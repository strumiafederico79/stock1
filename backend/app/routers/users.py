from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models import User
from app.schemas import UserCreate, UserRead, UserUpdate
from app.security import hash_password
from app.services.audit import log_audit_event

router = APIRouter(prefix='/users', tags=['users'])


@router.get('', response_model=list[UserRead])
def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.execute(select(User).order_by(User.created_at.desc())).scalars().all()


@router.post('', response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = User(
        username=payload.username.strip(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    try:
        db.flush()
        log_audit_event(
            db,
            action='USER_CREATED',
            entity_type='user',
            entity_id=str(user.id),
            current_user=current_user,
            details={'username': user.username, 'role': user.role.value},
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='El nombre de usuario ya existe.') from exc
    db.refresh(user)
    return user


@router.put('/{user_id}', response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado.')

    data = payload.model_dump(exclude_unset=True)
    if 'full_name' in data:
        user.full_name = data['full_name'].strip()
    if 'role' in data:
        user.role = data['role']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if data.get('password'):
        user.password_hash = hash_password(data['password'])

    db.add(user)
    log_audit_event(
        db,
        action='USER_UPDATED',
        entity_type='user',
        entity_id=str(user.id),
        current_user=current_user,
        details={'updated_fields': list(data.keys())},
    )
    db.commit()
    db.refresh(user)
    return user
