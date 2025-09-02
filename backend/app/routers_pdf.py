import os
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, datetime
from . import models
from .auth import get_current_user, require_admin
from .database import get_db
from .reporting import generate_reports_pdf

router = APIRouter(prefix="/pdf", tags=["pdf"]) 

@router.get("/me", response_class=Response)
def get_my_pdf(db: Session = Depends(get_db), user=Depends(get_current_user)):
    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == user.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    pdf = generate_reports_pdf(user, reports)
    
    # Generate dynamic filename with username and current date
    today = datetime.now()
    username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
    filename = f"{username}_{today.strftime('%d_%m_%Y')}.pdf"
    print(f"DEBUG: Generated filename: {filename}")
    print(f"DEBUG: User info - full_name: {user.full_name}, email: {user.email}")
    
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    print(f"DEBUG: Headers: {headers}")
    return Response(content=pdf, media_type="application/pdf", headers=headers)

@router.post("/me/save")
def save_my_pdf(db: Session = Depends(get_db), user=Depends(get_current_user)):
    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == user.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    
    if not reports:
        raise HTTPException(status_code=400, detail="No reports found to save")
    
    pdf = generate_reports_pdf(user, reports)
    
    try:
        # Generate dynamic filename with username and current date
        today = datetime.now()
        username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
        filename = f"{username}_{today.strftime('%d_%m_%Y')}.pdf"
        
        # Save PDF to database
        pdf_report = models.PDFReport(
            user_id=user.id,
            filename=filename,
            pdf_data=pdf,
            report_date=date.today(),
            file_size=len(pdf)
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
        "file_size": pdf.file_size
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