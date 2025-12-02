"""
Audit trail for probability calculations.
Shows user exactly what contributed to their score.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from .weights import FACTOR_WEIGHTS


@dataclass
class AuditRow:
    """Single factor's contribution to composite score"""
    factor: str
    weight: float
    score_0_to_10: Optional[float]
    weighted_contribution: Optional[float]
    note: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)


@dataclass
class AuditReport:
    """Complete audit report for a probability calculation"""
    composite_score: float
    probability: float
    acceptance_rate: float
    percentile_estimate: float
    factor_breakdown: List[AuditRow]
    policy_notes: List[str]

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "composite_score": round(self.composite_score, 1),
            "probability": round(self.probability, 3),
            "acceptance_rate": round(self.acceptance_rate, 3),
            "percentile_estimate": round(self.percentile_estimate, 1),
            "factor_breakdown": [row.to_dict() for row in self.factor_breakdown],
            "policy_notes": self.policy_notes
        }


def build_audit(
    scores: Dict[str, Optional[float]],
    used_factors: List[str],
    policy_notes: Optional[List[str]] = None
) -> List[AuditRow]:
    """
    Build audit trail showing contribution of each factor.

    Args:
        scores: Factor scores (0-10 scale)
        used_factors: List of factors that were actually used (after policy gates)
        policy_notes: Optional notes about policy adjustments

    Returns:
        List of AuditRow objects, one per factor
    """
    audit_rows = []

    for factor, weight in FACTOR_WEIGHTS.items():
        # Check if factor was used (not policy-gated)
        if factor not in used_factors:
            audit_rows.append(AuditRow(
                factor=factor,
                weight=weight,
                score_0_to_10=None,
                weighted_contribution=None,
                note="policy-gated (not used)"
            ))
            continue

        # Get score, default to 5 if missing
        score_value = scores.get(factor)
        score = score_value if score_value is not None else 5.0

        # Clamp to 0-10
        score = max(0.0, min(10.0, score))

        # Calculate contribution
        contribution = score * weight

        # Determine note
        note = None
        if score == 5.0 and factor not in scores:
            note = "neutral default (no data)"
        elif score >= 9.0:
            note = "exceptional strength"
        elif score <= 3.0:
            note = "area of concern"

        audit_rows.append(AuditRow(
            factor=factor,
            weight=weight,
            score_0_to_10=round(score, 1),
            weighted_contribution=round(contribution, 2),
            note=note
        ))

    return audit_rows


def identify_strengths_and_weaknesses(
    audit_rows: List[AuditRow],
    top_n: int = 3
) -> Dict[str, List[str]]:
    """
    Identify top strengths and weaknesses from audit.

    Args:
        audit_rows: Complete audit breakdown
        top_n: Number of top/bottom factors to return

    Returns:
        Dict with 'strengths' and 'weaknesses' lists
    """
    # Filter to only used factors
    used_rows = [row for row in audit_rows if row.score_0_to_10 is not None]

    # Sort by score (use 0.0 for None values to avoid comparison issues)
    sorted_by_score = sorted(used_rows, key=lambda r: r.score_0_to_10 if r.score_0_to_10 is not None else 0.0, reverse=True)

    strengths = [
        f"{row.factor} ({row.score_0_to_10}/10)"
        for row in sorted_by_score[:top_n]
        if row.score_0_to_10 >= 7.0
    ]

    weaknesses = [
        f"{row.factor} ({row.score_0_to_10}/10)"
        for row in sorted_by_score[-top_n:]
        if row.score_0_to_10 <= 6.0
    ]

    return {
        "strengths": strengths,
        "weaknesses": weaknesses
    }


def format_audit_for_display(audit_report: AuditReport) -> str:
    """
    Format audit report as human-readable text.

    Args:
        audit_report: Complete audit report

    Returns:
        Formatted string for display
    """
    lines = []
    lines.append("=" * 70)
    lines.append("CHANCIFY AI - ADMISSION PROBABILITY AUDIT")
    lines.append("=" * 70)
    lines.append("")

    # Summary
    lines.append("SUMMARY")
    lines.append("-" * 70)
    lines.append(f"  Composite Score:     {audit_report.composite_score:.1f} / 1000")
    lines.append(f"  Admission Prob:      {audit_report.probability * 100:.1f}%")
    lines.append(f"  School Accept Rate:  {audit_report.acceptance_rate * 100:.1f}%")
    lines.append(f"  Percentile Estimate: ~{audit_report.percentile_estimate:.0f}th")
    lines.append("")

    # Factor breakdown
    lines.append("FACTOR BREAKDOWN")
    lines.append("-" * 70)
    lines.append(f"{'Factor':<25} {'Weight':<8} {'Score':<8} {'Contrib':<10} {'Note'}")
    lines.append("-" * 70)

    for row in audit_report.factor_breakdown:
        factor = row.factor[:24]
        weight = f"{row.weight}%"
        score = f"{row.score_0_to_10}/10" if row.score_0_to_10 else "N/A"
        contrib = f"{row.weighted_contribution:.1f}" if row.weighted_contribution else "---"
        note = row.note or ""

        lines.append(f"{factor:<25} {weight:<8} {score:<8} {contrib:<10} {note}")

    lines.append("")

    # Policy notes
    if audit_report.policy_notes:
        lines.append("POLICY NOTES")
        lines.append("-" * 70)
        for note in audit_report.policy_notes:
            lines.append(f"  • {note}")
        lines.append("")

    # Strengths and weaknesses
    insights = identify_strengths_and_weaknesses(audit_report.factor_breakdown)

    if insights["strengths"]:
        lines.append("TOP STRENGTHS")
        lines.append("-" * 70)
        for strength in insights["strengths"]:
            lines.append(f"  ✓ {strength}")
        lines.append("")

    if insights["weaknesses"]:
        lines.append("AREAS FOR IMPROVEMENT")
        lines.append("-" * 70)
        for weakness in insights["weaknesses"]:
            lines.append(f"  ⚠ {weakness}")
        lines.append("")

    lines.append("=" * 70)

    return "\n".join(lines)


# Example usage
if __name__ == "__main__":
    # Test audit generation
    test_scores = {
        "grades": 9.2,
        "rigor": 8.5,
        "testing": 8.8,
        "essay": 7.0,
        "ecs_leadership": 8.2,
        "recommendations": 7.5,
        "plan_timing": 6.0,
        "major_fit": 7.0,
        "geography_residency": 5.0,
        "firstgen_diversity": 5.0,
        "demonstrated_interest": 6.5,
        "interview": 7.0,
        "conduct_record": 8.0,
        "hs_reputation": 6.5,
    }

    used = list(test_scores.keys())

    policy_notes = [
        "Test-optional policy: standardized testing not used",
        "Need-blind admissions: ability to pay not considered",
    ]

    # Build audit
    audit = build_audit(test_scores, used, policy_notes)

    # Create full report
    report = AuditReport(
        composite_score=742.5,
        probability=0.18,
        acceptance_rate=0.10,
        percentile_estimate=68.0,
        factor_breakdown=audit,
        policy_notes=policy_notes
    )

    # Display
    print(format_audit_for_display(report))

    # Also show JSON format
    print("\nJSON FORMAT:")
    print("-" * 70)
    import json
    print(json.dumps(report.to_dict(), indent=2))

