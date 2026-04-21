from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Area, Item, ItemStatus, Movement, MovementType, Rental, RentalStatus, User
from app.schemas import (
    DashboardAlertItem,
    DashboardAreaStat,
    DashboardInsights,
    DashboardMovementStat,
    DashboardRestockSuggestion,
    DashboardStatusStat,
    DashboardSummary,
)

router = APIRouter(prefix='/dashboard', tags=['dashboard'])


@router.get('/summary', response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total_items = db.scalar(select(func.count(Item.id))) or 0
    total_units = db.scalar(select(func.coalesce(func.sum(Item.quantity_total), 0))) or 0
    total_available_units = db.scalar(select(func.coalesce(func.sum(Item.quantity_available), 0))) or 0
    low_stock_items = db.scalar(select(func.count(Item.id)).where(Item.quantity_available <= Item.min_stock, Item.min_stock > 0)) or 0
    active_rentals = db.scalar(select(func.count(Rental.id)).where(Rental.status.in_([RentalStatus.ACTIVE, RentalStatus.PARTIAL_RETURN]))) or 0
    maintenance_items = db.scalar(select(func.count(Item.id)).where(Item.status == ItemStatus.MAINTENANCE)) or 0

    area_rows = db.execute(
        select(Area.id, Area.name, func.count(Item.id), func.coalesce(func.sum(Item.quantity_available), 0))
        .join(Item, Item.area_id == Area.id, isouter=True)
        .group_by(Area.id, Area.name)
        .order_by(Area.name.asc())
    ).all()

    status_rows = db.execute(
        select(Item.status, func.count(Item.id)).group_by(Item.status).order_by(Item.status.asc())
    ).all()

    return DashboardSummary(
        total_items=total_items,
        total_units=total_units,
        total_available_units=total_available_units,
        low_stock_items=low_stock_items,
        active_rentals=active_rentals,
        maintenance_items=maintenance_items,
        by_area=[DashboardAreaStat(area_id=row[0], area_name=row[1], items_count=row[2], units_available=row[3]) for row in area_rows],
        by_status=[DashboardStatusStat(status=row[0], items_count=row[1]) for row in status_rows],
    )


@router.get('/insights', response_model=DashboardInsights)
def get_dashboard_insights(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    due_soon_limit = today + timedelta(days=3)
    outgoing_types = [MovementType.OUT, MovementType.RENTAL_OUT]
    incoming_types = [MovementType.IN, MovementType.RETURN]

    outgoing_movements_30d = db.scalar(
        select(func.coalesce(func.sum(Movement.quantity), 0)).where(
            Movement.movement_type.in_(outgoing_types),
            Movement.created_at >= cutoff,
        )
    ) or 0
    incoming_movements_30d = db.scalar(
        select(func.coalesce(func.sum(Movement.quantity), 0)).where(
            Movement.movement_type.in_(incoming_types),
            Movement.created_at >= cutoff,
        )
    ) or 0
    unique_items_moved_30d = db.scalar(
        select(func.count(func.distinct(Movement.item_id))).where(Movement.created_at >= cutoff)
    ) or 0

    overdue_rentals = db.scalar(
        select(func.count(Rental.id)).where(
            Rental.status.in_([RentalStatus.ACTIVE, RentalStatus.PARTIAL_RETURN]),
            Rental.due_date < today,
        )
    ) or 0
    due_soon_rentals = db.scalar(
        select(func.count(Rental.id)).where(
            Rental.status.in_([RentalStatus.ACTIVE, RentalStatus.PARTIAL_RETURN]),
            Rental.due_date >= today,
            Rental.due_date <= due_soon_limit,
        )
    ) or 0

    top_outgoing_rows = db.execute(
        select(Item.id, Item.name, func.coalesce(func.sum(Movement.quantity), 0).label('total_outgoing'))
        .join(Movement, Movement.item_id == Item.id)
        .where(
            Movement.movement_type.in_(outgoing_types),
            Movement.created_at >= cutoff,
        )
        .group_by(Item.id, Item.name)
        .order_by(func.coalesce(func.sum(Movement.quantity), 0).desc(), Item.name.asc())
        .limit(5)
    ).all()

    critical_rows = db.execute(
        select(Item.id, Item.name, Item.quantity_available, Item.min_stock)
        .where(Item.min_stock > 0, Item.quantity_available <= Item.min_stock)
        .order_by((Item.min_stock - Item.quantity_available).desc(), Item.name.asc())
        .limit(8)
    ).all()

    velocity_rows = db.execute(
        select(Movement.item_id, func.coalesce(func.sum(Movement.quantity), 0))
        .where(Movement.movement_type.in_(outgoing_types), Movement.created_at >= cutoff)
        .group_by(Movement.item_id)
    ).all()
    velocity_map = {row[0]: row[1] for row in velocity_rows}

    restock_rows = db.execute(
        select(Item.id, Item.name, Item.quantity_available, Item.min_stock)
        .where(Item.min_stock > 0, Item.quantity_available < Item.min_stock)
        .order_by((Item.min_stock - Item.quantity_available).desc(), Item.name.asc())
        .limit(8)
    ).all()

    suggestions = []
    for row in restock_rows:
        velocity = int(velocity_map.get(row[0], 0))
        base_deficit = max(row[3] - row[2], 0)
        security_buffer = max(1, velocity // 4) if velocity > 0 else 1
        suggestions.append(
            DashboardRestockSuggestion(
                item_id=row[0],
                item_name=row[1],
                quantity_available=row[2],
                min_stock=row[3],
                suggested_restock=base_deficit + security_buffer,
                demand_velocity_30d=velocity,
            )
        )

    return DashboardInsights(
        generated_at=datetime.now(timezone.utc),
        period_days=30,
        outgoing_movements_30d=outgoing_movements_30d,
        incoming_movements_30d=incoming_movements_30d,
        unique_items_moved_30d=unique_items_moved_30d,
        overdue_rentals=overdue_rentals,
        due_soon_rentals=due_soon_rentals,
        top_outgoing_items=[
            DashboardMovementStat(item_id=row[0], item_name=row[1], total_outgoing=row[2]) for row in top_outgoing_rows
        ],
        critical_stock_items=[
            DashboardAlertItem(
                item_id=row[0],
                item_name=row[1],
                quantity_available=row[2],
                min_stock=row[3],
                deficit=max(row[3] - row[2], 0),
            )
            for row in critical_rows
        ],
        restock_suggestions=suggestions,
    )
