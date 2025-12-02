"""
Core scoring logic for computing composite student scores.
Scores are on 0-10 scale, composite is 0-1000.
"""

import math
from typing import Dict, Optional, List, Tuple
from .weights import FACTOR_WEIGHTS, CLUSTER_FACTORS


class CollegePolicy:
    """College-specific policies that affect scoring"""

    def __init__(self, uses_testing: bool = True, need_aware: bool = False):
        self.uses_testing = uses_testing
        self.need_aware = need_aware


class ScoringResult:
    """Result of composite score calculation"""

    def __init__(
        self,
        composite: float,
        sum_weights: float,
        used_factors: List[str],
        cluster_note: Optional[str] = None
    ):
        self.composite = composite
        self.sum_weights = sum_weights
        self.used_factors = used_factors
        self.cluster_note = cluster_note


def with_defaults(
    scores: Dict[str, Optional[float]],
    policy: CollegePolicy,
    treat_missing_as_neutral: bool = True
) -> Dict[str, Optional[float]]:
    """
    Fill in missing scores with neutral value (5.0) and apply policy gates.

    Args:
        scores: Raw factor scores (0-10 scale)
        policy: College policy (test-optional, need-aware, etc.)
        treat_missing_as_neutral: If True, missing scores default to 5.0

    Returns:
        Complete score dictionary with policy gates applied
    """
    neutral = 5.0
    output = {}

    for factor in FACTOR_WEIGHTS.keys():
        value = scores.get(factor)

        # Apply neutral default if missing
        if value is None and treat_missing_as_neutral:
            value = neutral

        # Policy gates
        if factor == "testing" and not policy.uses_testing:
            value = None
        if factor == "ability_to_pay" and not policy.need_aware:
            value = None

        output[factor] = value

    return output


def apply_cluster_dampening(
    scores: Dict[str, float],
    weights: Dict[str, float]
) -> Tuple[Dict[str, float], Optional[str]]:
    """
    Apply anti-double-counting dampening to clustered factors.

    If 2+ cluster factors score >= 8, reduce their weights by 15%
    to prevent over-weighting correlated achievements.

    Args:
        scores: Factor scores (0-10)
        weights: Factor weights

    Returns:
        Tuple of (dampened_weights, note_if_applied)
    """
    # Find cluster factors that score >= 8
    high_scorers = [
        factor for factor in CLUSTER_FACTORS
        if scores.get(factor, 0) >= 8
    ]

    # Only dampen if 2+ factors are high
    if len(high_scorers) < 2:
        return weights, None

    # Apply 15% reduction to all cluster factors
    dampened = dict(weights)
    for factor in CLUSTER_FACTORS:
        if factor in dampened:
            dampened[factor] = dampened[factor] * 0.85

    note = f"cluster_dampened_15pct: {','.join(high_scorers)}"
    return dampened, note


def clamp_score(score: float, min_val: float = 0.0, max_val: float = 10.0) -> float:
    """Clamp score to valid range"""
    return max(min_val, min(max_val, score))


def compute_composite(
    raw_scores: Dict[str, Optional[float]],
    policy: CollegePolicy
) -> ScoringResult:
    """
    Compute composite score (0-1000) from individual factor scores.

    Process:
    1. Fill missing scores with neutral value (5.0)
    2. Apply policy gates (test-optional, need-aware)
    3. Filter to active factors (non-None)
    4. Apply cluster dampening if applicable
    5. Calculate weighted composite

    Args:
        raw_scores: Factor scores (0-10 scale), can be incomplete
        policy: College-specific policies

    Returns:
        ScoringResult with composite score and metadata
    """
    # Step 1: Fill defaults and apply policy
    scores = with_defaults(raw_scores, policy)

    # Step 2: Filter to active factors (not None)
    active_factors = {
        factor: FACTOR_WEIGHTS[factor]
        for factor, value in scores.items()
        if value is not None
    }

    # Step 3: Clamp all scores to 0-10
    clamped_scores = {
        factor: clamp_score(scores[factor] if scores[factor] is not None else 5.0)
        for factor in active_factors.keys()
    }

    # Step 4: Apply cluster dampening
    effective_weights, cluster_note = apply_cluster_dampening(
        clamped_scores,
        active_factors
    )

    # Step 5: Calculate weighted sum
    weighted_sum = sum(
        clamped_scores[factor] * effective_weights[factor]
        for factor in effective_weights.keys()
    )

    sum_weights = sum(effective_weights.values())

    # Step 6: Normalize to 0-1000 scale
    # Formula: (weighted_sum / (10 * sum_weights)) * 1000
    # This gives 1000 if all factors are 10, 0 if all are 0
    composite = (weighted_sum / (10.0 * sum_weights)) * 1000.0

    return ScoringResult(
        composite=composite,
        sum_weights=sum_weights,
        used_factors=list(effective_weights.keys()),
        cluster_note=cluster_note
    )


def apply_conduct_penalty(
    composite: float,
    conduct_score: Optional[float]
) -> float:
    """
    Apply penalty for disciplinary issues.

    If conduct_record < 5 (issues present), subtract penalty:
    - Score 0: -40 points
    - Score 2.5: -20 points
    - Score 5+: No penalty

    Args:
        composite: Base composite score (0-1000)
        conduct_score: Conduct record score (0-10)

    Returns:
        Adjusted composite score
    """
    if conduct_score is None or conduct_score >= 5:
        return composite

    # Scale penalty: up to -40 points at score 0
    penalty = (5.0 - conduct_score) * 8.0  # Max penalty: 5 * 8 = 40

    return max(0.0, composite - penalty)


# Example usage and test
if __name__ == "__main__":
    # Test case: Strong applicant to test-optional school
    test_scores = {
        "grades": 9.0,
        "rigor": 8.5,
        "testing": 9.0,
        "essay": 7.5,
        "ecs_leadership": 8.0,
        "recommendations": 7.0,
        "plan_timing": 6.0,
        "major_fit": 7.0,
        "hs_reputation": 6.5,
    }

    policy = CollegePolicy(uses_testing=True, need_aware=False)
    result = compute_composite(test_scores, policy)

    print(f"Composite Score: {result.composite:.1f}")
    print(f"Active Factors: {len(result.used_factors)}")
    print(f"Sum of Weights: {result.sum_weights:.1f}")
    if result.cluster_note:
        print(f"Note: {result.cluster_note}")

    # Test conduct penalty
    adjusted = apply_conduct_penalty(result.composite, 6.0)
    print(f"After Conduct Adjustment: {adjusted:.1f}")

