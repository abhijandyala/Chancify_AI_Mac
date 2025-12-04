from dataclasses import dataclass, field
from typing import List, Optional, Tuple


Decision = Tuple[str, int]  # (college_name, decision_int)


@dataclass
class ApplicantProfile:
    raw_title: str
    raw_body: str

    gpa_unweighted: Optional[float] = None
    gpa_weighted: Optional[float] = None
    sat: Optional[int] = None
    act: Optional[int] = None
    ap_count: Optional[int] = None
    honors_count: Optional[int] = None
    class_rank_percentile: Optional[float] = None
    class_size: Optional[int] = None

    extracurricular_depth: Optional[float] = None
    leadership_positions: Optional[float] = None
    awards_publications: Optional[float] = None
    volunteer_work: Optional[float] = None
    research_experience: Optional[float] = None
    business_ventures: Optional[float] = None
    passion_projects: Optional[float] = None
    work_hours: Optional[float] = None
    volunteer_hours: Optional[float] = None

    misc_bullets_json: Optional[str] = None
    decisions: List[Decision] = field(default_factory=list)

