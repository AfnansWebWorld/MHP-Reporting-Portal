import os
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, datetime
from typing import Optional
from . import models
from .auth import get_current_user, require_admin, check_outstation_access
from .database import get_db
from .reporting import generate_reports_pdf, generate_outstation_expense_pdf

router = APIRouter(prefix="/pdf", tags=["pdf"]) 

@router.get("/me", response_class=Response)
def get_my_pdf(report_date: Optional[str] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == user.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    
    # Use custom date if provided, otherwise use current date
    custom_date = None
    if report_date:
        try:
            custom_date = dt.strptime(report_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    pdf = generate_reports_pdf(user, reports, custom_date)
    
    # Generate dynamic filename with username and date (custom or current)
    today = custom_date or datetime.now()
    username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
    filename = f"{username}_{today.strftime('%d_%m_%Y')}.pdf"
    print(f"DEBUG: Generated filename: {filename}")
    print(f"DEBUG: User info - full_name: {user.full_name}, email: {user.email}")
    
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    print(f"DEBUG: Headers: {headers}")
    return Response(content=pdf, media_type="application/pdf", headers=headers)

from pydantic import BaseModel
from datetime import datetime as dt

class SavePDFRequest(BaseModel):
    report_date: Optional[str] = None

@router.post("/me/save")
def save_my_pdf(request: SavePDFRequest = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == user.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    
    if not reports:
        raise HTTPException(status_code=400, detail="No reports found to save")
    
    # Use custom date if provided, otherwise use current date
    custom_date = None
    if request and request.report_date:
        try:
            custom_date = dt.strptime(request.report_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    pdf = generate_reports_pdf(user, reports, custom_date)
    
    try:
        # Calculate aggregated payment data before deleting reports
        total_payment_amount = sum(report.payment_amount for report in reports if report.payment_received)
        total_reports_count = len(reports)
        
        # Generate dynamic filename with username and date (custom or current)
        today = custom_date or datetime.now()
        username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
        filename = f"{username}_{today.strftime('%d_%m_%Y')}.pdf"
        
        # Save PDF to database with aggregated payment data
        pdf_report = models.PDFReport(
            user_id=user.id,
            filename=filename,
            pdf_data=pdf,
            report_date=date.today(),
            file_size=len(pdf),
            total_payment_amount=total_payment_amount,
            total_reports_count=total_reports_count
        )
        db.add(pdf_report)
        
        # Delete all user reports after successful PDF save
        db.query(models.Report).filter(models.Report.user_id == user.id).delete()
        # Increment user's submission count
        user.submissions_count += 1
        
        # Reset only today's daily visits to 0 when reports are saved
        # Monthly visits should remain unaffected
        today_date = date.today()
        today_visits = db.query(models.Visit).filter(
            and_(
                models.Visit.user_id == user.id,
                models.Visit.visit_date == today_date,
                models.Visit.is_deleted == False,
                models.Visit.daily_reset == False
            )
        ).all()
        
        # Mark today's visits as daily reset, preserving monthly count
        for visit in today_visits:
            visit.daily_reset = True
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "saved", "filename": filename}

# Out Station Expense PDF endpoints
@router.get("/outstation", response_class=Response)
def get_outstation_expense_pdf(
    month: Optional[str] = None,
    db: Session = Depends(get_db), 
    user=Depends(check_outstation_access)
):
    """Generate PDF for out station expenses"""
    query = db.query(models.OutStationExpense).filter(models.OutStationExpense.user_id == user.id)
    
    # Filter by month if provided
    if month:
        query = query.filter(models.OutStationExpense.month == month)
    
    # Filter out test data entries
    query = query.filter(models.OutStationExpense.summary_of_activity != "Test activity summary")
    
    # Order by day of month
    expenses = query.order_by(models.OutStationExpense.day_of_month).all()
    
    if not expenses:
        raise HTTPException(status_code=404, detail="No out station expense reports found")
    
    pdf = generate_outstation_expense_pdf(user, expenses)
    
    # Generate dynamic filename with username and month
    month_str = month or expenses[0].month
    username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
    filename = f"{username}_OutStation_{month_str.replace(' ', '_')}.pdf"
    
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=pdf, media_type="application/pdf", headers=headers)


@router.post("/outstation/save")
def save_outstation_expense_pdf(
    month: Optional[str] = None,
    db: Session = Depends(get_db), 
    user=Depends(check_outstation_access)
):
    """Save PDF for out station expenses to database"""
    query = db.query(models.OutStationExpense).filter(models.OutStationExpense.user_id == user.id)
    
    # Filter by month if provided
    if month:
        query = query.filter(models.OutStationExpense.month == month)
    
    # Filter out test data entries
    query = query.filter(models.OutStationExpense.summary_of_activity != "Test activity summary")
    
    # Order by day of month
    expenses = query.order_by(models.OutStationExpense.day_of_month).all()
    
    if not expenses:
        raise HTTPException(status_code=404, detail="No out station expense reports found")
    
    pdf = generate_outstation_expense_pdf(user, expenses)
    
    try:
        # Generate dynamic filename with username and month
        month_str = month or expenses[0].month
        username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
        filename = f"{username}_OutStation_{month_str.replace(' ', '_')}.pdf"
        
        # Save PDF to database
        pdf_report = models.PDFReport(
            user_id=user.id,
            filename=filename,
            pdf_data=pdf,
            report_date=date.today(),
            file_size=len(pdf),
            report_type="outstation"
        )
        db.add(pdf_report)
        db.commit()
        db.refresh(pdf_report)
        
        # Update all expense records with the pdf_report_id
        for expense in expenses:
            expense.pdf_report_id = pdf_report.id
        db.commit()
        
        return {"status": "saved", "filename": filename}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/outstation/{pdf_id}", response_class=Response)
def get_outstation_pdf(pdf_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Download a specific outstation PDF report by ID"""
    pdf_report = db.query(models.PDFReport).filter(
        models.PDFReport.id == pdf_id,
        models.PDFReport.report_type == "outstation"
    ).first()
    
    if not pdf_report:
        raise HTTPException(status_code=404, detail="PDF report not found")
    
    # Check if user has access to this PDF (either it's their own or they're an admin)
    if pdf_report.user_id != user.id and user.role != models.Role.admin:
        raise HTTPException(status_code=403, detail="You don't have permission to access this PDF")
    
    headers = {"Content-Disposition": f"attachment; filename={pdf_report.filename}"}
    return Response(content=pdf_report.pdf_data, media_type="application/pdf", headers=headers)

@router.get("/admin/outstation/{user_id}")
def admin_get_user_outstation_pdf(
    user_id: int,
    month: Optional[str] = None,
    db: Session = Depends(get_db), 
    admin=Depends(require_admin)
):
    """Admin endpoint to get a user's out station expense PDF"""
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = db.query(models.OutStationExpense).filter(models.OutStationExpense.user_id == user_id)
    
    # Filter by month if provided
    if month:
        query = query.filter(models.OutStationExpense.month == month)
    
    # Filter out test data entries
    query = query.filter(models.OutStationExpense.summary_of_activity != "Test activity summary")
    
    # Order by day of month
    expenses = query.order_by(models.OutStationExpense.day_of_month).all()
    
    if not expenses:
        raise HTTPException(status_code=404, detail="No out station expense reports found for this user")
    
    pdf = generate_outstation_expense_pdf(user, expenses)
    
    # Generate dynamic filename with username and month
    month_str = month or expenses[0].month
    username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
    filename = f"{username}_OutStation_{month_str.replace(' ', '_')}.pdf"
    
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=pdf, media_type="application/pdf", headers=headers)


# Admin endpoints for managing saved PDFs
@router.get("/admin/all")
def get_all_saved_pdfs(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get all saved PDF reports for admin view"""
    pdf_reports = (
        db.query(models.PDFReport)
        .join(models.User)
        .order_by(models.PDFReport.created_at.desc())
        .all()
    )
    
    return [{
        "id": pdf.id,
        "filename": pdf.filename,
        "user_name": pdf.user.full_name or pdf.user.email,
        "user_email": pdf.user.email,
        "report_date": pdf.report_date.isoformat(),
        "created_at": pdf.created_at.isoformat(),
        "file_size": pdf.file_size,
        "report_type": pdf.report_type
    } for pdf in pdf_reports]

@router.get("/admin/download/{pdf_id}", response_class=Response)
def download_pdf(pdf_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Download a specific PDF report"""
    pdf_report = db.query(models.PDFReport).filter(models.PDFReport.id == pdf_id).first()
    
    if not pdf_report:
        raise HTTPException(status_code=404, detail="PDF report not found")
    
    headers = {"Content-Disposition": f"attachment; filename={pdf_report.filename}"}
    return Response(content=pdf_report.pdf_data, media_type="application/pdf", headers=headers)

@router.get("/admin/view/{pdf_id}", response_class=Response)
def view_pdf(pdf_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """View a specific PDF report in browser"""
    pdf_report = db.query(models.PDFReport).filter(models.PDFReport.id == pdf_id).first()
    
    if not pdf_report:
        raise HTTPException(status_code=404, detail="PDF report not found")
    
    return Response(content=pdf_report.pdf_data, media_type="application/pdf")

@router.get("/outstation/generate_monthly/", name="generate_outstation_monthly_pdf")
def generate_outstation_monthly_pdf(
    month: str,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """Generate a monthly PDF for outstation expenses (admin only)
    
    This endpoint allows admins to generate PDFs for a specific month,
    optionally filtered by user_id.
    """
    # Build the query
    query = db.query(models.OutStationExpense)
    
    # Filter by month (required)
    query = query.filter(models.OutStationExpense.month == month)
    
    # Filter out test data entries
    query = query.filter(models.OutStationExpense.summary_of_activity != "Test activity summary")
    
    # Filter by user if specified
    if user_id:
        # Check if user exists
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        query = query.filter(models.OutStationExpense.user_id == user_id)
    
    # Get expenses ordered by user and day
    expenses = query.order_by(
        models.OutStationExpense.user_id,
        models.OutStationExpense.day_of_month
    ).all()
    
    if not expenses:
        raise HTTPException(status_code=404, detail="No outstation expenses found for the specified criteria")
    
    try:
        # If filtering by user_id, generate a single user PDF
        if user_id:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            pdf = generate_outstation_expense_pdf(user, expenses)
            
            # Generate filename
            username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
            filename = f"{username}_OutStation_{month.replace(' ', '_')}.pdf"
            
            # Save PDF to database
            pdf_report = models.PDFReport(
                user_id=user.id,
                filename=filename,
                pdf_data=pdf,
                report_date=date.today(),
                file_size=len(pdf),
                report_type="outstation"
            )
            db.add(pdf_report)
            db.commit()
            db.refresh(pdf_report)
            
            # Update expense records with pdf_report_id
            for expense in expenses:
                expense.pdf_report_id = pdf_report.id
            db.commit()
            
            return {"status": "success", "pdf_id": pdf_report.id}
        
        # If no user_id specified, we need to generate PDFs for each user with expenses
        else:
            # Group expenses by user_id
            user_expenses = {}
            for expense in expenses:
                if expense.user_id not in user_expenses:
                    user_expenses[expense.user_id] = []
                user_expenses[expense.user_id].append(expense)
            
            # Generate and save PDF for each user
            pdf_ids = []
            for user_id, user_exps in user_expenses.items():
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if not user:
                    continue
                
                pdf = generate_outstation_expense_pdf(user, user_exps)
                
                # Generate filename
                username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
                filename = f"{username}_OutStation_{month.replace(' ', '_')}.pdf"
                
                # Save PDF to database
                pdf_report = models.PDFReport(
                    user_id=user.id,
                    filename=filename,
                    pdf_data=pdf,
                    report_date=date.today(),
                    file_size=len(pdf),
                    report_type="outstation"
                )
                db.add(pdf_report)
                db.commit()
                db.refresh(pdf_report)
                
                # Update expense records with pdf_report_id
                for expense in user_exps:
                    expense.pdf_report_id = pdf_report.id
                db.commit()
                
                pdf_ids.append(pdf_report.id)
            
            if not pdf_ids:
                raise HTTPException(status_code=404, detail="No PDFs could be generated")
            
            # Return the first PDF ID if multiple were generated
            return {"status": "success", "pdf_id": pdf_ids[0], "total_pdfs": len(pdf_ids)}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")