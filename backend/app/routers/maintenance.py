from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_permission
from app.models import Area, Item, ItemStatus, MaintenanceWorkOrder, Movement, MovementType, User
from app.schemas import MaintenanceItem, MaintenanceOverview, WorkOrderCreate, WorkOrderRead, WorkOrderUpdate

router = APIRouter(prefix='/maintenance', tags=['maintenance'])

def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)



@router.get('/overview', response_model=MaintenanceOverview)
def get_maintenance_overview(
    preventive_days: int = Query(default=45, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('maintenance.read')),
):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)

    maint_map = {
        row[0]: row[1]
        for row in db.execute(
            select(Movement.item_id, func.max(Movement.created_at))
            .where(Movement.movement_type == MovementType.MAINTENANCE)
            .group_by(Movement.item_id)
        ).all()
    }
    demand_map = {
        row[0]: int(row[1] or 0)
        for row in db.execute(
            select(Movement.item_id, func.coalesce(func.sum(Movement.quantity), 0))
            .where(Movement.movement_type.in_([MovementType.OUT, MovementType.RENTAL_OUT]), Movement.created_at >= cutoff)
            .group_by(Movement.item_id)
        ).all()
    }

    items = db.execute(select(Item, Area.name).join(Area, Item.area_id == Area.id)).all()

    result: list[MaintenanceItem] = []
    for item, area_name in items:
        last_maintenance = _as_utc(maint_map.get(item.id))
        item_created_at = _as_utc(item.created_at)
        days_without = (now - last_maintenance).days if last_maintenance else (now - item_created_at).days
        usage_30d = demand_map.get(item.id, 0)
        risk_score = min(100, max(0, (usage_30d * 5) + (days_without // 2)))

        is_preventive = days_without >= preventive_days
        is_predictive = usage_30d >= 8 or risk_score >= 70
        if item.status == ItemStatus.MAINTENANCE:
            recommendation = 'Equipo en mantenimiento: priorizar cierre técnico.'
        elif is_predictive:
            recommendation = 'Riesgo alto: programar revisión predictiva.'
        elif is_preventive:
            recommendation = 'Candidato preventivo: agendar mantenimiento.'
        else:
            continue

        result.append(
            MaintenanceItem(
                item_id=item.id,
                item_code=item.code,
                item_name=item.name,
                area_name=area_name,
                status=item.status,
                last_maintenance_at=last_maintenance,
                days_without_maintenance=days_without,
                risk_score=risk_score,
                recommendation=recommendation,
            )
        )

    total_in_maintenance = sum(1 for item in result if item.status == ItemStatus.MAINTENANCE)
    preventive_candidates = sum(1 for item in result if 'preventivo' in item.recommendation.lower())
    predictive_candidates = sum(1 for item in result if 'predictiva' in item.recommendation.lower() or 'riesgo alto' in item.recommendation.lower())

    return MaintenanceOverview(
        generated_at=now,
        total_items_in_maintenance=total_in_maintenance,
        preventive_candidates=preventive_candidates,
        predictive_candidates=predictive_candidates,
        items=sorted(result, key=lambda row: row.risk_score, reverse=True)[:50],
    )


@router.get('/work-orders', response_model=list[WorkOrderRead])
def list_work_orders(db: Session = Depends(get_db), _: User = Depends(require_permission('maintenance.read'))):
    return db.execute(select(MaintenanceWorkOrder).order_by(MaintenanceWorkOrder.opened_at.desc())).scalars().all()


@router.post('/work-orders', response_model=WorkOrderRead)
def create_work_order(payload: WorkOrderCreate, db: Session = Depends(get_db), _: User = Depends(require_permission('maintenance.write'))):
    item = db.get(Item, payload.item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Equipo no encontrado.')

    work_order = MaintenanceWorkOrder(**payload.model_dump())
    db.add(work_order)
    item.status = ItemStatus.MAINTENANCE
    db.commit()
    db.refresh(work_order)
    return work_order


@router.put('/work-orders/{work_order_id}', response_model=WorkOrderRead)
def update_work_order(work_order_id: int, payload: WorkOrderUpdate, db: Session = Depends(get_db), _: User = Depends(require_permission('maintenance.write'))):
    work_order = db.get(MaintenanceWorkOrder, work_order_id)
    if not work_order:
        raise HTTPException(status_code=404, detail='Orden no encontrada.')
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(work_order, key, value)
    if work_order.status == 'DONE':
        work_order.closed_at = datetime.now(timezone.utc)
        item = db.get(Item, work_order.item_id)
        if item and item.status == ItemStatus.MAINTENANCE:
            item.status = ItemStatus.AVAILABLE
    db.commit()
    db.refresh(work_order)
    return work_order
