import argparse
import json
import time
from typing import Dict, List

from .config import get_per_subreddit_limit, get_reddit_client, get_default_time_filter
from .parse_post import parse_applicant_post
from .college_mapping import load_college_mapping, normalize_college_name
from .models import ApplicantProfile


def _serialize_submission(sub) -> Dict:
    return {
        "id": sub.id,
        "subreddit": sub.subreddit.display_name,
        "title": sub.title,
        "body": sub.selftext or "",
        "created_utc": sub.created_utc,
        "url": sub.permalink,
    }


def fetch_collegeresults_posts(limit: int) -> List[Dict]:
    reddit = get_reddit_client()
    posts = []
    for sub in reddit.subreddit("collegeresults").top(time_filter=get_default_time_filter(), limit=limit):
        if not sub.is_self or not sub.selftext:
            continue
        posts.append(_serialize_submission(sub))
    return posts


def fetch_a2c_results_posts(limit: int) -> List[Dict]:
    reddit = get_reddit_client()
    posts = []
    queries = [
        '"Profile RESULTS"',
        '"results thread"',
        '"Class of" results',
        '"decision" title:results',
    ]
    sub = reddit.subreddit("ApplyingToCollege")
    per_query = max(50, limit // max(1, len(queries)))
    for q in queries:
        for subm in sub.search(q, limit=per_query, time_filter=get_default_time_filter()):
            if not subm.is_self or not subm.selftext:
                continue
            posts.append(_serialize_submission(subm))
            if len(posts) >= limit:
                break
        if len(posts) >= limit:
            break
    return posts


def fetch_chanceme_results_posts(limit: int) -> List[Dict]:
    reddit = get_reddit_client()
    posts = []
    sub = reddit.subreddit("chanceme")
    for subm in sub.new(limit=limit * 3):  # oversample then filter
        if not subm.is_self or not subm.selftext:
            continue
        title_body = (subm.title + " " + subm.selftext).lower()
        if any(k in title_body for k in ["result", "decision", "admitted", "got in"]):
            posts.append(_serialize_submission(subm))
        if len(posts) >= limit:
            break
    return posts


from typing import Optional


def posts_to_csv_rows(posts: List[Dict], college_mapping_path: Optional[str] = None) -> List[Dict]:
    mapping = load_college_mapping(college_mapping_path) if college_mapping_path else {}
    rows: List[Dict] = []
    for post in posts:
        profile = parse_applicant_post(post["title"], post["body"])
        if not profile or not profile.decisions:
            continue
        rows.extend(applicant_to_rows(profile, mapping))
    return rows


def applicant_to_rows(profile: ApplicantProfile, mapping: Dict[str, str]) -> List[Dict]:
    from .college_mapping import normalize_college_name

    rows: List[Dict] = []
    for raw_college_name, decision in profile.decisions:
        college_name = normalize_college_name(raw_college_name, mapping) if mapping else raw_college_name.strip()
        rows.append(
            {
                "college_name": college_name,
                "decision": decision,
                "gpa_unweighted": profile.gpa_unweighted,
                "gpa_weighted": profile.gpa_weighted,
                "sat": profile.sat,
                "act": profile.act,
                "ap_count": profile.ap_count,
                "honors_count": profile.honors_count,
                "class_rank_percentile": profile.class_rank_percentile,
                "class_size": profile.class_size,
                "extracurricular_depth": profile.extracurricular_depth,
                "leadership_positions": profile.leadership_positions,
                "awards_publications": profile.awards_publications,
                "volunteer_work": profile.volunteer_work,
                "research_experience": profile.research_experience,
                "business_ventures": profile.business_ventures,
                "passion_projects": profile.passion_projects,
                "work_hours": profile.work_hours,
                "volunteer_hours": profile.volunteer_hours,
                "misc_bullets_json": profile.misc_bullets_json,
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser(description="Reddit admissions scraper")
    parser.add_argument("--source", choices=["collegeresults", "a2c_results", "chanceme_results", "all"], default="all")
    parser.add_argument("--limit", type=int, default=None, help="per-source limit")
    parser.add_argument("--output", type=str, default="reddit_admissions_dataset.csv")
    parser.add_argument("--college-mapping", type=str, default=None, help="path to real_colleges_integrated.csv")
    args = parser.parse_args()

    limit = args.limit or get_per_subreddit_limit()
    sources = (
        ["collegeresults", "a2c_results", "chanceme_results"] if args.source == "all" else [args.source]
    )

    posts: List[Dict] = []
    fetchers = {
        "collegeresults": fetch_collegeresults_posts,
        "a2c_results": fetch_a2c_results_posts,
        "chanceme_results": fetch_chanceme_results_posts,
    }

    for src in sources:
        print(f"Fetching {src} (limit {limit})...")
        fetched = fetchers[src](limit)
        print(f"Fetched {len(fetched)} posts from {src}")
        posts.extend(fetched)
        time.sleep(1)

    rows = posts_to_csv_rows(posts, args.college_mapping)
    if not rows:
        print("No rows parsed. Check credentials and parsing heuristics.")
        return

    import csv

    fieldnames = [
        "college_name",
        "decision",
        "gpa_unweighted",
        "gpa_weighted",
        "sat",
        "act",
        "ap_count",
        "honors_count",
        "class_rank_percentile",
        "class_size",
        "extracurricular_depth",
        "leadership_positions",
        "awards_publications",
        "volunteer_work",
        "research_experience",
        "business_ventures",
        "passion_projects",
        "work_hours",
        "volunteer_hours",
        "misc_bullets_json",
    ]

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {args.output}")


if __name__ == "__main__":
    main()

