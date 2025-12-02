"""
Configuration settings for Chancify AI backend.
"""

import os
from typing import Any

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # Fallback for older pydantic versions
    from pydantic import BaseSettings  # type: ignore

# Type alias to suppress pyright warning about BaseSettings
_BaseSettings: Any = BaseSettings


class Settings(_BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase Configuration
    supabase_url: str = "https://vwvqfellrhxznesaifwe.supabase.co"
    supabase_anon_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnFmZWxscmh4em5lc2FpZndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzU2NjQsImV4cCI6MjA3NTg1MTY2NH0.TBYg6XEy1cmsPePkT2Q5tSSDcEqi0AWNCTt7pGT2ZBc"
    supabase_service_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnFmZWxscmh4em5lc2FpZndlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NTY2NCwiZXhwIjoyMDc1ODUxNjY0fQ.zVtdMf9Z5gklqfmkjUdMeALE3AGqVlGz1efoNHqSiK4"

    # Database - Railway PostgreSQL
    # IMPORTANT: Use DATABASE_PUBLIC_URL for local development (works from your PC)
    # Use DATABASE_URL (postgres.railway.internal) only when deployed on Railway
    database_url: str = "postgresql://postgres:aLrUyIYMFZrWalrETCKLmhHNlTKCyfvU@shuttle.proxy.rlwy.net:22500/railway"

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # Security
    secret_key: str = "chancify-ai-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    frontend_url: str = "http://localhost:3000"

    # ML Model Path
    ml_model_path: str = "../models/trained/"

    # OpenAI Configuration
    # Load from environment variable (.env file) - never commit API keys to git
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Global settings instance
settings = Settings()
