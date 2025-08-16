from sqlalchemy.orm import Session
from . import models
from .auth import get_password_hash

def seed(db: Session):
    # Create default admin if none
    admin = db.query(models.User).filter(models.User.role == models.Role.admin).first()
    if not admin:
        admin = models.User(
            email="admin@mhp.local",
            full_name="Admin",
            hashed_password=get_password_hash("admin123"),
            role=models.Role.admin,
        )
        db.add(admin)
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