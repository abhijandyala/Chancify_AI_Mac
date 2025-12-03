#!/usr/bin/env python3
"""
Simple authentication database setup for Chancify AI.
"""

import os
from sqlalchemy import create_engine, text, Column, String, Integer, Boolean, DateTime, UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
import uuid
from datetime import datetime

Base = declarative_base()

class User(Base):
    """User authentication table."""
    __tablename__ = "users"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))  # Nullable for OAuth users
    first_name = Column(String(100))
    last_name = Column(String(100))
    
    # OAuth fields
    google_id = Column(String(255), unique=True)
    provider = Column(String(20), default="local")  # "local", "google"
    
    # Account status
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_login = Column(DateTime(timezone=True))

def setup_auth_tables():
    """Create authentication tables."""
    
    # Get database URL from environment variable
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set!")
        print("Set it in your .env file or Railway dashboard")
        return
    
    print(f"Connecting to Railway Postgres...")
    
    try:
        # Create engine
        engine = create_engine(database_url, echo=True)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Connected to PostgreSQL: {version}")
        
        # Create authentication tables
        print("Creating authentication tables...")
        Base.metadata.create_all(engine)
        
        print("✅ Authentication database setup complete!")
        print("\nTables created:")
        print("- users (authentication with OAuth support)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

if __name__ == "__main__":
    success = setup_auth_tables()
    exit(0 if success else 1)
