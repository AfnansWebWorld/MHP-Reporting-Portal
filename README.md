# MHP Reporting Portal

A full-stack application for managing client reports with user and admin roles.

## Database Setup

### Option 1: Using PostgreSQL 17 (Local Installation)

If you have PostgreSQL 17 installed locally:

1. Ensure PostgreSQL is running on port 5432
2. Create the database:
   ```sql
   CREATE DATABASE mhp_portal;
   ```
3. The application will automatically create tables and seed data when started

### Option 2: Using Docker

If you prefer using Docker:

```bash
docker compose up -d db
```

## Initialize Database

To manually initialize the database and create tables:

```bash
python init_db.py
```

This script will:
- Ensure the database exists
- Create all tables based on the models
- Seed initial data (admin user and sample clients)

## Running the Backend

1. Activate the virtual environment:
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Start the FastAPI server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

4. Access the API at http://localhost:8000
   - API documentation: http://localhost:8000/docs

## Running the Frontend

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application at http://localhost:3000

## Default Admin Credentials

- Email: admin@mhp.local
- Password: admin123