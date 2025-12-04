import json
import re
from typing import List, Optional

from .models import ApplicantProfile
from .utils import clean_lines, normalize_whitespace, safe_json_array, strip_bullet_prefix


GPA_PATTERN = re.compile(
    r"(?:gpa[^\\d]{0,10})?(?P<uw>\\d\\.\\d{1,2})\\s*(?:uw|unweighted)?\\s*(?:[/,]|and)?\\s*(?P<w>\\d\\.\\d{1,2})?\\s*(?:w|weighted)?",
    re.IGNORECASE,
)
SAT_PATTERN = re.compile(r"sat[^\\d]{0,6}(\\d{3,4})", re.IGNORECASE)
ACT_PATTERN = re.compile(r"act[^\\d]{0,6}(\\d{1,2})", re.IGNORECASE)
AP_PATTERN = re.compile(r"\\bap[^\\d]{0,4}(\\d{1,2})", re.IGNORECASE)
HONORS_PATTERN = re.compile(r"honors[^\\d]{0,4}(\\d{1,2})", re.IGNORECASE)
RANK_FRACTION = re.compile(r"rank[^\\d]{0,6}(\\d{1,4})\\s*/\\s*(\\d{1,5})", re.IGNORECASE)
RANK_TOP = re.compile(r"top\\s*(\\d{1,2})\\s*%", re.IGNORECASE)


def _parse_gpa(text: str) -> tuple[Optional[float], Optional[float]]:
    for match in GPA_PATTERN.finditer(text):
        uw = match.group("uw")
        w = match.group("w")
        uw_val = float(uw) if uw else None
        w_val = float(w) if w else None
        return uw_val, w_val
    return None, None


def _parse_sat(text: str) -> Optional[int]:
    m = SAT_PATTERN.search(text)
    if m:
        val = int(m.group(1))
        if 400 <= val <= 1600:
            return val
    return None


def _parse_act(text: str) -> Optional[int]:
    m = ACT_PATTERN.search(text)
    if m:
        val = int(m.group(1))
        if 1 <= val <= 36:
            return val
    return None


def _parse_count(pattern: re.Pattern, text: str, lo: int = 0, hi: int = 50) -> Optional[int]:
    m = pattern.search(text)
    if m:
        val = int(m.group(1))
        if lo <= val <= hi:
            return val
    return None


def _parse_rank(text: str) -> tuple[Optional[float], Optional[int]]:
    m = RANK_FRACTION.search(text)
    if m:
        rank = int(m.group(1))
        size = int(m.group(2))
        if size > 0:
            pct = rank / size * 100
            return pct, size
    m = RANK_TOP.search(text)
    if m:
        pct = float(m.group(1))
        return pct, None
    return None, None


def _extract_section_lines(body_lower: str, body: str) -> List[str]:
    headers = ["ecs:", "extracurriculars:", "activities:", "extracurriculars/activities:"]
    end_markers = ["awards:", "honors:", "results:", "decisions:", "accepted:", "rejected:", "misc:", "notes:"]
    for header in headers:
        idx = body_lower.find(header)
        if idx != -1:
            sub = body[idx + len(header) :]
            end_idx = len(sub)
            for end in end_markers:
                j = sub.lower().find(end)
                if j != -1:
                    end_idx = min(end_idx, j)
            block = sub[:end_idx]
            return clean_lines(block)
    # Fallback: bullet-ish lines
    bullets = []
    for line in body.splitlines():
        if re.match(r"\\s*[-•*\\d]", line) and len(line.strip()) > 4:
            bullets.append(strip_bullet_prefix(line))
    return bullets


def _extract_decisions(text: str) -> List[tuple[str, int]]:
    decisions: List[tuple[str, int]] = []
    patterns = [
        (r"(accepted|admitted)\\s*:\\s*(.+)", 1),
        (r"(rejected|denied)\\s*:\\s*(.+)", 0),
    ]
    for line in text.splitlines():
        line_clean = normalize_whitespace(line)
        for pat, label in patterns:
            m = re.search(pat, line_clean, re.IGNORECASE)
            if m:
                tail = m.group(2)
                parts = [p.strip(" ,.;") for p in tail.split(",") if p.strip(" ,.;")]
                for college in parts:
                    decisions.append((college, label))
    return decisions


def parse_applicant_post(title: str, body: str) -> Optional[ApplicantProfile]:
    full = f"{title}\\n{body}"
    full_lower = full.lower()

    gpa_uw, gpa_w = _parse_gpa(full)
    sat = _parse_sat(full)
    act = _parse_act(full)
    ap_count = _parse_count(AP_PATTERN, full)
    honors_count = _parse_count(HONORS_PATTERN, full)
    rank_pct, class_size = _parse_rank(full)

    misc_lines = _extract_section_lines(full_lower, full)
    misc_json = safe_json_array(misc_lines) if misc_lines else None

    decisions = _extract_decisions(full)
    if not decisions:
        return None

    # Light EC strength heuristics
    leadership = 1.0 if any(re.search(r"president|captain|lead|chair|director", l, re.IGNORECASE) for l in misc_lines) else None
    research = 1.0 if any("research" in l.lower() or "lab" in l.lower() for l in misc_lines) else None
    volunteer = 1.0 if any("volunteer" in l.lower() or "service" in l.lower() for l in misc_lines) else None
    business = 1.0 if any(re.search(r"founder|startup|business|company", l, re.IGNORECASE) for l in misc_lines) else None

    profile = ApplicantProfile(
        raw_title=title,
        raw_body=body,
        gpa_unweighted=gpa_uw,
        gpa_weighted=gpa_w,
        sat=sat,
        act=act,
        ap_count=ap_count,
        honors_count=honors_count,
        class_rank_percentile=rank_pct,
        class_size=class_size,
        extracurricular_depth=float(len(misc_lines)) if misc_lines else None,
        leadership_positions=leadership,
        awards_publications=None,
        volunteer_work=volunteer,
        research_experience=research,
        business_ventures=business,
        passion_projects=None,
        work_hours=None,
        volunteer_hours=None,
        misc_bullets_json=misc_json,
        decisions=decisions,
    )
    return profile

