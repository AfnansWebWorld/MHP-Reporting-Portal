from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from . import models, schemas
from .auth import require_admin
from .database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(models.User).all()

@router.get("/users/{user_id}/reports", response_model=list[schemas.ReportOut])
def list_user_reports(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    return (
        db.query(models.Report)
        .filter(models.Report.user_id == user_id)
        .order_by(models.Report.created_at.desc())
        .all()
    )

@router.get("/stats")
def stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    data = db.query(models.User).all()
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "count": u.submissions_count if hasattr(u, 'submissions_count') else len(u.reports)
            } for u in data
        ]
    }