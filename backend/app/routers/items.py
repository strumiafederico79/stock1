from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models import Area, Category, ControlType, Item, ItemStatus, Location, Movement, User
from app.schemas import ItemCreate, ItemRead, ItemUpdate, MovementRead
from app.services.barcodes import generate_code128_png, generate_qr_png

router = APIRouter(prefix='/items', tags=['items'])
settings = get_settings()


def _build_item_code(db: Session, area: Area) -> str:
    count = db.scalar(select(func.count(Item.id)).where(Item.area_id == area.id)) or 0
    return f'{area.code_prefix}-{count + 1:05d}'


def _get_item_or_404(db: Session, item_id: int) -> Item:
    stmt = select(Item).options(joinedload(Item.area), joinedload(Item.category), joinedload(Item.location)).where(Item.id == item_id)
    item = db.execute(stmt).scalars().unique().first()
    if not item:
        raise HTTPException(status_code=404, detail='Ítem no encontrado.')
    return item


def _validate_relations(db: Session, *, area_id: int, category_id: int | None, location_id: int | None):
    area = db.get(Area, area_id)
    if not area:
        raise HTTPException(status_code=404, detail='Área no encontrada.')

    category = None
    if category_id is not None:
        category = db.get(Category, category_id)
        if not category:
            raise HTTPException(status_code=404, detail='Categoría no encontrada.')
        if category.area_id != area.id:
            raise HTTPException(status_code=400, detail='La categoría no pertenece al área seleccionada.')

    location = None
    if location_id is not None:
        location = db.get(Location, location_id)
        if not location:
            raise HTTPException(status_code=404, detail='Ubicación no encontrada.')
        if location.area_id != area.id:
            raise HTTPException(status_code=400, detail='La ubicación no pertenece al área seleccionada.')

    return area, category, location


def _normalize_item_quantities(*, control_type: ControlType, status: ItemStatus, quantity_total: int, quantity_available: int | None):
    if control_type == ControlType.SERIALIZED:
        return 1, 1 if status == ItemStatus.AVAILABLE else 0

    normalized_available = quantity_total if quantity_available is None else quantity_available
    if normalized_available > quantity_total:
        raise HTTPException(status_code=400, detail='La cantidad disponible no puede superar la cantidad total.')
    return quantity_total, normalized_available


@router.get('', response_model=list[ItemRead])
def list_items(
    q: Optional[str] = Query(default=None),
    area_id: Optional[int] = Query(default=None),
    category_id: Optional[int] = Query(default=None),
    location_id: Optional[int] = Query(default=None),
    status_filter: Optional[ItemStatus] = Query(default=None, alias='status'),
    available_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Item).options(joinedload(Item.area), joinedload(Item.category), joinedload(Item.location)).order_by(Item.created_at.desc())
    if q:
        pattern = f'%{q.strip()}%'
        stmt = stmt.where(or_(Item.name.ilike(pattern), Item.code.ilike(pattern), Item.barcode_value.ilike(pattern), Item.serial_number.ilike(pattern), Item.brand.ilike(pattern), Item.model.ilike(pattern)))
    if area_id:
        stmt = stmt.where(Item.area_id == area_id)
    if category_id:
        stmt = stmt.where(Item.category_id == category_id)
    if location_id:
        stmt = stmt.where(Item.location_id == location_id)
    if status_filter:
        stmt = stmt.where(Item.status == status_filter)
    if available_only:
        stmt = stmt.where(Item.quantity_available > 0)
    return db.execute(stmt).scalars().unique().all()


@router.post('', response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    area, _, _ = _validate_relations(db, area_id=payload.area_id, category_id=payload.category_id, location_id=payload.location_id)
    quantity_total, quantity_available = _normalize_item_quantities(
        control_type=payload.control_type,
        status=payload.status,
        quantity_total=payload.quantity_total,
        quantity_available=payload.quantity_available,
    )
    item = Item(
        **payload.model_dump(exclude={'quantity_total', 'quantity_available', 'code', 'barcode_value', 'barcode_type', 'qr_value'}),
        quantity_total=quantity_total,
        quantity_available=quantity_available,
        code=payload.code or _build_item_code(db, area),
        barcode_type=payload.barcode_type or settings.barcode_type_default,
        barcode_value=payload.barcode_value or f"BC-{payload.area_id}-{payload.name[:16].upper().replace(' ', '-')}",
        qr_value=payload.qr_value or f'ITEM::{payload.area_id}::{payload.name}',
    )
    if not payload.barcode_value:
        item.barcode_value = item.code
    if not payload.qr_value:
        item.qr_value = f'item:{item.code}'
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='Código, barcode o QR duplicado.') from exc
    return _get_item_or_404(db, item.id)


@router.get('/barcode/{barcode}', response_model=ItemRead)
def get_item_by_barcode(barcode: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Item).options(joinedload(Item.area), joinedload(Item.category), joinedload(Item.location)).where(Item.barcode_value == barcode)
    item = db.execute(stmt).scalars().unique().first()
    if not item:
        raise HTTPException(status_code=404, detail='Ítem no encontrado para ese barcode.')
    return item


@router.get('/{item_id}', response_model=ItemRead)
def get_item(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _get_item_or_404(db, item_id)


@router.put('/{item_id}', response_model=ItemRead)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    item = _get_item_or_404(db, item_id)
    data = payload.model_dump(exclude_unset=True)

    target_area_id = data.get('area_id', item.area_id)
    target_category_id = data.get('category_id', item.category_id)
    target_location_id = data.get('location_id', item.location_id)
    _validate_relations(db, area_id=target_area_id, category_id=target_category_id, location_id=target_location_id)

    next_control_type = item.control_type
    next_status = data.get('status', item.status)
    next_total = data.get('quantity_total', item.quantity_total)
    next_available = data.get('quantity_available', item.quantity_available)
    normalized_total, normalized_available = _normalize_item_quantities(control_type=next_control_type, status=next_status, quantity_total=next_total, quantity_available=next_available)

    for key, value in data.items():
        setattr(item, key, value)
    item.quantity_total = normalized_total
    item.quantity_available = normalized_available

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='No se pudo actualizar el ítem.') from exc
    return _get_item_or_404(db, item.id)


@router.get('/{item_id}/movements', response_model=list[MovementRead])
def get_item_movements(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    _get_item_or_404(db, item_id)
    stmt = select(Movement).where(Movement.item_id == item_id).order_by(Movement.created_at.desc())
    return db.execute(stmt).scalars().all()


@router.get('/{item_id}/barcode.png')
def barcode_image(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = _get_item_or_404(db, item_id)
    return Response(generate_code128_png(item.barcode_value), media_type='image/png')


@router.get('/{item_id}/qrcode.png')
def qrcode_image(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = _get_item_or_404(db, item_id)
    return Response(generate_qr_png(item.qr_value), media_type='image/png')
