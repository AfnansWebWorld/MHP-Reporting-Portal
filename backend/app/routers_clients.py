from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas
from .database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])

@router.get("/", response_model=List[schemas.ClientOut])
def list_clients(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    List clients based on user role:
    - Admin: all clients
    - Regular user: only their own clients and assigned clients
    """
    if current_user.role == models.Role.admin:
        clients = db.query(models.Client).order_by(models.Client.name.asc()).all()
        return clients
    else:
        # Get all clients directly owned by the user
        own_clients = db.query(models.Client).filter(models.Client.user_id == current_user.id)
        
        # Get clients assigned to the user with assignment info
        assigned_clients_data = db.query(
            models.Client,
            models.User.full_name.label("assigned_by")
        ).join(
            models.ClientAssignment,
            models.Client.id == models.ClientAssignment.client_id
        ).join(
            models.User,
            models.ClientAssignment.manager_id == models.User.id
        ).filter(
            models.ClientAssignment.junior_id == current_user.id,
            models.ClientAssignment.is_active == True
        ).all()
        
        # Get all assigned client IDs
        assigned_client_ids = [client.id for client, _ in assigned_clients_data]
        
        # Query all clients (own + assigned) for consistent ordering
        from sqlalchemy import or_
        if assigned_client_ids:
            clients = db.query(models.Client).filter(
                or_(
                    models.Client.user_id == current_user.id,
                    models.Client.id.in_(assigned_client_ids)
                )
            ).order_by(models.Client.name.asc()).all()
        else:
            clients = own_clients.order_by(models.Client.name.asc()).all()
        
        # Process clients to include assignment info
        clients_out = []
        for client in clients:
            client_out = schemas.ClientOut.from_orm(client)
            # Check if this is an assigned client
            is_assigned = client.user_id != current_user.id
            if is_assigned:
                client_out.is_assigned = True
                # Find the assigned_by info
                for c, assigned_by in assigned_clients_data:
                    if c.id == client.id:
                        client_out.assigned_by = assigned_by
                        break
            clients_out.append(client_out)
        
        # Log access for audit purposes
        for client in clients:
            # Determine if this is an assigned client or own client
            is_assigned = client.user_id != current_user.id
            action_type = "view_assigned" if is_assigned else "view_own"
            
            # Log the access
            log_entry = models.ClientAccessLog(
                user_id=current_user.id,
                client_id=client.id,
                action_type=action_type,
                details=f"User viewed {'assigned' if is_assigned else 'own'} client"
            )
            db.add(log_entry)
        
        db.commit()
        return clients_out

@router.get("/dashboard", response_model=dict)
def unified_client_dashboard(db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(get_current_user)):
    """
    Provides a unified dashboard view for User 1 showing:
    - Their own clients
    - Clients assigned to them from other users (User 2)
    - Grouped by ownership with additional metadata
    """
    # Get user's own clients
    own_clients = db.query(models.Client).filter(models.Client.user_id == current_user.id).all()
    
    # Get clients assigned to the user with owner information
    assigned_clients_query = db.query(
        models.Client, 
        models.User.full_name.label("owner_name"),
        models.User.id.label("owner_id"),
        models.User.full_name.label("assigned_by")
    ).join(
        models.ClientAssignment,
        models.Client.id == models.ClientAssignment.client_id
    ).join(
        models.User,
        models.ClientAssignment.manager_id == models.User.id
    ).filter(
        models.ClientAssignment.junior_id == current_user.id,
        models.ClientAssignment.is_active == True
    )
    
    assigned_clients_data = assigned_clients_query.all()
    
    # Process own clients
    own_clients_out = [schemas.ClientOut.from_orm(client) for client in own_clients]
    
    # Format the response
    result = {
        "own_clients": own_clients_out,
        "assigned_clients": []
    }
    
    # Group assigned clients by owner
    owner_groups = {}
    for client, owner_name, owner_id, assigned_by in assigned_clients_data:
        if owner_id not in owner_groups:
            owner_groups[owner_id] = {
                "owner_id": owner_id,
                "owner_name": owner_name,
                "clients": []
            }
        
        # Add assignment info to client
        client_out = schemas.ClientOut.from_orm(client)
        client_out.is_assigned = True
        client_out.assigned_by = assigned_by
        
        owner_groups[owner_id]["clients"].append(client_out)
    
    result["assigned_clients"] = list(owner_groups.values())
    
    # Get counts for summary
    result["summary"] = {
        "total_clients": len(own_clients) + len(assigned_clients_data),
        "own_clients_count": len(own_clients),
        "assigned_clients_count": len(assigned_clients_data),
        "owner_count": len(owner_groups)
    }
    
    # Provide a flat clients list for backwards compatibility in frontend
    assigned_clients_flat = []
    for group in owner_groups.values():
        assigned_clients_flat.extend(group["clients"])
    result["clients"] = own_clients_out + assigned_clients_flat
    
    # Commit any access logs recorded above
    db.commit()
    return result

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
def update_client(client_id: int, client_in: schemas.ClientUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Update a client - admin can update any client, users can only update their own"""
    try:
        client = db.query(models.Client).filter(models.Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Check permissions
        if user.role != models.Role.admin and client.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this client")
        
        incoming_name = client_in.name if client_in.name is not None else client.name

        # Check if new name conflicts with existing client for the same user
        if incoming_name != client.name:
            existing = db.query(models.Client).filter(
                models.Client.name == incoming_name,
                models.Client.user_id == client.user_id,
                models.Client.id != client_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Client with this name already exists for this user")
        
        dump_kwargs = {"exclude_unset": True}
        payload = client_in.model_dump(**dump_kwargs) if hasattr(client_in, "model_dump") else client_in.dict(**dump_kwargs)

        # Log the incoming data for debugging
        print(f"Updating client {client_id} with data: {payload}")

        if not payload:
            raise HTTPException(status_code=400, detail="No changes provided for update")

        # Update client fields only if provided
        if client_in.name is not None:
            client.name = client_in.name
        if client_in.phone is not None:
            client.phone = client_in.phone
        if client_in.phone2 is not None:
            client.phone2 = client_in.phone2
        if client_in.address is not None:
            client.address = client_in.address
        if client_in.city is not None:
            client.city = client_in.city
        if client_in.store_name is not None:
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