from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Area, Item, ItemStatus, Rental, RentalStatus, User
from app.schemas import DashboardAreaStat, DashboardStatusStat, DashboardSummary

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
