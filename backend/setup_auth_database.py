#!/usr/bin/env python3
"""
Setup authentication database tables for Chancify AI.
"""

import os
import sys
from sqlalchemy import create_engine, text
from database.models import Base, User, UserProfile

def setup_database():
    """Create all database tables."""
    
    # Get database URL from environment variable (required)
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set!")
        print("Set it in your .env file or Railway dashboard")
        sys.exit(1)
    
    print(f"Connecting to database...")
    
    try:
        # Create engine
        engine = create_engine(database_url, echo=True)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"Connected to PostgreSQL: {version}")
        
        # Create all tables
        print("Creating authentication tables...")
        Base.metadata.create_all(engine)
        
        print("✅ Authentication database setup complete!")
        print("\nTables created:")
        print("- users (authentication)")
        print("- user_profiles (user data)")
        print("- academic_data")
        print("- extracurriculars") 
        print("- colleges")
        print("- saved_colleges")
        print("- probability_calculations")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)
