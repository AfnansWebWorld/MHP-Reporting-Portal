from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime, date
from enum import Enum

class Role(str, Enum):
    admin = "admin"
    user = "user"

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: Role = Role.user

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    submissions_count: Optional[int] = 0

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: int
    role: Role

class ClientBase(BaseModel):
    name: str
    phone: str
    phone2: Optional[str] = None  # Optional second phone number
    address: str
    city: str
    store_name: Optional[str] = None  # Optional store name

class ClientCreate(ClientBase):
    pass

class ClientOut(ClientBase):
    id: int
    user_id: int
    created_at: datetime
    user: Optional['UserOut'] = None

    class Config:
        from_attributes = True

class ReportBase(BaseModel):
    client_id: int
    shift_timing: str
    payment_received: bool
    payment_amount: Optional[float] = 0.0
    physician_sample: Optional[bool] = False
    order_received: Optional[bool] = False

class GiveawayUsageCreate(BaseModel):
    giveaway_assignment_id: int
    quantity_used: int

class ReportCreate(ReportBase):
    giveaway_usage: Optional[GiveawayUsageCreate] = None

class GiveawayUsageOut(BaseModel):
    id: int
    report_id: int
    giveaway_assignment_id: int
    quantity_used: int
    created_at: datetime
    giveaway_assignment: Optional['GiveawayAssignmentOut'] = None

    class Config:
        from_attributes = True

class ReportOut(ReportBase):
    id: int
    user_id: int
    created_at: datetime
    client: ClientOut
    payment_amount: float
    physician_sample: bool
    order_received: bool
    giveaway_usages: Optional[List['GiveawayUsageOut']] = []

    class Config:
        from_attributes = True

class VisitBase(BaseModel):
    visit_date: Optional[str] = None
    visit_month: Optional[str] = None

class VisitCreate(VisitBase):
    pass

class VisitOut(VisitBase):
    id: int
    user_id: int
    visit_date: Union[date, str]
    visit_month: str
    created_at: datetime
    is_deleted: bool

    class Config:
        from_attributes = True
        json_encoders = {
            date: lambda v: v.isoformat()
        }

class VisitStats(BaseModel):
    daily_visits: int  # Represents Daily Calls in the frontend
    monthly_visits: int  # Represents Monthly Calls in the frontend
    total_visits: int  # Used for internal tracking

class GiveawayBase(BaseModel):
    name: str

class GiveawayCreate(GiveawayBase):
    pass

class GiveawayOut(GiveawayBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class GiveawayAssignmentBase(BaseModel):
    user_id: int
    giveaway_id: int
    quantity: int

class GiveawayAssignmentCreate(GiveawayAssignmentBase):
    pass

class GiveawayAssignmentOut(GiveawayAssignmentBase):
    id: int
    assigned_by: int
    assigned_at: datetime
    is_active: bool
    user: Optional['UserOut'] = None
    giveaway: Optional['GiveawayOut'] = None
    admin: Optional['UserOut'] = None

    class Config:
        from_attributes = True

# Resolve forward references
ClientOut.model_rebuild()
GiveawayAssignmentOut.model_rebuild()
GiveawayUsageOut.model_rebuild()
ReportOut.model_rebuild()