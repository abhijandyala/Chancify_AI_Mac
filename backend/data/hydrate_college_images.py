"""
Batch hydrator to fetch/store Google Places images for colleges.

Usage:
    GOOGLE_MAPS_API_KEY=... python -m data.hydrate_college_images

Notes:
- Iterates scorecard_colleges that lack an image or photo_reference.
- Calls get_or_create_college_image (caches in DB) with light rate limiting.
- Skips if GOOGLE_MAPS_API_KEY is not set.
"""

import time
import logging
from typing import Optional

from database.connection import SessionLocal
from database.models import ScorecardCollege, CollegeImage
from services.college_discover_service import get_or_create_college_image
from config import settings

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

RATE_SLEEP_SEC = 0.2  # gentle pacing to avoid quota spikes
BATCH_SIZE = 50


def hydrate_images(limit: Optional[int] = None):
    if not settings.google_maps_api_key:
        logger.warning("GOOGLE_MAPS_API_KEY not set; aborting hydration.")
        return
    if SessionLocal is None:
        raise RuntimeError("Database not initialized; check DATABASE_URL")

    session = SessionLocal()
    processed = 0
    try:
        while True:
            q = (
                session.query(ScorecardCollege)
                .outerjoin(CollegeImage, CollegeImage.college_id == ScorecardCollege.scorecard_id)
                .filter(
                    (CollegeImage.id == None)  # noqa: E711
                    | (CollegeImage.photo_reference == None)  # noqa: E711
                )
                .limit(BATCH_SIZE)
            )
            items = q.all()
            if not items:
                logger.info("No more colleges needing images. Done.")
                break

            for college in items:
                try:
                    img = get_or_create_college_image(session, college)
                    processed += 1
                    logger.info(
                        "Hydrated image for %s (%s) -> %s",
                        college.name,
                        college.scorecard_id,
                        "found" if img and img.has_image else "none",
                    )
                except Exception as e:
                    logger.warning("Failed to hydrate %s: %s", college.name, e)
                time.sleep(RATE_SLEEP_SEC)

                if limit and processed >= limit:
                    logger.info("Reached limit=%s, stopping.", limit)
                    return
    finally:
        session.close()


if __name__ == "__main__":
    hydrate_images()

