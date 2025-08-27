from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date
from . import models, schemas
from .auth import get_current_user, require_admin
from .database import get_db

router = APIRouter(prefix="/visits", tags=["visits"])

@router.post("/log", response_model=schemas.VisitOut)
def log_visit(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Log a visit for the current user"""
    today = date.today()
    current_month = today.strftime("%Y-%m")
    
    # Check if user already has a visit logged for today
    existing_visit = db.query(models.Visit).filter(
        and_(
            models.Visit.user_id == user.id,
            models.Visit.visit_date == today,
            models.Visit.is_deleted == False
        )
    ).first()
    
    if existing_visit:
        return existing_visit
    
    # Create new visit record
    visit = models.Visit(
        user_id=user.id,
        visit_date=today,
        visit_month=current_month
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit

@router.post("/increment-daily")
def increment_daily_visit(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Increment daily visit count when user saves a report"""
    today = date.today()
    current_month = today.strftime("%Y-%m")
    
    # Create a new visit record for each save action
    visit = models.Visit(
        user_id=user.id,
        visit_date=today,
        visit_month=current_month
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return {"message": "Daily visit incremented", "daily_visits": get_daily_visit_count(db, user.id)}

@router.post("/reset-daily")
def reset_daily_visits(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Reset daily visit count to 0 when user sends reports"""
    today = date.today()
    
    # Mark all today's visits as daily reset for this user
    today_visits = db.query(models.Visit).filter(
        and_(
            models.Visit.user_id == user.id,
            models.Visit.visit_date == today,
            models.Visit.is_deleted == False,
            models.Visit.daily_reset == False
        )
    ).all()
    
    for visit in today_visits:
        visit.daily_reset = True
    
    db.commit()
    return {"message": "Daily visits reset to 0", "daily_visits": 0}

def get_daily_visit_count(db: Session, user_id: int) -> int:
    """Helper function to get current daily visit count for a user"""
    today = date.today()
    return db.query(models.Visit).filter(
        and_(
            models.Visit.user_id == user_id,
            models.Visit.visit_date == today,
            models.Visit.is_deleted == False,
            models.Visit.daily_reset == False
        )
    ).count()

@router.get("/stats", response_model=schemas.VisitStats)
def get_visit_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Get visit statistics for the current user"""
    today = date.today()
    current_month = today.strftime("%Y-%m")
    
    # Daily visits (today only, excluding reset visits)
    daily_visits = db.query(models.Visit).filter(
        and_(
            models.Visit.user_id == user.id,
            models.Visit.visit_date == today,
            models.Visit.is_deleted == False,
            models.Visit.daily_reset == False
        )
    ).count()
    
    # Monthly visits (current month)
    monthly_visits = db.query(models.Visit).filter(
        and_(
            models.Visit.user_id == user.id,
            models.Visit.visit_month == current_month,
            models.Visit.is_deleted == False
        )
    ).count()
    
    # Total visits (all time)
    total_visits = db.query(models.Visit).filter(
        and_(
            models.Visit.user_id == user.id,
            models.Visit.is_deleted == False
        )
    ).count()
    
    return schemas.VisitStats(
        daily_visits=daily_visits,
        monthly_visits=monthly_visits,
        total_visits=total_visits
    )

@router.get("/admin/all", response_model=list[schemas.VisitOut])
def get_all_visits(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get all visit records for admin (including soft deleted)"""
    return db.query(models.Visit).order_by(models.Visit.created_at.desc()).all()

@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get overall visit statistics for admin"""
    today = date.today()
    current_month = today.strftime("%Y-%m")
    
    # Overall daily visits (today, excluding reset visits)
    daily_visits = db.query(models.Visit).filter(
        and_(
            models.Visit.visit_date == today,
            models.Visit.is_deleted == False,
            models.Visit.daily_reset == False
        )
    ).count()
    
    # Overall monthly visits (current month)
    monthly_visits = db.query(models.Visit).filter(
        and_(
            models.Visit.visit_month == current_month,
            models.Visit.is_deleted == False
        )
    ).count()
    
    # Total visits (all time)
    total_visits = db.query(models.Visit).filter(
        models.Visit.is_deleted == False
    ).count()
    
    # User breakdown
    user_stats = db.query(
        models.User.id,
        models.User.email,
        models.User.full_name,
        func.count(models.Visit.id).label('visit_count')
    ).outerjoin(
        models.Visit, and_(
            models.Visit.user_id == models.User.id,
            models.Visit.is_deleted == False
        )
    ).group_by(models.User.id, models.User.email, models.User.full_name).all()
    
    return {
        "daily_visits": daily_visits,
        "monthly_visits": monthly_visits,
        "total_visits": total_visits,
        "users": [
            {
                "id": stat.id,
                "email": stat.email,
                "full_name": stat.full_name,
                "visit_count": stat.visit_count
            } for stat in user_stats
        ]
    }

@router.delete("/admin/{visit_id}")
def soft_delete_visit(visit_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Soft delete a visit record (admin only)"""
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit.is_deleted = True
    visit.deleted_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Visit soft deleted successfully"}

@router.post("/admin/{visit_id}/restore")
def restore_visit(visit_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Restore a soft deleted visit record (admin only)"""
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit.is_deleted = False
    visit.deleted_at = None
    db.commit()
    
    return {"message": "Visit restored successfully"}