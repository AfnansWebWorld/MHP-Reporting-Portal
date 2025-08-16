from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class Role(str, Enum):
    admin = "admin"
    user = "user"

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Role = Role.user

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    submissions_count: int | None = 0

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
    address: str

class ClientCreate(ClientBase):
    pass

class ClientOut(ClientBase):
    id: int

    class Config:
        from_attributes = True

class ReportBase(BaseModel):
    client_id: int
    shift_timing: str
    payment_received: bool

class ReportCreate(ReportBase):
    pass

class ReportOut(ReportBase):
    id: int
    user_id: int
    created_at: datetime
    client: ClientOut

    class Config:
        from_attributes = True