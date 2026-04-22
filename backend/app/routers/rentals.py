from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Response, status
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ControlType, Item, ItemStatus, Movement, MovementType, Rental, RentalItem, RentalStatus, User, UserRole
from app.schemas import RentalCreate, RentalItemAdd, RentalRead, RentalReturn
from app.services.audit import log_audit_event
from app.services.settings import get_receipt_config

router = APIRouter(prefix='/rentals', tags=['rentals'])


def _get_rental_or_404(db: Session, rental_id: int) -> Rental:
    stmt = select(Rental).options(
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.area),
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.category),
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.location),
    ).where(Rental.id == rental_id)
    rental = db.execute(stmt).scalars().unique().first()
    if not rental:
        raise HTTPException(status_code=404, detail='Rental no encontrado.')
    return rental


def _apply_item_status_from_available(item: Item) -> None:
    if item.quantity_available <= 0:
        item.status = ItemStatus.RENTED
    elif item.quantity_available >= item.quantity_total:
        item.status = ItemStatus.AVAILABLE
    else:
        item.status = ItemStatus.RESERVED


def _generate_rental_receipt_pdf(rental: Rental, branding) -> bytes:
    stream = BytesIO()
    pdf = canvas.Canvas(stream, pagesize=letter)
    _, height = letter
    y = height - 40

    pdf.setFont('Helvetica-Bold', 14)
    pdf.drawString(40, y, branding.business_name)
    y -= 20
    pdf.setFont('Helvetica', 10)
    pdf.drawString(40, y, f'Formato fiscal: {branding.business_tax_id}')
    y -= 14
    pdf.drawString(40, y, f'Dirección: {branding.business_address}')
    y -= 14
    pdf.drawString(40, y, f'Comprobante de alquiler #{rental.id}')
    y -= 14
    pdf.drawString(40, y, f'Cliente: {rental.client_name}')
    y -= 14
    pdf.drawString(40, y, f'Evento: {rental.event_name or "-"}')
    y -= 14
    pdf.drawString(40, y, f'Fechas: {rental.start_date} a {rental.due_date}')
    y -= 14
    pdf.drawString(40, y, f'Estado: {rental.status.value}')
    y -= 24

    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(40, y, 'Detalle')
    y -= 16
    pdf.setFont('Helvetica', 9)
    total = 0.0
    for rental_item in rental.items:
        unit_price = float(rental_item.unit_price or 0)
        line_total = unit_price * rental_item.quantity
        total += line_total
        line = f'{rental_item.item.code} - {rental_item.item.name} | Cant: {rental_item.quantity} | P.Unit: {branding.currency_symbol}{unit_price:.2f} | Subtotal: {branding.currency_symbol}{line_total:.2f}'
        if y < 45:
            pdf.showPage()
            pdf.setFont('Helvetica', 9)
            y = height - 40
        pdf.drawString(40, y, line[:150])
        y -= 14

    y -= 8
    pdf.setFont('Helvetica-Bold', 11)
    pdf.drawString(40, y, f'Total alquiler: {branding.currency_symbol}{total:.2f}')
    y -= 16
    pdf.setFont('Helvetica', 9)
    pdf.drawString(40, y, branding.footer_note[:120])
    pdf.save()
    return stream.getvalue()


@router.get('', response_model=list[RentalRead])
def list_rentals(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Rental).options(
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.area),
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.category),
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.location),
    ).order_by(Rental.created_at.desc())
    return db.execute(stmt).scalars().unique().all()


@router.post('', response_model=RentalRead, status_code=status.HTTP_201_CREATED)
def create_rental(payload: RentalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.due_date < payload.start_date:
        raise HTTPException(status_code=400, detail='La fecha de devolución no puede ser menor a la de salida.')
    rental = Rental(**payload.model_dump())
    db.add(rental)
    db.flush()
    log_audit_event(
        db,
        action='RENTAL_CREATED',
        entity_type='rental',
        entity_id=str(rental.id),
        current_user=current_user,
        details={'client_name': rental.client_name, 'due_date': str(rental.due_date)},
    )
    db.commit()
    return _get_rental_or_404(db, rental.id)


@router.get('/{rental_id}', response_model=RentalRead)
def get_rental(rental_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _get_rental_or_404(db, rental_id)


@router.post('/{rental_id}/items', response_model=RentalRead)
def add_item_to_rental(rental_id: int, payload: RentalItemAdd, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rental = _get_rental_or_404(db, rental_id)
    if rental.status in {RentalStatus.CLOSED, RentalStatus.CANCELLED}:
        raise HTTPException(status_code=400, detail='No se pueden agregar equipos a un rental cerrado o cancelado.')
    item = db.get(Item, payload.item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Ítem no encontrado.')
    if item.quantity_available < payload.quantity:
        raise HTTPException(status_code=400, detail='Stock insuficiente para este rental.')
    if item.control_type == ControlType.SERIALIZED and payload.quantity != 1:
        raise HTTPException(status_code=400, detail='Un equipo serializado solo puede salir de a uno.')
    if payload.unit_price is not None and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail='Solo administradores pueden definir precios de alquiler.')

    rental_item = RentalItem(rental_id=rental.id, item_id=item.id, quantity=payload.quantity, unit_price=payload.unit_price)
    db.add(rental_item)
    item.quantity_available -= payload.quantity
    _apply_item_status_from_available(item)
    rental.status = RentalStatus.ACTIVE

    movement = Movement(
        item_id=item.id,
        movement_type=MovementType.RENTAL_OUT,
        quantity=payload.quantity,
        origin_area_id=item.area_id,
        origin_location_id=item.location_id,
        barcode_scanned=item.barcode_value,
        performed_by=current_user.full_name,
        performed_by_user_id=current_user.id,
        notes=payload.notes or f'Salida por rental #{rental.id}',
    )
    db.add(movement)

    try:
        db.flush()
        log_audit_event(
            db,
            action='RENTAL_ITEM_ADDED',
            entity_type='rental',
            entity_id=str(rental.id),
            current_user=current_user,
            details={'item_id': payload.item_id, 'quantity': payload.quantity},
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='El ítem ya fue agregado a este rental.') from exc
    log_audit_event(
        db,
        action='RENTAL_ITEM_ADDED',
        entity_type='rental',
        entity_id=str(rental.id),
        current_user=current_user,
        details={'item_id': payload.item_id, 'quantity': payload.quantity},
    )
    db.commit()
    return _get_rental_or_404(db, rental_id)


@router.post('/{rental_id}/items/{rental_item_id}/return', response_model=RentalRead)
def return_rental_item(rental_id: int, rental_item_id: int, payload: RentalReturn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rental = _get_rental_or_404(db, rental_id)
    rental_item = next((ri for ri in rental.items if ri.id == rental_item_id), None)
    if not rental_item:
        raise HTTPException(status_code=404, detail='Ítem del rental no encontrado.')
    pending = rental_item.quantity - rental_item.returned_quantity
    if payload.quantity > pending:
        raise HTTPException(status_code=400, detail='La cantidad devuelta supera lo pendiente.')
    item = db.get(Item, rental_item.item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Ítem no encontrado.')

    rental_item.returned_quantity += payload.quantity
    rental_item.return_notes = payload.notes
    item.quantity_available = min(item.quantity_total, item.quantity_available + payload.quantity)
    _apply_item_status_from_available(item)

    movement = Movement(
        item_id=item.id,
        movement_type=MovementType.RETURN,
        quantity=payload.quantity,
        destination_area_id=item.area_id,
        destination_location_id=item.location_id,
        barcode_scanned=item.barcode_value,
        performed_by=current_user.full_name,
        performed_by_user_id=current_user.id,
        notes=payload.notes or f'Devolución de rental #{rental.id}',
    )
    db.add(movement)

    all_returned = all(ri.returned_quantity >= ri.quantity for ri in rental.items)
    if all_returned:
        rental.status = RentalStatus.CLOSED
        rental.return_date = date.today()
    else:
        rental.status = RentalStatus.PARTIAL_RETURN

    log_audit_event(
        db,
        action='RENTAL_ITEM_RETURNED',
        entity_type='rental',
        entity_id=str(rental.id),
        current_user=current_user,
        details={'rental_item_id': rental_item.id, 'quantity': payload.quantity},
    )
    db.commit()
    return _get_rental_or_404(db, rental_id)


@router.get('/{rental_id}/receipt.pdf')
def get_rental_receipt(rental_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rental = _get_rental_or_404(db, rental_id)
    branding = get_receipt_config(db)
    pdf_bytes = _generate_rental_receipt_pdf(rental, branding)
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="rental_{rental_id}_receipt.pdf"'},
    )
