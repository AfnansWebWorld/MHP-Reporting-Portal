from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_current_user
from .database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/", response_model=schemas.ReportOut)
def create_report(report_in: schemas.ReportCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    client = db.query(models.Client).filter(models.Client.id == report_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    report = models.Report(
        user_id=user.id,
        client_id=report_in.client_id,
        shift_timing=report_in.shift_timing,
        payment_received=report_in.payment_received
    )
    db.add(report)
    # increment user submissions counter
    db_user = db.query(models.User).filter(models.User.id == user.id).first()
    if db_user:
        db_user.submissions_count = (db_user.submissions_count or 0) + 1
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