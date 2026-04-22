import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import require_permission
from app.models import Item, Rental, RentalItem, ScheduledReport, User
from app.schemas import ScheduledReportCreate, ScheduledReportRead, ScheduledReportUpdate

router = APIRouter(prefix='/reports', tags=['reports'])


def _csv_response(filename: str, rows: list[list[str]]) -> Response:
    output = io.StringIO()
    writer = csv.writer(output)
    for row in rows:
        writer.writerow(row)
    data = output.getvalue().encode('utf-8')
    return Response(
        content=data,
        media_type='text/csv; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


def _excel_response(filename: str, headers: list[str], rows: list[list[str]]) -> Response:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Reporte'
    sheet.append(headers)
    for row in rows:
        sheet.append(row)
    stream = io.BytesIO()
    workbook.save(stream)
    return Response(
        content=stream.getvalue(),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


def _pdf_response(filename: str, title: str, rows: list[list[str]]) -> Response:
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream, pagesize=letter)
    width, height = letter
    y = height - 40
    pdf.setFont('Helvetica-Bold', 13)
    pdf.drawString(40, y, title)
    y -= 18
    pdf.setFont('Helvetica', 9)
    pdf.drawString(40, y, f'Generado: {datetime.now(timezone.utc).isoformat()}')
    y -= 22

    for row in rows:
        line = ' | '.join(row)
        if y < 40:
            pdf.showPage()
            pdf.setFont('Helvetica', 9)
            y = height - 40
        pdf.drawString(40, y, line[:150])
        y -= 14
    pdf.save()

    return Response(
        content=stream.getvalue(),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.get('/inventory')
def export_inventory_report(
    format: str = Query(default='csv', pattern='^(csv|excel|pdf)$'),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('reports.export')),
):
    items = db.execute(select(Item).options(joinedload(Item.area)).order_by(Item.name.asc())).scalars().all()
    header = ['codigo', 'nombre', 'area', 'estado', 'disponible', 'total', 'minimo', 'barcode']
    rows = [
        [item.code, item.name, item.area.name if item.area else '-', item.status.value, str(item.quantity_available), str(item.quantity_total), str(item.min_stock), item.barcode_value]
        for item in items
    ]
    if format == 'csv':
        return _csv_response('inventory_report.csv', [header, *rows])
    if format == 'excel':
        return _excel_response('inventory_report.xlsx', header, rows)
    return _pdf_response('inventory_report.pdf', 'Reporte de inventario', [header, *rows])


@router.get('/rentals')
def export_rentals_report(
    format: str = Query(default='csv', pattern='^(csv|excel|pdf)$'),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('reports.export')),
):
    rentals = db.execute(
        select(Rental).options(joinedload(Rental.items).joinedload(RentalItem.item)).order_by(Rental.created_at.desc())
    ).scalars().unique().all()
    header = ['id', 'cliente', 'evento', 'salida', 'devolucion', 'estado', 'items', 'cantidad_total']
    rows: list[list[str]] = []
    for rental in rentals:
        total_qty = sum(item.quantity for item in rental.items)
        rows.append([
            str(rental.id),
            rental.client_name,
            rental.event_name or '-',
            str(rental.start_date),
            str(rental.due_date),
            rental.status.value,
            str(len(rental.items)),
            str(total_qty),
        ])
    if format == 'csv':
        return _csv_response('rentals_report.csv', [header, *rows])
    if format == 'excel':
        return _excel_response('rentals_report.xlsx', header, rows)
    return _pdf_response('rentals_report.pdf', 'Reporte de rentals', [header, *rows])


@router.get('/schedules', response_model=list[ScheduledReportRead])
def list_scheduled_reports(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('reports.schedule.manage')),
):
    return db.execute(select(ScheduledReport).order_by(ScheduledReport.created_at.desc())).scalars().all()


@router.post('/schedules', response_model=ScheduledReportRead)
def create_schedule(
    payload: ScheduledReportCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('reports.schedule.manage')),
):
    schedule = ScheduledReport(**payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put('/schedules/{schedule_id}', response_model=ScheduledReportRead)
def update_schedule(
    schedule_id: int,
    payload: ScheduledReportUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('reports.schedule.manage')),
):
    schedule = db.get(ScheduledReport, schedule_id)
    if not schedule:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail='Programación no encontrada.')
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(schedule, key, value)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.post('/schedules/{schedule_id}/run', response_model=ScheduledReportRead)
def run_schedule_now(
    schedule_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission('reports.schedule.manage')),
):
    schedule = db.get(ScheduledReport, schedule_id)
    if not schedule:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail='Programación no encontrada.')
    schedule.last_status = f'RUN_MANUAL ({schedule.report_type}/{schedule.report_format})'
    schedule.last_run_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(schedule)
    return schedule
