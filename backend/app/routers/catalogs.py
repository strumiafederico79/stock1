from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models import Area, Category, Location, User
from app.schemas import AreaCreate, AreaRead, CategoryCreate, CategoryRead, LocationCreate, LocationRead

router = APIRouter(prefix='/catalogs', tags=['catalogs'])


@router.get('/areas', response_model=list[AreaRead])
def list_areas(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.execute(select(Area).order_by(Area.name.asc())).scalars().all()


@router.post('/areas', response_model=AreaRead, status_code=status.HTTP_201_CREATED)
def create_area(payload: AreaCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    area = Area(**payload.model_dump())
    db.add(area)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='Área duplicada.') from exc
    db.refresh(area)
    return area


@router.get('/categories', response_model=list[CategoryRead])
def list_categories(area_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Category).order_by(Category.name.asc())
    if area_id:
        stmt = stmt.where(Category.area_id == area_id)
    return db.execute(stmt).scalars().all()


@router.post('/categories', response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    area = db.get(Area, payload.area_id)
    if not area:
        raise HTTPException(status_code=404, detail='Área no encontrada.')
    category = Category(**payload.model_dump())
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='Categoría duplicada para esta área.') from exc
    db.refresh(category)
    return category


@router.get('/locations', response_model=list[LocationRead])
def list_locations(area_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Location).order_by(Location.name.asc())
    if area_id:
        stmt = stmt.where(Location.area_id == area_id)
    return db.execute(stmt).scalars().all()


@router.post('/locations', response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(payload: LocationCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    area = db.get(Area, payload.area_id)
    if not area:
        raise HTTPException(status_code=404, detail='Área no encontrada.')
    location = Location(**payload.model_dump())
    db.add(location)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='Ubicación duplicada para esta área.') from exc
    db.refresh(location)
    return location
