import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from . import models
from .routers_auth import router as auth_router
from .routers_clients import router as clients_router
from .routers_reports import router as reports_router

app = FastAPI(title="MHP Reporting Portal API")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Seed initial data
from fastapi import Depends
from .database import get_db
from .seed import seed
from sqlalchemy.orm import Session

@app.on_event("startup")
def on_startup():
    # Create a temporary session
    from .database import SessionLocal
    db: Session = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()

# Routers
app.include_router(auth_router)
app.include_router(clients_router)
app.include_router(reports_router)
from .routers_admin import router as admin_router
app.include_router(admin_router)
from .routers_pdf import router as pdf_router
app.include_router(pdf_router)

@app.get("/")
def root():
    return {"status": "ok", "service": "MHP Reporting Portal API"}