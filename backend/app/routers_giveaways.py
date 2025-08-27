from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from . import models, schemas
from .database import get_db
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/giveaways", tags=["giveaways"])

# Admin routes for managing giveaways
@router.post("/", response_model=schemas.GiveawayOut)
def create_giveaway(giveaway: schemas.GiveawayCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Create a new giveaway (admin only)"""
    # Check if giveaway with same name already exists
    existing = db.query(models.Giveaway).filter(models.Giveaway.name == giveaway.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Giveaway with this name already exists")
    
    db_giveaway = models.Giveaway(**giveaway.dict())
    db.add(db_giveaway)
    db.commit()
    db.refresh(db_giveaway)
    return db_giveaway

@router.get("/", response_model=List[schemas.GiveawayOut])
def get_giveaways(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get all giveaways (admin only)"""
    return db.query(models.Giveaway).filter(models.Giveaway.is_active == True).all()

@router.get("/all", response_model=List[schemas.GiveawayOut])
def get_all_giveaways(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get all giveaways including inactive ones (admin only)"""
    return db.query(models.Giveaway).all()

@router.put("/{giveaway_id}", response_model=schemas.GiveawayOut)
def update_giveaway(giveaway_id: int, giveaway: schemas.GiveawayCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Update a giveaway (admin only)"""
    db_giveaway = db.query(models.Giveaway).filter(models.Giveaway.id == giveaway_id).first()
    if not db_giveaway:
        raise HTTPException(status_code=404, detail="Giveaway not found")
    
    # Check if another giveaway with same name exists
    existing = db.query(models.Giveaway).filter(
        and_(models.Giveaway.name == giveaway.name, models.Giveaway.id != giveaway_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Giveaway with this name already exists")
    
    for key, value in giveaway.dict().items():
        setattr(db_giveaway, key, value)
    
    db.commit()
    db.refresh(db_giveaway)
    return db_giveaway

@router.delete("/{giveaway_id}")
def delete_giveaway(giveaway_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Soft delete a giveaway (admin only)"""
    db_giveaway = db.query(models.Giveaway).filter(models.Giveaway.id == giveaway_id).first()
    if not db_giveaway:
        raise HTTPException(status_code=404, detail="Giveaway not found")
    
    db_giveaway.is_active = False
    db.commit()
    return {"message": "Giveaway deleted successfully"}

# Giveaway assignment routes
@router.post("/assign", response_model=schemas.GiveawayAssignmentOut)
def assign_giveaway(assignment: schemas.GiveawayAssignmentCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Assign a giveaway to a user (admin only)"""
    # Verify giveaway exists and is active
    giveaway = db.query(models.Giveaway).filter(
        and_(models.Giveaway.id == assignment.giveaway_id, models.Giveaway.is_active == True)
    ).first()
    if not giveaway:
        raise HTTPException(status_code=404, detail="Giveaway not found or inactive")
    
    # Verify user exists
    user = db.query(models.User).filter(models.User.id == assignment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already has this giveaway assigned
    existing_assignment = db.query(models.GiveawayAssignment).filter(
        and_(
            models.GiveawayAssignment.user_id == assignment.user_id,
            models.GiveawayAssignment.giveaway_id == assignment.giveaway_id,
            models.GiveawayAssignment.is_active == True
        )
    ).first()
    
    if existing_assignment:
        # Update existing assignment quantity
        existing_assignment.quantity += assignment.quantity
        existing_assignment.assigned_by = admin.id
        db.commit()
        db.refresh(existing_assignment)
        return existing_assignment
    else:
        # Create new assignment
        db_assignment = models.GiveawayAssignment(
            **assignment.dict(),
            assigned_by=admin.id
        )
        db.add(db_assignment)
        db.commit()
        db.refresh(db_assignment)
        return db_assignment

@router.get("/assignments", response_model=List[schemas.GiveawayAssignmentOut])
def get_all_assignments(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get all giveaway assignments (admin only)"""
    return db.query(models.GiveawayAssignment).filter(
        models.GiveawayAssignment.is_active == True
    ).all()

@router.get("/my-giveaways", response_model=List[schemas.GiveawayAssignmentOut])
def get_my_giveaways(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Get current user's giveaway assignments"""
    return db.query(models.GiveawayAssignment).filter(
        and_(
            models.GiveawayAssignment.user_id == user.id,
            models.GiveawayAssignment.is_active == True
        )
    ).all()

@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Remove a giveaway assignment (admin only)"""
    assignment = db.query(models.GiveawayAssignment).filter(
        models.GiveawayAssignment.id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.is_active = False
    db.commit()
    return {"message": "Assignment removed successfully"}

@router.put("/assignments/{assignment_id}", response_model=schemas.GiveawayAssignmentOut)
def update_assignment(assignment_id: int, quantity: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Update giveaway assignment quantity (admin only)"""
    assignment = db.query(models.GiveawayAssignment).filter(
        models.GiveawayAssignment.id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.quantity = quantity
    assignment.assigned_by = admin.id
    db.commit()
    db.refresh(assignment)
    return assignment