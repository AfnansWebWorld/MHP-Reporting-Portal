from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, Date, Float
from sqlalchemy.orm import relationship
from datetime import datetime, date
from .database import Base
import enum

class Role(enum.Enum):
    admin = "admin"
    user = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), default=Role.user, nullable=False)
    is_active = Column(Boolean, default=True)
    submissions_count = Column(Integer, default=0)
    reports = relationship("Report", back_populates="user")
    visits = relationship("Visit", back_populates="user")
    clients = relationship("Client", back_populates="user")

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    reports = relationship("Report", back_populates="client")
    user = relationship("User", back_populates="clients")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    shift_timing = Column(String, nullable=False)  # Morning or Evening
    payment_received = Column(Boolean, default=False)
    payment_amount = Column(Float, default=0.0)  # Amount received for payment
    physician_sample = Column(Boolean, default=False)  # Physician Sample (p/s)
    order_received = Column(Boolean, default=False)  # Order Received
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    client = relationship("Client", back_populates="reports")
    giveaway_usages = relationship("GiveawayUsage", back_populates="report")

class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    visit_date = Column(Date, default=date.today, nullable=False)
    visit_month = Column(String, nullable=False)  # Format: YYYY-MM
    created_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)  # Soft delete flag
    deleted_at = Column(DateTime, nullable=True)
    daily_reset = Column(Boolean, default=False)  # Flag to track if daily count was reset

    user = relationship("User", back_populates="visits")

class Giveaway(Base):
    __tablename__ = "giveaways"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    assignments = relationship("GiveawayAssignment", back_populates="giveaway")

class GiveawayAssignment(Base):
    __tablename__ = "giveaway_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    giveaway_id = Column(Integer, ForeignKey("giveaways.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Admin who assigned
    assigned_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    user = relationship("User", foreign_keys=[user_id])
    giveaway = relationship("Giveaway", back_populates="assignments")
    admin = relationship("User", foreign_keys=[assigned_by])

class GiveawayUsage(Base):
    __tablename__ = "giveaway_usages"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    giveaway_assignment_id = Column(Integer, ForeignKey("giveaway_assignments.id"), nullable=False)
    quantity_used = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    report = relationship("Report", back_populates="giveaway_usages")
    giveaway_assignment = relationship("GiveawayAssignment")