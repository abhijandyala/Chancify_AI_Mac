"""
Shared dependencies for API endpoints.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from database import get_db, get_supabase, UserProfile
from config import settings

# Security scheme
security = HTTPBearer()
# Optional security scheme (doesn't require auth)
optional_security = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Extract and validate JWT token to get current user ID.

    Args:
        credentials: JWT token from Authorization header

    Returns:
        str: User ID from token

    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    # Support custom tokens generated for Google/dev flows
    if token.startswith("google_token_"):
        # Format: google_token_{user_id}_{google_id}
        remainder = token[len("google_token_") :]
        parts = remainder.split("_", 1)
        if parts and parts[0]:
            return parts[0]
        raise credentials_exception

    if token.startswith("demo_token_"):
        return "demo_user"

    try:
        # Decode JWT token (Supabase uses HS256)
        payload = jwt.decode(
            token,
            settings.supabase_service_key,  # Use service key to verify
            algorithms=[settings.algorithm]
        )
        user_id_value = payload.get("sub")
        if user_id_value is None:
            raise credentials_exception
        user_id: str = str(user_id_value)
        return user_id
    except JWTError:
        raise credentials_exception


def get_current_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> UserProfile:
    """
    Get current user's profile from database.

    Args:
        user_id: Current user's ID
        db: Database session

    Returns:
        UserProfile: User's profile

    Raises:
        HTTPException: If profile not found
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    return profile


def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[str]:
    """
    Get current user ID if authenticated, None otherwise.
    This allows endpoints to work with or without authentication.
    """
    if credentials is None:
        return None

    token = credentials.credentials

    # Support custom tokens generated for Google/dev flows
    if token.startswith("google_token_"):
        remainder = token[len("google_token_") :]
        parts = remainder.split("_", 1)
        if parts and parts[0]:
            return parts[0]
        return None

    if token.startswith("demo_token_"):
        return "demo_user"

    try:
        # Decode JWT token (Supabase uses HS256)
        payload = jwt.decode(
            token,
            settings.supabase_service_key,
            algorithms=[settings.algorithm]
        )
        user_id_value = payload.get("sub")
        if user_id_value is None:
            return None
        return str(user_id_value)
    except JWTError:
        return None


def get_optional_user_profile(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Optional[Session] = Depends(get_db)
) -> Optional[UserProfile]:
    """
    Get current user's profile if authenticated, None otherwise.
    This allows endpoints to work with or without authentication.
    Handles database errors gracefully.

    Args:
        credentials: Optional JWT token from Authorization header
        db: Database session (may be None if database unavailable)

    Returns:
        Optional[UserProfile]: User's profile or None
    """
    # If no credentials, return None (not authenticated)
    if credentials is None:
        return None

    # If database is unavailable, return None
    if db is None:
        return None

    token = credentials.credentials

    # Support custom tokens generated for Google/dev flows
    user_id = None
    if token.startswith("google_token_"):
        remainder = token[len("google_token_") :]
        parts = remainder.split("_", 1)
        if parts and parts[0]:
            user_id = parts[0]
    elif token.startswith("demo_token_"):
        user_id = "demo_user"
    else:
        try:
            # Decode JWT token (Supabase uses HS256)
            payload = jwt.decode(
                token,
                settings.supabase_service_key,
                algorithms=[settings.algorithm]
            )
            user_id = payload.get("sub")
        except JWTError:
            return None

    if user_id is None:
        return None

    try:
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        return profile
    except Exception:
        # Database error - return None gracefully
        return None
