"""
Chancify AI - Backend API
FastAPI application for college admissions probability calculations
"""

import os
import logging
import time
from typing import Dict, Any
from fastapi import FastAPI, Request
from starlette.responses import Response

# Configure logging FIRST
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info("=== Chancify AI Backend Starting ===")

# Import numpy/pandas with error handling
try:
    import numpy as np
    import pandas as pd
    logger.info("✓ numpy/pandas imported")
except ImportError as e:
    logger.error(f"Failed to import numpy/pandas: {e}")
    np = None
    pd = None

# Import config with error handling
try:
    from config import settings
    logger.info("✓ config imported")
except ImportError as e:
    logger.error(f"Failed to import config: {e}")
    settings = None

# Import database with error handling
try:
    from database import create_tables
    logger.info("✓ database imported")
except ImportError as e:
    logger.error(f"Failed to import database: {e}")
    def create_tables(): pass

# Import data modules with error handling - these are optional
real_college_suggestions = None
college_names_mapping = {}
nickname_mapper = None
college_subject_emphasis = {}
tuition_state_service = None
college_tuition_service = None
improvement_analysis_service = None
get_colleges_for_major = None
get_major_strength_score = None
get_major_relevance_info = None

try:
    from data.real_ipeds_major_mapping import get_colleges_for_major, get_major_strength_score, get_major_relevance_info
    logger.info("✓ real_ipeds_major_mapping imported")
except Exception as e:
    logger.warning(f"Failed to import real_ipeds_major_mapping: {e}")

try:
    from data.real_college_suggestions import real_college_suggestions
    logger.info("✓ real_college_suggestions imported")
except Exception as e:
    logger.warning(f"Failed to import real_college_suggestions: {e}")

try:
    from data.college_names_mapping import college_names_mapping
    logger.info("✓ college_names_mapping imported")
except Exception as e:
    logger.warning(f"Failed to import college_names_mapping: {e}")

try:
    from data.college_nickname_mapper import nickname_mapper
    logger.info("✓ nickname_mapper imported")
except Exception as e:
    logger.warning(f"Failed to import nickname_mapper: {e}")

try:
    from data.college_subject_emphasis import college_subject_emphasis
    logger.info("✓ college_subject_emphasis imported")
except Exception as e:
    logger.warning(f"Failed to import college_subject_emphasis: {e}")

try:
    from data.tuition_state_service import tuition_state_service
    logger.info("✓ tuition_state_service imported")
except Exception as e:
    logger.warning(f"Failed to import tuition_state_service: {e}")

try:
    from data.college_tuition_service import college_tuition_service
    logger.info("✓ college_tuition_service imported")
except Exception as e:
    logger.warning(f"Failed to import college_tuition_service: {e}")

try:
    from data.improvement_analysis_service import improvement_analysis_service
    logger.info("✓ improvement_analysis_service imported")
except Exception as e:
    logger.warning(f"Failed to import improvement_analysis_service: {e}")

# Simple in-memory cache for college suggestions
suggestion_cache = {}
CACHE_DURATION = 300  # 5 minutes

# Helper functions for JSON-compliant values
def safe_float(value, default=0.0):
    """Convert value to float, handling NaN, None, and infinity"""
    if value is None:
        return default

    # Handle string inputs
    if isinstance(value, str):
        if not value.strip():
            return default
        try:
            float_val = float(value)
        except (ValueError, TypeError):
            return default
    else:
        try:
            float_val = float(value)
        except (ValueError, TypeError):
            return default

    # Check for NaN and infinity - only after conversion to float
    try:
        if pd is not None and pd.isna(float_val):
            return default
        if np is not None and np.isinf(float_val):
            return default
        # Fallback check if numpy/pandas not available
        if float_val != float_val:  # NaN check
            return default
    except (TypeError, ValueError):
        return default

    return float_val

def safe_int(value, default=0):
    """Convert value to int, handling NaN, None, and invalid values"""
    if value is None:
        return default

    # Handle string inputs
    if isinstance(value, str):
        if not value.strip():
            return default
        try:
            int_val = int(float(value))  # Convert via float first to handle "3.0" strings
        except (ValueError, TypeError):
            return default
    else:
        try:
            int_val = int(value)
        except (ValueError, TypeError):
            return default

    return int_val

def safe_round(value, decimals=4, default=0.0):
    """Round value to specified decimals, handling NaN, None, and infinity"""
    safe_val = safe_float(value, default)
    return round(safe_val, decimals)

# Get environment
ENV = os.getenv("ENVIRONMENT", "development")

# Initialize FastAPI app
app = FastAPI(
    title="Chancify AI API",
    description="College admissions probability calculator with personalized game plans",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# IMMEDIATE PING - defined FIRST to prove app is running
@app.get("/ping")
async def ping():
    """Simple ping endpoint - responds immediately without any dependencies"""
    return {"status": "pong", "message": "Chancify AI Backend is alive!"}

"""
Strict CORS configuration.
Important: We cannot use allow_origins=["*"] together with allow_credentials=True,
because browsers will reject credentialed requests (e.g., Authorization headers)
if Access-Control-Allow-Origin is "*".

We explicitly list the frontends that are allowed to call the backend.
"""
# Build allowed origins list safely
_frontend_url = getattr(settings, 'frontend_url', None) if settings else None
allowed_origins = list({
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://chancifyaipresidential.up.railway.app",  # Production frontend
    _frontend_url or "http://localhost:3000",  # From environment variable with fallback
})

allowed_origin_suffixes = (
    ".ngrok-free.dev",
    ".railway.app",
)


def is_allowed_origin(origin: str) -> bool:
    """Check whether the incoming request origin is allowed."""
    if not origin:
        return False

    # Normalize origin (lowercase for comparison)
    origin_lower = origin.lower().strip()

    # Check exact matches (case-insensitive)
    for allowed in allowed_origins:
        if allowed.lower() == origin_lower:
            return True

    # Check suffix matches
    for suffix in allowed_origin_suffixes:
        if origin_lower.endswith(suffix.lower()):
            return True

    return False


@app.middleware("http")
async def custom_cors_middleware(request: Request, call_next):
    """
    CORS middleware - handles ALL CORS requests including preflight OPTIONS.

    CRITICAL: This is the ONLY CORS middleware - FastAPI's CORSMiddleware was removed
    to prevent conflicts. This middleware handles:
    - OPTIONS preflight requests
    - Actual API requests
    - Exact origin matches
    - Suffix-based origin matches (.railway.app, .ngrok-free.dev)
    """
    origin = request.headers.get("origin")
    method = request.method
    path = request.url.path

    # Log all CORS-related requests for debugging
    if origin or method == "OPTIONS":
        logger.info(f"🌐 CORS request - Method: {method}, Origin: {origin}, Path: {path}")

    try:
        # Handle preflight OPTIONS requests FIRST
        if method == "OPTIONS":
            if not origin:
                logger.warning(f"⚠️ OPTIONS request with no origin header - Path: {path}")
                # Return 204 with basic CORS headers
                response = Response(status_code=204)
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,ngrok-skip-browser-warning"
                return response

            # Check if origin is allowed
            origin_allowed = is_allowed_origin(origin)
            logger.info(f"🔍 OPTIONS preflight check - Origin: {origin}, Allowed: {origin_allowed}")

            if origin_allowed:
                # Create response with ALL required CORS headers
                response = Response(status_code=204)
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"

                # Handle requested headers
                requested_headers = request.headers.get("access-control-request-headers", "")
                allowed_headers = "Authorization,Content-Type,ngrok-skip-browser-warning"
                if requested_headers:
                    allowed_headers = f"{allowed_headers},{requested_headers}"
                response.headers["Access-Control-Allow-Headers"] = allowed_headers
                response.headers["Access-Control-Max-Age"] = "86400"
                response.headers["Vary"] = "Origin"

                logger.info(f"✅ CORS preflight ALLOWED - Origin: {origin}, Path: {path}, Headers: {allowed_headers}")
                return response
            else:
                # Origin not allowed
                logger.warning(f"❌ CORS preflight REJECTED - Origin: {origin}, Path: {path}")
                logger.warning(f"   Allowed origins: {allowed_origins}")
                logger.warning(f"   Allowed suffixes: {allowed_origin_suffixes}")
                # Return 204 without CORS headers - browser will block
                return Response(status_code=204)

        # Handle actual requests (GET, POST, etc.)
        # Wrap in try/except to ensure CORS headers are ALWAYS added for allowed origins
        try:
            response = await call_next(request)
        except Exception as inner_e:
            logger.error(f"❌ Error processing request: {inner_e}", exc_info=True)
            # Create error response
            response = Response(
                status_code=500,
                content='{"detail": "Internal server error"}',
                media_type="application/json"
            )

        # CRITICAL: Add CORS headers to ALL responses (including errors) if origin is allowed
        # This ensures the browser can read the error response
        if origin:
            origin_allowed = is_allowed_origin(origin)
            if origin_allowed:
                # Add ALL required CORS headers - even for error responses
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,ngrok-skip-browser-warning"
                response.headers["Access-Control-Max-Age"] = "86400"
                response.headers["Vary"] = "Origin"
                logger.info(f"✅ CORS headers added - Origin: {origin}, Path: {path}, Method: {method}, Status: {response.status_code}")
            else:
                logger.warning(f"❌ CORS rejected - Origin: {origin}, Path: {path}, Method: {method}")
        else:
            # No origin - might be same-origin or direct request
            logger.debug(f"Request without origin header - Path: {path}, Method: {method}")

        return response

    except Exception as e:
        logger.error(f"❌ CORS middleware EXCEPTION: {e}", exc_info=True)
        # Create error response with CORS headers
        response = Response(
            status_code=500,
            content='{"detail": "Internal server error"}',
            media_type="application/json"
        )

        # CRITICAL: Always add CORS headers for allowed origins, even on middleware errors
        if origin and is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,ngrok-skip-browser-warning"
            response.headers["Vary"] = "Origin"
            logger.info(f"✅ CORS headers added after middleware error - Origin: {origin}")

        return response

# REMOVED FastAPI CORSMiddleware - using ONLY custom middleware
# FastAPI's CORSMiddleware was interfering with our custom CORS handling
# Our custom middleware handles ALL CORS including exact matches and suffix-based matching
# This ensures OPTIONS preflight requests are handled correctly with proper headers

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables."""
    logger.info(f"Starting Chancify AI API in {ENV} mode")
    logger.info(f"Python path: {os.environ.get('PYTHONPATH', 'not set')}")
    logger.info(f"Working directory: {os.getcwd()}")

    try:
        create_tables()
        logger.info("✓ Database tables created/verified successfully")
    except Exception as e:
        logger.warning(f"⚠ Database initialization failed: {e}")
        logger.warning("  API will continue without database features")

    logger.info("✓ Chancify AI API started successfully")

@app.get("/")
async def root():
    """Root health check endpoint"""
    return {
        "status": "healthy",
        "message": "Chancify AI API is running",
        "version": "0.1.0",
        "environment": ENV
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check for Railway"""
    # Test database connection
    db_status = "unknown"
    try:
        from database.connection import engine
        from sqlalchemy import text
        if engine is not None:
            # Try a simple query to verify connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_status = "connected"
        else:
            db_status = "not_initialized"
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        db_status = "error"

    return {
        "status": "healthy",
        "database": db_status,
        "scoring_system": "loaded",
        "environment": ENV,
        "port": os.environ.get("PORT", "8000")
    }

@app.get("/api/search/colleges")
async def search_colleges(q: str = "", limit: int = 20):
    """
    Search colleges by name, nickname, or abbreviation.

    This endpoint searches through official names, common names, and abbreviations
    to find colleges matching the query.

    Args:
        q: Search query (college name, nickname, or abbreviation)
        limit: Maximum number of results to return (default: 20, max: 100)

    Returns:
        JSON response with matching colleges and their data
    """
    try:
        # Validate limit
        limit = min(max(1, limit), 100)

        if not q or len(q.strip()) < 2:
            return {
                "success": True,
                "colleges": [],
                "total": 0,
                "message": "Please provide a search query with at least 2 characters"
            }

        # Use already loaded dataset if available to avoid IO and path issues
        try:
            college_df = real_college_suggestions.college_df
            if college_df is None or getattr(college_df, 'empty', False):
                # Fallback to CSV path - try multiple locations
                possible_paths = [
                    os.path.join(os.path.dirname(__file__), 'data', 'raw', 'real_colleges_integrated.csv'),  # Relative to main.py
                    os.path.join(os.getcwd(), 'backend', 'data', 'raw', 'real_colleges_integrated.csv'),  # From project root
                    'data/raw/real_colleges_integrated.csv',  # Relative to current working directory
                ]

                csv_path = None
                for path in possible_paths:
                    if os.path.exists(path):
                        csv_path = path
                        break

                if csv_path:
                    college_df = pd.read_csv(csv_path)
                else:
                    logger.warning(f"Could not find real_colleges_integrated.csv. Tried: {possible_paths}")
        except Exception as e:
            logger.error(f"Error loading college data: {e}")
            return {
                "success": False,
                "colleges": [],
                "total": 0,
                "error": f"Unable to load college data: {e}"
            }

        # Search for colleges directly in the CSV data
        query = q.strip().lower()
        matching_colleges = []

        # First, try to find college by nickname/abbreviation
        official_name = nickname_mapper.find_college_by_nickname(q)
        logger.info(f"Nickname search for '{q}': {official_name}")

        # If we found an official name from nickname mapping, search for that
        if official_name:
            logger.info(f"Searching for official name: {official_name}")
            for _, row in college_df.iterrows():
                college_name = str(row.get('name', '')).lower()
                if official_name.lower() in college_name or college_name in official_name.lower():
                    matching_colleges.append(row)
                    logger.info(f"Found match: {row.get('name', '')}")

        # If no matches from nickname mapping, do regular search
        if not matching_colleges:
            logger.info(f"No nickname matches, doing regular search for: {query}")

            # Search through college names
            for _, row in college_df.iterrows():
                college_name = str(row.get('name', '')).lower()
                if query in college_name:
                    matching_colleges.append(row)

            # If still no matches, try broader search
            if not matching_colleges:
                logger.info("No direct matches, trying broader search")
                for _, row in college_df.iterrows():
                    college_name = str(row.get('name', '')).lower()
                    city = str(row.get('city', '')).lower()
                    state = str(row.get('state', '')).lower()

                    if (query in city or query in state or
                        any(word.startswith(query) for word in college_name.split())):
                        matching_colleges.append(row)

        # Limit results
        matching_colleges = matching_colleges[:limit]

        if not matching_colleges:
            return {
                "success": True,
                "colleges": [],
                "total": 0,
                "message": f"No colleges found matching '{q}'"
            }

        # Format results
        results = []
        for row in matching_colleges:
            college_data = {
                "college_id": f"college_{row.get('unitid', 'unknown')}",
                "name": row.get('name', ''),
                "acceptance_rate": safe_float(row.get('acceptance_rate', 0.5), 0.5),
                "selectivity_tier": row.get('selectivity_tier', 'Moderately Selective'),
                "city": row.get('city', ''),
                "state": row.get('state', ''),
                "tuition_in_state": safe_float(row.get('tuition_in_state_usd', 0), 0),
                "tuition_out_of_state": safe_float(row.get('tuition_out_of_state_usd', 0), 0),
                "student_body_size": safe_float(row.get('student_body_size', 0), 0),
                "name_variations": {
                    "official": row.get('name', '').lower(),
                    "common": row.get('name', '').lower()  # Use same as official for now
                }
            }
            results.append(college_data)

        return {
            "success": True,
            "colleges": results,
            "total": len(results),
            "query": q,
            "nickname_matched": official_name is not None,
            "message": f"Found {len(results)} colleges matching '{q}'"
        }

    except Exception as e:
        logger.error(f"Error in search_colleges: {e}")
        return {
            "success": False,
            "colleges": [],
            "total": 0,
            "error": str(e)
        }

@app.get("/api/college-subject-emphasis/{college_name}",
         summary="Get college subject emphasis",
         description="Get real-time subject emphasis percentages for a college using OpenAI API",
         tags=["College Subject Emphasis"])
async def get_college_subject_emphasis(college_name: str):
    """
    Get subject emphasis percentages for a specific college.

    This endpoint uses OpenAI API to analyze the college's academic focus
    and return percentage emphasis for different subject areas.

    Args:
        college_name: Name of the college

    Returns:
        JSON response with subject emphasis percentages
    """
    try:
        logger.info(f"Getting subject emphasis for: {college_name}")

        # Get subject emphasis data
        subject_data = college_subject_emphasis.get_subject_emphasis_with_cache(college_name, suggestion_cache)

        # Format for frontend
        subjects = []
        for subject, percentage in subject_data.items():
            subjects.append({
                "label": subject,
                "value": percentage
            })

        logger.info(f"Subject emphasis retrieved for {college_name}: {len(subjects)} subjects")

        return {
            "success": True,
            "college_name": college_name,
            "subjects": subjects,
            "total_subjects": len(subjects)
        }

    except Exception as e:
        logger.error(f"Error getting subject emphasis for {college_name}: {e}")
        return {
            "success": False,
            "college_name": college_name,
            "subjects": [],
            "error": str(e)
        }

@app.get("/api/college-tuition/{college_name}",
         summary="Get college tuition data",
         description="Get real tuition and cost data for a college",
         tags=["College Tuition"])
async def get_college_tuition(college_name: str):
    """
    Get tuition and cost data for a specific college.

    This endpoint returns real tuition, fees, room & board, and other costs
    for the specified college.

    Args:
        college_name: Name of the college

    Returns:
        JSON response with tuition and cost information
    """
    try:
        logger.info(f"Getting tuition data for: {college_name}")

        # Get tuition data
        tuition_data = college_tuition_service.get_tuition_data_with_cache(college_name, suggestion_cache)

        logger.info(f"Tuition data retrieved for {college_name}: ${tuition_data['total_in_state']:,} total")

        return {
            "success": True,
            "college_name": college_name,
            "tuition_data": tuition_data
        }

    except Exception as e:
        logger.error(f"Error getting tuition data for {college_name}: {e}")
        return {
            "success": False,
            "college_name": college_name,
            "tuition_data": None,
            "error": str(e)
        }

@app.get("/api/tuition-by-zipcode/{college_name}/{zipcode}",
         summary="Get tuition based on zipcode",
         description="Get in-state or out-of-state tuition for a college based on zipcode",
         tags=["Tuition State"])
async def get_tuition_by_zipcode(college_name: str, zipcode: str):
    """
    Get tuition information for a college based on zipcode.

    This endpoint determines if the zipcode qualifies for in-state tuition
    and returns the appropriate tuition amount.

    Args:
        college_name: Name of the college
        zipcode: User's zipcode

    Returns:
        JSON response with tuition information and state determination
    """
    try:
        logger.info(f"Getting tuition for {college_name} with zipcode {zipcode}")

        # Get tuition data based on zipcode
        result = tuition_state_service.get_tuition_for_college_and_zipcode(college_name, zipcode)

        if result['success']:
            logger.info(f"Tuition determined for {college_name}: ${result['tuition']:,} ({'in-state' if result['is_in_state'] else 'out-of-state'})")

        return result

    except Exception as e:
        logger.error(f"Error getting tuition for {college_name} with zipcode {zipcode}: {e}")
        return {
            "success": False,
            "error": str(e),
            "college_name": college_name,
            "zipcode": zipcode,
            "is_in_state": None,
            "tuition": None
        }

@app.post("/api/improvement-analysis/{college_name}",
         summary="Get personalized improvement recommendations",
         description="Analyze user profile against college requirements and provide improvement areas",
         tags=["Improvement Analysis"])
async def get_improvement_analysis(college_name: str, user_profile: Dict[str, Any]):
    """
    Get personalized improvement recommendations for a specific college.

    This endpoint analyzes the user's profile against the college's requirements
    and provides specific, actionable improvement areas.

    Args:
        college_name: Name of the college
        user_profile: User's academic and extracurricular profile

    Returns:
        JSON response with improvement areas and recommendations
    """
    try:
        logger.info(f"Getting improvement analysis for {college_name}")

        # Get improvement recommendations
        improvements = improvement_analysis_service.analyze_user_profile(user_profile, college_name)

        # Calculate combined impact
        combined_impact = improvement_analysis_service.calculate_combined_impact(improvements)

        # Convert to JSON-serializable format
        improvements_data = []
        for imp in improvements:
            improvements_data.append({
                "area": imp.area,
                "current": imp.current,
                "target": imp.target,
                "impact": imp.impact,
                "priority": imp.priority,
                "description": imp.description,
                "actionable_steps": imp.actionable_steps
            })

        result = {
            "success": True,
            "college_name": college_name,
            "improvements": improvements_data,
            "combined_impact": combined_impact,
            "total_improvements": len(improvements)
        }

        logger.info(f"Generated {len(improvements)} improvement recommendations for {college_name}")
        return result

    except Exception as e:
        logger.error(f"Error getting improvement analysis for {college_name}: {e}")
        return {
            "success": False,
            "error": str(e),
            "college_name": college_name,
            "improvements": [],
            "combined_impact": 0
        }

# Include API routes
from api.routes import calculations, ml_calculations, openai_routes, auth
from services.openai_service import college_info_service
from ml.models.predictor import get_predictor
from ml.preprocessing.feature_extractor import StudentFeatures, CollegeFeatures
from pydantic import BaseModel
import pandas as pd

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(calculations.router, prefix="/api/calculations", tags=["Probability Calculations"])
app.include_router(ml_calculations.router, prefix="/api/calculations", tags=["ML Predictions"])
app.include_router(openai_routes.router, prefix="/api/openai", tags=["OpenAI College Info"])

# College data mapping based on training data
def get_college_data(college_name: str) -> Dict[str, Any]:
    """Get college data based on college name from integrated data."""

    logger.info(f"Getting college data for: {college_name}")

    # Load the integrated college data
    try:
        # Try multiple possible paths
        possible_paths = [
            os.path.join(os.path.dirname(__file__), 'data', 'raw', 'real_colleges_integrated.csv'),  # Relative to main.py
            'data/raw/real_colleges_integrated.csv',  # Relative to current working directory
            os.path.join(os.getcwd(), 'backend', 'data', 'raw', 'real_colleges_integrated.csv'),  # From project root
        ]

        csv_path = None
        for path in possible_paths:
            if os.path.exists(path):
                csv_path = path
                break

        if csv_path:
            df = pd.read_csv(csv_path)
            logger.info(f"Loaded college data: {df.shape} from {csv_path}")
        else:
            raise FileNotFoundError(f"Could not find real_colleges_integrated.csv. Tried: {possible_paths}")

        # Check if the input is a college ID (format: college_XXXXXX)
        college_row = None
        if college_name.startswith('college_'):
            college_id = college_name.replace('college_', '')
            logger.info(f"Looking for college ID: {college_id}")

            # Try to find by unitid (MOST COMMON CASE)
            college_row = df[df['unitid'] == int(college_id)]
            logger.info(f"Found by unitid: {len(college_row)} rows")

            if not college_row.empty:
                logger.info(f"✅ SUCCESS: Found college by ID")
            else:
                logger.warning(f"❌ FAILED: No college found with unitid={college_id}")
        else:
            # Find the college by name (case-insensitive, with exact matching first)
            college_name_lower = college_name.lower()
            college_row = df[df['name'].str.lower() == college_name_lower]
            logger.info(f"Exact match found: {len(college_row)} rows")

            # If exact match not found, try partial matching but prefer shorter matches
            if college_row.empty:
                college_row = df[df['name'].str.lower().str.contains(college_name_lower, na=False)]
                logger.info(f"Partial match found: {len(college_row)} rows")
                # If multiple matches, prefer the one with the shortest name (most specific)
                if not college_row.empty and len(college_row) > 1:
                    # Just take the first match since they all contain the query
                    college_row = college_row.iloc[[0]]

        if college_row is not None and not college_row.empty:
            row = college_row.iloc[0]
            logger.info(f"Found college: {row['name']}")
            # Debug: Print all column names and the name value
            logger.info(f"CSV columns: {list(row.index)}")
            logger.info(f"Row name value: {row.get('name', 'MISSING_NAME_COLUMN')}")
            logger.info(f"Row name type: {type(row.get('name'))}")
            logger.info(f"Row name is NaN: {pd.isna(row.get('name'))}")

            # Try to get name from different possible column names
            college_actual_name = None
            if pd.notna(row.get('name')):
                college_actual_name = str(row['name'])
            elif pd.notna(row.get('Name')):
                college_actual_name = str(row['Name'])
            elif pd.notna(row.get('institution_name')):
                college_actual_name = str(row['institution_name'])
            else:
                college_actual_name = college_name  # Fallback to original input

            result = {
                'name': college_actual_name,
                'acceptance_rate': float(row.get('acceptance_rate', 0.5)) if pd.notna(row.get('acceptance_rate')) else (float(row.get('acceptance_rate_percent', 50)) / 100 if pd.notna(row.get('acceptance_rate_percent')) else 0.5),
                'sat_25th': 1200,  # Default values since SAT/ACT data not available
                'sat_75th': 1500,
                'act_25th': 25,
                'act_75th': 35,
                'test_policy': str(row.get('test_policy', 'Required')),
                'financial_aid_policy': str(row.get('financial_aid_policy', 'Need-blind')),
                'selectivity_tier': str(row.get('selectivity_tier', 'Moderately Selective')),
                'gpa_average': float(row.get('gpa_average', 3.7)) if pd.notna(row.get('gpa_average')) else 3.7,
                'city': str(row.get('city', 'Unknown')) if pd.notna(row.get('city')) else "Unknown",
                'state': str(row.get('state', 'Unknown')) if pd.notna(row.get('state')) else "Unknown",
                'tuition_in_state': int(row.get('tuition_in_state_usd', 20000)) if pd.notna(row.get('tuition_in_state_usd')) else 20000,
                'tuition_out_of_state': int(row.get('tuition_out_of_state_usd', 40000)) if pd.notna(row.get('tuition_out_of_state_usd')) else 40000,
                'student_body_size': int(row.get('student_body_size', 5000)) if pd.notna(row.get('student_body_size')) else 5000,
                'is_public': str(row.get('control', 'Private')).lower() == 'public' if pd.notna(row.get('control')) else False
            }
            logger.info(f"Returning college data: {result}")
            return result
        else:
            logger.warning(f"No college found for: {college_name}")
    except Exception as e:
        logger.warning(f"Could not load college data: {e}")

    # Default fallback data
    logger.info(f"Returning fallback data for: {college_name}")
    return {
        'name': college_name,
        'acceptance_rate': 0.1,
        'sat_25th': 1200,
        'sat_75th': 1500,
        'act_25th': 25,
        'act_75th': 35,
        'test_policy': 'Required',
        'financial_aid_policy': 'Need-blind',
        'selectivity_tier': 'Elite',
        'gpa_average': 3.7,
        'city': "Unknown",
        'state': "Unknown",
        'tuition_in_state': 20000,
        'tuition_out_of_state': 40000,
        'student_body_size': 5000
    }

# Frontend profile request model (matches frontend format)
class FrontendProfileRequest(BaseModel):
    # Academic data
    gpa_unweighted: str = "3.5"
    gpa_weighted: str = "3.8"
    sat: str = "1200"
    act: str = "25"

    # Course rigor and class info
    rigor: str = "5"
    ap_count: str = "0"
    honors_count: str = "0"
    class_rank_percentile: str = "50"
    class_size: str = "300"

    # Factor scores (1-10 scale from frontend dropdowns)
    extracurricular_depth: str = "5"
    leadership_positions: str = "5"
    awards_publications: str = "5"
    passion_projects: str = "5"
    business_ventures: str = "5"
    volunteer_work: str = "5"
    research_experience: str = "5"
    portfolio_audition: str = "5"
    essay_quality: str = "5"
    recommendations: str = "5"
    interview: str = "5"
    demonstrated_interest: str = "5"
    legacy_status: str = "5"
    hs_reputation: str = "5"

    # Additional ML model fields (derived from dropdowns)
    geographic_diversity: str = "5"
    plan_timing: str = "5"
    geography_residency: str = "5"
    firstgen_diversity: str = "5"
    ability_to_pay: str = "5"
    policy_knob: str = "5"
    conduct_record: str = "9"

    # Major and college
    major: str = "Computer Science"
    college: str = "Stanford University"

# Legacy prediction request model (for backward compatibility)
class PredictionRequest(BaseModel):
    # Academic data
    gpa_unweighted: float
    gpa_weighted: float
    sat: int
    act: int
    rigor: int

    # Unique factors
    extracurricular_depth: int
    leadership_positions: int
    awards_publications: int
    passion_projects: int
    business_ventures: int
    volunteer_work: int
    research_experience: int
    portfolio_audition: int
    essay_quality: int
    recommendations: int
    interview: int
    demonstrated_interest: int
    legacy_status: int
    geographic_diversity: int
    firstgen_diversity: int
    major: str
    hs_reputation: int

    # College selection
    college: str

@app.post("/api/predict/frontend")
async def predict_admission_frontend(request: FrontendProfileRequest):
    """Predict admission probability using hybrid ML+Formula system for frontend"""
    try:
        # Get predictor
        predictor = get_predictor()

        # Convert frontend string values to appropriate types
        def safe_int(value: str) -> int:
            try:
                return int(value) if value and value.strip() else 0
            except (ValueError, TypeError):
                return 0

        # Calculate derived factor scores from real data
        gpa_unweighted = safe_float(request.gpa_unweighted)
        gpa_weighted = safe_float(request.gpa_weighted)
        sat_score = safe_int(request.sat)
        act_score = safe_int(request.act)

        # Calculate grades score from GPA (0-10 scale)
        def calculate_grades_score(gpa_unweighted, gpa_weighted):
            if gpa_unweighted > 0:
                # Convert 4.0 scale to 10.0 scale
                return min(10.0, (gpa_unweighted / 4.0) * 10.0)
            elif gpa_weighted > 0:
                # Convert 5.0 scale to 10.0 scale
                return min(10.0, (gpa_weighted / 5.0) * 10.0)
            return 5.0  # Default neutral

        # Calculate testing score from SAT/ACT (0-10 scale)
        def calculate_testing_score(sat, act):
            if sat > 0:
                # FIXED: More realistic SAT scoring - 1200=5.0, 1600=10.0
                return min(10.0, max(0.0, ((sat - 1200) / 400) * 5.0 + 5.0))
            elif act > 0:
                # FIXED: More realistic ACT scoring - 20=5.0, 36=10.0
                return min(10.0, max(0.0, ((act - 20) / 16) * 5.0 + 5.0))
            return 5.0  # Default neutral

        # Calculate major fit score based on major relevance
        def calculate_major_fit_score(major, college_name):
            # This would ideally use a major-college relevance database
            # For now, use a simple heuristic based on major popularity
            popular_majors = ['Computer Science', 'Business', 'Engineering', 'Biology', 'Psychology']
            if major in popular_majors:
                return 7.0  # Good fit for popular majors
            return 6.0  # Neutral fit

        # Create student features from frontend data
        student = StudentFeatures(
            # Academic metrics
            gpa_unweighted=gpa_unweighted,
            gpa_weighted=gpa_weighted,
            sat_total=sat_score,
            act_composite=act_score,

            # Course rigor and class info
            ap_count=int(safe_float(request.extracurricular_depth) * 2),  # Estimate based on extracurricular depth
            honors_count=int(safe_float(request.extracurricular_depth) * 1.5),  # Estimate based on extracurricular depth
            class_rank_percentile=safe_float(request.hs_reputation) * 10,  # Estimate based on HS reputation
            class_size=500,  # Default class size

            # Extracurricular counts and commitment
            ec_count=min(10, max(1, safe_int(request.extracurricular_depth) // 2)),  # Derive from extracurricular depth
            leadership_positions_count=safe_int(request.leadership_positions),
            years_commitment=min(6, max(1, safe_int(request.extracurricular_depth) // 2)),  # Derive from extracurricular depth
            hours_per_week=min(20.0, max(2.0, safe_float(request.extracurricular_depth) * 1.5)),  # Derive from extracurricular depth
            awards_count=safe_int(request.awards_publications),
            national_awards=min(5, max(0, safe_int(request.awards_publications) // 2)),  # Derive from awards/publications

            # Demographics and diversity
            first_generation=safe_float(request.firstgen_diversity) > 7.0,  # Derive from firstgen_diversity
            underrepresented_minority=safe_float(request.firstgen_diversity) > 6.0,  # Derive from firstgen_diversity
            geographic_diversity=safe_float(request.geographic_diversity),
            legacy_status=bool(safe_int(request.legacy_status)),
            recruited_athlete=safe_float(request.volunteer_work) > 7.0,  # Derive from volunteer_work

            # Factor scores (calculated from real data, not defaults)
            factor_scores={
                'grades': calculate_grades_score(gpa_unweighted, gpa_weighted),
                'rigor': safe_float(request.extracurricular_depth),  # Use extracurricular depth as rigor proxy
                'testing': calculate_testing_score(sat_score, act_score),
                'essay': safe_float(request.essay_quality),
                'ecs_leadership': safe_float(request.extracurricular_depth),
                'recommendations': safe_float(request.recommendations),
                'plan_timing': safe_float(request.plan_timing),
                'athletic_recruit': safe_float(request.volunteer_work),  # Use volunteer_work as proxy
                'major_fit': calculate_major_fit_score(request.major, "Unknown"),  # No specific college for suggestions
                'geography_residency': safe_float(request.geography_residency),
                'firstgen_diversity': safe_float(request.firstgen_diversity),
                'ability_to_pay': safe_float(request.ability_to_pay),
                'awards_publications': safe_float(request.awards_publications),
                'portfolio_audition': safe_float(request.portfolio_audition),
                'policy_knob': safe_float(request.policy_knob),
                'demonstrated_interest': safe_float(request.demonstrated_interest),
                'legacy': safe_float(request.legacy_status),
                'interview': safe_float(request.interview),
                'conduct_record': safe_float(request.conduct_record),
                'hs_reputation': safe_float(request.hs_reputation)
            }
        )

        # Get college data with real acceptance rate from OpenAI
        college_data = get_college_data(request.college)
        logger.info(f"College data retrieved: {college_data}")
        logger.info(f"College name: {college_data.get('name', 'MISSING')}")
        logger.info(f"College city: {college_data.get('city', 'MISSING')}")
        logger.info(f"College state: {college_data.get('state', 'MISSING')}")

        # Get real acceptance rate and subject emphasis from OpenAI API
        try:
            college_info = await college_info_service.get_college_info(college_data['name'])
            real_acceptance_rate = college_info['academics']['acceptance_rate']
            print(f"Using real acceptance rate for {college_data['name']}: {real_acceptance_rate:.1%}")

            # Get subject emphasis data
            subject_data = await college_info_service.get_college_subject_emphasis(college_data['name'])
            subject_emphasis = subject_data['subject_emphasis']
            print(f"Using real subject emphasis for {college_data['name']}: {len(subject_emphasis)} subjects")
        except Exception as e:
            print(f"Failed to get OpenAI data for {college_data['name']}: {e}")
            real_acceptance_rate = college_data['acceptance_rate']  # Fallback to database value
            subject_emphasis = [
                {"label": "Computer Science", "value": 28},
                {"label": "Engineering", "value": 24},
                {"label": "Business", "value": 16},
                {"label": "Biological Sciences", "value": 14},
                {"label": "Mathematics & Stats", "value": 11},
                {"label": "Social Sciences", "value": 9},
                {"label": "Arts & Humanities", "value": 7},
                {"label": "Education", "value": 5}
            ]

        college = CollegeFeatures(
            name=college_data['name'],
            acceptance_rate=real_acceptance_rate,  # Use real acceptance rate from OpenAI
            sat_25th=college_data['sat_25th'],
            sat_75th=college_data['sat_75th'],
            act_25th=college_data['act_25th'],
            act_75th=college_data['act_75th'],
            test_policy=college_data['test_policy'],
            financial_aid_policy=college_data['financial_aid_policy'],
            selectivity_tier=college_data['selectivity_tier'],
            gpa_average=college_data['gpa_average']
        )

        # Make hybrid prediction
        result = predictor.predict(student, college, model_name='ensemble', use_formula=True)

        # Determine category based on final probability
        # Use same thresholds as suggestions endpoint: Safety: 75%+, Target: 25-75%, Reach: 10-25%
        prob = result.probability
        if prob >= 0.75:
            category = "safety"
        elif prob >= 0.25:
            category = "target"
        elif prob >= 0.10:
            category = "reach"
        else:
            category = "reach"  # Default to reach for very low probabilities

        return {
            "success": True,
            "college_id": request.college,
            "college_name": college_data['name'],
            "probability": round(result.probability, 4),
            "confidence_interval": {
                "lower": round(result.confidence_interval[0], 4),
                "upper": round(result.confidence_interval[1], 4)
            },
            "ml_probability": round(result.ml_probability, 4),
            "formula_probability": round(result.formula_probability, 4),
            "ml_confidence": round(result.ml_confidence, 4),
            "blend_weights": result.blend_weights,
            "model_used": result.model_used,
            "prediction_method": "hybrid_ml_formula",
            "explanation": result.explanation,
            "category": category,
            "acceptance_rate": real_acceptance_rate,  # Use real acceptance rate from OpenAI
            "selectivity_tier": college_data['selectivity_tier'],
            # Return full college data for frontend
            "college_data": {
                "name": college_data['name'],
                "city": college_data['city'],
                "state": college_data['state'],
                "is_public": college_data.get('is_public', False),
                "tuition_in_state": college_data['tuition_in_state'],
                "tuition_out_of_state": college_data['tuition_out_of_state'],
                "student_body_size": college_data['student_body_size'],
                "test_policy": college_data['test_policy'],
                "financial_aid_policy": college_data['financial_aid_policy'],
                "gpa_average": college_data['gpa_average']
            },
            # Return subject emphasis data from OpenAI
            "subject_emphasis": subject_emphasis
        }

    except Exception as e:
        logger.error(f"Frontend prediction error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Prediction failed. Please try again."
        }

# College suggestions request model (simplified)
# This model receives user profile data from the frontend and generates
# AI-powered college suggestions based on academic strength and preferences
# Updated with elite universities integration - 19 elite universities now included
class CollegeSuggestionsRequest(BaseModel):
    # Essential academic data - core metrics for college admissions
    gpa_unweighted: str = "3.5"      # Unweighted GPA (0.0-4.0 scale)
    gpa_weighted: str = "3.8"        # Weighted GPA (0.0-5.0+ scale)
    sat: str = "1200"                 # SAT total score (400-1600)
    act: str = "25"                   # ACT composite score (1-36)
    major: str = "Computer Science"   # Intended major of study

    # Factor scores (1-10 scale from frontend dropdowns)
    # These represent the user's strength in various admission factors
    extracurricular_depth: str = "5"      # Depth and commitment to activities
    leadership_positions: str = "5"       # Leadership roles and responsibilities
    awards_publications: str = "5"        # Awards, honors, and publications
    passion_projects: str = "5"           # Personal projects and initiatives
    business_ventures: str = "5"          # Entrepreneurial activities
    volunteer_work: str = "5"             # Community service and volunteering
    research_experience: str = "5"        # Academic research involvement
    portfolio_audition: str = "5"         # Creative portfolio or audition quality
    essay_quality: str = "5"              # Personal statement and essay quality
    recommendations: str = "5"            # Letter of recommendation strength
    interview: str = "5"                  # Interview performance
    demonstrated_interest: str = "5"      # Show of interest in specific colleges
    legacy_status: str = "5"              # Legacy status (family alumni)
    hs_reputation: str = "5"              # High school reputation and rigor

    # Additional ML model fields (derived from dropdowns)
    # These provide additional context for the ML model
    geographic_diversity: str = "5"       # Geographic diversity factor
    plan_timing: str = "5"                # Application timing (early/regular)
    geography_residency: str = "5"        # In-state vs out-of-state status
    firstgen_diversity: str = "5"         # First-generation college student status
    ability_to_pay: str = "5"             # Financial need and ability to pay
    policy_knob: str = "5"                # Policy-related factors
    conduct_record: str = "9"             # Disciplinary record status

@app.post("/api/suggest/colleges")
async def suggest_colleges(request: CollegeSuggestionsRequest):
    """
    Get AI-suggested colleges based on user profile using real IPEDS data.

    This endpoint:
    1. Processes user profile data from frontend
    2. Calculates academic strength score
    3. Uses real IPEDS data to find colleges strong in the user's major
    4. Categorizes colleges into Safety/Target/Reach based on realistic probability ranges
    5. Returns balanced suggestions (3 safety, 3 target, 3 reach) with accurate major relevance

    Args:
        request: CollegeSuggestionsRequest containing user profile data

    Returns:
        JSON response with 9 balanced college suggestions and metadata
    """
    try:
        # Create cache key from request data
        cache_key = f"{request.gpa_unweighted}_{request.gpa_weighted}_{request.sat}_{request.act}_{request.major}_{request.extracurricular_depth}"

        # Check cache first
        current_time = time.time()
        if cache_key in suggestion_cache:
            cached_data, cache_time = suggestion_cache[cache_key]
            if current_time - cache_time < CACHE_DURATION:
                logger.info(f"Returning cached suggestions for key: {cache_key[:20]}...")
                return cached_data

        logger.info(f"Processing new suggestions for key: {cache_key[:20]}...")

        # Convert frontend string values to appropriate types
        def safe_int(value: str) -> int:
            try:
                return int(value) if value and value.strip() else 0
            except (ValueError, TypeError):
                return 0

        # Calculate academic strength
        gpa_unweighted = safe_float(request.gpa_unweighted)
        gpa_weighted = safe_float(request.gpa_weighted)
        sat_score = safe_int(request.sat)
        act_score = safe_int(request.act)

        # Calculate academic strength (0-10 scale)
        gpa_score = min(10.0, (gpa_unweighted / 4.0) * 10.0) if gpa_unweighted > 0 else 5.0
        sat_score_scaled = min(10.0, max(0.0, ((sat_score - 1200) / 400) * 5.0 + 5.0)) if sat_score > 0 else 5.0
        act_score_scaled = min(10.0, max(0.0, ((act_score - 20) / 16) * 5.0 + 5.0)) if act_score > 0 else 5.0

        # Use the higher of SAT or ACT
        test_score = max(sat_score_scaled, act_score_scaled)

        # Calculate academic strength (0-10 scale)
        academic_strength = (gpa_score + test_score) / 2.0

        # Calculate extracurricular strength
        ec_strength = (
            safe_float(request.extracurricular_depth) +
            safe_float(request.leadership_positions) +
            safe_float(request.awards_publications) +
            safe_float(request.passion_projects)
        ) / 4.0

        # Calculate overall student strength
        student_strength = (academic_strength * 0.7) + (ec_strength * 0.3)

        # Get real college suggestions based on major
        major = request.major

        # Try to get balanced suggestions from real IPEDS data
        try:
            college_suggestions = real_college_suggestions.get_balanced_suggestions(major, student_strength)

            # If we don't have enough suggestions, use fallback
            if len(college_suggestions) < 9:
                college_suggestions = real_college_suggestions.get_fallback_suggestions(major, student_strength)

        except Exception as e:
            logger.error(f"Error getting real college suggestions: {e}")
            college_suggestions = real_college_suggestions.get_fallback_suggestions(major, student_strength)


        # Convert to API response format
        suggestions = []
        for college_data in college_suggestions[:9]:  # Ensure exactly 9 suggestions
            college_name = college_data['name']

            # Use the probability already calculated by the real_college_suggestions system
            probability = college_data.get('probability', 0.5)

            # Get major relevance info
            major_relevance = get_major_relevance_info(college_name, major)

            # Handle NaN values for enrollment
            student_body_size = college_data['student_body_size']
            if pd.isna(student_body_size) or student_body_size is None:
                enrollment_str = "N/A"
                student_body_size = 0
            else:
                enrollment_str = f"{int(student_body_size):,}"

            suggestion = {
                'college_id': f"college_{college_data['unitid']}",
                'name': college_name,
                'probability': safe_round(probability, 4),
                'original_probability': safe_round(probability, 4),
                'major_fit_score': safe_round(college_data['major_fit_score'], 2),
                'confidence_interval': {
                    "lower": safe_round(max(0.01, probability - 0.1), 4),
                    "upper": safe_round(min(0.95, probability + 0.1), 4)
                },
                'acceptance_rate': safe_float(college_data['acceptance_rate'], 0.5),
                'selectivity_tier': college_data['selectivity_tier'],
                'tier': college_data['selectivity_tier'],
                'city': college_data['city'],
                'state': college_data['state'],
                'tuition_in_state': safe_float(college_data['tuition_in_state'], 0),
                'tuition_out_of_state': safe_float(college_data['tuition_out_of_state'], 0),
                'student_body_size': safe_float(student_body_size, 0),
                'enrollment': enrollment_str,
                'category': college_data['category'],
                'major_match': major_relevance['match_level'],
                'major_relevance_score': safe_round(major_relevance['score'], 2)
            }

            suggestions.append(suggestion)

        # Calculate academic score for response (ensure JSON-compliant)
        academic_score = safe_float((gpa_unweighted * 25) + (sat_score * 0.1) + (act_score * 2.5) + (ec_strength * 5), 0)

        # Determine target tiers based on academic strength
        target_tiers = []
        if academic_strength >= 8.0:
            target_tiers = ['Elite', 'Highly Selective']
        elif academic_strength >= 6.0:
            target_tiers = ['Highly Selective', 'Moderately Selective']
        else:
            target_tiers = ['Moderately Selective', 'Less Selective']

        # Prepare response
        response_data = {
            "success": True,
            "suggestions": suggestions,
            "academic_score": round(academic_score, 2),
            "target_tiers": target_tiers,
            "prediction_method": "real_ipeds_data"
        }

        # Cache the response
        suggestion_cache[cache_key] = (response_data, current_time)

        logger.info(f"Cached suggestions for key: {cache_key[:20]}...")

        return response_data

    except Exception as e:
        logger.error(f"Error in suggest_colleges: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e), "suggestions": [], "traceback": traceback.format_exc()}

@app.post("/predict")
async def predict_admission(request: PredictionRequest):
    """Predict admission probability using ML model"""
    try:
        # Get predictor
        predictor = get_predictor()

        # Create student features
        student = StudentFeatures(
            gpa_unweighted=request.gpa_unweighted,
            gpa_weighted=request.gpa_weighted,
            sat_score=request.sat,
            act_score=request.act,
            rigor_score=request.extracurricular_depth / 10.0,  # Convert to 0-1 scale
            factor_scores={
                'extracurricular_depth': request.extracurricular_depth / 10.0,
                'leadership_positions': request.leadership_positions / 10.0,
                'awards_publications': request.awards_publications / 10.0,
                'passion_projects': request.passion_projects / 10.0,
                'business_ventures': request.business_ventures / 10.0,
                'volunteer_work': request.volunteer_work / 10.0,
                'research_experience': request.research_experience / 10.0,
                'portfolio_audition': request.portfolio_audition / 10.0,
                'essay_quality': request.essay_quality / 10.0,
                'recommendations': request.recommendations / 10.0,
                'interview': request.interview / 10.0,
                'demonstrated_interest': request.demonstrated_interest / 10.0,
                'legacy_status': request.legacy_status / 10.0,
                'geographic_diversity': request.geographic_diversity / 10.0,
                'firstgen_diversity': request.firstgen_diversity / 10.0,
                'hs_reputation': request.hs_reputation / 10.0,
            }
        )

        # Create college features based on the selected college
        # Map college selection to actual training data
        college_data = get_college_data(request.college)
        college = CollegeFeatures(
            name=request.college,
            acceptance_rate=college_data['acceptance_rate'],
            sat_25th=college_data.get('sat_25th', 1200),
            sat_75th=college_data.get('sat_75th', 1500),
            act_25th=college_data.get('act_25th', 25),
            act_75th=college_data.get('act_75th', 35),
            test_policy=college_data.get('test_policy', 'Required'),
            financial_aid_policy=college_data.get('financial_aid_policy', 'Need-blind'),
            selectivity_tier=college_data.get('selectivity_tier', 'Elite')
        )

        # Make prediction
        result = predictor.predict(student, college)

        # Determine outcome based on probability
        if result.probability >= 0.7:
            outcome = "Acceptance"
        elif result.probability >= 0.3:
            outcome = "Waitlist"
        else:
            outcome = "Rejection"

        return {
            "probability": result.probability,
            "outcome": outcome,
            "confidence": result.ml_confidence,
            "model_used": result.model_used,
            "explanation": result.explanation
        }

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Return deterministic fallback based on student profile (NOT random)
        # Calculate a deterministic probability based on GPA and test scores
        gpa_unweighted = safe_float(request.gpa_unweighted)
        gpa_weighted = safe_float(request.gpa_weighted)
        sat_score = safe_int(request.sat)
        act_score = safe_int(request.act)

        # Calculate deterministic base probability from academic metrics
        if gpa_unweighted > 0:
            gpa_score = min(1.0, gpa_unweighted / 4.0)  # Normalize to 0-1
        elif gpa_weighted > 0:
            gpa_score = min(1.0, gpa_weighted / 5.0)  # Normalize to 0-1
        else:
            gpa_score = 0.5  # Default neutral

        if sat_score > 0:
            test_score = min(1.0, max(0.0, (sat_score - 1200) / 400))  # 1200-1600 → 0-1
        elif act_score > 0:
            test_score = min(1.0, max(0.0, (act_score - 20) / 16))  # 20-36 → 0-1
        else:
            test_score = 0.5  # Default neutral

        # Deterministic probability: average of GPA and test scores, capped at 85%
        deterministic_prob = (gpa_score + test_score) / 2.0
        deterministic_prob = max(0.02, min(0.85, deterministic_prob))

        if deterministic_prob >= 0.7:
            outcome = "Acceptance"
        elif deterministic_prob >= 0.3:
            outcome = "Waitlist"
        else:
            outcome = "Rejection"

        return {
            "probability": round(deterministic_prob, 4),
            "outcome": outcome,
            "confidence": 0.75,
            "model_used": "deterministic_fallback",
            "explanation": f"Deterministic fallback calculation based on GPA ({gpa_unweighted or gpa_weighted}) and test scores ({sat_score or act_score})"
        }

# Debug endpoint to force reload predictor
@app.get("/api/debug/reload-predictor")
async def debug_reload_predictor():
    """Debug endpoint to force reload the ML predictor."""
    try:
        from ml.models.predictor import get_predictor
        predictor = get_predictor(force_reload=True)
        return {
            "status": "success",
            "message": "Predictor reloaded",
            "models_available": len(predictor.models),
            "scaler_available": predictor.scaler is not None,
            "feature_selector_available": predictor.feature_selector is not None,
            "available_models": list(predictor.models.keys())
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to reload predictor: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



