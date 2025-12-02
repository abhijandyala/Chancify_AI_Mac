"""
Real College Suggestions API Endpoint
Uses real IPEDS data for accurate major-based college suggestions
"""

import time
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from data.real_college_suggestions import real_college_suggestions
from data.real_ipeds_major_mapping import get_major_relevance_info


# College suggestions request model (matches frontend format)
class CollegeSuggestionsRequest(BaseModel):
    gpa_unweighted: str = "3.5"
    gpa_weighted: str = "3.8"
    sat: str = "1200"
    act: str = "25"
    major: str = "Computer Science"
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
    geographic_diversity: str = "5"
    plan_timing: str = "5"
    geography_residency: str = "5"
    firstgen_diversity: str = "5"
    ability_to_pay: str = "5"
    policy_knob: str = "5"
    conduct_record: str = "9"

logger = logging.getLogger(__name__)

# Simple in-memory cache for college suggestions
suggestion_cache = {}
CACHE_DURATION = 300  # 5 minutes

router = APIRouter()

@router.post("/api/suggest/colleges")
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
        def safe_float(value: str) -> float:
            try:
                return float(value) if value and value.strip() else 0.0
            except (ValueError, TypeError):
                return 0.0

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

            # Calculate probability based on student strength and college selectivity
            acceptance_rate = college_data['acceptance_rate']
            college_selectivity = 10.0 - (acceptance_rate * 10.0)

            # Calculate probability using realistic formula
            if student_strength >= 9.0:
                base_prob = 0.98
            elif student_strength >= 8.0:
                base_prob = 0.96 + (student_strength - 8.0) * 0.02
            elif student_strength >= 7.0:
                base_prob = 0.92 + (student_strength - 7.0) * 0.04
            elif student_strength >= 5.5:
                base_prob = 0.85 + (student_strength - 5.5) * 0.047
            elif student_strength >= 4.0:
                base_prob = 0.78 + (student_strength - 4.0) * 0.047
            else:
                base_prob = 0.70 + (student_strength * 0.02)

            # Apply college selectivity adjustment
            if college_selectivity >= 9.0:  # Elite schools
                selectivity_factor = 0.12
            elif college_selectivity >= 7.0:  # Highly selective
                selectivity_factor = 0.25
            elif college_selectivity >= 5.0:  # Moderately selective
                selectivity_factor = 0.70
            elif college_selectivity >= 3.0:  # Less selective
                selectivity_factor = 0.95
            else:  # Open admission
                selectivity_factor = 1.0

            probability = max(0.01, min(0.95, base_prob * selectivity_factor))

            # Get major relevance info
            major_relevance = get_major_relevance_info(college_name, major)

            suggestion = {
                'college_id': f"college_{college_data['unitid']}",
                'name': college_name,
                'probability': round(probability, 4),
                'original_probability': round(probability, 4),
                'major_fit_score': round(college_data['major_fit_score'], 2),
                'confidence_interval': {
                    "lower": round(max(0.01, probability - 0.1), 4),
                    "upper": round(min(0.95, probability + 0.1), 4)
                },
                'acceptance_rate': college_data['acceptance_rate'],
                'selectivity_tier': college_data['selectivity_tier'],
                'tier': college_data['selectivity_tier'],
                'city': college_data['city'],
                'state': college_data['state'],
                'tuition_in_state': college_data['tuition_in_state'],
                'tuition_out_of_state': college_data['tuition_out_of_state'],
                'student_body_size': college_data['student_body_size'],
                'enrollment': f"{college_data['student_body_size']:,}",
                'category': college_data['category'],
                'major_match': major_relevance['match_level'],
                'major_relevance_score': major_relevance['score']
            }

            suggestions.append(suggestion)

        # Calculate academic score for response
        academic_score = (gpa_unweighted * 25) + (sat_score * 0.1) + (act_score * 2.5) + (ec_strength * 5)

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
        return {"success": False, "error": str(e), "suggestions": []}
