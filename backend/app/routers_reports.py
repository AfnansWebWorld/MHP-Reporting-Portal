from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, datetime
from . import models, schemas
from .auth import get_current_user
from .database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/", response_model=schemas.ReportOut)
def create_report(report_in: schemas.ReportCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Ensure the client belongs to the current user (unless admin)
    if user.role == models.Role.admin:
        client = db.query(models.Client).filter(models.Client.id == report_in.client_id).first()
    else:
        client = db.query(models.Client).filter(
            models.Client.id == report_in.client_id,
            models.Client.user_id == user.id
        ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or not accessible")
    report = models.Report(
        user_id=user.id,
        client_id=report_in.client_id,
        shift_timing=report_in.shift_timing,
        payment_received=report_in.payment_received,
        payment_amount=report_in.payment_amount or 0.0,
        physician_sample=report_in.physician_sample or False,
        order_received=report_in.order_received or False
    )
    db.add(report)
    db.flush()  # Flush to get the report ID
    
    # Handle giveaway usage if provided
    if report_in.giveaway_usage:
        # Verify the giveaway assignment belongs to the user and has enough quantity
        assignment = db.query(models.GiveawayAssignment).filter(
            and_(
                models.GiveawayAssignment.id == report_in.giveaway_usage.giveaway_assignment_id,
                models.GiveawayAssignment.user_id == user.id,
                models.GiveawayAssignment.is_active == True
            )
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Giveaway assignment not found or not accessible")
        
        if assignment.quantity < report_in.giveaway_usage.quantity_used:
            raise HTTPException(status_code=400, detail="Insufficient giveaway quantity available")
        
        # Create giveaway usage record
        giveaway_usage = models.GiveawayUsage(
            report_id=report.id,
            giveaway_assignment_id=report_in.giveaway_usage.giveaway_assignment_id,
            quantity_used=report_in.giveaway_usage.quantity_used
        )
        db.add(giveaway_usage)
        
        # Update assignment quantity
        assignment.quantity -= report_in.giveaway_usage.quantity_used
        
        # If quantity reaches 0, mark assignment as inactive
        if assignment.quantity <= 0:
            assignment.is_active = False
    # increment user submissions counter
    db_user = db.query(models.User).filter(models.User.id == user.id).first()
    if db_user:
        db_user.submissions_count = (db_user.submissions_count or 0) + 1
    
    # Increment daily visit count when report is saved (create a new visit for each report)
    today = date.today()
    current_month = today.strftime("%Y-%m")
    
    # Create a new visit record for each report saved to increment daily count
    visit = models.Visit(
        user_id=user.id,
        visit_date=today,
        visit_month=current_month
    )
    db.add(visit)
    
    db.commit()
    db.refresh(report)
    return report

@router.get("/me", response_model=list[schemas.ReportOut])
def list_my_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return (
        db.query(models.Report)
        .filter(models.Report.user_id == user.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )

@router.delete("/me")
def clear_my_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Delete all reports for the current user (not admin records)"""
    deleted_count = db.query(models.Report).filter(models.Report.user_id == user.id).delete()
    db.commit()
    return {"message": f"Cleared {deleted_count} reports", "deleted_count": deleted_count}