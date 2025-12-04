import json

from reddit_scraper.parse_post import parse_applicant_post


def test_parse_basic_post():
    title = "Results: Accepted to Stanford and MIT!"
    body = """
    GPA: 3.9 UW / 4.5 W
    SAT: 1550
    Rank: 20/500

    ECs:
    - President, Robotics (200 hours)
    - Research intern at AI Lab
    - Volunteer tutoring (150 hours)

    Accepted: Stanford University, MIT
    Rejected: Harvard University
    """
    profile = parse_applicant_post(title, body)
    assert profile is not None
    assert profile.gpa_unweighted == 3.9
    assert profile.sat == 1550
    assert profile.class_rank_percentile is not None
    assert len(profile.decisions) >= 2
    bullets = json.loads(profile.misc_bullets_json)
    assert any("Robotics" in b for b in bullets)

