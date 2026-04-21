from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = 'ADMIN'
    OPERATOR = 'OPERATOR'


class ControlType(str, enum.Enum):
    SERIALIZED = 'SERIALIZED'
    QUANTITY = 'QUANTITY'


class ItemStatus(str, enum.Enum):
    AVAILABLE = 'AVAILABLE'
    RESERVED = 'RESERVED'
    RENTED = 'RENTED'
    MAINTENANCE = 'MAINTENANCE'
    DAMAGED = 'DAMAGED'
    OUT_OF_SERVICE = 'OUT_OF_SERVICE'


class MovementType(str, enum.Enum):
    IN = 'IN'
    OUT = 'OUT'
    TRANSFER = 'TRANSFER'
    RETURN = 'RETURN'
    MAINTENANCE = 'MAINTENANCE'
    ADJUSTMENT = 'ADJUSTMENT'
    RENTAL_OUT = 'RENTAL_OUT'
    STATUS_CHANGE = 'STATUS_CHANGE'


class RentalStatus(str, enum.Enum):
    DRAFT = 'DRAFT'
    ACTIVE = 'ACTIVE'
    PARTIAL_RETURN = 'PARTIAL_RETURN'
    CLOSED = 'CLOSED'
    CANCELLED = 'CANCELLED'


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.OPERATOR, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    movements: Mapped[list['Movement']] = relationship(back_populates='performed_by_user')


class Area(Base):
    __tablename__ = 'areas'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    code_prefix: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    categories: Mapped[list['Category']] = relationship(back_populates='area', cascade='all, delete-orphan')
    locations: Mapped[list['Location']] = relationship(back_populates='area', cascade='all, delete-orphan')
    items: Mapped[list['Item']] = relationship(back_populates='area')


class Category(Base):
    __tablename__ = 'categories'
    __table_args__ = (UniqueConstraint('area_id', 'name', name='uq_category_area_name'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    area_id: Mapped[int] = mapped_column(ForeignKey('areas.id', ondelete='CASCADE'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    area: Mapped[Area] = relationship(back_populates='categories')
    items: Mapped[list['Item']] = relationship(back_populates='category')


class Location(Base):
    __tablename__ = 'locations'
    __table_args__ = (UniqueConstraint('area_id', 'name', name='uq_location_area_name'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    area_id: Mapped[int] = mapped_column(ForeignKey('areas.id', ondelete='CASCADE'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    area: Mapped[Area] = relationship(back_populates='locations')
    items: Mapped[list['Item']] = relationship(back_populates='location')


class Item(Base):
    __tablename__ = 'items'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    area_id: Mapped[int] = mapped_column(ForeignKey('areas.id'), nullable=False)
    category_id: Mapped[int | None] = mapped_column(ForeignKey('categories.id'), nullable=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey('locations.id'), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(80), nullable=True)
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    control_type: Mapped[ControlType] = mapped_column(Enum(ControlType), default=ControlType.SERIALIZED, nullable=False)
    quantity_total: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    quantity_available: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default='u', nullable=False)
    status: Mapped[ItemStatus] = mapped_column(Enum(ItemStatus), default=ItemStatus.AVAILABLE, nullable=False)
    min_stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    barcode_value: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    barcode_type: Mapped[str] = mapped_column(String(20), default='CODE128', nullable=False)
    qr_value: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    area: Mapped[Area] = relationship(back_populates='items')
    category: Mapped[Category | None] = relationship(back_populates='items')
    location: Mapped[Location | None] = relationship(back_populates='items')
    movements: Mapped[list['Movement']] = relationship(back_populates='item', cascade='all, delete-orphan')
    rental_items: Mapped[list['RentalItem']] = relationship(back_populates='item')


class Movement(Base):
    __tablename__ = 'movements'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey('items.id', ondelete='CASCADE'), nullable=False)
    movement_type: Mapped[MovementType] = mapped_column(Enum(MovementType), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    origin_area_id: Mapped[int | None] = mapped_column(ForeignKey('areas.id'), nullable=True)
    destination_area_id: Mapped[int | None] = mapped_column(ForeignKey('areas.id'), nullable=True)
    origin_location_id: Mapped[int | None] = mapped_column(ForeignKey('locations.id'), nullable=True)
    destination_location_id: Mapped[int | None] = mapped_column(ForeignKey('locations.id'), nullable=True)
    barcode_scanned: Mapped[str | None] = mapped_column(String(80), nullable=True)
    performed_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    performed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    item: Mapped[Item] = relationship(back_populates='movements')
    performed_by_user: Mapped[User | None] = relationship(back_populates='movements')


class Rental(Base):
    __tablename__ = 'rentals'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_name: Mapped[str] = mapped_column(String(120), nullable=False)
    event_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    responsible: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[RentalStatus] = mapped_column(Enum(RentalStatus), default=RentalStatus.DRAFT, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list['RentalItem']] = relationship(back_populates='rental', cascade='all, delete-orphan')


class RentalItem(Base):
    __tablename__ = 'rental_items'
    __table_args__ = (UniqueConstraint('rental_id', 'item_id', name='uq_rental_item'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rental_id: Mapped[int] = mapped_column(ForeignKey('rentals.id', ondelete='CASCADE'), nullable=False)
    item_id: Mapped[int] = mapped_column(ForeignKey('items.id', ondelete='CASCADE'), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    returned_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checkout_status: Mapped[str] = mapped_column(String(80), default='CHECKED_OUT', nullable=False)
    return_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    rental: Mapped[Rental] = relationship(back_populates='items')
    item: Mapped[Item] = relationship(back_populates='rental_items')
