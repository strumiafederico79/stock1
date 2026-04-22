from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog, User


def log_audit_event(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    current_user: User | None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        username=current_user.username if current_user else 'system',
        user_full_name=current_user.full_name if current_user else 'System',
        details_json=str(details or {}),
    )
    db.add(log)
    return log
