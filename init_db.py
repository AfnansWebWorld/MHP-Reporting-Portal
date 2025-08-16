import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app.database import Base, engine, ensure_database_exists, DATABASE_URL
from backend.app import models
from backend.app.seed import seed
from backend.app.database import SessionLocal

def init_database():
    print("Ensuring database exists...")
    ensure_database_exists(DATABASE_URL)
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Seeding initial data...")
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    
    print("Database initialization complete!")
    print(f"Database URL: {DATABASE_URL}")
    print("Tables created:")
    for table in Base.metadata.tables:
        print(f"  - {table}")

if __name__ == "__main__":
    init_database()