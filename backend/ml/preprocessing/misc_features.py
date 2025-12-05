import os
import re
from typing import Dict, List, Optional, Tuple

try:
    from openai import OpenAI
except Exception:
    OpenAI = None  # Optional; only used if enabled


def _extract_hours_bucket(text: str) -> Optional[str]:
    """Find hour counts and bucket them."""
    match = re.search(r"(\d{2,4})\s*(?:\+)?\s*(hours?|hrs?)", text, re.IGNORECASE)
    if not match:
        return None
    hours = int(match.group(1))
    if hours >= 300:
        return "300+"
    if hours >= 200:
        return "200-299"
    if hours >= 150:
        return "150-199"
    if hours >= 100:
        return "100-149"
    if hours >= 50:
        return "50-99"
    return "1-49"


def _infer_award_tier_regex(text: str) -> Optional[str]:
    lower = text.lower()
    if any(k in lower for k in ["national", "intl", "international", "us-wide"]):
        return "national"
    if "state" in lower:
        return "state"
    if "regional" in lower or "county" in lower:
        return "regional"
    if "district" in lower or "school" in lower or "chapter" in lower:
        return "school"
    return None


def _infer_award_tier_openai(text: str, client: Optional[object]) -> Optional[str]:
    if client is None:
        return None
    prompt = (
        "Classify this award/competition into one tier: national, state, regional, school, or none.\n"
        "Return only the tier string.\n\nItem:\n"
        f"{text}"
    )
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a concise classifier. Respond with a single word tier."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            max_tokens=5,
        )
        tier = resp.choices[0].message.content.strip().lower()
        if tier in {"national", "state", "regional", "school"}:
            return tier
    except Exception:
        return None
    return None


def extract_misc_signals(
    misc_items: List[str],
    use_openai: bool = False,
    openai_api_key: Optional[str] = None,
) -> Dict[str, float]:
    """
    Derive ML-friendly signals from MISC bullets.
    All outputs are non-negative and intended for monotone uplift only.
    """
    signals: Dict[str, float] = {
        "has_internship": 0.0,
        "has_research": 0.0,
        "has_competition": 0.0,
        "has_summer_program": 0.0,
        "has_nonprofit": 0.0,
        "has_work": 0.0,
        "has_leadership": 0.0,
        "has_service": 0.0,
        "has_award": 0.0,
        "award_tier_national": 0.0,
        "award_tier_state": 0.0,
        "award_tier_regional": 0.0,
        "award_tier_school": 0.0,
        "has_rigor_ib": 0.0,
        "has_rigor_dual_enroll": 0.0,
        "has_rigor_cambridge": 0.0,
        "has_ap_exam": 0.0,
        "count_testing": 0.0,
        "count_academics": 0.0,
        "count_awards": 0.0,
        "count_leadership": 0.0,
        "count_service": 0.0,
        "count_work": 0.0,
        "count_projects": 0.0,
    }

    hours_buckets = set()
    openai_client = None
    if use_openai and OpenAI is not None:
        api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if api_key:
            openai_client = OpenAI(api_key=api_key)

    for item in misc_items:
        text = item.strip()
        lower = text.lower()
        if not text:
            continue

        # Category counts
        if any(k in lower for k in ["sat", "act", "psat", "testing"]):
            signals["count_testing"] += 1
        if any(k in lower for k in ["ap ", "ib ", "dual enrollment", "dual-enrollment", "cambridge"]):
            signals["count_academics"] += 1
        if any(k in lower for k in ["award", "honor", "finalist", "medalist", "prize", "scholar"]):
            signals["count_awards"] += 1
        if any(k in lower for k in ["president", "captain", "director", "chair", "leadership", "lead"]):
            signals["count_leadership"] += 1
        if any(k in lower for k in ["volunteer", "service", "outreach", "tutor", "mentorship"]):
            signals["count_service"] += 1
        if any(k in lower for k in ["job", "work", "employment", "barista", "cashier", "staff"]):
            signals["count_work"] += 1
        if any(k in lower for k in ["project", "startup", "venture", "app", "research", "portfolio"]):
            signals["count_projects"] += 1

        # Flags
        if "intern" in lower or "co-op" in lower:
            signals["has_internship"] = 1.0
        if "research" in lower or "lab" in lower:
            signals["has_research"] = 1.0
        if any(k in lower for k in ["competition", "olympiad", "contest", "hackathon", "tournament"]):
            signals["has_competition"] = 1.0
        if "summer program" in lower or "summer institute" in lower or "summer fellowship" in lower:
            signals["has_summer_program"] = 1.0
        if "nonprofit" in lower or "foundation" in lower:
            signals["has_nonprofit"] = 1.0
        if any(k in lower for k in ["job", "work", "employment", "barista", "cashier", "staff", "assistant"]):
            signals["has_work"] = 1.0
        if any(k in lower for k in ["president", "captain", "director", "chair", "leadership", "lead"]):
            signals["has_leadership"] = 1.0
        if any(k in lower for k in ["volunteer", "service", "outreach", "tutor", "mentorship"]):
            signals["has_service"] = 1.0
        if any(k in lower for k in ["award", "honor", "finalist", "medalist", "prize", "scholar"]):
            signals["has_award"] = 1.0
            tier = _infer_award_tier_regex(text)
            if not tier and openai_client:
                tier = _infer_award_tier_openai(text, openai_client)
            if tier == "national":
                signals["award_tier_national"] = 1.0
            elif tier == "state":
                signals["award_tier_state"] = 1.0
            elif tier == "regional":
                signals["award_tier_regional"] = 1.0
            elif tier == "school":
                signals["award_tier_school"] = 1.0

        # Rigor cues
        if "international baccalaureate" in lower or " ib " in lower:
            signals["has_rigor_ib"] = 1.0
        if "dual enrollment" in lower or "dual-enrollment" in lower or "dual credit" in lower:
            signals["has_rigor_dual_enroll"] = 1.0
        if "cambridge" in lower:
            signals["has_rigor_cambridge"] = 1.0
        if "ap exam" in lower or "ap score" in lower:
            signals["has_ap_exam"] = 1.0

        bucket = _extract_hours_bucket(text)
        if bucket:
            hours_buckets.add(bucket)

    # Intensity from hours buckets (monotone)
    if hours_buckets:
        if "300+" in hours_buckets or "200-299" in hours_buckets:
            signals["has_service"] = 1.0
            signals["has_work"] = max(signals["has_work"], 0.5)
            signals["has_leadership"] = max(signals["has_leadership"], 0.5)

    # Soft caps on counts to reduce outlier influence
    for key in [
        "count_testing",
        "count_academics",
        "count_awards",
        "count_leadership",
        "count_service",
        "count_work",
        "count_projects",
    ]:
        signals[key] = float(min(signals[key], 8.0))

    return signals


def compute_misc_uplift(signals: Dict[str, float], acceptance_rate: float) -> float:
    """
    Convert misc signals into a bounded uplift (absolute probability delta).
    Monotone-positive, capped by selectivity band.
    """
    uplift = 0.0
    acceptance_rate = float(max(0.02, min(0.98, acceptance_rate or 0.5)))

    # Selectivity multiplier: temper uplift for more selective schools
    if acceptance_rate < 0.10:
        selectivity_mult = 0.6
    elif acceptance_rate < 0.20:
        selectivity_mult = 0.75
    elif acceptance_rate < 0.35:
        selectivity_mult = 0.9
    else:
        selectivity_mult = 1.0

    # Core experiential boosts
    if signals["has_research"]:
        uplift += 0.015
    if signals["has_internship"]:
        uplift += 0.015
    if signals["has_competition"]:
        uplift += 0.01
    if signals["has_summer_program"]:
        uplift += 0.008
    if signals["has_nonprofit"]:
        uplift += 0.008
    if signals["has_work"]:
        uplift += 0.006
    if signals["has_leadership"]:
        uplift += 0.01
    if signals["has_service"]:
        uplift += 0.006

    # Awards tiers (stack modestly)
    uplift += 0.02 * signals["award_tier_national"]
    uplift += 0.012 * signals["award_tier_state"]
    uplift += 0.01 * signals["award_tier_regional"]
    uplift += 0.006 * signals["award_tier_school"]
    if signals["has_award"] and uplift < 0.008:
        uplift += 0.008

    # Rigor cues
    uplift += 0.01 * signals["has_rigor_ib"]
    uplift += 0.01 * signals["has_rigor_dual_enroll"]
    uplift += 0.008 * signals["has_rigor_cambridge"]
    uplift += 0.004 * signals["has_ap_exam"]

    # Density bonus for multiple strong buckets (but capped)
    strong_counts = sum(
        1
        for key in ["count_awards", "count_leadership", "count_service", "count_projects"]
        if signals[key] >= 3
    )
    if strong_counts >= 2:
        uplift += 0.01

    # Apply selectivity scaling and cap by selectivity band
    uplift *= selectivity_mult
    hard_cap = 0.06 if acceptance_rate < 0.10 else 0.08 if acceptance_rate < 0.25 else 0.10
    uplift = min(uplift, hard_cap)
    return uplift

