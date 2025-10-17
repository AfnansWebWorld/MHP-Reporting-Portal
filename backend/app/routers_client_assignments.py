from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from . import models, schemas
from .auth import get_current_user, require_admin
from .database import get_db
from typing import List
from datetime import datetime

router = APIRouter(prefix="/client-assignments", tags=["client-assignments"])

# Helper function to log client access
def log_client_access(db: Session, user_id: int, client_id: int, action_type: str, details: str = None):
    log = models.ClientAccessLog(
        user_id=user_id,
        client_id=client_id,
        action_type=action_type,
        details=details
    )
    db.add(log)
    db.commit()
    return log

@router.post("/", response_model=schemas.ClientAssignmentOut)
def assign_client(
    assignment: schemas.ClientAssignmentCreate, 
    db: Session = Depends(get_db), 
    admin=Depends(require_admin)
):
    """Admin endpoint to assign a client from one user to another"""
    # Verify the client exists
    client = db.query(models.Client).filter(models.Client.id == assignment.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify the users exist
    assigned_to_user = db.query(models.User).filter(models.User.id == assignment.junior_id).first()
    owner_user = db.query(models.User).filter(models.User.id == assignment.manager_id).first()
    
    if not assigned_to_user or not owner_user:
        raise HTTPException(status_code=404, detail="One or both users not found")
    
    # Verify the client belongs to the owner user
    if client.user_id != owner_user.id:
        raise HTTPException(status_code=400, detail="Client does not belong to the specified owner user")
    
    # Check if assignment already exists
    existing_assignment = db.query(models.ClientAssignment).filter(
        models.ClientAssignment.client_id == assignment.client_id,
        models.ClientAssignment.junior_id == assignment.junior_id,
        models.ClientAssignment.manager_id == assignment.manager_id,
        models.ClientAssignment.is_active == True
    ).first()
    
    if existing_assignment:
        raise HTTPException(status_code=400, detail="This client is already assigned to this user")
    
    # Create the assignment
    new_assignment = models.ClientAssignment(
        client_id=assignment.client_id,
        junior_id=assignment.junior_id,
        manager_id=assignment.manager_id,
        is_active=True
    )
    
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    # Log the assignment
    log_client_access(
        db, 
        admin.id, 
        assignment.client_id, 
        "assign", 
        f"Admin {admin.email} assigned client to user {assigned_to_user.email}"
    )
    
    return new_assignment

@router.get("/", response_model=List[schemas.ClientAssignmentOut])
def list_client_assignments(
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    """List all client assignments for the current user"""
    if user.role == models.Role.admin:
        # Admins can see all assignments
        return db.query(models.ClientAssignment).filter(models.ClientAssignment.is_active == True).all()
    else:
        # Regular users can only see assignments where they are the junior_id
        return db.query(models.ClientAssignment).filter(
            models.ClientAssignment.junior_id == user.id,
            models.ClientAssignment.is_active == True
        ).all()

@router.delete("/{assignment_id}")
def remove_client_assignment(
    assignment_id: int, 
    db: Session = Depends(get_db), 
    admin=Depends(require_admin)
):
    """Admin endpoint to remove a client assignment"""
    assignment = db.query(models.ClientAssignment).filter(models.ClientAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Soft delete by setting is_active to False
    assignment.is_active = False
    db.commit()
    
    # Log the removal
    log_client_access(
        db, 
        admin.id, 
        assignment.client_id, 
        "unassign", 
        f"Admin {admin.email} removed client assignment"
    )
    
    return {"message": "Assignment removed successfully"}

@router.get("/assigned-clients", response_model=List[schemas.ClientOut])
def list_assigned_clients(
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    """Get all clients assigned to the current user from other users"""
    # Get all active assignments where the current user is the junior_id
    assignments = db.query(models.ClientAssignment).filter(
        models.ClientAssignment.junior_id == user.id,
        models.ClientAssignment.is_active == True
    ).all()
    
    # Extract client IDs from assignments
    client_ids = [assignment.client_id for assignment in assignments]
    
    # Get all clients with those IDs
    clients = db.query(models.Client).filter(models.Client.id.in_(client_ids)).all()
    
    # Log access for each client
    for client in clients:
        log_client_access(db, user.id, client.id, "view_assigned", "Viewed assigned client")
    
    return clients