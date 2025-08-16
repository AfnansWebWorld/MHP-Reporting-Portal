from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_current_user
from .database import get_db

router = APIRouter(prefix="/clients", tags=["clients"])

@router.get("/", response_model=list[schemas.ClientOut])
def list_clients(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Client).order_by(models.Client.name.asc()).all()

from .auth import require_admin

@router.post("/", response_model=schemas.ClientOut)
def create_client(client_in: schemas.ClientCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    existing = db.query(models.Client).filter(models.Client.name == client_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Client with this name already exists")
    client = models.Client(name=client_in.name, phone=client_in.phone, address=client_in.address)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client