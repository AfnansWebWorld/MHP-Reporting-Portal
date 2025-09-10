#!/usr/bin/env python3
"""
Migration script to add designation column to users table
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.app.database import DATABASE_URL

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def add_designation_column():
    """Add designation column to users table"""
    db = SessionLocal()
    try:
        print("\n=== Adding designation column to users table ===")
        
        # Test database connection
        print("Testing database connection...")
        db.execute(text("SELECT 1"))
        print("✓ Database connection successful")
        
        # Check if designation column exists in users table
        print("\nChecking users table for designation column...")
        has_column = db.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='designation')"
        )).scalar()
        
        if not has_column:
            print("✓ Adding designation column to users table")
            db.execute(text(
                "ALTER TABLE users ADD COLUMN designation VARCHAR(255)"
            ))
            db.commit()
            print("✓ designation column added successfully")
        else:
            print("✓ designation column already exists")
            
        # Verify the changes
        print("\nVerifying migration...")
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='designation'"
        )).fetchone()
        
        if result:
            print("✓ designation column verified in users table")
        else:
            print("✗ designation column not found - migration may have failed")
            
    except Exception as e:
        db.rollback()
        print(f"\n✗ Migration failed: {str(e)}")
        import traceback
        print("\nFull error traceback:")
        print(traceback.format_exc())
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    print("MHP Portal Database Migration Script - Add Designation Column")
    print("=======================================================")
    add_designation_column()
    print("\nMigration script completed. You can now restart your application.")