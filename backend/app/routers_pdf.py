import os
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
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
    headers = {"Content-Disposition": "attachment; filename=reports.pdf"}
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
        send_pdf(os.getenv("SEND_EMAIL_TO", "afnanhybrid@gmail.com"), subject="MHP Reports", text="Attached are the latest reports.", pdf_bytes=pdf)
        # Delete all user reports after successful email send
        db.query(models.Report).filter(models.Report.user_id == user.id).delete()
        # Increment user's submission count
        user.submissions_count += 1
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "sent"}