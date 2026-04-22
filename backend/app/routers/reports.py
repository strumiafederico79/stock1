import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Item, Rental, RentalItem, User

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
    table_rows = ''.join(
        f"<tr>{''.join(f'<td>{cell}</td>' for cell in row)}</tr>"
        for row in rows
    )
    html = f"<table><tr>{''.join(f'<th>{h}</th>' for h in headers)}</tr>{table_rows}</table>"
    return Response(
        content=html.encode('utf-8'),
        media_type='application/vnd.ms-excel',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


def _pdf_like_response(filename: str, title: str, rows: list[list[str]]) -> Response:
    content = [title, f'Generado: {datetime.now(timezone.utc).isoformat()}', '']
    content.extend(' | '.join(row) for row in rows)
    return Response(
        content='\n'.join(content).encode('utf-8'),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.get('/inventory')
def export_inventory_report(
    format: str = Query(default='csv', pattern='^(csv|excel|pdf)$'),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
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
        return _excel_response('inventory_report.xls', header, rows)
    return _pdf_like_response('inventory_report.pdf', 'Reporte de inventario', [header, *rows])


@router.get('/rentals')
def export_rentals_report(
    format: str = Query(default='csv', pattern='^(csv|excel|pdf)$'),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
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
        return _excel_response('rentals_report.xls', header, rows)
    return _pdf_like_response('rentals_report.pdf', 'Reporte de rentals', [header, *rows])
