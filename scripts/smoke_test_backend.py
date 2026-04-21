#!/usr/bin/env python3
"""Smoke test local del backend usando SQLite temporal."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path


def main() -> None:
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'

    root = Path(__file__).resolve().parents[1] / 'backend'
    sys.path.insert(0, str(root))

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as client:
        health = client.get('/health')
        assert health.status_code == 200, health.text

        areas = client.get('/api/v1/catalogs/areas')
        assert areas.status_code == 200, areas.text
        areas_data = areas.json()
        assert areas_data, 'No se seedearon áreas'

        area_id = areas_data[0]['id']
        second_area_id = areas_data[1]['id']
        categories = client.get(f'/api/v1/catalogs/categories?area_id={area_id}').json()
        locations = client.get(f'/api/v1/catalogs/locations?area_id={area_id}').json()
        second_area_locations = client.get(f'/api/v1/catalogs/locations?area_id={second_area_id}').json()

        item = client.post(
            '/api/v1/items',
            json={
                'name': 'Smoke Test Item',
                'area_id': area_id,
                'category_id': categories[0]['id'],
                'location_id': locations[0]['id'],
                'control_type': 'SERIALIZED',
                'status': 'AVAILABLE',
            },
        )
        assert item.status_code == 201, item.text
        item_data = item.json()

        barcode = client.get(f"/api/v1/items/{item_data['id']}/barcode.png")
        assert barcode.status_code == 200, barcode.text

        movement = client.post(
            '/api/v1/movements',
            json={
                'item_id': item_data['id'],
                'movement_type': 'TRANSFER',
                'quantity': 1,
                'destination_location_id': second_area_locations[0]['id'],
            },
        )
        assert movement.status_code == 201, movement.text

        moved_item = client.get(f"/api/v1/items/{item_data['id']}")
        assert moved_item.status_code == 200, moved_item.text
        moved = moved_item.json()
        assert moved['area_id'] == second_area_id, moved
        assert moved['location_id'] == second_area_locations[0]['id'], moved
        assert moved['category_id'] is None, moved

        maintenance = client.post(
            '/api/v1/movements',
            json={
                'item_id': item_data['id'],
                'movement_type': 'MAINTENANCE',
                'quantity': 1,
                'origin_area_id': second_area_id,
                'origin_location_id': second_area_locations[0]['id'],
            },
        )
        assert maintenance.status_code == 201, maintenance.text

        rental = client.post(
            '/api/v1/rentals',
            json={
                'client_name': 'Cliente Test',
                'event_name': 'Evento Test',
                'start_date': '2026-04-13',
                'due_date': '2026-04-14',
            },
        )
        assert rental.status_code == 201, rental.text

    Path(db_path).unlink(missing_ok=True)
    print('Smoke test OK')


if __name__ == '__main__':
    main()
