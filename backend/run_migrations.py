#!/usr/bin/env python3
"""
Standalone migration script for Railway deployment.
This can be run manually if the automatic migration during startup fails.

Usage:
  python run_migrations.py

Or on Railway:
  railway run python run_migrations.py
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

print(f"Database URL format: {DATABASE_URL[:20]}*****@*****")

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migrations():
    """Run all necessary database migrations"""
    db = SessionLocal()
    try:
        print("\n=== Starting Database Migrations ===")
        
        # Test database connection
        print("Testing database connection...")
        db.execute(text("SELECT 1"))
        print("✓ Database connection successful")
        
        # Check if has_outstation_access column exists in users table
        print("\nChecking users table for has_outstation_access column...")
        has_column = db.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='has_outstation_access')"
        )).scalar()
        
        if not has_column:
            print("✓ Adding has_outstation_access column to users table")
            db.execute(text(
                "ALTER TABLE users ADD COLUMN has_outstation_access BOOLEAN NOT NULL DEFAULT false"
            ))
        else:
            print("✓ has_outstation_access column already exists")
        
        # Check if report_type column exists in pdf_reports table
        print("\nChecking pdf_reports table for report_type column...")
        has_column = db.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name='pdf_reports' AND column_name='report_type')"
        )).scalar()
        
        if not has_column:
            print("✓ Adding report_type column to pdf_reports table")
            db.execute(text(
                "ALTER TABLE pdf_reports ADD COLUMN report_type VARCHAR(50) DEFAULT 'daily_report'"
            ))
        else:
            print("✓ report_type column already exists")
        
        # Check if outstation_expenses table exists
        print("\nChecking for outstation_expenses table...")
        table_exists = db.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_name='outstation_expenses')"
        )).scalar()
        
        if not table_exists:
            print("✓ Creating outstation_expenses table")
            db.execute(text("""
                CREATE TABLE outstation_expenses (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    day DATE NOT NULL,
                    day_of_month INTEGER NOT NULL,
                    month VARCHAR(50) NOT NULL,
                    station VARCHAR(50) NOT NULL,
                    travelling VARCHAR(50) NOT NULL,
                    km_travelled FLOAT NOT NULL,
                    csr_verified VARCHAR(255) NOT NULL,
                    summary_of_activity TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    pdf_report_id INTEGER REFERENCES pdf_reports(id)
                )
            """))
        else:
            print("✓ outstation_expenses table already exists")
        
        # Commit all changes
        db.commit()
        print("\n=== All Migrations Completed Successfully! ===")
        
        # Verify the changes
        print("\nVerifying migrations...")
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='has_outstation_access'"
        )).fetchone()
        
        if result:
            print("✓ has_outstation_access column verified in users table")
        else:
            print("✗ has_outstation_access column not found - migration may have failed")
            
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
    print("MHP Portal Database Migration Script")
    print("=====================================")
    run_migrations()
    print("\nMigration script completed. You can now restart your application.")