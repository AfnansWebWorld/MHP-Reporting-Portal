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
            hashed_password=get_password_hash("user123"),
            role=models.Role.user,
        )
        db.add(user)
    
    db.commit()
    # Add some demo clients if none
    if db.query(models.Client).count() == 0:
        clients = [
            models.Client(name="Client A", phone="123-456-7890", address="123 Main St"),
            models.Client(name="Client B", phone="555-111-2222", address="456 Oak Ave"),
            models.Client(name="Client C", phone="999-888-7777", address="789 Pine Rd"),
        ]
        db.add_all(clients)
        db.commit()