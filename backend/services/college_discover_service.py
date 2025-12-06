"""
Service layer for Discover colleges API (Scorecard data + cached images).
"""

from typing import List, Optional, Tuple, Dict, Any
import logging
import requests
from datetime import datetime

from sqlalchemy import or_, asc, desc
from sqlalchemy.orm import Session

from database.models import ScorecardCollege, CollegeImage
from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Filtering helpers
# ---------------------------------------------------------------------------

SELECTIVITY_OPTIONS = {"very_selective", "selective", "moderate", "open"}
SIZE_OPTIONS = {"small", "medium", "large"}
SORTABLE_FIELDS = {
    "name": ScorecardCollege.name,
    "admission_rate": ScorecardCollege.admission_rate,
    "net_price": ScorecardCollege.net_price,
    "earnings": ScorecardCollege.earnings_10yr,
    "size": ScorecardCollege.student_size,
}


def apply_filters(
    query,
    q: Optional[str],
    state: Optional[str],
    selectivity: Optional[str],
    size: Optional[str],
    max_net_price: Optional[int],
):
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            or_(
                ScorecardCollege.name.ilike(like),
                ScorecardCollege.city.ilike(like),
            )
        )
    if state:
        query = query.filter(ScorecardCollege.state == state.upper())
    if selectivity and selectivity in SELECTIVITY_OPTIONS:
        query = query.filter(ScorecardCollege.selectivity_bucket == selectivity)
    if size and size in SIZE_OPTIONS:
        query = query.filter(ScorecardCollege.size_bucket == size)
    if max_net_price is not None:
        query = query.filter(ScorecardCollege.net_price <= max_net_price)
    return query


def apply_sort(query, sort: Optional[str], order: str):
    sort_col = SORTABLE_FIELDS.get(sort or "name", ScorecardCollege.name)
    if order == "desc":
        return query.order_by(desc(sort_col))
    return query.order_by(asc(sort_col))


def selectivity_label(bucket: Optional[str]) -> str:
    labels = {
        "very_selective": "Very Selective",
        "selective": "Selective",
        "moderate": "Moderate",
        "open": "Open",
    }
    return labels.get(bucket or "", "Not reported")


def size_label(bucket: Optional[str]) -> str:
    labels = {
        "small": "Small",
        "medium": "Medium",
        "large": "Large",
    }
    return labels.get(bucket or "", "Not reported")


# ---------------------------------------------------------------------------
# Image fetching and caching
# ---------------------------------------------------------------------------

PLACES_TEXT_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo"


def build_photo_url(photo_reference: str, maxwidth: int = 1200) -> str:
    # We proxy via backend route to avoid exposing key directly
    return f"/api/colleges/image/{photo_reference}?maxwidth={maxwidth}"


def get_or_create_college_image(db: Session, college: ScorecardCollege) -> Optional[CollegeImage]:
    api_key = settings.google_maps_api_key
    if not api_key:
        logger.info("Google Maps API key not configured; skipping image fetch.")
        return None

    existing = (
        db.query(CollegeImage)
        .filter(CollegeImage.college_id == college.scorecard_id)
        .first()
    )
    if existing and (existing.has_image or existing.image_url or existing.photo_reference):
        return existing

    # Build a search query "Name, City, ST"
    q_parts = [college.name]
    if college.city:
        q_parts.append(college.city)
    if college.state:
        q_parts.append(college.state)
    query = ", ".join(q_parts)

    params = {"query": query, "key": api_key}
    try:
        resp = requests.get(PLACES_TEXT_URL, params=params, timeout=15)
        if resp.status_code != 200:
            logger.warning("Places textsearch failed %s: %s", resp.status_code, resp.text)
            return None
        data = resp.json()
        results = data.get("results", [])
        if not results:
            # cache a negative result to avoid retries? keep null for now
            return None
        first = results[0]
        place_id = first.get("place_id")
        photos = first.get("photos") or []
        photo_ref = photos[0].get("photo_reference") if photos else None

        img = existing or CollegeImage(college_id=college.scorecard_id)
        img.provider = "google_places"
        img.place_id = place_id
        img.photo_reference = photo_ref
        img.has_image = photo_ref is not None
        img.image_url = build_photo_url(photo_ref) if photo_ref else None
        img.last_fetched_at = datetime.utcnow()

        db.add(img)
        db.commit()
        db.refresh(img)
        return img
    except Exception as e:
        logger.warning("Failed to fetch Google Places image for %s: %s", college.name, e)
        return None


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def query_colleges(
    db: Session,
    q: Optional[str],
    state: Optional[str],
    selectivity: Optional[str],
    size: Optional[str],
    max_net_price: Optional[int],
    sort: Optional[str],
    order: str,
    page: int,
    page_size: int,
) -> Tuple[List[Dict[str, Any]], int]:
    base = db.query(ScorecardCollege)
    base = apply_filters(base, q, state, selectivity, size, max_net_price)
    total = base.count()
    base = apply_sort(base, sort, order)
    items = base.offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for c in items:
        img = get_or_create_college_image(db, c)
        results.append(
            {
                "id": c.scorecard_id,
                "name": c.name,
                "city": c.city,
                "state": c.state,
                "ownership": c.ownership,
                "student_size": c.student_size,
                "admission_rate": c.admission_rate,
                "net_price": c.net_price,
                "tuition_in_state": c.tuition_in_state,
                "tuition_out_of_state": c.tuition_out_of_state,
                "completion_rate": c.completion_rate,
                "earnings_10yr": c.earnings_10yr,
                "selectivity_label": selectivity_label(c.selectivity_bucket),
                "size_label": size_label(c.size_bucket),
                "image_url": img.image_url if img and img.has_image else None,
                "has_image": bool(img and img.has_image),
            }
        )
    return results, total


def get_college_detail(db: Session, scorecard_id: int) -> Optional[Dict[str, Any]]:
    c = db.get(ScorecardCollege, scorecard_id)
    if not c:
        return None
    img = get_or_create_college_image(db, c)
    return {
        "id": c.scorecard_id,
        "name": c.name,
        "city": c.city,
        "state": c.state,
        "zip": c.zip,
        "region_id": c.region_id,
        "school_url": c.school_url,
        "ownership": c.ownership,
        "predominant_degree": c.predominant_degree,
        "locale": c.locale,
        "student_size": c.student_size,
        "admission_rate": c.admission_rate,
        "sat_avg": c.sat_avg,
        "sat_math": c.sat_math,
        "sat_ebrw": c.sat_ebrw,
        "act_mid": c.act_mid,
        "cost_attendance": c.cost_attendance,
        "tuition_in_state": c.tuition_in_state,
        "tuition_out_of_state": c.tuition_out_of_state,
        "net_price": c.net_price,
        "completion_rate": c.completion_rate,
        "earnings_10yr": c.earnings_10yr,
        "repayment_3yr": c.repayment_3yr,
        "selectivity_label": selectivity_label(c.selectivity_bucket),
        "size_label": size_label(c.size_bucket),
        "image_url": img.image_url if img and img.has_image else None,
        "has_image": bool(img and img.has_image),
    }


def fetch_photo_bytes(photo_reference: str, maxwidth: int = 1200) -> Tuple[bytes, str]:
    api_key = settings.google_maps_api_key
    if not api_key:
        raise RuntimeError("Google Maps API key not configured")
    params = {
        "maxwidth": maxwidth,
        "photo_reference": photo_reference,
        "key": api_key,
    }
    resp = requests.get(PLACES_PHOTO_URL, params=params, timeout=20)
    if resp.status_code != 200:
        raise RuntimeError(f"Photo fetch failed {resp.status_code}: {resp.text}")
    content_type = resp.headers.get("Content-Type", "image/jpeg")
    return resp.content, content_type

