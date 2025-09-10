from sqlalchemy.orm import Session
from . import models
from .auth import get_password_hash

def seed(db: Session):
    # Create demo admin user
    admin = db.query(models.User).filter(models.User.email == "admin@mhp.com").first()
    if not admin:
        admin = models.User(
            email="admin@mhp.com",
            full_name="Admin User",
            designation="System Administrator",
            hashed_password=get_password_hash("admin123"),
            role=models.Role.admin,
        )
        db.add(admin)
    
    # Create demo regular user
    user = db.query(models.User).filter(models.User.email == "user@mhp.com").first()
    if not user:
        user = models.User(
            email="user@mhp.com",
            full_name="Demo User",
            designation="Sales Representative",
            hashed_password=get_password_hash("user123"),
            role=models.Role.user,
        )
        db.add(user)
    
    db.commit()
    
    # Refresh to get IDs
    db.refresh(admin)
    db.refresh(user)
    
    # Add some demo clients if none
    if db.query(models.Client).count() == 0:
        clients = [
            models.Client(name="Client A", phone="123-456-7890", address="123 Main St", city="New York", user_id=user.id),
            models.Client(name="Client B", phone="555-111-2222", address="456 Oak Ave", city="Los Angeles", user_id=user.id),
            models.Client(name="Admin Client", phone="999-888-7777", address="789 Pine Rd", city="Chicago", user_id=admin.id),
        ]
        db.add_all(clients)
        db.commit()
    
    # Add predefined giveaways if none exist
    if db.query(models.Giveaway).count() == 0:
        giveaways = [
            models.Giveaway(name="Wall Clock"),
            models.Giveaway(name="Pen"),
            models.Giveaway(name="Keychain"),
            models.Giveaway(name="Paper weight"),
        ]
        db.add_all(giveaways)
        db.commit()