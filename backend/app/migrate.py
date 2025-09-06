import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from .database import DATABASE_URL

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Migration function
def run_migrations():
    db = SessionLocal()
    try:
        print("Running migrations...")
        
        # Check if has_outstation_access column exists in users table
        has_column = db.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='has_outstation_access')"
        )).scalar()
        
        if not has_column:
            print("Adding has_outstation_access column to users table")
            db.execute(text(
                "ALTER TABLE users ADD COLUMN has_outstation_access BOOLEAN NOT NULL DEFAULT false"
            ))
        
        # Check if report_type column exists in pdf_reports table
        has_column = db.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name='pdf_reports' AND column_name='report_type')"
        )).scalar()
        
        if not has_column:
            print("Adding report_type column to pdf_reports table")
            db.execute(text(
                "ALTER TABLE pdf_reports ADD COLUMN report_type VARCHAR(50) DEFAULT 'daily_report'"
            ))
        
        # Check if outstation_expenses table exists
        table_exists = db.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_name='outstation_expenses')"
        )).scalar()
        
        if not table_exists:
            print("Creating outstation_expenses table")
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
        
        db.commit()
        print("Migrations completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {str(e)}")
        import traceback
        print(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    run_migrations()