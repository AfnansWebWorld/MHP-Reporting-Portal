from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import calendar

from . import models, schemas, auth
from .database import get_db

router = APIRouter(
    prefix="/outstation",
    tags=["outstation"]
)


@router.get("/check-access")
def check_access(current_user: models.User = Depends(auth.check_outstation_access)):
    """Check if the current user has access to outstation expense feature"""
    return {"has_access": True}


@router.post("/expenses", response_model=schemas.OutStationExpenseOut)
def create_outstation_expense(expense: schemas.OutStationExpenseCreate, 
                             db: Session = Depends(get_db),
                             current_user: models.User = Depends(auth.check_outstation_access)):
    """Create a new out station expense report"""
    
    # Calculate day of month and month string
    day_of_month = expense.day.day
    month = expense.day.strftime("%B %Y")
    
    # Convert string enum values to model enum values
    station_value = models.StationType(expense.station.value)
    travelling_value = models.TravellingType(expense.travelling.value)
    
    # Create the expense record without PDF report initially
    db_expense = models.OutStationExpense(
        user_id=current_user.id,
        day=expense.day,
        day_of_month=day_of_month,
        month=month,
        station=station_value,
        travelling=travelling_value,
        km_travelled=expense.km_travelled,
        csr_verified=expense.csr_verified,
        summary_of_activity=expense.summary_of_activity,
        created_at=datetime.now()
    )
    
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    return db_expense


@router.get("/expenses", response_model=List[schemas.OutStationExpenseOut])
def get_outstation_expenses(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.check_outstation_access)
):
    """Get all out station expenses for the current user"""
    
    query = db.query(models.OutStationExpense).filter(models.OutStationExpense.user_id == current_user.id)
    
    # Filter by month if provided
    if month:
        query = query.filter(models.OutStationExpense.month == month)
    
    # Order by day of month
    expenses = query.order_by(models.OutStationExpense.day_of_month).all()
    
    return expenses


@router.get("/expenses/{expense_id}", response_model=schemas.OutStationExpenseOut)
def get_outstation_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.check_outstation_access)
):
    """Get a specific out station expense by ID"""
    
    expense = db.query(models.OutStationExpense).filter(
        models.OutStationExpense.id == expense_id
    ).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    # Check if the expense belongs to the current user or user is admin
    if expense.user_id != current_user.id and current_user.role != models.Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this expense report"
        )
    
    return expense


@router.get("/months", response_model=List[str])
def get_available_months(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.check_outstation_access)
):
    """Get all available months for which the user has expense reports"""
    
    # Query distinct months
    months = db.query(models.OutStationExpense.month).filter(
        models.OutStationExpense.user_id == current_user.id
    ).distinct().all()
    
    # Extract month strings from result tuples
    return [month[0] for month in months]


# Admin endpoints
@router.get("/admin/expenses", response_model=List[schemas.OutStationExpenseOut])
def admin_get_all_expenses(
    user_id: Optional[int] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Admin endpoint to get all out station expenses"""
    
    query = db.query(models.OutStationExpense)
    
    # Filter by user_id if provided
    if user_id:
        query = query.filter(models.OutStationExpense.user_id == user_id)
    
    # Filter by month if provided
    if month:
        query = query.filter(models.OutStationExpense.month == month)
    
    # Filter out test data entries
    query = query.filter(models.OutStationExpense.summary_of_activity != "Test activity summary")
    
    # Order by user_id, month, and day_of_month
    expenses = query.order_by(
        models.OutStationExpense.user_id,
        models.OutStationExpense.month,
        models.OutStationExpense.day_of_month
    ).all()
    
    return expenses


@router.get("/admin/months", response_model=List[str])
def admin_get_all_months(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Admin endpoint to get all available months across all users"""
    
    # Query distinct months
    months = db.query(models.OutStationExpense.month).distinct().all()
    
    # Extract month strings from result tuples
    return [month[0] for month in months]


@router.put("/admin/user-permission", response_model=schemas.UserOut)
def update_user_outstation_permission(
    permission: schemas.OutStationExpensePermissionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Admin endpoint to update a user's outstation access permission"""
    
    user = db.query(models.User).filter(models.User.id == permission.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.has_outstation_access = permission.has_outstation_access
    db.commit()
    db.refresh(user)
    
    return user