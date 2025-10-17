from pydantic import BaseModel, field_validator
from pydantic import validator  # Fallback for older Pydantic versions
from typing import Optional, List, Union
from datetime import datetime, date
from enum import Enum

class Role(str, Enum):
    admin = "admin"
    user = "user"
    
class StationType(str, Enum):
    base_station = "Base Station"
    ex = "Ex."
    night_stay = "Night Stay"
    
class TravellingType(str, Enum):
    one_way = "1-way"
    two_way = "2-way"

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    designation: Optional[str] = None
    role: Role = Role.user
    has_outstation_access: Optional[bool] = False

    @property
    def role_value(self) -> str:
        """Get the string value of the role"""
        return self.role.value

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    designation: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    submissions_count: Optional[int] = 0
    has_outstation_access: bool = False
    role: str  # Override to ensure string serialization

    class Config:
        from_attributes = True
    
    @field_validator('role', mode='before')
    def convert_role_to_string(cls, v):
        """Convert Role enum to string"""
        if hasattr(v, 'value'):
            return v.value
        return str(v)
    
    # Fallback for older Pydantic versions
    @validator('role', pre=True)
    def convert_role_to_string_fallback(cls, v):
        """Convert Role enum to string (fallback)"""
        if hasattr(v, 'value'):
            return v.value
        return str(v)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: int
    role: Role
    
class ClientAssignmentBase(BaseModel):
    client_id: int
    junior_id: int
    manager_id: int
    
class ClientAssignmentCreate(ClientAssignmentBase):
    pass
    
class ClientAssignmentOut(ClientAssignmentBase):
    id: int
    assigned_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True
        
class ClientAccessLogBase(BaseModel):
    client_id: int
    action_type: str
    details: Optional[str] = None
    
class ClientAccessLogCreate(ClientAccessLogBase):
    pass
    
class ClientAccessLogOut(ClientAccessLogBase):
    id: int
    user_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    name: str
    phone: str
    phone2: Optional[str] = None  # Optional second phone number
    address: str
    city: str
    store_name: Optional[str] = None  # Optional store name

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    store_name: Optional[str] = None

class ClientOut(ClientBase):
    id: int
    user_id: int
    created_at: datetime
    user: Optional['UserOut'] = None
    is_assigned: bool = False
    assigned_by: Optional[str] = None

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
    
    class Config:
        from_attributes = True
        
# Out Station Expense schemas
class OutStationExpenseBase(BaseModel):
    day: date
    station: StationType
    travelling: TravellingType
    km_travelled: float
    csr_verified: str
    summary_of_activity: str

class OutStationExpenseCreate(OutStationExpenseBase):
    pass

class OutStationExpenseOut(OutStationExpenseBase):
    id: int
    user_id: int
    day_of_month: int
    month: str
    created_at: datetime
    pdf_report_id: Optional[int] = None
    station: str  # Override to ensure string serialization
    travelling: str  # Override to ensure string serialization
    
    class Config:
        from_attributes = True
        json_encoders = {
            date: lambda v: v.isoformat()
        }
    
    @field_validator('station', mode='before')
    def convert_station_to_string(cls, v):
        """Convert StationType enum to string"""
        if hasattr(v, 'value'):
            return v.value
        return str(v)
    
    @field_validator('travelling', mode='before')
    def convert_travelling_to_string(cls, v):
        """Convert TravellingType enum to string"""
        if hasattr(v, 'value'):
            return v.value
        return str(v)
    
    # Fallback for older Pydantic versions
    @validator('station', pre=True)
    def convert_station_to_string_fallback(cls, v):
        """Convert StationType enum to string (fallback)"""
        if hasattr(v, 'value'):
            return v.value
        return str(v)
    
    @validator('travelling', pre=True)
    def convert_travelling_to_string_fallback(cls, v):
        """Convert TravellingType enum to string (fallback)"""
        if hasattr(v, 'value'):
            return v.value
        return str(v)

class OutStationExpensePermissionUpdate(BaseModel):
    user_id: int
    has_outstation_access: bool
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