"""
Database connection and session management for Supabase PostgreSQL.
"""

from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from supabase import create_client, Client
from config import settings
import logging

logger = logging.getLogger(__name__)

# Supabase client for authentication
supabase: Optional[Client] = None
if settings.supabase_url and settings.supabase_service_key:
    try:
        supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_key  # Use service key for admin operations
        )
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}")
        supabase = None
else:
    logger.warning("SUPABASE_URL or SUPABASE_SERVICE_KEY not set - Supabase features will be disabled")

# SQLAlchemy engine and session
database_url = settings.database_url
engine = None
SessionLocal = None

if database_url and database_url.strip() and database_url != "":
    try:
        engine = create_engine(
            database_url,
            echo=False,  # Disable SQL query logging in production
            pool_pre_ping=True,  # Verify connections before use
            pool_recycle=300,  # Recycle connections every 5 minutes
            connect_args={"connect_timeout": 10}  # Add connection timeout
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("Database engine created successfully")
    except Exception as e:
        logger.error(f"Failed to create database engine: {e}")
        engine = None
        SessionLocal = None
else:
    logger.warning("DATABASE_URL not set - database features will be disabled")


def get_db() -> Generator[Optional[Session], None, None]:
    """
    Dependency to get database session.

    Yields:
        Optional[Session]: SQLAlchemy database session, or None if database unavailable
    """
    if SessionLocal is None:
        logger.error("Database not initialized, returning None for session.")
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}", exc_info=True)
        yield None
    finally:
        if db:
            db.close()


def get_supabase() -> Optional[Client]:
    """
    Get Supabase client instance.

    Returns:
        Optional[Client]: Supabase client for authentication and database operations, or None if not initialized
    """
    return supabase


def create_tables():
    """Create all database tables."""
    if engine is None:
        logger.warning("Cannot create tables: Database engine not initialized")
        return

    try:
        from .models import Base
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        raise


def drop_tables():
    """Drop all database tables (for testing)."""
    from .models import Base
    Base.metadata.drop_all(bind=engine)
