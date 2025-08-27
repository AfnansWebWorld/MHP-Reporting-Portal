import os
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, datetime
from . import models
from .auth import get_current_user
from .database import get_db
from .reporting import generate_reports_pdf
from .emailer import send_pdf

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

@router.post("/me/send")
def send_my_pdf(db: Session = Depends(get_db), user=Depends(get_current_user)):
    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == user.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    pdf = generate_reports_pdf(user, reports)
    try:
        # Generate dynamic filename with username and current date
        today = datetime.now()
        username = (user.full_name or user.email.split('@')[0]).replace(' ', '')
        filename = f"{username}_{today.strftime('%d_%m_%Y')}.pdf"
        
        send_pdf(os.getenv("SEND_EMAIL_TO", "afnanhybrid@gmail.com"), subject="MHP Reports", text="Attached are the latest reports.", pdf_bytes=pdf, filename=filename)
        # Delete all user reports after successful email send
        db.query(models.Report).filter(models.Report.user_id == user.id).delete()
        # Increment user's submission count
        user.submissions_count += 1
        
        # Reset only today's daily visits to 0 when reports are sent
        # Monthly visits should remain unaffected
        today = date.today()
        today_visits = db.query(models.Visit).filter(
            and_(
                models.Visit.user_id == user.id,
                models.Visit.visit_date == today,
                models.Visit.is_deleted == False,
                models.Visit.daily_reset == False
            )
        ).all()
        
        # Mark today's visits as daily reset, preserving monthly count
        for visit in today_visits:
            visit.daily_reset = True
        
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "sent"}