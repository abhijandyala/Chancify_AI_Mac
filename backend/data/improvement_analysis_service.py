import pandas as pd
import os
import json
import logging
from typing import Dict, List, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ImprovementArea:
    area: str
    current: str
    target: str
    impact: int
    priority: str  # 'high', 'medium', 'low'
    description: str
    actionable_steps: List[str]

class ImprovementAnalysisService:
    def __init__(self):
        self.elite_colleges_data = {}
        self.admission_factors = {}
        self.general_colleges_df = None
        self.load_data()

        # TEMPORARY: Hardcode Carnegie Mellon data for testing
        self.elite_colleges_data["Carnegie Mellon"] = {
            "acceptance_rate": 0.135,
            "sat_25th": 1470,
            "sat_75th": 1570,
            "act_25th": 34,
            "act_75th": 36,
            "gpa_avg": 4.11,
            "gpa_unweighted_avg": 3.93,
            "category": "selective"
        }

        logger.info(f"ImprovementAnalysisService initialized with {len(self.elite_colleges_data)} colleges")
        if len(self.elite_colleges_data) == 0:
            logger.error("CRITICAL: Elite colleges data is empty! This will cause all analyses to fail.")
        else:
            logger.info(f"Elite colleges data loaded successfully. Sample: {list(self.elite_colleges_data.keys())[:3]}")

    def load_data(self):
        """Load all necessary data for improvement analysis"""
        try:
            # Load elite colleges data - use absolute path to ensure it's found
            elite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'models', 'elite_colleges_data.json'))
            logger.info(f"Looking for elite colleges data at: {elite_path}")
            logger.info(f"Current working directory: {os.getcwd()}")
            logger.info(f"File exists: {os.path.exists(elite_path)}")

            if os.path.exists(elite_path):
                try:
                    with open(elite_path, 'r') as f:
                        self.elite_colleges_data = json.load(f)
                    logger.info(f"Loaded elite colleges data: {len(self.elite_colleges_data)} colleges")
                    logger.info(f"Sample colleges: {list(self.elite_colleges_data.keys())[:5]}")
                except Exception as e:
                    logger.error(f"Failed to parse elite colleges data JSON: {e}")
                    self.elite_colleges_data = {}
            else:
                logger.error(f"Elite colleges data file not found at: {elite_path}")
                # Try alternative path
                alt_path = os.path.join(os.getcwd(), 'backend', 'data', 'models', 'elite_colleges_data.json')
                logger.info(f"Trying alternative path: {alt_path}")
                if os.path.exists(alt_path):
                    with open(alt_path, 'r') as f:
                        self.elite_colleges_data = json.load(f)
                    logger.info(f"Loaded elite colleges data from alternative path: {len(self.elite_colleges_data)} colleges")
                else:
                    logger.error(f"Alternative path also not found: {alt_path}")
                    # Initialize empty dict to prevent errors
                    self.elite_colleges_data = {}

            # Load broader college dataset as a secondary source for acceptance rates/metadata
            try:
                import pandas as pd  # local import to avoid issues if pandas missing at import-time
                # Try multiple possible paths
                possible_paths = [
                    os.path.join(os.path.dirname(__file__), 'raw', 'real_colleges_integrated.csv'),  # Relative to this file
                    os.path.abspath(os.path.join(os.getcwd(), 'backend', 'data', 'raw', 'real_colleges_integrated.csv')),  # From project root
                    os.path.abspath(os.path.join(os.getcwd(), 'data', 'raw', 'real_colleges_integrated.csv')),  # From backend directory
                ]

                csv_path = None
                for path in possible_paths:
                    if os.path.exists(path):
                        csv_path = path
                        break

                if csv_path and os.path.exists(csv_path):
                    self.general_colleges_df = pd.read_csv(csv_path)
                    logger.info(f"Loaded general colleges dataset: {self.general_colleges_df.shape} from {csv_path}")
                else:
                    logger.warning(f"General colleges CSV not found. Tried paths: {possible_paths}")
            except Exception as e:
                logger.warning(f"Failed to load general colleges dataset: {e}")

            # Load admission factors
            factors_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'factors', 'admissions_factors.json')
            if os.path.exists(factors_path):
                with open(factors_path, 'r') as f:
                    factors_data = json.load(f)
                    self.admission_factors = {factor['id']: factor for factor in factors_data['factors']}
                logger.info(f"Loaded admission factors: {len(self.admission_factors)} factors")

        except Exception as e:
            logger.error(f"Error loading improvement analysis data: {e}")

    def analyze_user_profile(self, user_profile: Dict[str, Any], college_name: str) -> List[ImprovementArea]:
        """
        Analyze user profile against college requirements and return improvement areas
        """
        try:
            # Try exact match first
            college_data = self.elite_colleges_data.get(college_name, {})
            logger.info(f"Direct match for '{college_name}': {len(college_data)} fields")

            # If not found, try common variations
            if not college_data:
                # Try without "University" suffix
                if "University" in college_name:
                    short_name = college_name.replace(" University", "")
                    college_data = self.elite_colleges_data.get(short_name, {})
                    logger.info(f"After removing 'University' ('{short_name}'): {len(college_data)} fields")

                # Try without "College" suffix
                if not college_data and "College" in college_name:
                    short_name = college_name.replace(" College", "")
                    college_data = self.elite_colleges_data.get(short_name, {})
                    logger.info(f"After removing 'College' ('{short_name}'): {len(college_data)} fields")

                # Try common abbreviations
                if not college_data:
                    name_variations = {
                        "Massachusetts Institute of Technology": "MIT",
                        "Carnegie Mellon University": "Carnegie Mellon",
                        "University of Pennsylvania": "Penn",
                        "New York University": "NYU",
                        "University of California-Berkeley": "UC Berkeley",
                        "University of California-Los Angeles": "UCLA"
                    }
                    for full_name, short_name in name_variations.items():
                        if college_name == full_name:
                            college_data = self.elite_colleges_data.get(short_name, {})
                            logger.info(f"Variation match ('{full_name}' -> '{short_name}'): {len(college_data)} fields")
                            break

            if not college_data:
                # Try the broader dataset before falling back
                if self.general_colleges_df is not None and not self.general_colleges_df.empty:
                    df = self.general_colleges_df
                    try:
                        # Exact, then case-insensitive contains
                        row = df[df['name'].str.lower() == college_name.lower()]
                        if row.empty:
                            row = df[df['name'].str.lower().str.contains(college_name.lower(), na=False)]
                        if not row.empty:
                            r = row.iloc[0]
                            acceptance_rate = None
                            if 'acceptance_rate' in r and pd.notna(r['acceptance_rate']):
                                acceptance_rate = float(r['acceptance_rate'])
                            elif 'acceptance_rate_percent' in r and pd.notna(r['acceptance_rate_percent']):
                                acceptance_rate = float(r['acceptance_rate_percent']) / 100.0

                            college_data = {
                                "acceptance_rate": acceptance_rate if acceptance_rate is not None else 0.18,
                                "sat_25th": int(r.get('sat_25th', 1400)) if 'sat_25th' in r and pd.notna(r['sat_25th']) else 1400,
                                "sat_75th": int(r.get('sat_75th', 1550)) if 'sat_75th' in r and pd.notna(r['sat_75th']) else 1550,
                                "act_25th": int(r.get('act_25th', 31)) if 'act_25th' in r and pd.notna(r['act_25th']) else 31,
                                "act_75th": int(r.get('act_75th', 35)) if 'act_75th' in r and pd.notna(r['act_75th']) else 35,
                                "gpa_avg": float(r.get('gpa_average', 4.05)) if 'gpa_average' in r and pd.notna(r['gpa_average']) else 4.05,
                                "gpa_unweighted_avg": float(r.get('gpa_unweighted_avg', 3.85)) if 'gpa_unweighted_avg' in r and pd.notna(r['gpa_unweighted_avg']) else 3.85,
                                "category": "selective"
                            }
                            logger.info(f"General dataset match found for '{college_name}' → using derived metrics")
                    except Exception as e:
                        logger.warning(f"Failed matching in general dataset for '{college_name}': {e}")

            if not college_data:
                logger.warning(f"No data found for '{college_name}' in elite or general datasets; using conservative defaults")
                college_data = {
                    "acceptance_rate": 0.18,
                    "sat_25th": 1350,
                    "sat_75th": 1500,
                    "act_25th": 30,
                    "act_75th": 34,
                    "gpa_avg": 4.05,
                    "gpa_unweighted_avg": 3.85,
                    "category": "selective"
                }

            logger.info(f"Using college data with {len(college_data)} fields for analysis")

            improvements = []

            # 1. Academic Performance Analysis
            try:
                improvements.extend(self._analyze_academic_performance(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in academic performance analysis: {e}")

            # 2. Standardized Testing Analysis
            try:
                improvements.extend(self._analyze_standardized_testing(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in standardized testing analysis: {e}")

            # 3. Extracurricular Activities Analysis
            try:
                improvements.extend(self._analyze_extracurriculars(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in extracurricular analysis: {e}")

            # 4. Leadership & Awards Analysis
            try:
                improvements.extend(self._analyze_leadership_awards(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in leadership analysis: {e}")

            # 5. Academic Rigor Analysis
            try:
                improvements.extend(self._analyze_academic_rigor(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in academic rigor analysis: {e}")

            # 6. Research & Innovation Analysis
            try:
                improvements.extend(self._analyze_research_innovation(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in research analysis: {e}")

            # 7. Essays & Recommendations Analysis
            try:
                improvements.extend(self._analyze_essays_recommendations(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in essays analysis: {e}")

            # 8. NEW: Major-Specific Analysis
            try:
                improvements.extend(self._analyze_major_specific(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in major analysis: {e}")

            # 9. Geographic & Diversity Analysis (DISABLED per product decision)
            # Skipped: do not factor first-gen/diversity or geographic diversity in improvement recommendations

            # 10. NEW: Interview & Demonstrated Interest Analysis
            try:
                improvements.extend(self._analyze_interview_interest(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in interview analysis: {e}")

            # 11. NEW: Portfolio & Creative Analysis
            try:
                improvements.extend(self._analyze_portfolio_creative(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in portfolio analysis: {e}")

            # 12. NEW: Volunteer & Community Service Analysis
            try:
                improvements.extend(self._analyze_volunteer_service(user_profile, college_data))
            except Exception as e:
                logger.error(f"Error in volunteer analysis: {e}")

            # Log the number of improvements generated
            logger.info(f"Total improvements generated: {len(improvements)}")

            # Sort by priority and impact
            improvements.sort(key=lambda x: (x.priority == 'high', x.impact), reverse=True)

            # Return improvements (analysis methods should ALWAYS return at least maintenance advice)
            if len(improvements) == 0:
                logger.error("NO improvements generated - this should never happen!")
                return self._get_default_improvements()

            return improvements[:20]  # Return up to 20 improvements for comprehensive analysis

        except Exception as e:
            logger.error(f"Error analyzing user profile: {e}")
            return self._get_default_improvements()

    def _analyze_academic_performance(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze GPA and academic performance with enhanced calculations"""
        improvements = []

        # Get user GPA with multiple scales - handle string values
        user_gpa_unweighted = profile.get('gpa_unweighted', 0)
        user_gpa_weighted = profile.get('gpa_weighted', 0)

        # Convert string values to numbers if needed
        try:
            user_gpa_unweighted = float(user_gpa_unweighted) if user_gpa_unweighted else 0
            user_gpa_weighted = float(user_gpa_weighted) if user_gpa_weighted else 0
        except (ValueError, TypeError):
            user_gpa_unweighted = 0
            user_gpa_weighted = 0

        college_avg_gpa = college_data.get('gpa_unweighted_avg', 3.9)
        college_weighted_gpa = college_data.get('gpa_avg', 4.1)

        # Use the more relevant GPA based on what's available
        user_gpa = user_gpa_unweighted if user_gpa_unweighted > 0 else user_gpa_weighted
        target_gpa = college_avg_gpa if user_gpa_unweighted > 0 else college_weighted_gpa

        # Debug logging
        logger.info(f"Academic Performance Debug: user_gpa={user_gpa}, target_gpa={target_gpa}, college_avg_gpa={college_avg_gpa}")
        logger.info(f"Academic Performance Debug: user_gpa_unweighted={user_gpa_unweighted}, user_gpa_weighted={user_gpa_weighted}")
        logger.info(f"Academic Performance Debug: college_weighted_gpa={college_weighted_gpa}")
        logger.info(f"Academic Performance Debug: Comparison user_gpa >= target_gpa: {user_gpa} >= {target_gpa} = {user_gpa >= target_gpa}")

        # Check if user already exceeds target significantly
        if user_gpa >= target_gpa:
            # User has met or exceeded target - don't show this improvement
            pass
        elif user_gpa < target_gpa - 0.1:
            # User needs significant improvement
            gap = target_gpa - user_gpa
            target_gpa_final = min(target_gpa + 0.05, 4.0 if user_gpa_unweighted > 0 else 5.0)

            # Calculate impact based on gap size and college selectivity
            acceptance_rate = college_data.get('acceptance_rate', 0.15)
            selectivity_multiplier = 1.5 if acceptance_rate < 0.1 else 1.2 if acceptance_rate < 0.2 else 1.0

            impact = int(gap * 15 * selectivity_multiplier)
            priority = "high" if gap > 0.2 else "medium"

            improvements.append(ImprovementArea(
                area="Academic Performance",
                current=f"{user_gpa:.2f} GPA",
                target=f"{target_gpa_final:.2f}+ GPA",
                impact=min(impact, 15),  # Cap at 15%
                priority=priority,
                description=f"Your GPA is {round(target_gpa - user_gpa, 2)} points below the average for admitted students at this selective school",
                actionable_steps=[
                    "Focus on improving grades in core academic subjects",
                    "Consider retaking courses with low grades if possible",
                    "Maintain strong performance in remaining semesters",
                    "Highlight upward trend if grades are improving",
                    "Take challenging courses while maintaining high grades"
                ]
            ))
        else:
            # User is close to target - minor improvement needed
            target_gpa_final = min(target_gpa + 0.05, 4.0 if user_gpa_unweighted > 0 else 5.0)
            impact = 3  # Low impact since close to target
            priority = "low"

            improvements.append(ImprovementArea(
                area="Academic Performance",
                current=f"{user_gpa:.2f} GPA",
                target=f"{target_gpa_final:.2f}+ GPA",
                impact=impact,
                priority=priority,
                description="You're close to the target GPA. Small improvements can strengthen your application.",
                actionable_steps=[
                    "Focus on improving grades in core academic subjects",
                    "Consider retaking courses with low grades if possible",
                    "Maintain strong performance in remaining semesters"
                ]
            ))

        return improvements

    def _analyze_standardized_testing(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze SAT/ACT scores with enhanced calculations"""
        improvements = []

        # Get user test scores - handle both field name variations
        user_sat = profile.get('sat_total', profile.get('sat', 0))
        user_act = profile.get('act_composite', profile.get('act', 0))

        # Convert string values to numbers if needed
        try:
            user_sat = float(user_sat) if user_sat else 0
            user_act = float(user_act) if user_act else 0
        except (ValueError, TypeError):
            user_sat = 0
            user_act = 0

        # Get college test score ranges
        college_sat_25th = college_data.get('sat_25th', 1400)
        college_sat_75th = college_data.get('sat_75th', 1550)
        college_act_25th = college_data.get('act_25th', 30)
        college_act_75th = college_data.get('act_75th', 35)

        # Check SAT scores
        if user_sat > 0:
            if user_sat >= college_sat_75th:
                # User has met or exceeded 75th percentile - don't show this improvement
                pass
            elif user_sat < college_sat_25th:
                # User needs significant improvement
                gap = college_sat_25th - user_sat
                target_sat = min(college_sat_75th, user_sat + 100)

                # Calculate impact based on gap and college selectivity
                acceptance_rate = college_data.get('acceptance_rate', 0.15)
                selectivity_multiplier = 1.3 if acceptance_rate < 0.1 else 1.1 if acceptance_rate < 0.2 else 1.0

                impact = int(gap / 8 * selectivity_multiplier)  # 1% per 8 SAT points
                priority = "high" if gap > 100 else "medium"

                improvements.append(ImprovementArea(
                    area="Standardized Testing",
                    current=f"{user_sat} SAT",
                    target=f"{target_sat}+ SAT",
                    impact=min(impact, 12),  # Cap at 12%
                    priority=priority,
                    description=f"Your SAT score is {gap} points below the 25th percentile for admitted students",
                    actionable_steps=[
                        "Take practice tests to identify weak areas",
                        "Consider SAT prep course or tutoring",
                        "Focus on math and reading comprehension",
                        "Take multiple practice tests to improve timing"
                    ]
                ))
            else:
                # User is between 25th and 75th percentile
                target_sat = min(college_sat_75th + 50, 1600)
                impact = 3  # Low impact since already competitive
                priority = "low"

                improvements.append(ImprovementArea(
                    area="Standardized Testing",
                    current=f"{user_sat} SAT",
                    target=f"{target_sat}+ SAT",
                    impact=impact,
                    priority=priority,
                    description="Your SAT score is competitive - aim for the 75th percentile to strengthen your application",
                    actionable_steps=[
                        "Take practice tests to identify weak areas",
                        "Consider SAT prep course or tutoring",
                        "Focus on math and reading comprehension"
                    ]
                ))

        elif user_act > 0:
            if user_act >= college_act_75th:
                # User has met or exceeded 75th percentile - don't show this improvement
                pass
            elif user_act < college_act_25th:
                # User needs significant improvement
                gap = college_act_25th - user_act
                target_act = min(college_act_75th, user_act + 3)

                # Calculate impact based on gap and college selectivity
                acceptance_rate = college_data.get('acceptance_rate', 0.15)
                selectivity_multiplier = 1.3 if acceptance_rate < 0.1 else 1.1 if acceptance_rate < 0.2 else 1.0

                impact = int(gap * 2 * selectivity_multiplier)  # 2% per ACT point
                priority = "high" if gap > 3 else "medium"

                improvements.append(ImprovementArea(
                    area="Standardized Testing",
                    current=f"{user_act} ACT",
                    target=f"{target_act}+ ACT",
                    impact=min(impact, 12),  # Cap at 12%
                    priority=priority,
                    description=f"Your ACT score is {gap} points below the 25th percentile for admitted students",
                    actionable_steps=[
                        "Take practice tests to identify weak areas",
                        "Consider ACT prep course or tutoring",
                        "Focus on weak subject areas",
                        "Take the test multiple times for superscoring",
                        "Consider ACT Writing if required"
                    ]
                ))
            else:
                # User is between 25th and 75th percentile
                target_act = min(college_act_75th + 1, 36)
                impact = 3  # Low impact since already competitive
                priority = "low"

                improvements.append(ImprovementArea(
                    area="Standardized Testing",
                    current=f"{user_act} ACT",
                    target=f"{target_act}+ ACT",
                    impact=impact,
                    priority=priority,
                    description="Your ACT score is competitive - aim for the 75th percentile to strengthen your application",
                    actionable_steps=[
                        "Take practice tests to identify weak areas",
                        "Consider ACT prep course or tutoring",
                        "Focus on weak subject areas",
                        "Take the test multiple times for superscoring"
                    ]
                ))

        else:
            # No test scores provided - provide general guidance
            improvements.append(ImprovementArea(
                area="Standardized Testing",
                current="No test scores provided",
                target=f"{college_sat_25th}+ SAT or {college_act_25th}+ ACT",
                impact=8,  # Medium impact for missing scores
                priority="high",
                description="Standardized test scores are important for this selective college",
                actionable_steps=[
                    "Take practice tests to identify weak areas",
                    "Consider test prep course or tutoring",
                    "Focus on weak subject areas",
                    "Take the test multiple times for superscoring",
                    "Consider test writing if required"
                ]
            ))

        return improvements

    def _analyze_extracurriculars(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze extracurricular activities with enhanced depth analysis"""
        improvements = []

        # Get user extracurricular data with string-to-number conversion
        ec_depth = profile.get('extracurricular_depth', 5)
        leadership = profile.get('leadership_positions', 0)
        passion_projects = profile.get('passion_projects', 0)

        # Convert string values to numbers if needed
        try:
            ec_depth = float(ec_depth) if ec_depth else 5
            leadership = float(leadership) if leadership else 0
            passion_projects = float(passion_projects) if passion_projects else 0
        except (ValueError, TypeError):
            ec_depth = 5
            leadership = 0
            passion_projects = 0

        # Calculate current level based on multiple factors
        current_level = (ec_depth + leadership + passion_projects) / 3

        # Determine target based on college selectivity
        acceptance_rate = college_data.get('acceptance_rate', 0.15)
        if acceptance_rate < 0.1:  # Ultra-selective
            target_level = 8.5
        elif acceptance_rate < 0.2:  # Highly selective
            target_level = 7.5
        else:  # Selective
            target_level = 6.5

        # Only provide guidance if current is below target
        if current_level < target_level:
            gap = target_level - current_level
            impact = int(gap * 3)  # 3% per level gap
            priority = "high" if gap > 2 else "medium"
            description = f"Increase depth and commitment in extracurricular activities for this competitive school"

            improvements.append(ImprovementArea(
                area="Extracurricular Activities",
                current=f"{current_level:.1f}/10 overall depth",
                target=f"{target_level:.1f}/10 with leadership",
                impact=min(impact, 12),  # Cap at 12%
                priority=priority,
                description=description,
                actionable_steps=[
                    "Focus on 2-3 activities you're passionate about",
                    "Take on leadership roles in existing activities",
                    "Show long-term commitment (2+ years)",
                    "Document impact and achievements",
                    "Develop unique projects or initiatives"
                ]
            ))
        # If current >= target, don't show improvement

        return improvements

    def _analyze_leadership_awards(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze leadership positions and awards - ALWAYS provide guidance"""
        improvements = []

        leadership = profile.get('leadership_positions', 0)
        awards = profile.get('awards_publications', 0)

        # Convert string values to numbers if needed
        try:
            leadership = float(leadership) if leadership else 0
            awards = float(awards) if awards else 0
        except (ValueError, TypeError):
            leadership = 0
            awards = 0

        # Check leadership positions
        if leadership >= 8:
            # User has exceptional leadership - don't show this improvement
            pass
        elif leadership < 2:
            # User needs significant improvement
            improvements.append(ImprovementArea(
                area="Leadership Experience",
                current=f"{leadership} positions",
                target="2+ leadership roles",
                impact=8,
                priority="medium",
                description="Develop leadership experience in your areas of interest",
                actionable_steps=[
                    "Run for student government positions",
                    "Start a club or organization",
                    "Take initiative in existing activities",
                    "Mentor younger students"
                ]
            ))
        else:
            # User has some leadership but can improve
            improvements.append(ImprovementArea(
                area="Leadership Experience",
                current=f"{leadership} positions",
                target="8+ exceptional leadership",
                impact=3,
                priority="low",
                description="Maintain your strong leadership and consider taking on more responsibility",
                actionable_steps=[
                    "Take on higher-level leadership roles",
                    "Mentor others in leadership",
                    "Lead major projects or initiatives",
                    "Document your leadership impact"
                ]
            ))

        # Only provide awards guidance if below target
        if awards < 3:
            improvements.append(ImprovementArea(
                area="Awards & Recognition",
                current=f"{awards} awards",
                target="3+ significant awards",
                impact=6,
                priority="low",
                description="Pursue recognition in your areas of strength",
                actionable_steps=[
                    "Enter competitions in your field of interest",
                    "Apply for scholarships and recognition programs",
                    "Pursue research or creative projects",
                    "Document all achievements and recognition"
                ]
            ))
        elif awards < 7:
            # User is between 3 and 7 - provide guidance for excellence
            improvements.append(ImprovementArea(
                area="Awards & Recognition",
                current=f"{awards} awards",
                target="7+ exceptional recognition",
                impact=2,
                priority="low",
                description="Maintain your strong recognition and pursue higher-level awards",
                actionable_steps=[
                    "Apply for national/international competitions",
                    "Pursue prestigious scholarships",
                    "Document all achievements professionally",
                    "Seek recognition in multiple areas"
                ]
            ))
        # If awards >= 7, don't show improvement

        return improvements

    def _analyze_academic_rigor(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze AP courses and academic rigor with enhanced calculations"""
        improvements = []

        # Get actual AP courses from profile data
        ap_count = profile.get('ap_count', 5)

        # Convert string values to numbers if needed
        try:
            ap_count = int(float(ap_count)) if ap_count else 5
        except (ValueError, TypeError):
            ap_count = 5
        # Determine target based solely on college selectivity (ignore HS reputation)
        acceptance_rate = college_data.get('acceptance_rate', 0.15)
        if acceptance_rate < 0.1:  # Ultra-selective
            target_ap = 7
        elif acceptance_rate < 0.2:  # Highly selective
            target_ap = 5
        else:  # Selective
            target_ap = 3

        # Only provide academic rigor guidance if below target
        if ap_count < target_ap:
            gap = target_ap - ap_count
            impact = int(gap * 2)  # 2% per AP course gap
            priority = "high" if gap > 3 else "medium"

            improvements.append(ImprovementArea(
                area="Academic Rigor",
                current=f"{ap_count} AP courses",
                target=f"{target_ap}+ AP courses",
                impact=min(impact, 10),  # Cap at 10%
                priority=priority,
                description=f"Increase the rigor of your academic coursework for this competitive school",
                actionable_steps=[
                    "Take more AP courses in your areas of strength",
                    "Consider dual enrollment courses",
                    "Pursue honors-level coursework",
                    "Maintain strong grades while increasing rigor",
                    "Focus on courses related to your intended major"
                ]
            ))
        # If ap_count >= target_ap, don't show improvement

        return improvements

    def _analyze_research_innovation(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze research and innovation experience - ALWAYS provide guidance"""
        improvements = []

        research = profile.get('research_experience', 0)
        passion_projects = profile.get('passion_projects', 0)

        # Convert string values to numbers if needed
        try:
            research = float(research) if research else 0
            passion_projects = float(passion_projects) if passion_projects else 0
        except (ValueError, TypeError):
            research = 0
            passion_projects = 0

        # Always provide research guidance
        if research < 2:
            improvements.append(ImprovementArea(
                area="Research & Innovation",
                current=f"{research}/10 research experience",
                target="7+/10 with projects",
                impact=8,
                priority="medium",
                description="Develop research or innovative project experience",
                actionable_steps=[
                    "Pursue independent research projects",
                    "Work with teachers on research initiatives",
                    "Participate in science fairs or competitions",
                    "Document your research process and findings"
                ]
            ))
        elif research >= 9:
            # User has already met or exceeded the target - don't show this improvement
            pass
        else:
            # User is between 2 and 9 - provide guidance for excellence
            improvements.append(ImprovementArea(
                area="Research & Innovation",
                current=f"{research}/10 research experience",
                target="9+/10 exceptional research",
                impact=3,
                priority="low",
                description="Maintain your strong research experience and pursue advanced projects",
                actionable_steps=[
                    "Pursue advanced research opportunities",
                    "Consider publishing or presenting findings",
                    "Mentor others in research",
                    "Document all research achievements"
                ]
            ))

        # Always provide passion projects guidance
        if passion_projects < 3:
            improvements.append(ImprovementArea(
                area="Passion Projects",
                current=f"{passion_projects}/10 projects",
                target="7+/10 meaningful projects",
                impact=4,
                priority="medium",
                description="Develop personal projects that show initiative and passion",
                actionable_steps=[
                    "Start personal projects in your areas of interest",
                    "Show initiative and self-direction",
                    "Document progress and impact",
                    "Create something meaningful"
                ]
            ))
        elif passion_projects >= 9:
            # User has already met or exceeded the target - don't show this improvement
            pass
        else:
            # User is between 3 and 9 - provide guidance for excellence
            improvements.append(ImprovementArea(
                area="Passion Projects",
                current=f"{passion_projects}/10 projects",
                target="9+/10 exceptional projects",
                impact=2,
                priority="low",
                description="Maintain your strong passion projects and consider advanced initiatives",
                actionable_steps=[
                    "Take on more ambitious projects",
                    "Share your work with others",
                    "Mentor others in similar projects",
                    "Document all project achievements"
                ]
            ))

        return improvements

    def _analyze_essays_recommendations(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze essays and recommendations"""
        improvements = []

        essay_quality = profile.get('essay_quality', 5)
        recommendations = profile.get('recommendations', 5)

        # Convert string values to numbers if needed
        try:
            essay_quality = float(essay_quality) if essay_quality else 5
            recommendations = float(recommendations) if recommendations else 5
        except (ValueError, TypeError):
            essay_quality = 5
            recommendations = 5

        if essay_quality < 8:
            improvements.append(ImprovementArea(
                area="Essay Quality",
                current=f"{essay_quality}/10 quality",
                target="8+/10 compelling essays",
                impact=6,
                priority="medium",
                description="Improve the quality and authenticity of your essays",
                actionable_steps=[
                    "Start writing essays early and revise multiple times",
                    "Show, don't tell - use specific examples",
                    "Be authentic and personal in your writing",
                    "Get feedback from teachers and mentors"
                ]
            ))
        # If essay_quality >= 8, don't show improvement

        if recommendations < 8:
            improvements.append(ImprovementArea(
                area="Recommendations",
                current=f"{recommendations}/10 strength",
                target="8+/10 strong recommendations",
                impact=5,
                priority="low",
                description="Strengthen relationships with teachers and mentors",
                actionable_steps=[
                    "Build strong relationships with teachers",
                    "Participate actively in class discussions",
                    "Seek opportunities to work closely with faculty",
                    "Provide recommenders with your resume and goals"
                ]
            ))
        # If recommendations >= 8, don't show improvement

        return improvements

    def _analyze_major_specific(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze major-specific requirements and preparation"""
        improvements = []

        intended_major = profile.get('intended_major', profile.get('major', 'General Studies'))
        # Always provide major-specific guidance, even if no specific major provided

        # STEM majors require strong math/science background
        stem_majors = ['computer science', 'engineering', 'mathematics', 'physics', 'chemistry', 'biology', 'medicine']
        is_stem = any(major in intended_major.lower() for major in stem_majors)

        if is_stem:
            # Check for STEM-specific activities
            research_experience = profile.get('research_experience', 0)
            try:
                research_experience = float(research_experience) if research_experience else 0
            except (ValueError, TypeError):
                research_experience = 0
            if research_experience < 7:
                improvements.append(ImprovementArea(
                    area="STEM Preparation",
                    current=f"{research_experience}/10 research experience",
                    target="7+/10 with STEM projects",
                    impact=9,
                    priority="high",
                    description="Develop strong STEM background for competitive programs",
                    actionable_steps=[
                        "Participate in science fairs and competitions",
                        "Take advanced math and science courses",
                        "Pursue independent research projects",
                        "Join STEM clubs and organizations",
                        "Consider summer STEM programs"
                    ]
                ))
            # If research_experience >= 7, don't show improvement

        # Business/Economics majors
        business_majors = ['business', 'economics', 'finance', 'marketing', 'management']
        is_business = any(major in intended_major.lower() for major in business_majors)

        if is_business:
            business_ventures = profile.get('business_ventures', 0)

            # Convert string values to numbers if needed
            try:
                business_ventures = float(business_ventures) if business_ventures else 0
            except (ValueError, TypeError):
                business_ventures = 0
            if business_ventures < 6:
                improvements.append(ImprovementArea(
                    area="Business Experience",
                    current=f"{business_ventures}/10 business ventures",
                    target="6+/10 with real projects",
                    impact=7,
                    priority="medium",
                    description="Gain hands-on business experience",
                    actionable_steps=[
                        "Start a small business or side project",
                        "Participate in business competitions",
                        "Take economics and business courses",
                        "Join business clubs and organizations",
                        "Seek internships or shadowing opportunities"
                    ]
                ))
            # If business_ventures >= 6, don't show improvement

        return improvements

    def _analyze_geographic_diversity(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze geographic diversity factors"""
        improvements = []

        geographic_diversity = profile.get('geographic_diversity', 5)
        firstgen_diversity = profile.get('firstgen_diversity', 5)

        # Convert string values to numbers if needed
        try:
            geographic_diversity = float(geographic_diversity) if geographic_diversity else 5
            firstgen_diversity = float(firstgen_diversity) if firstgen_diversity else 5
        except (ValueError, TypeError):
            geographic_diversity = 5
            firstgen_diversity = 5

        # First-generation college student - ALWAYS provide guidance
        if firstgen_diversity < 7:
            improvements.append(ImprovementArea(
                area="First-Gen Support",
                current=f"{firstgen_diversity}/10 first-gen factors",
                target="8+/10 strong first-gen profile",
                impact=6,
                priority="medium",
                description="Highlight first-generation college student status",
                actionable_steps=[
                    "Emphasize family's educational journey in essays",
                    "Connect with first-gen support programs",
                    "Highlight overcoming educational barriers",
                    "Showcase academic achievements despite challenges",
                    "Mention mentoring younger family members"
                ]
            ))
        else:
            # Even if good, provide guidance for excellence
            improvements.append(ImprovementArea(
                area="First-Gen Support",
                current=f"{firstgen_diversity}/10 first-gen factors",
                target="9+/10 exceptional first-gen profile",
                impact=2,
                priority="low",
                description="Maintain your strong first-generation status and leverage it effectively",
                actionable_steps=[
                    "Highlight unique perspective in essays",
                    "Connect with first-gen alumni networks",
                    "Mentor other first-gen students",
                    "Document your educational journey"
                ]
            ))

        # Geographic diversity - ALWAYS provide guidance
        if geographic_diversity < 6:
            improvements.append(ImprovementArea(
                area="Geographic Diversity",
                current=f"{geographic_diversity}/10 geographic factors",
                target="7+/10 diverse background",
                impact=4,
                priority="low",
                description="Enhance geographic diversity profile",
                actionable_steps=[
                    "Highlight unique geographic background",
                    "Emphasize cultural experiences and perspectives",
                    "Showcase travel or relocation experiences",
                    "Connect with diverse communities",
                    "Highlight multilingual abilities if applicable"
                ]
            ))
        else:
            # Even if good, provide guidance for excellence
            improvements.append(ImprovementArea(
                area="Geographic Diversity",
                current=f"{geographic_diversity}/10 geographic factors",
                target="8+/10 exceptional diversity",
                impact=2,
                priority="low",
                description="Maintain your strong geographic diversity and leverage it effectively",
                actionable_steps=[
                    "Highlight unique cultural perspective",
                    "Connect with diverse communities",
                    "Showcase international experiences",
                    "Document cultural contributions"
                ]
            ))

        return improvements

    def _analyze_interview_interest(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze interview performance and demonstrated interest"""
        improvements = []

        interview_quality = profile.get('interview', 5)
        demonstrated_interest = profile.get('demonstrated_interest', 5)

        # Convert string values to numbers if needed
        try:
            interview_quality = float(interview_quality) if interview_quality else 5
            demonstrated_interest = float(demonstrated_interest) if demonstrated_interest else 5
        except (ValueError, TypeError):
            interview_quality = 5
            demonstrated_interest = 5

        if interview_quality < 8:
            improvements.append(ImprovementArea(
                area="Interview Skills",
                current=f"{interview_quality}/10 interview quality",
                target="8+/10 confident performance",
                impact=5,
                priority="medium",
                description="Improve interview and communication skills",
                actionable_steps=[
                    "Practice common interview questions",
                    "Prepare thoughtful questions about the college",
                    "Practice articulating your goals and interests",
                    "Work on public speaking and presentation skills",
                    "Consider mock interviews with counselors"
                ]
            ))
        # If interview_quality >= 8, don't show improvement

        if demonstrated_interest < 8:
            improvements.append(ImprovementArea(
                area="Demonstrated Interest",
                current=f"{demonstrated_interest}/10 interest level",
                target="8+/10 strong engagement",
                impact=4,
                priority="low",
                description="Show strong interest in the college",
                actionable_steps=[
                    "Visit campus if possible",
                    "Attend virtual information sessions",
                    "Connect with current students or alumni",
                    "Follow college social media and engage",
                    "Mention specific programs and opportunities in essays"
                ]
            ))
        # If demonstrated_interest >= 8, don't show improvement

        return improvements

    def _analyze_portfolio_creative(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze portfolio and creative work - ALWAYS provide guidance"""
        improvements = []

        portfolio_audition = profile.get('portfolio_audition', 0)

        # Convert string values to numbers if needed
        try:
            portfolio_audition = float(portfolio_audition) if portfolio_audition else 0
        except (ValueError, TypeError):
            portfolio_audition = 0

        # Only provide portfolio guidance if below target
        if portfolio_audition < 8:
            improvements.append(ImprovementArea(
                area="Creative Portfolio",
                current=f"{portfolio_audition}/10 portfolio strength",
                target="8+/10 outstanding work",
                impact=6,
                priority="medium",
                description="Develop a strong creative portfolio",
                actionable_steps=[
                    "Create diverse, high-quality work samples",
                    "Seek feedback from teachers and professionals",
                    "Build an online portfolio or website",
                    "Document your creative process",
                    "Showcase your best work"
                ]
            ))
        # If portfolio_audition >= 8, don't show improvement

        return improvements

    def _analyze_volunteer_service(self, profile: Dict[str, Any], college_data: Dict[str, Any]) -> List[ImprovementArea]:
        """Analyze volunteer work and community service - ALWAYS provide guidance"""
        improvements = []

        volunteer_work = profile.get('volunteer_work', 5)

        # Convert string values to numbers if needed
        try:
            volunteer_work = float(volunteer_work) if volunteer_work else 5
        except (ValueError, TypeError):
            volunteer_work = 5

        # Only provide volunteer guidance if below target
        if volunteer_work < 7:
            improvements.append(ImprovementArea(
                area="Community Service",
                current=f"{volunteer_work}/10 volunteer work",
                target="7+/10 meaningful service",
                impact=6,
                priority="medium",
                description="Engage in meaningful community service",
                actionable_steps=[
                    "Find volunteer opportunities aligned with your interests",
                    "Commit to long-term service projects",
                    "Take on leadership roles in service organizations",
                    "Document impact and outcomes of your service",
                    "Connect service to your academic and career goals"
                ]
            ))
        elif volunteer_work < 9:
            # User is between 7 and 9 - provide guidance for excellence
            improvements.append(ImprovementArea(
                area="Community Service",
                current=f"{volunteer_work}/10 volunteer work",
                target="9+/10 exceptional service",
                impact=2,
                priority="low",
                description="Maintain your strong community service and pursue advanced opportunities",
                actionable_steps=[
                    "Take on leadership roles in service organizations",
                    "Start your own service initiatives",
                    "Mentor other volunteers",
                    "Document and share your impact"
                ]
            ))
        # If volunteer_work >= 9, don't show improvement

        return improvements

    def _get_default_improvements(self) -> List[ImprovementArea]:
        """Return default improvements when college data is not available"""
        return [
            ImprovementArea(
                area="Academic Performance",
                current="Current GPA",
                target="3.9+ GPA",
                impact=10,
                priority="high",
                description="Focus on maintaining strong academic performance",
                actionable_steps=["Maintain high grades", "Take challenging courses", "Show improvement over time"]
            ),
            ImprovementArea(
                area="Standardized Testing",
                current="Current SAT",
                target="1500+ SAT",
                impact=12,
                priority="high",
                description="Improve standardized test scores",
                actionable_steps=["Practice regularly", "Take prep courses", "Focus on weak areas"]
            ),
            ImprovementArea(
                area="Extracurricular Activities",
                current="Current activities",
                target="Deep involvement",
                impact=8,
                priority="medium",
                description="Develop meaningful extracurricular involvement",
                actionable_steps=["Focus on 2-3 activities", "Take leadership roles", "Show long-term commitment"]
            )
        ]

    def calculate_combined_impact(self, improvements: List[ImprovementArea]) -> int:
        """Calculate the combined potential impact of all improvements"""
        if not improvements:
            return 0

        # Cap the combined impact at 35% for realistic expectations
        total_impact = sum(imp.impact for imp in improvements)
        return min(total_impact, 35)

improvement_analysis_service = ImprovementAnalysisService()
