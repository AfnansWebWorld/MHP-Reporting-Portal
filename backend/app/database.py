import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine.url import make_url
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

# Get database URL from environment
raw_database_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/mhp_portal")

# Fix for Railway's postgres:// URLs (SQLAlchemy requires postgresql://)
if raw_database_url.startswith("postgres://"):
    print("Converting postgres:// URL to postgresql://")
    DATABASE_URL = raw_database_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_database_url

print(f"Database URL format: {DATABASE_URL.split('@')[0].split('://')[0]}://*****@*****")


# Ensure target database exists (PostgreSQL)
def ensure_database_exists(db_url_str: str):
    try:
        url = make_url(db_url_str)
        if url.get_backend_name().startswith("postgres"):
            db_name = url.database
            # connect to default 'postgres' database to create target db if needed
            admin_url = url.set(database="postgres")
            print(f"Attempting to connect to database to check if {db_name} exists")
            tmp_engine = create_engine(admin_url)
            with tmp_engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")
                exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": db_name}).scalar()
                if not exists:
                    print(f"Creating database {db_name}")
                    conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                else:
                    print(f"Database {db_name} already exists")
            tmp_engine.dispose()
    except Exception as e:
        # If creation fails (permissions or DB already exists), log the error and continue
        print(f"Database connection error in ensure_database_exists: {str(e)}")
        import traceback
        print(traceback.format_exc())

# Create DB if needed
ensure_database_exists(DATABASE_URL)

try:
    print("Creating SQLAlchemy engine...")
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True,
        pool_recycle=3600,  # Recycle connections after 1 hour
        connect_args={"connect_timeout": 30}  # 30 second connection timeout
    )
    # Test connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("Database connection successful")
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    
except Exception as e:
    print(f"Failed to create database engine: {str(e)}")
    import traceback
    print(traceback.format_exc())
    # Don't raise here, let the application try to start anyway
    # The first request will fail if DB is unavailable

# Dependency
def get_db():
    db = None
    try:
        db = SessionLocal()
        yield db
    except Exception as e:
        print(f"Database session error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise  # Re-raise to let FastAPI handle the error
    finally:
        if db:
            db.close()