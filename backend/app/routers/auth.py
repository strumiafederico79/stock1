from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import LoginRequest, PasswordChangeRequest, TokenResponse, UserRead
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Usuario o contraseña inválidos.')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Usuario inactivo.')

    token = create_access_token(user.username)
    return TokenResponse(access_token=token, user=user)


@router.get('/me', response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post('/change-password')
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail='La contraseña actual no es correcta.')
    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    return {'ok': True, 'message': 'Contraseña actualizada.'}
