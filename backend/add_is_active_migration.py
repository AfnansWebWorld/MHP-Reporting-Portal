from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Function to add is_active column to client_assignments table
def add_is_active_column():
    # Connect to the database
    with engine.connect() as conn:
        try:
            # Check if column exists first to avoid errors
            check_query = text("SELECT column_name FROM information_schema.columns WHERE table_name='client_assignments' AND column_name='is_active'")
            result = conn.execute(check_query)
            column_exists = result.fetchone() is not None
            
            if not column_exists:
                print("Adding is_active column to client_assignments table...")
                # Add the column with default value of True
                alter_query = text("ALTER TABLE client_assignments ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
                conn.execute(alter_query)
                conn.commit()
                print("Column added successfully!")
            else:
                print("is_active column already exists in client_assignments table.")
                
        except Exception as e:
            print(f"Error occurred: {e}")

if __name__ == "__main__":
    add_is_active_column()
    print("Migration completed.")