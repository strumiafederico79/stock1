from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import ControlType, ItemStatus, MovementType, RentalStatus, UserRole


class AreaBase(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    code_prefix: str = Field(min_length=2, max_length=8)


class AreaCreate(AreaBase):
    pass


class AreaRead(AreaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CategoryBase(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    area_id: int


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class LocationBase(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    area_id: int
    description: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationRead(LocationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    full_name: str = Field(min_length=2, max_length=120)
    role: UserRole = UserRole.OPERATOR
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)


class UserRead(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserRead


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class ItemBase(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    description: Optional[str] = None
    area_id: int
    category_id: Optional[int] = None
    location_id: Optional[int] = None
    brand: Optional[str] = Field(default=None, max_length=80)
    model: Optional[str] = Field(default=None, max_length=80)
    serial_number: Optional[str] = Field(default=None, max_length=120)
    control_type: ControlType = ControlType.SERIALIZED
    quantity_total: int = Field(default=1, ge=1)
    quantity_available: Optional[int] = Field(default=None, ge=0)
    unit: str = Field(default='u', max_length=20)
    status: ItemStatus = ItemStatus.AVAILABLE
    min_stock: int = Field(default=0, ge=0)
    code: Optional[str] = Field(default=None, max_length=50)
    barcode_value: Optional[str] = Field(default=None, max_length=80)
    barcode_type: Optional[str] = Field(default=None, max_length=20)
    qr_value: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=140)
    description: Optional[str] = None
    area_id: Optional[int] = None
    category_id: Optional[int] = None
    location_id: Optional[int] = None
    brand: Optional[str] = Field(default=None, max_length=80)
    model: Optional[str] = Field(default=None, max_length=80)
    serial_number: Optional[str] = Field(default=None, max_length=120)
    quantity_total: Optional[int] = Field(default=None, ge=1)
    quantity_available: Optional[int] = Field(default=None, ge=0)
    unit: Optional[str] = Field(default=None, max_length=20)
    status: Optional[ItemStatus] = None
    min_stock: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None


class ItemRead(ItemBase):
    id: int
    barcode_type: str
    barcode_value: str
    qr_value: str
    created_at: datetime
    updated_at: datetime
    area: AreaRead
    category: Optional[CategoryRead] = None
    location: Optional[LocationRead] = None
    model_config = ConfigDict(from_attributes=True)


class MovementCreate(BaseModel):
    item_id: int
    movement_type: MovementType
    quantity: int = Field(ge=1)
    origin_area_id: Optional[int] = None
    destination_area_id: Optional[int] = None
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    barcode_scanned: Optional[str] = None
    performed_by: Optional[str] = None
    notes: Optional[str] = None


class MovementRead(BaseModel):
    id: int
    item_id: int
    movement_type: MovementType
    quantity: int
    origin_area_id: Optional[int]
    destination_area_id: Optional[int]
    origin_location_id: Optional[int]
    destination_location_id: Optional[int]
    barcode_scanned: Optional[str]
    performed_by: Optional[str]
    performed_by_user_id: Optional[int] = None
    notes: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RentalBase(BaseModel):
    client_name: str = Field(min_length=2, max_length=120)
    event_name: Optional[str] = Field(default=None, max_length=160)
    start_date: date
    due_date: date
    responsible: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class RentalCreate(RentalBase):
    status: RentalStatus = RentalStatus.DRAFT


class RentalItemAdd(BaseModel):
    item_id: int
    quantity: int = Field(ge=1)
    unit_price: Optional[Decimal] = None
    performed_by: Optional[str] = None
    notes: Optional[str] = None


class RentalReturn(BaseModel):
    quantity: int = Field(ge=1)
    performed_by: Optional[str] = None
    notes: Optional[str] = None


class RentalItemRead(BaseModel):
    id: int
    item_id: int
    quantity: int
    returned_quantity: int
    checkout_status: str
    return_notes: Optional[str]
    unit_price: Optional[Decimal]
    item: ItemRead
    model_config = ConfigDict(from_attributes=True)


class RentalRead(RentalBase):
    id: int
    return_date: Optional[date]
    status: RentalStatus
    created_at: datetime
    items: list[RentalItemRead] = []
    model_config = ConfigDict(from_attributes=True)


class DashboardAreaStat(BaseModel):
    area_id: int
    area_name: str
    items_count: int
    units_available: int


class DashboardStatusStat(BaseModel):
    status: ItemStatus
    items_count: int


class DashboardSummary(BaseModel):
    total_items: int
    total_units: int
    total_available_units: int
    low_stock_items: int
    active_rentals: int
    maintenance_items: int
    by_area: list[DashboardAreaStat]
    by_status: list[DashboardStatusStat]
