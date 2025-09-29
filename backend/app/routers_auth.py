from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from . import models, schemas
from .auth import create_access_token, get_password_hash, verify_password, require_admin
from .database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        # Log authentication attempt (without password)
        print(f"Login attempt for user: {form_data.username}")
        
        # Query the user
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
        
        # Check credentials
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        
        # Generate token
        token = create_access_token({"sub": str(user.id), "role": user.role.value})
        print(f"Login successful for user: {form_data.username}")
        
        return {"access_token": token, "token_type": "bearer"}
    except Exception as e:
        # Log the error (but don't expose details to client)
        import traceback
        print(f"Login error for {form_data.username}: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error during authentication")

@router.post("/users", response_model=schemas.UserOut)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=models.Role(user_in.role.value)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/create-user", response_model=schemas.UserOut)
def create_user_simple(user_data: dict, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Simplified user creation endpoint for admin frontend"""
    existing = db.query(models.User).filter(models.User.email == user_data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=user_data["email"],
        full_name=user_data["full_name"],
        designation=user_data.get("designation"),
        hashed_password=get_password_hash(user_data["password"]),
        role=models.Role.user  # Default to user role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Update user details - admin only"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is being changed and if it conflicts
    if user_update.email and user_update.email != user.email:
        existing = db.query(models.User).filter(models.User.email == user_update.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = user_update.email
    
    # Update other fields
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    
    if user_update.designation is not None:
        user.designation = user_update.designation
    
    if user_update.password:
        user.hashed_password = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Delete user - admin only"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has any reports
    reports_count = db.query(models.Report).filter(models.Report.user_id == user_id).count()
    if reports_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete user with {reports_count} existing reports")
    
    # Check if user has any clients
    clients_count = db.query(models.Client).filter(models.Client.user_id == user_id).count()
    if clients_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete user with {clients_count} existing clients")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}