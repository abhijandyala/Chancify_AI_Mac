"""
Authentication routes for user signup, login, and profile management.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db, get_supabase, UserProfile, AcademicData, Extracurricular, SavedCollege
from database.schemas import (
    UserProfileCreate,
    UserProfileResponse,
    AcademicDataResponse,
    ExtracurricularResponse,
    SavedCollegeResponse,
    Token,
    CompleteProfileResponse
)
from api.dependencies import get_current_user_profile, get_optional_user_profile

router = APIRouter()


@router.post("/google-oauth", response_model=Token)
async def google_oauth_callback(
    email: str,
    name: str,
    google_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Handle Google OAuth callback and create user in local database.

    Args:
        email: User's email from Google
        name: User's name from Google
        google_id: Google user ID
        db: Database session

    Returns:
        Dict: Access token and user information
    """
    supabase = get_supabase()

    try:
        # Check if user already exists in Supabase Auth
        if supabase is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service not available"
            )
        existing_users = supabase.auth.admin.list_users()
        user_exists = False
        user_id = None

        # Access users list safely
        users_list = getattr(existing_users, 'users', []) or []
        for user in users_list:
            if user.email == email:
                user_exists = True
                user_id = user.id
                break

        if not user_exists:
            # Create user in Supabase Auth
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "email_confirm": True,
                "user_metadata": {
                    "name": name,
                    "google_id": google_id
                }
            })
            user_id = auth_response.user.id

        # Check if profile already exists in local database
        existing_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

        if not existing_profile:
            # Create profile in local database
            profile_data = UserProfileCreate(
                first_name=name.split(' ')[0] if name else None,
                last_name=' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else None,
                email=email
            )

            profile = UserProfile(
                user_id=user_id,
                **profile_data.dict()
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
        else:
            profile = existing_profile

        # Generate a session token (simplified for demo)
        # In production, you'd want to use proper JWT tokens
        access_token = f"google_token_{user_id}_{google_id}"

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
                "profile": UserProfileResponse.from_orm(profile) if profile else None
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Google OAuth user: {str(e)}"
        )


@router.post("/signup", response_model=Token)
async def signup(
    email: str,
    password: str,
    profile_data: UserProfileCreate,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new user account and profile.

    Args:
        email: User's email address
        password: User's password
        profile_data: Initial profile information
        db: Database session

    Returns:
        Dict: Access token and user information
    """
    supabase = get_supabase()

    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available"
        )

    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account"
            )

        user_id = auth_response.user.id

        # Create profile in our database
        profile = UserProfile(
            user_id=user_id,
            **profile_data.dict()
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

        # Return token and user info
        session = auth_response.session
        access_token = session.access_token if session else f"temp_token_{user_id}"
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "profile": UserProfileResponse.from_orm(profile)
            }
        }

    except Exception as e:
        db.rollback()
        if "already registered" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(
    email: str,
    password: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Login existing user.

    Args:
        email: User's email address
        password: User's password
        db: Database session

    Returns:
        Dict: Access token and user information
    """
    supabase = get_supabase()

    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available"
        )

    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        user_id = auth_response.user.id

        # Get user profile
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

        session = auth_response.session
        access_token = session.access_token if session else f"temp_token_{user_id}"
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "profile": UserProfileResponse.from_orm(profile) if profile else None
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@router.post("/logout")
async def logout():
    """
    Logout user (clear session).
    """
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user(
    current_user: Optional[UserProfile] = Depends(get_optional_user_profile)
):
    """
    Get current user's complete profile.
    Returns user data if authenticated, or null if not authenticated.
    Handles database errors gracefully.
    """
    try:
        if current_user is None:
            return {"detail": "Not authenticated", "authenticated": False}

        from database.schemas import CompleteProfileResponse
        return CompleteProfileResponse.from_orm(current_user)
    except Exception as e:
        # Log error but return graceful response
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in /api/auth/me: {e}", exc_info=True)
        # Return unauthenticated response instead of 500
        return {"detail": "Not authenticated", "authenticated": False}
