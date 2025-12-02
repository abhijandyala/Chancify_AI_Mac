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

    # Supabase Configuration - Load from environment variables
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # Database - Railway PostgreSQL
    # Set via DATABASE_URL environment variable in Railway
    database_url: str = os.getenv("DATABASE_URL", "")

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # Security - Load from environment variable
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
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
