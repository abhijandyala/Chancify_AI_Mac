
# Enhanced Elite University Calibration System
# Generated automatically based on statistical analysis

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ml.preprocessing.feature_extractor import CollegeFeatures, StudentFeatures


def _load_enhanced_elite_calibration(self):
    """Load enhanced elite university calibration data for realistic probabilities."""
    return {
        "MIT": {
                "calibration_factor": 0.07344,
                "max_probability": 0.09795000000000001,
                "acceptance_rate": 0.041,
                "category": "ultra_selective",
                "base_factor": 0.08,
                "rate_adjustment": 0.918,
                "notes": "Even perfect profiles have < 12% chance"
        },
        "Harvard": {
                "calibration_factor": 0.0736,
                "max_probability": 0.098,
                "acceptance_rate": 0.04,
                "category": "ultra_selective",
                "base_factor": 0.08,
                "rate_adjustment": 0.92,
                "notes": "Even perfect profiles have < 12% chance"
        },
        "Stanford": {
                "calibration_factor": 0.0736,
                "max_probability": 0.098,
                "acceptance_rate": 0.04,
                "category": "ultra_selective",
                "base_factor": 0.08,
                "rate_adjustment": 0.92,
                "notes": "Even perfect profiles have < 12% chance"
        },
        "Yale": {
                "calibration_factor": 0.10728,
                "max_probability": 0.146025,
                "acceptance_rate": 0.053,
                "category": "highly_selective",
                "base_factor": 0.12,
                "rate_adjustment": 0.894,
                "notes": "Perfect profiles have < 18% chance"
        },
        "Princeton": {
                "calibration_factor": 0.10944,
                "max_probability": 0.1467,
                "acceptance_rate": 0.044,
                "category": "highly_selective",
                "base_factor": 0.12,
                "rate_adjustment": 0.912,
                "notes": "Perfect profiles have < 18% chance"
        },
        "Columbia": {
                "calibration_factor": 0.11016,
                "max_probability": 0.146925,
                "acceptance_rate": 0.041,
                "category": "highly_selective",
                "base_factor": 0.12,
                "rate_adjustment": 0.918,
                "notes": "Perfect profiles have < 18% chance"
        },
        "University of Pennsylvania": {
                "calibration_factor": 0.10584,
                "max_probability": 0.145575,
                "acceptance_rate": 0.059,
                "category": "highly_selective",
                "base_factor": 0.12,
                "rate_adjustment": 0.882,
                "notes": "Perfect profiles have < 18% chance"
        },
        "Dartmouth": {
                "calibration_factor": 0.10511999999999999,
                "max_probability": 0.14534999999999998,
                "acceptance_rate": 0.062,
                "category": "highly_selective",
                "base_factor": 0.12,
                "rate_adjustment": 0.876,
                "notes": "Perfect profiles have < 18% chance"
        },
        "Brown": {
                "calibration_factor": 0.10679999999999999,
                "max_probability": 0.145875,
                "acceptance_rate": 0.055,
                "category": "highly_selective",
                "base_factor": 0.12,
                "rate_adjustment": 0.89,
                "notes": "Perfect profiles have < 18% chance"
        },
        "University of Chicago": {
                "calibration_factor": 0.10439999999999999,
                "max_probability": 0.145125,
                "acceptance_rate": 0.065,
                "category": "highly_selective",
                "base_factor": 0.12,
                "rate_adjustment": 0.87,
                "notes": "Perfect profiles have < 18% chance"
        },
        "Cornell": {
                "calibration_factor": 0.1652,
                "max_probability": 0.21043,
                "acceptance_rate": 0.087,
                "category": "very_selective",
                "base_factor": 0.2,
                "rate_adjustment": 0.8260000000000001,
                "notes": "Perfect profiles have < 25% chance"
        },
        "Duke": {
                "calibration_factor": 0.1764,
                "max_probability": 0.21351,
                "acceptance_rate": 0.059,
                "category": "very_selective",
                "base_factor": 0.2,
                "rate_adjustment": 0.882,
                "notes": "Perfect profiles have < 25% chance"
        },
        "Northwestern": {
                "calibration_factor": 0.17200000000000001,
                "max_probability": 0.2123,
                "acceptance_rate": 0.07,
                "category": "very_selective",
                "base_factor": 0.2,
                "rate_adjustment": 0.86,
                "notes": "Perfect profiles have < 25% chance"
        },
        "Vanderbilt": {
                "calibration_factor": 0.1716,
                "max_probability": 0.21219000000000002,
                "acceptance_rate": 0.071,
                "category": "very_selective",
                "base_factor": 0.2,
                "rate_adjustment": 0.858,
                "notes": "Perfect profiles have < 25% chance"
        },
        "Rice": {
                "calibration_factor": 0.2835,
                "max_probability": 0.28575,
                "acceptance_rate": 0.095,
                "category": "selective",
                "base_factor": 0.35,
                "rate_adjustment": 0.81,
                "notes": "Perfect profiles have < 35% chance"
        },
        "Emory": {
                "calibration_factor": 0.2583,
                "max_probability": 0.28035,
                "acceptance_rate": 0.131,
                "category": "selective",
                "base_factor": 0.35,
                "rate_adjustment": 0.738,
                "notes": "Perfect profiles have < 35% chance"
        },
        "Georgetown": {
                "calibration_factor": 0.26599999999999996,
                "max_probability": 0.282,
                "acceptance_rate": 0.12,
                "category": "selective",
                "base_factor": 0.35,
                "rate_adjustment": 0.76,
                "notes": "Perfect profiles have < 35% chance"
        },
        "Carnegie Mellon": {
                "calibration_factor": 0.2555,
                "max_probability": 0.27975,
                "acceptance_rate": 0.135,
                "category": "selective",
                "base_factor": 0.35,
                "rate_adjustment": 0.73,
                "notes": "Perfect profiles have < 35% chance"
        },
        "New York University": {
                "calibration_factor": 0.259,
                "max_probability": 0.2805,
                "acceptance_rate": 0.13,
                "category": "selective",
                "base_factor": 0.35,
                "rate_adjustment": 0.74,
                "notes": "Perfect profiles have < 35% chance"
        }
}

def _apply_enhanced_elite_calibration(self, probability: float, college: "CollegeFeatures", student: "StudentFeatures") -> float:
    """
    Apply enhanced elite university calibration based on profile strength.

    Args:
        probability: Raw probability from ML model
        college: College features containing name
        student: Student features for profile strength assessment

    Returns:
        Calibrated probability
    """
    college_name = college.name.lower()

    # Check if this is an elite university
    for elite_name, calibration_data in self.elite_calibration.items():
        if elite_name.lower() in college_name or college_name in elite_name.lower():
            # Determine profile strength
            profile_strength = self._assess_profile_strength(student)

            # Get appropriate calibration based on profile strength
            if profile_strength == 'perfect':
                factor = calibration_data['calibration_factor'] * 1.2
                max_prob = calibration_data['max_probability']
            elif profile_strength == 'strong':
                factor = calibration_data['calibration_factor']
                max_prob = calibration_data['max_probability'] * 0.8
            elif profile_strength == 'average':
                factor = calibration_data['calibration_factor'] * 0.7
                max_prob = calibration_data['max_probability'] * 0.6
            else:  # below_average
                factor = calibration_data['calibration_factor'] * 0.5
                max_prob = calibration_data['max_probability'] * 0.4

            # Apply calibration
            calibrated_prob = probability * factor
            calibrated_prob = min(calibrated_prob, max_prob)

            # Log the calibration for debugging
            print(f"ENHANCED CALIBRATION: {college.name}")
            print(f"  Profile strength: {profile_strength}")
            print(f"  Raw probability: {probability:.3f}")
            print(f"  Calibrated: {calibrated_prob:.3f}")
            print(f"  Factor: {factor:.3f}")
            print(f"  Max prob: {max_prob:.3f}")
            print(f"  Acceptance rate: {calibration_data['acceptance_rate']:.1%}")

            return calibrated_prob

    # Not an elite university, return original probability
    return probability

def _assess_profile_strength(self, student: "StudentFeatures") -> str:
    """
    Assess student profile strength for calibration adjustment.

    Returns:
        'perfect', 'strong', 'average', or 'below_average'
    """
    # Check academic metrics
    gpa_score = 0
    if student.gpa_unweighted and student.gpa_unweighted >= 3.95:
        gpa_score += 2
    elif student.gpa_unweighted and student.gpa_unweighted >= 3.8:
        gpa_score += 1

    if student.gpa_weighted and student.gpa_weighted >= 4.3:
        gpa_score += 2
    elif student.gpa_weighted and student.gpa_weighted >= 4.0:
        gpa_score += 1

    # Check test scores
    test_score = 0
    if student.sat_total and student.sat_total >= 1550:
        test_score += 2
    elif student.sat_total and student.sat_total >= 1500:
        test_score += 1

    if student.act_composite and student.act_composite >= 35:
        test_score += 2
    elif student.act_composite and student.act_composite >= 34:
        test_score += 1

    # Check factor scores (extracurriculars, leadership, etc.)
    factor_score = 0
    if hasattr(student, 'factor_scores'):
        high_factors = sum(1 for score in student.factor_scores.values() if score >= 8)
        if high_factors >= 15:  # Most factors are high
            factor_score += 2
        elif high_factors >= 10:
            factor_score += 1

    # Calculate total score
    total_score = gpa_score + test_score + factor_score

    # Determine profile strength
    if total_score >= 6:
        return 'perfect'
    elif total_score >= 4:
        return 'strong'
    elif total_score >= 2:
        return 'average'
    else:
        return 'below_average'
