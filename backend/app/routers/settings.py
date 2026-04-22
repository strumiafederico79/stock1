from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_permission
from app.models import User
from app.schemas import ReceiptBrandingConfig
from app.services.settings import get_receipt_config, save_receipt_config

router = APIRouter(prefix='/settings', tags=['settings'])


@router.get('/receipt-branding', response_model=ReceiptBrandingConfig)
def get_receipt_branding(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('settings.manage')),
):
    return get_receipt_config(db)


@router.put('/receipt-branding', response_model=ReceiptBrandingConfig)
def update_receipt_branding(
    payload: ReceiptBrandingConfig,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('settings.manage')),
):
    config = save_receipt_config(db, payload)
    db.commit()
    return config
