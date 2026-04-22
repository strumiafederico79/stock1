from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.models import SystemSetting
from app.schemas import ReceiptBrandingConfig

RECEIPT_SETTING_KEY = 'receipt_branding_config'


def get_receipt_config(db: Session) -> ReceiptBrandingConfig:
    setting = db.get(SystemSetting, RECEIPT_SETTING_KEY)
    if not setting:
        return ReceiptBrandingConfig()
    try:
        raw = json.loads(setting.value_json)
    except json.JSONDecodeError:
        return ReceiptBrandingConfig()
    return ReceiptBrandingConfig(**raw)


def save_receipt_config(db: Session, config: ReceiptBrandingConfig) -> ReceiptBrandingConfig:
    setting = db.get(SystemSetting, RECEIPT_SETTING_KEY)
    payload = config.model_dump()
    if setting:
        setting.value_json = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    else:
        setting = SystemSetting(key=RECEIPT_SETTING_KEY, value_json=json.dumps(payload, ensure_ascii=False, sort_keys=True))
        db.add(setting)
    return config
