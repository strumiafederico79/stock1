from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ControlType, Item, ItemStatus, Movement, MovementType, Rental, RentalItem, RentalStatus, User
from app.schemas import RentalCreate, RentalItemAdd, RentalRead, RentalReturn

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


@router.get('', response_model=list[RentalRead])
def list_rentals(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Rental).options(
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.area),
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.category),
        joinedload(Rental.items).joinedload(RentalItem.item).joinedload(Item.location),
    ).order_by(Rental.created_at.desc())
    return db.execute(stmt).scalars().unique().all()


@router.post('', response_model=RentalRead, status_code=status.HTTP_201_CREATED)
def create_rental(payload: RentalCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if payload.due_date < payload.start_date:
        raise HTTPException(status_code=400, detail='La fecha de devolución no puede ser menor a la de salida.')
    rental = Rental(**payload.model_dump())
    db.add(rental)
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
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='El ítem ya fue agregado a este rental.') from exc
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

    db.commit()
    return _get_rental_or_404(db, rental_id)
