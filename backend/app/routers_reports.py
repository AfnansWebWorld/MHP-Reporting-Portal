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
    # Note: submissions_count is now incremented only when reports are sent via email
    # This was moved to /pdf/me/send endpoint to match user requirements
    
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

@router.put("/{report_id}", response_model=schemas.ReportOut)
def update_report(report_id: int, report_in: schemas.ReportCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Update a specific report"""
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
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
    
    # Update report fields
    report.client_id = report_in.client_id
    report.shift_timing = report_in.shift_timing
    report.payment_received = report_in.payment_received
    report.payment_amount = report_in.payment_amount or 0.0
    report.physician_sample = report_in.physician_sample or False
    report.order_received = report_in.order_received or False
    
    # Handle giveaway usage if provided
    if report_in.giveaway_usage:
        # First, check if there's an existing giveaway usage for this report
        existing_usage = db.query(models.GiveawayUsage).filter(
            models.GiveawayUsage.report_id == report.id
        ).first()
        
        # If there's existing usage, restore the quantity to the original assignment
        if existing_usage:
            old_assignment = db.query(models.GiveawayAssignment).filter(
                models.GiveawayAssignment.id == existing_usage.giveaway_assignment_id
            ).first()
            if old_assignment:
                old_assignment.quantity += existing_usage.quantity_used
                if old_assignment.quantity > 0:
                    old_assignment.is_active = True
            db.delete(existing_usage)
        
        # Verify the new giveaway assignment belongs to the user and has enough quantity
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
        
        # Create new giveaway usage record
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
    else:
        # If no giveaway usage provided, remove any existing usage
        existing_usage = db.query(models.GiveawayUsage).filter(
            models.GiveawayUsage.report_id == report.id
        ).first()
        
        if existing_usage:
            # Restore quantity to the assignment
            old_assignment = db.query(models.GiveawayAssignment).filter(
                models.GiveawayAssignment.id == existing_usage.giveaway_assignment_id
            ).first()
            if old_assignment:
                old_assignment.quantity += existing_usage.quantity_used
                if old_assignment.quantity > 0:
                    old_assignment.is_active = True
            db.delete(existing_usage)
    
    db.commit()
    db.refresh(report)
    return report

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Delete a specific report"""
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete associated giveaway usage records first
    db.query(models.GiveawayUsage).filter(models.GiveawayUsage.report_id == report_id).delete()
    
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}

@router.delete("/me")
def clear_my_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Delete all reports for the current user (not admin records)"""
    deleted_count = db.query(models.Report).filter(models.Report.user_id == user.id).delete()
    db.commit()
    return {"message": f"Cleared {deleted_count} reports", "deleted_count": deleted_count}