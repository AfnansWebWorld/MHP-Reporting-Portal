from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_current_user
from .database import get_db

router = APIRouter(prefix="/clients", tags=["clients"])

@router.get("/", response_model=list[schemas.ClientOut])
def list_clients(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role == models.Role.admin:
        # Admin can see all clients
        return db.query(models.Client).order_by(models.Client.name.asc()).all()
    else:
        # Regular users can only see their own clients
        return db.query(models.Client).filter(models.Client.user_id == user.id).order_by(models.Client.name.asc()).all()

from .auth import require_admin

@router.post("/", response_model=schemas.ClientOut)
def create_client(client_in: schemas.ClientCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        # Check if client name already exists for this user
        existing = db.query(models.Client).filter(
            models.Client.name == client_in.name,
            models.Client.user_id == user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Client with this name already exists for your account")
        
        # Log the incoming data for debugging
        print(f"Creating client with data: {client_in.dict()}")
        
        client = models.Client(
            name=client_in.name,
            phone=client_in.phone,
            phone2=client_in.phone2,
            address=client_in.address,
            city=client_in.city,
            store_name=client_in.store_name,
            user_id=user.id
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        return client
    except Exception as e:
        # Rollback the transaction in case of error
        db.rollback()
        # Log the error for debugging
        import traceback
        error_detail = f"Error creating client: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        # Raise a more informative HTTP exception
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/admin/all", response_model=list[schemas.ClientOut])
def list_all_clients_admin(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get all clients for admin interface with user information"""
    from sqlalchemy.orm import joinedload
    return db.query(models.Client).options(joinedload(models.Client.user)).order_by(models.Client.created_at.desc()).all()

@router.put("/{client_id}", response_model=schemas.ClientOut)
def update_client(client_id: int, client_in: schemas.ClientCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Update a client - admin can update any client, users can only update their own"""
    try:
        client = db.query(models.Client).filter(models.Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Check permissions
        if user.role != models.Role.admin and client.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this client")
        
        # Check if new name conflicts with existing client for the same user
        if client_in.name != client.name:
            existing = db.query(models.Client).filter(
                models.Client.name == client_in.name,
                models.Client.user_id == client.user_id,
                models.Client.id != client_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Client with this name already exists for this user")
        
        # Log the incoming data for debugging
        print(f"Updating client {client_id} with data: {client_in.dict()}")
        
        # Update client fields
        client.name = client_in.name
        client.phone = client_in.phone
        client.phone2 = client_in.phone2
        client.address = client_in.address
        client.city = client_in.city
        client.store_name = client_in.store_name
        
        db.commit()
        db.refresh(client)
        return client
    except Exception as e:
        # Rollback the transaction in case of error
        db.rollback()
        # Log the error for debugging
        import traceback
        error_detail = f"Error updating client {client_id}: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        # Raise a more informative HTTP exception
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Delete a client - admin can delete any client, users can only delete their own"""
    try:
        client = db.query(models.Client).filter(models.Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Check permissions
        if user.role != models.Role.admin and client.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this client")
        
        # Check if client has any reports
        reports_count = db.query(models.Report).filter(models.Report.client_id == client_id).count()
        if reports_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete client with {reports_count} existing reports")
        
        # Log the deletion for debugging
        print(f"Deleting client {client_id} (name: {client.name})")
        
        db.delete(client)
        db.commit()
        return {"message": "Client deleted successfully"}
    except Exception as e:
        # Rollback the transaction in case of error
        db.rollback()
        # Log the error for debugging
        import traceback
        error_detail = f"Error deleting client {client_id}: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        # Raise a more informative HTTP exception
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")