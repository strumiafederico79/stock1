from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models import AuditLog, User
from app.schemas import AuditLogRead

router = APIRouter(prefix='/audit', tags=['audit'])


@router.get('/logs', response_model=list[AuditLogRead])
def list_audit_logs(
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    username: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if username:
        stmt = stmt.where(AuditLog.username == username)
    return db.execute(stmt).scalars().all()
