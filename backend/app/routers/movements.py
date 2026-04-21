from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Area, Category, ControlType, Item, ItemStatus, Location, Movement, MovementType, User
from app.schemas import MovementCreate, MovementRead

router = APIRouter(prefix='/movements', tags=['movements'])


def _recalculate_status(item: Item, movement_type: MovementType) -> None:
    if movement_type == MovementType.MAINTENANCE:
        item.status = ItemStatus.MAINTENANCE
        return
    if item.quantity_available <= 0:
        item.status = ItemStatus.RENTED if movement_type == MovementType.RENTAL_OUT else ItemStatus.RESERVED
        return
    if item.quantity_available >= item.quantity_total:
        item.status = ItemStatus.AVAILABLE
        return
    item.status = ItemStatus.RESERVED if movement_type in {MovementType.OUT, MovementType.RENTAL_OUT} else ItemStatus.AVAILABLE


def _apply_stock_change(item: Item, movement_type: MovementType, quantity: int) -> None:
    if item.control_type == ControlType.SERIALIZED and quantity != 1:
        raise HTTPException(status_code=400, detail='Los ítems serializados solo permiten cantidad 1.')
    if movement_type == MovementType.TRANSFER:
        return
    if movement_type in {MovementType.OUT, MovementType.RENTAL_OUT, MovementType.MAINTENANCE}:
        if item.quantity_available < quantity:
            raise HTTPException(status_code=400, detail='Stock disponible insuficiente.')
        item.quantity_available -= quantity
    elif movement_type in {MovementType.IN, MovementType.RETURN}:
        item.quantity_available = 1 if item.control_type == ControlType.SERIALIZED else min(item.quantity_total, item.quantity_available + quantity)
    elif movement_type == MovementType.ADJUSTMENT:
        item.quantity_available = 1 if item.control_type == ControlType.SERIALIZED and quantity > 0 else (0 if item.control_type == ControlType.SERIALIZED else quantity)
    elif movement_type == MovementType.STATUS_CHANGE:
        return
    _recalculate_status(item, movement_type)


def _validate_destination_consistency(item: Item, destination_area: Area | None, destination_location: Location | None, db: Session):
    target_area_id = destination_area.id if destination_area else item.area_id
    target_location_id = destination_location.id if destination_location else item.location_id
    if destination_location and destination_location.area_id != target_area_id:
        raise HTTPException(status_code=400, detail='La ubicación destino no pertenece al área destino.')
    if target_location_id:
        location = db.get(Location, target_location_id)
        if location and location.area_id != target_area_id:
            target_location_id = None
    if item.category_id:
        category = db.get(Category, item.category_id)
        if category and category.area_id != target_area_id:
            item.category_id = None
    return target_area_id, target_location_id


@router.get('', response_model=list[MovementRead])
def list_movements(item_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Movement).order_by(Movement.created_at.desc())
    if item_id:
        stmt = stmt.where(Movement.item_id == item_id)
    return db.execute(stmt).scalars().all()


@router.post('', response_model=MovementRead, status_code=status.HTTP_201_CREATED)
def create_movement(payload: MovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(Item, payload.item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Ítem no encontrado.')

    origin_area = db.get(Area, payload.origin_area_id) if payload.origin_area_id else None
    destination_area = db.get(Area, payload.destination_area_id) if payload.destination_area_id else None
    origin_location = db.get(Location, payload.origin_location_id) if payload.origin_location_id else None
    destination_location = db.get(Location, payload.destination_location_id) if payload.destination_location_id else None

    if payload.origin_area_id and not origin_area:
        raise HTTPException(status_code=404, detail='Área origen no encontrada.')
    if payload.destination_area_id and not destination_area:
        raise HTTPException(status_code=404, detail='Área destino no encontrada.')
    if payload.origin_location_id and not origin_location:
        raise HTTPException(status_code=404, detail='Ubicación origen no encontrada.')
    if payload.destination_location_id and not destination_location:
        raise HTTPException(status_code=404, detail='Ubicación destino no encontrada.')
    if origin_location and origin_area and origin_location.area_id != origin_area.id:
        raise HTTPException(status_code=400, detail='La ubicación origen no pertenece al área origen.')
    if payload.movement_type == MovementType.TRANSFER and not (destination_area or destination_location):
        raise HTTPException(status_code=400, detail='La transferencia requiere un área o una ubicación destino.')
    if destination_location and not destination_area:
        destination_area = db.get(Area, destination_location.area_id)

    _apply_stock_change(item, payload.movement_type, payload.quantity)

    if payload.movement_type == MovementType.TRANSFER:
        target_area_id, target_location_id = _validate_destination_consistency(item, destination_area, destination_location, db)
        item.area_id = target_area_id
        item.location_id = target_location_id
    else:
        if destination_area:
            item.area_id = destination_area.id
        if destination_location:
            item.location_id = destination_location.id

    movement = Movement(
        **payload.model_dump(exclude={'performed_by'}),
        destination_area_id=destination_area.id if destination_area else None,
        performed_by=current_user.full_name,
        performed_by_user_id=current_user.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement
