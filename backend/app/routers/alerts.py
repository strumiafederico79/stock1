from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_permission
from app.models import Item, Rental, RentalStatus, User
from app.schemas import SmartAlert, SmartAlertsResponse

router = APIRouter(prefix='/alerts', tags=['alerts'])


@router.get('/smart', response_model=SmartAlertsResponse)
def get_smart_alerts(db: Session = Depends(get_db), _: User = Depends(require_permission('alerts.read'))):
    alerts: list[SmartAlert] = []
    today = date.today()
    due_soon = today + timedelta(days=3)

    critical_items = db.execute(
        select(Item).where(Item.min_stock > 0, Item.quantity_available <= Item.min_stock).order_by((Item.min_stock - Item.quantity_available).desc()).limit(10)
    ).scalars().all()
    for item in critical_items:
        alerts.append(
            SmartAlert(
                type='LOW_STOCK',
                severity='HIGH',
                title=f'Stock crítico: {item.name}',
                message=f'Stock actual {item.quantity_available}, mínimo {item.min_stock}.',
                channels=['in_app', 'email', 'slack'],
                entity_type='item',
                entity_id=str(item.id),
            )
        )

    overdue = db.execute(
        select(Rental).where(Rental.status.in_([RentalStatus.ACTIVE, RentalStatus.PARTIAL_RETURN]), Rental.due_date < today).limit(10)
    ).scalars().all()
    for rental in overdue:
        alerts.append(
            SmartAlert(
                type='OVERDUE_RENTAL',
                severity='HIGH',
                title=f'Rental #{rental.id} vencido',
                message=f'Cliente: {rental.client_name}. Venció el {rental.due_date}.',
                channels=['in_app', 'email', 'whatsapp'],
                entity_type='rental',
                entity_id=str(rental.id),
            )
        )

    upcoming = db.execute(
        select(Rental).where(
            Rental.status.in_([RentalStatus.ACTIVE, RentalStatus.PARTIAL_RETURN]),
            Rental.due_date >= today,
            Rental.due_date <= due_soon,
        ).limit(10)
    ).scalars().all()
    for rental in upcoming:
        alerts.append(
            SmartAlert(
                type='DUE_SOON_RENTAL',
                severity='MEDIUM',
                title=f'Rental #{rental.id} por vencer',
                message=f'Vence el {rental.due_date}. Cliente: {rental.client_name}.',
                channels=['in_app', 'email'],
                entity_type='rental',
                entity_id=str(rental.id),
            )
        )

    return SmartAlertsResponse(
        generated_at=datetime.now(timezone.utc),
        total_alerts=len(alerts),
        alerts=alerts,
    )


@router.post('/dispatch-preview')
def dispatch_preview(db: Session = Depends(get_db), _: User = Depends(require_permission('alerts.read'))):
    smart = get_smart_alerts(db)
    simulated = [
        {
            'title': alert.title,
            'sent_to': ['email:operaciones@empresa.local', 'whatsapp:+5491112345678'],
            'channels': alert.channels,
            'status': 'SIMULATED',
        }
        for alert in smart.alerts[:20]
    ]
    return {'generated_at': datetime.now(timezone.utc), 'dispatched': len(simulated), 'items': simulated}
