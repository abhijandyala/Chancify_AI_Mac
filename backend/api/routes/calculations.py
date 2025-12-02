"""
Probability calculation routes using our scoring system.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db, College, UserProfile, AcademicData, Extracurricular
from database.schemas import (
    BatchCalculationRequest,
    CalculationResponse,
    BatchCalculationResponse,
    ProbabilityCalculationResponse
)
from api.dependencies import get_current_user_profile
from core import calculate_admission_probability

router = APIRouter()


def profile_to_factor_scores(
    profile: UserProfile,
    academic_data: AcademicData,
    extracurriculars: List[Extracurricular]
) -> dict:
    """
    Convert user profile data to factor scores for probability calculation.

    This is where we map the database fields to our 0-10 scoring scale.
    """
    scores = {}

    # Academic Factors (45% total weight)

    # 1. GPA (25%)
    if academic_data and academic_data.gpa_unweighted:
        gpa = float(academic_data.gpa_unweighted)
        if gpa >= 3.9:
            scores["grades"] = 9.5
        elif gpa >= 3.7:
            scores["grades"] = 8.5
        elif gpa >= 3.5:
            scores["grades"] = 7.5
        elif gpa >= 3.3:
            scores["grades"] = 6.5
        elif gpa >= 3.0:
            scores["grades"] = 5.5
        else:
            scores["grades"] = 4.0
    else:
        scores["grades"] = 5.0  # Neutral if no data

    # 2. Curriculum Rigor (12%)
    rigor_score = 5.0  # Default neutral
    if academic_data:
        ap_count = len(academic_data.ap_courses) if academic_data.ap_courses else 0
        honors_count = len(academic_data.honors_courses) if academic_data.honors_courses else 0

        total_rigorous = ap_count + honors_count
        if total_rigorous >= 12:
            rigor_score = 9.5
        elif total_rigorous >= 8:
            rigor_score = 8.5
        elif total_rigorous >= 5:
            rigor_score = 7.5
        elif total_rigorous >= 3:
            rigor_score = 6.5
        elif total_rigorous >= 1:
            rigor_score = 5.5
    scores["rigor"] = rigor_score

    # 3. Standardized Testing (8%)
    if academic_data and academic_data.sat_total:
        sat = academic_data.sat_total
        if sat >= 1550:
            scores["testing"] = 10.0
        elif sat >= 1500:
            scores["testing"] = 9.5
        elif sat >= 1450:
            scores["testing"] = 8.5
        elif sat >= 1400:
            scores["testing"] = 7.5
        elif sat >= 1300:
            scores["testing"] = 6.5
        elif sat >= 1200:
            scores["testing"] = 5.5
        else:
            scores["testing"] = 4.0
    elif academic_data and academic_data.act_composite:
        act = academic_data.act_composite
        if act >= 35:
            scores["testing"] = 10.0
        elif act >= 33:
            scores["testing"] = 9.0
        elif act >= 30:
            scores["testing"] = 8.0
        elif act >= 28:
            scores["testing"] = 7.0
        elif act >= 25:
            scores["testing"] = 6.0
        else:
            scores["testing"] = 5.0
    else:
        scores["testing"] = 5.0  # Neutral if no data

    # Qualitative Factors (13% total weight)

    # 4. Essay (8%) - For now, neutral until we implement essay scoring
    scores["essay"] = 5.0

    # 5. Recommendations (4%) - For now, neutral
    scores["recommendations"] = 5.0

    # 6. Interview (1%) - For now, neutral
    scores["interview"] = 5.0

    # Co-curricular (7.5% total weight)

    # 7. Extracurriculars & Leadership (7.5%)
    ec_score = 5.0  # Default
    if extracurriculars:
        leadership_count = sum(1 for ec in extracurriculars
                             if ec.leadership_positions and len(ec.leadership_positions) > 0)
        total_years = sum(len(ec.years_participated) if ec.years_participated else 0
                         for ec in extracurriculars)

        # Score based on leadership and commitment
        if leadership_count >= 3 and total_years >= 10:
            ec_score = 9.0
        elif leadership_count >= 2 and total_years >= 8:
            ec_score = 8.0
        elif leadership_count >= 1 and total_years >= 6:
            ec_score = 7.0
        elif total_years >= 4:
            ec_score = 6.0
        elif total_years >= 2:
            ec_score = 5.5
    scores["ecs_leadership"] = ec_score

    # Strategic Factors (9.5% total weight)

    # 8. Application Timing (4%) - Default to neutral
    scores["plan_timing"] = 5.0

    # 9. Major Fit (3%) - Default to neutral
    scores["major_fit"] = 5.0

    # 10. Demonstrated Interest (1.5%) - Default to neutral
    scores["demonstrated_interest"] = 5.0

    # Special Factors (6% total weight)

    # 11. Athletic Recruitment (4%) - Default to low (not recruited)
    scores["athletic_recruit"] = 3.0

    # 12. Portfolio/Audition (2%) - Default to neutral
    scores["portfolio_audition"] = 5.0

    # Demographic Factors (6% total weight)

    # 13. Geographic/Residency (3%) - Default to neutral
    scores["geography_residency"] = 5.0

    # 14. First-gen/Diversity (3%) - Could be extracted from profile
    scores["firstgen_diversity"] = 5.0

    # Financial Factors (3% total weight)

    # 15. Ability to Pay (3%) - Default to neutral
    scores["ability_to_pay"] = 5.0

    # Achievement Factors (2% total weight)

    # 16. Awards/Publications (2%) - Default to neutral
    scores["awards_publications"] = 5.0

    # Institutional Factors (3.5% total weight)

    # 17. Policy Knob (2%) - Default to neutral
    scores["policy_knob"] = 5.0

    # 18. Legacy (1.5%) - Default to low (not legacy)
    scores["legacy"] = 3.0

    # Negative Factors (0.5% total weight)

    # 19. Conduct Record (0.5%) - Default to high (clean record)
    scores["conduct_record"] = 9.0

    # Contextual Factors (2% total weight)

    # 20. High School Reputation (2%) - Default to neutral
    scores["hs_reputation"] = 5.0

    return scores


@router.post("/calculate/{college_id}", response_model=CalculationResponse)
async def calculate_probability(
    college_id: str,
    current_user_profile: UserProfile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    """
    Calculate admission probability for a specific college.

    Args:
        college_id: UUID of the college
        current_user_profile: Current user's profile
        db: Database session

    Returns:
        CalculationResponse: Probability calculation result
    """
    # Get college data
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="College not found"
        )

    # Get user's academic data
    academic_data = db.query(AcademicData).filter(
        AcademicData.profile_id == current_user_profile.id
    ).first()

    # Get user's extracurriculars
    extracurriculars = db.query(Extracurricular).filter(
        Extracurricular.profile_id == current_user_profile.id
    ).all()

    # Convert profile to factor scores
    factor_scores = profile_to_factor_scores(
        current_user_profile,
        academic_data,
        extracurriculars
    )

    # Calculate probability using our scoring system
    try:
        report = calculate_admission_probability(
            factor_scores=factor_scores,
            acceptance_rate=float(college.acceptance_rate) if college.acceptance_rate else 0.1,
            uses_testing=college.test_policy != "Blind",
            need_aware=college.financial_aid_policy == "Need-aware"
        )

        # Determine category
        prob = report.probability
        if prob < 0.15:
            category = "reach"
        elif prob < 0.40:
            category = "reach"
        elif prob < 0.65:
            category = "target"
        else:
            category = "safety"

        return CalculationResponse(
            college_id=college.id,
            college_name=college.name,
            composite_score=report.composite_score,
            probability=report.probability,
            percentile_estimate=report.percentile_estimate,
            audit_breakdown=[row.to_dict() for row in report.factor_breakdown],
            policy_notes=report.policy_notes,
            category=category
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate probability: {str(e)}"
        )


@router.post("/calculate/batch", response_model=BatchCalculationResponse)
async def calculate_batch_probabilities(
    request: BatchCalculationRequest,
    current_user_profile: UserProfile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    """
    Calculate admission probabilities for multiple colleges.

    Args:
        request: Batch calculation request with college IDs
        current_user_profile: Current user's profile
        db: Database session

    Returns:
        BatchCalculationResponse: Array of calculation results
    """
    results = []

    for college_id in request.college_ids:
        try:
            result = await calculate_probability(
                college_id=str(college_id),
                current_user_profile=current_user_profile,
                db=db
            )
            results.append(result)
        except HTTPException:
            # Skip colleges that cause errors, log them
            continue

    return BatchCalculationResponse(results=results)


@router.get("/history", response_model=List[ProbabilityCalculationResponse])
async def get_calculation_history(
    current_user_profile: UserProfile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    """
    Get user's calculation history.

    Args:
        current_user_profile: Current user's profile
        db: Database session

    Returns:
        List[ProbabilityCalculationResponse]: Historical calculations
    """
    from database.models import ProbabilityCalculation

    calculations = db.query(ProbabilityCalculation).filter(
        ProbabilityCalculation.profile_id == current_user_profile.id
    ).order_by(ProbabilityCalculation.calculated_at.desc()).limit(50).all()

    return [ProbabilityCalculationResponse.from_orm(calc) for calc in calculations]
