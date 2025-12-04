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
    """Application settings loaded from environment variables.
    
    Note: Pydantic will automatically load values from .env file via the Config class.
    Do not use os.getenv() in field defaults as it executes at import time before
    Pydantic's .env loading mechanism runs.
    """

    # Supabase Configuration - Loaded from environment variables via Pydantic
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    # Database - Railway PostgreSQL
    # Set via DATABASE_URL environment variable in Railway
    database_url: str = ""

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # Security - Loaded from environment variable via Pydantic
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS - Loaded from environment variable via Pydantic
    frontend_url: str = "http://localhost:3000"

    # ML Model Path
    ml_model_path: str = "../models/trained/"

    # OpenAI Configuration
    # Loaded from environment variable (.env file) via Pydantic - never commit API keys to git
    openai_api_key: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Global settings instance
settings = Settings()
