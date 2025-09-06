# Database Migration Guide for Railway Deployment

This guide helps you fix the `has_outstation_access` column error when deploying to Railway.

## Problem
The error occurs because the production database is missing the `has_outstation_access` column that was added for the Out Station Expense feature.

```
psycopg2.errors.UndefinedColumn: column users.has_outstation_access does not exist
```

## Solution

### Option 1: Automatic Migration (Recommended)
The application now automatically runs migrations on startup. Simply redeploy your application:

1. **Push your changes to Railway:**
   ```bash
   git add .
   git commit -m "Add automatic database migrations on startup"
   git push
   ```

2. **Railway will automatically redeploy** and run the migrations during startup.

### Option 2: Manual Migration (If automatic fails)
If the automatic migration doesn't work, you can run the migration manually:

1. **Using Railway CLI:**
   ```bash
   # Install Railway CLI if you haven't
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Link to your project
   railway link
   
   # Run the migration script
   railway run python run_migrations.py
   ```

2. **Using Railway Dashboard:**
   - Go to your Railway project dashboard
   - Navigate to the backend service
   - Go to "Variables" tab
   - Add a new deployment with the command: `python run_migrations.py`
   - After migration completes, change back to normal startup command

### Option 3: Direct Database Access
If you have direct access to your PostgreSQL database:

```sql
-- Add the missing column
ALTER TABLE users ADD COLUMN has_outstation_access BOOLEAN NOT NULL DEFAULT false;

-- Add report_type column if missing
ALTER TABLE pdf_reports ADD COLUMN report_type VARCHAR(50) DEFAULT 'daily_report';

-- Create outstation_expenses table if missing
CREATE TABLE IF NOT EXISTS outstation_expenses (
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
);
```

## Verification

After running the migration, verify it worked:

1. **Check the application logs** for "Migrations completed successfully!"
2. **Test the application** - it should start without the column error
3. **Access the Out Station Expense feature** to ensure it works properly

## Files Modified

- `backend/app/main.py` - Added automatic migration on startup
- `backend/run_migrations.py` - Standalone migration script
- `backend/app/migrate.py` - Core migration logic (already existed)

## Troubleshooting

### If migration fails:
1. Check Railway logs for detailed error messages
2. Ensure DATABASE_URL environment variable is set correctly
3. Verify database connectivity
4. Try running the migration manually using Option 2

### If application still fails after migration:
1. Check that all required environment variables are set
2. Verify the database schema matches the models
3. Review application logs for other potential issues

## Contact

If you continue to experience issues, check the application logs and verify that:
- The DATABASE_URL is correctly formatted
- The database is accessible from Railway
- All required tables and columns exist after migration