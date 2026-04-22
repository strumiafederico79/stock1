from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Area, Item, ItemStatus, Movement, MovementType, User
from app.schemas import MaintenanceItem, MaintenanceOverview

router = APIRouter(prefix='/maintenance', tags=['maintenance'])


@router.get('/overview', response_model=MaintenanceOverview)
def get_maintenance_overview(
    preventive_days: int = Query(default=45, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
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
        last_maintenance = maint_map.get(item.id)
        days_without = (now - last_maintenance).days if last_maintenance else (now - item.created_at).days
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
