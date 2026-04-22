from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ScheduledReport


def run_pending_reports(db: Session) -> int:
    now = datetime.now(timezone.utc)
    pending = db.execute(
        select(ScheduledReport).where(
            ScheduledReport.is_active.is_(True),
            (ScheduledReport.next_run_at.is_(None)) | (ScheduledReport.next_run_at <= now),
        )
    ).scalars().all()

    executed = 0
    for schedule in pending:
        schedule.last_run_at = now
        schedule.next_run_at = now + timedelta(minutes=schedule.interval_minutes)
        schedule.last_status = f'OK ({schedule.report_type}/{schedule.report_format})'
        executed += 1
    if executed:
        db.commit()
    return executed
