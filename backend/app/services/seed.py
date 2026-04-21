from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Area, Category, Location, User, UserRole
from app.security import hash_password

DEFAULT_AREAS = [
    ('Sonido', 'SON'),
    ('Iluminacion', 'ILU'),
    ('Pantalla', 'PAN'),
    ('Layher', 'LAY'),
    ('Extras', 'EXT'),
    ('Rental', 'RNT'),
]

DEFAULT_CATEGORIES = {
    'SON': ['Consolas', 'Parlantes', 'Subs', 'Microfonos', 'Cables'],
    'ILU': ['Cabezales', 'Par LED', 'Consolas DMX', 'Hazer', 'Accesorios'],
    'PAN': ['Modulos LED', 'Procesadores', 'Cables de datos', 'Estructuras'],
    'LAY': ['Torres', 'Plataformas', 'Bases', 'Accesorios'],
    'EXT': ['Herramientas', 'Routers', 'Handys', 'Varios'],
    'RNT': ['Eventos', 'Clientes', 'Logistica'],
}

DEFAULT_LOCATIONS = {
    'SON': ['Deposito Sonido', 'Rack A', 'Rack B'],
    'ILU': ['Deposito Iluminacion', 'Flightcase ILU 1'],
    'PAN': ['Deposito Pantalla', 'Case LED 1'],
    'LAY': ['Patio Layher'],
    'EXT': ['Deposito General'],
    'RNT': ['Preparacion Rental'],
}


def seed_reference_data(db: Session) -> None:
    settings = get_settings()

    admin_exists = db.execute(select(User).where(User.username == settings.default_admin_username)).scalar_one_or_none()
    if not admin_exists:
        db.add(
            User(
                username=settings.default_admin_username,
                full_name=settings.default_admin_full_name,
                password_hash=hash_password(settings.default_admin_password),
                role=UserRole.ADMIN,
                is_active=True,
            )
        )
        db.commit()

    existing = db.execute(select(Area)).scalars().all()
    if existing:
        return

    area_map: dict[str, Area] = {}
    for name, prefix in DEFAULT_AREAS:
        area = Area(name=name, code_prefix=prefix)
        db.add(area)
        area_map[prefix] = area
    db.flush()

    for prefix, categories in DEFAULT_CATEGORIES.items():
        area = area_map[prefix]
        for category_name in categories:
            db.add(Category(name=category_name, area_id=area.id))

    for prefix, locations in DEFAULT_LOCATIONS.items():
        area = area_map[prefix]
        for location_name in locations:
            db.add(Location(name=location_name, area_id=area.id))

    db.commit()
