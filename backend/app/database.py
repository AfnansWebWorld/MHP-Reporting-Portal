import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine.url import make_url
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/mhp_portal")

# Ensure target database exists (PostgreSQL)
def ensure_database_exists(db_url_str: str):
    try:
        url = make_url(db_url_str)
        if url.get_backend_name().startswith("postgres"):
            db_name = url.database
            # connect to default 'postgres' database to create target db if needed
            admin_url = url.set(database="postgres")
            tmp_engine = create_engine(admin_url)
            with tmp_engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")
                exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": db_name}).scalar()
                if not exists:
                    conn.execute(text(f'CREATE DATABASE "{db_name}"'))
            tmp_engine.dispose()
    except Exception as e:
        # If creation fails (permissions or DB already exists), continue and let normal engine creation proceed
        pass

# Create DB if needed
ensure_database_exists(DATABASE_URL)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()