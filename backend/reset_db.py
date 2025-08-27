#!/usr/bin/env python3
"""
Database Reset Script
This script drops all tables and recreates them with the updated schema.
USE WITH CAUTION: This will delete all existing data!
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app import models
from app.seed import seed
from app.database import SessionLocal

def reset_database():
    print("⚠️  WARNING: This will delete ALL existing data!")
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables with updated schema...")
    Base.metadata.create_all(bind=engine)
    
    print("Seeding initial data...")
    db = SessionLocal()
    try:
        seed(db)
        print("✅ Database reset completed successfully!")
        print("The foreign key constraint issue has been fixed.")
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()