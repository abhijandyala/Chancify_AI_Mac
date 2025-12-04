# Reddit admissions scraper (A2C / collegeresults / chanceme)

## Setup
1) Install deps (backend venv):
```
pip install -r backend/requirements.txt
```
2) Create `.env` in repo root or export env vars:
```
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USERNAME=...
REDDIT_PASSWORD=...
REDDIT_USER_AGENT=ChancifyAI/1.0
REDDIT_TIME_FILTER=year    # optional
REDDIT_PER_SUBREDDIT_LIMIT=500  # optional
```

## Run
From `backend/`:
```
python -m reddit_scraper.scrape --source all --limit 400 --output reddit_admissions_dataset.csv --college-mapping ../data/raw/real_colleges_integrated.csv
```
Sources: `collegeresults`, `a2c_results`, `chanceme_results`, or `all`.

Output: CSV with one row per (applicant, college):
`college_name, decision (1/0), gpa_* , sat/act, ap_count, honors_count, class_rank_percentile, class_size, extracurricular_depth, leadership_positions, awards_publications, volunteer_work, research_experience, business_ventures, passion_projects, work_hours, volunteer_hours, misc_bullets_json`

## Notes
- Decisions parse accepted/rejected lines; waitlists ignored.
- EC bullets pulled from EC sections or bullet-like lines; stored as JSON array string.
- Heuristics are conservative; improves coverage over time.

