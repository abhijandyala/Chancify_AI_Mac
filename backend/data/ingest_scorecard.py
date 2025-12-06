"""
Ingest U.S. College Scorecard data into the local database.

Usage:
    COLLEGE_SCORECARD_API_KEY=xxx python -m data.ingest_scorecard

Notes:
- Paginates through the /schools endpoint until empty.
- Uses a conservative page size (100).
- Upserts into scorecard_colleges keyed by scorecard_id.
"""

import os
import math
import time
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

import requests
from sqlalchemy.orm import Session

from database.connection import SessionLocal
from database.models import ScorecardCollege

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools"
DEFAULT_PAGE_SIZE = 100

# Fields to request from Scorecard; keep flat for mapping
FIELDS = [
    "id",
    "ope6_id",
    "ope8_id",
    "school.name",
    "school.city",
    "school.state",
    "school.zip",
    "school.region_id",
    "school.school_url",
    "school.ownership",
    "school.degrees_awarded.predominant",
    "school.locale",
    "latest.student.size",
    "latest.admissions.admission_rate.overall",
    "latest.admissions.sat_scores.average.overall",
    "latest.admissions.sat_scores.midpoint.math",
    "latest.admissions.sat_scores.midpoint.critical_reading",
    "latest.admissions.act_scores.midpoint.cumulative",
    "latest.cost.attendance.academic_year",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
    "latest.cost.net_price.overall",
    "latest.completion.rate_suppressed.overall",
    "latest.earnings.10_yrs_after_entry.median",
    "latest.repayment.3_yr_repayment.overall",
    "latest.school.year",
]


def get_api_key() -> str:
    key = os.getenv("COLLEGE_SCORECARD_API_KEY") or os.getenv("SCORECARD_API_KEY")
    if not key:
        raise RuntimeError("Missing COLLEGE_SCORECARD_API_KEY (or SCORECARD_API_KEY) env var")
    return key


def compute_selectivity_bucket(rate: Optional[float]) -> str:
    if rate is None:
        return "unknown"
    if rate < 0.25:
        return "very_selective"
    if rate < 0.5:
        return "selective"
    if rate < 0.75:
        return "moderate"
    return "open"


def compute_size_bucket(size: Optional[int]) -> str:
    if size is None:
        return "unknown"
    if size < 3000:
        return "small"
    if size < 15000:
        return "medium"
    return "large"


def compute_cost_bucket(net_price: Optional[int]) -> str:
    if net_price is None:
        return "unknown"
    if net_price < 20000:
        return "low"
    if net_price < 40000:
        return "medium"
    return "high"


def to_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        # Some fields may be strings; convert to float
        return float(value)
    except (ValueError, TypeError):
        return None


def fetch_page(page: int, api_key: str, per_page: int = DEFAULT_PAGE_SIZE) -> Tuple[List[Dict[str, Any]], int]:
    params = {
        "api_key": api_key,
        "page": page,
        "per_page": per_page,
        "fields": ",".join(FIELDS),
    }
    resp = requests.get(BASE_URL, params=params, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Scorecard API error {resp.status_code}: {resp.text}")
    data = resp.json()
    results = data.get("results", [])
    metadata = data.get("metadata", {})
    total = metadata.get("total", 0)
    return results, total


def upsert_college(db: Session, payload: Dict[str, Any]) -> None:
    sid = payload.get("id")
    if sid is None:
        return

    existing = db.get(ScorecardCollege, sid)
    if not existing:
        existing = ScorecardCollege(scorecard_id=sid)
        db.add(existing)

    # Map fields safely
    existing.opeid = payload.get("ope8_id")
    existing.opeid6 = payload.get("ope6_id")
    existing.name = payload.get("school.name") or ""
    existing.city = payload.get("school.city")
    existing.state = payload.get("school.state")
    existing.zip = payload.get("school.zip")
    existing.region_id = payload.get("school.region_id")
    existing.school_url = payload.get("school.school_url")
    existing.ownership = payload.get("school.ownership")
    existing.predominant_degree = payload.get("school.degrees_awarded.predominant")
    existing.locale = payload.get("school.locale")
    existing.student_size = payload.get("latest.student.size")

    existing.admission_rate = to_number(payload.get("latest.admissions.admission_rate.overall"))
    existing.sat_avg = to_number(payload.get("latest.admissions.sat_scores.average.overall"))
    existing.sat_math = to_number(payload.get("latest.admissions.sat_scores.midpoint.math"))
    existing.sat_ebrw = to_number(payload.get("latest.admissions.sat_scores.midpoint.critical_reading"))
    existing.act_mid = to_number(payload.get("latest.admissions.act_scores.midpoint.cumulative"))

    existing.cost_attendance = payload.get("latest.cost.attendance.academic_year")
    existing.tuition_in_state = payload.get("latest.cost.tuition.in_state")
    existing.tuition_out_of_state = payload.get("latest.cost.tuition.out_of_state")
    existing.net_price = payload.get("latest.cost.net_price.overall")

    existing.completion_rate = to_number(payload.get("latest.completion.rate_suppressed.overall"))
    existing.earnings_10yr = payload.get("latest.earnings.10_yrs_after_entry.median")
    existing.repayment_3yr = to_number(payload.get("latest.repayment.3_yr_repayment.overall"))

    existing.selectivity_bucket = compute_selectivity_bucket(existing.admission_rate)
    existing.size_bucket = compute_size_bucket(existing.student_size)
    existing.cost_bucket = compute_cost_bucket(existing.net_price)

    existing.data_year = payload.get("latest.school.year")
    now = datetime.utcnow()
    existing.updated_at = now
    existing.last_synced_at = now


def ingest_scorecard(per_page: int = DEFAULT_PAGE_SIZE, max_pages: Optional[int] = None) -> None:
    api_key = get_api_key()
    if SessionLocal is None:
        raise RuntimeError("Database not initialized; check DATABASE_URL")

    session = SessionLocal()
    try:
        page = 0
        total = None
        while True:
            page += 1
            if max_pages and page > max_pages:
                logger.info("Reached max_pages=%s, stopping.", max_pages)
                break

            results, total = fetch_page(page, api_key, per_page)
            if not results:
                logger.info("No more results, stopping at page %s.", page)
                break

            for item in results:
                upsert_college(session, item)

            session.commit()
            logger.info("Ingested page %s (%s records).", page, len(results))

            # If total known, stop when covered
            if total is not None:
                total_pages = math.ceil(total / per_page)
                if page >= total_pages:
                    break

            # Gentle pacing to avoid rate limits
            time.sleep(0.2)
    except Exception as e:
        session.rollback()
        logger.exception("Ingestion failed: %s", e)
        raise
    finally:
        session.close()


if __name__ == "__main__":
    ingest_scorecard()

