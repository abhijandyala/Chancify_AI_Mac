"""
Real College Suggestions System
Uses real IPEDS data to suggest colleges based on major strength
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from .real_ipeds_major_mapping import real_ipeds_mapping

class RealCollegeSuggestions:
    def __init__(self):
        """Initialize with real college and major data"""
        self.college_df = None
        self.college_by_name = {}  # Index for fast lookup by name
        self.load_college_data()

    def load_college_data(self):
        """Load the college data and create indexes for fast lookup"""
        try:
            # Get the directory of this file and construct the path
            current_dir = os.path.dirname(os.path.abspath(__file__))
            csv_path = os.path.join(current_dir, 'raw', 'real_colleges_integrated.csv')
            self.college_df = pd.read_csv(csv_path)
            print(f"Loaded college data: {self.college_df.shape}")

            # Create index for fast lookup by name
            for idx, row in self.college_df.iterrows():
                college_name = row.get('name', '')
                if college_name:
                    self.college_by_name[college_name] = row

            print(f"Indexed {len(self.college_by_name)} colleges by name")
        except Exception as e:
            print(f"Error loading college data: {e}")
            self.college_df = pd.DataFrame()

    def get_colleges_for_major_and_tier(self, major: str, tier: str, limit: int = None) -> List[Dict]:
        """Get colleges that offer a specific major in a specific tier"""
        # Map user major to IPEDS major
        ipeds_major = real_ipeds_mapping.map_major_name(major)

        # Get colleges from IPEDS data
        ipeds_colleges = real_ipeds_mapping.get_colleges_for_major(ipeds_major, tier, limit)

        # Convert to college data format (using index for fast lookup)
        college_suggestions = []
        for college_name in ipeds_colleges:
            # Use indexed lookup instead of DataFrame search
            row = self.college_by_name.get(college_name)

            if row is not None:
                # Get major strength score
                major_fit_score = real_ipeds_mapping.get_major_strength_score(college_name, ipeds_major)

                college_data = {
                    'name': college_name,
                    'unitid': row.get('unitid', 0),
                    'city': row.get('city', ''),
                    'state': row.get('state', ''),
                    'selectivity_tier': row.get('selectivity_tier', 'Moderately Selective'),
                    'acceptance_rate': row.get('acceptance_rate', 0.5),
                    'tuition_in_state': row.get('tuition_in_state_usd', 0),
                    'tuition_out_of_state': row.get('tuition_out_of_state_usd', 0),
                    'student_body_size': row.get('student_body_size', 0),
                    'major_fit_score': major_fit_score,
                    'ipeds_major': ipeds_major
                }

                college_suggestions.append(college_data)

        return college_suggestions

    def calculate_probability(self, college: Dict, academic_strength: float) -> float:
        """Calculate admission probability based on college selectivity and student strength"""
        acceptance_rate = college.get('acceptance_rate', 0.5)

        # Calculate base probability from academic strength (0-10 scale)
        # More conservative base probability calculation
        # Even perfect students shouldn't have 95% base probability
        base_prob = min(0.80, max(0.10, academic_strength / 12.5))  # Max 80% base, scaled by 12.5 instead of 10

        # Apply college selectivity adjustment
        # More selective colleges (lower acceptance rate) reduce probability more
        if acceptance_rate <= 0.05:  # Elite schools (5% or less)
            selectivity_factor = 0.08  # Very low probability
        elif acceptance_rate <= 0.15:  # Highly selective (5-15%)
            selectivity_factor = 0.15  # Low probability
        elif acceptance_rate <= 0.30:  # Selective (15-30%)
            selectivity_factor = 0.35  # Moderate probability
        elif acceptance_rate <= 0.50:  # Moderately selective (30-50%)
            selectivity_factor = 0.65  # Good probability
        elif acceptance_rate <= 0.75:  # Less selective (50-75%)
            selectivity_factor = 0.85  # High probability
        else:  # Open admission (75%+)
            selectivity_factor = 0.95  # Very high probability

        # Calculate final probability
        final_prob = base_prob * selectivity_factor

        # Ensure realistic bounds - cap at 85% maximum
        return max(0.01, min(0.85, final_prob))

    def get_balanced_suggestions(self, major: str, academic_strength: float) -> List[Dict]:
        """Get balanced suggestions (3 safety, 3 target, 3 reach) for a major based on actual probabilities"""
        suggestions = []

        # Get all colleges that offer this major
        ipeds_major = real_ipeds_mapping.map_major_name(major)
        all_colleges = real_ipeds_mapping.get_colleges_for_major(ipeds_major, limit=100)

        def is_cosmetology_school(name: str) -> bool:
            n = name.lower()
            return any(k in n for k in ["beauty", "cosmetology", "salon", "spa", "barber"])

        def is_religious_only(name: str) -> bool:
            n = name.lower()
            return any(k in n for k in ["seminary", "theological", "divinity", "apostles", "bible"])

        # Convert to college data with probabilities
        college_data = []
        for college_name in all_colleges:
            row = self.college_by_name.get(college_name)

            if row is not None:
                major_fit_score = real_ipeds_mapping.get_major_strength_score(college_name, ipeds_major)

                college_info = {
                    'name': college_name,
                    'unitid': row.get('unitid', 0),
                    'city': row.get('city', ''),
                    'state': row.get('state', ''),
                    'selectivity_tier': row.get('selectivity_tier', 'Moderately Selective'),
                    'acceptance_rate': row.get('acceptance_rate', 0.5),
                    'tuition_in_state': row.get('tuition_in_state_usd', 0),
                    'tuition_out_of_state': row.get('tuition_out_of_state_usd', 0),
                    'student_body_size': row.get('student_body_size', 0),
                    'major_fit_score': major_fit_score,
                    'ipeds_major': ipeds_major
                }

                # Calculate probability for this student
                probability = self.calculate_probability(college_info, academic_strength)
                college_info['probability'] = probability

                college_data.append(college_info)

        # Deduplicate by college name, keep the entry with highest major_fit_score
        unique_colleges = {}
        for c in college_data:
            name = c['name']
            if name not in unique_colleges or c['major_fit_score'] > unique_colleges[name]['major_fit_score']:
                unique_colleges[name] = c
        college_data = list(unique_colleges.values())

        # Hard filter: drop cosmetology/beauty/barber schools for non-VPA majors
        if ipeds_major not in ["Visual & Performing Arts", "Fashion Design", "Fine Arts"]:
            college_data = [c for c in college_data if not is_cosmetology_school(c['name'])]

        # Hard filter: drop seminaries/religious-only schools for STEM majors
        if ipeds_major in ["Engineering", "Computer & Information Sciences", "Physical Sciences", "Mathematics & Statistics", "Biological & Biomedical Sciences"]:
            college_data = [c for c in college_data if not is_religious_only(c['name'])]

        # Quality gate: require non-zero fit and reasonable size
        def size_ok_balanced(c):
            size = c.get('student_body_size') or 0
            try:
                return float(size) >= 1000.0
            except Exception:
                return False

        strict_filtered = [c for c in college_data if c['major_fit_score'] >= 0.35 and size_ok_balanced(c)]
        # If too few, relax size and fit slightly
        if len(strict_filtered) >= 9:
            college_data = strict_filtered
        else:
            relaxed = [c for c in college_data if c['major_fit_score'] >= 0.2 and (size_ok_balanced(c) or c.get('student_body_size', 0) > 0)]
            college_data = relaxed if relaxed else college_data

        # Sort by major fit score first, then by probability
        college_data.sort(key=lambda x: (x['major_fit_score'], x['probability']), reverse=True)

        # Filter out weak matches; keep fallbacks if needed
        def size_ok(c):
            size = c.get('student_body_size') or 0
            try:
                return float(size) >= 1000.0
            except Exception:
                return False

        strong_colleges = [c for c in college_data if c['major_fit_score'] >= 0.5 and size_ok(c)]
        medium_colleges = [c for c in college_data if c['major_fit_score'] >= 0.4 and size_ok(c)]
        if len(strong_colleges) >= 9:
            college_data = strong_colleges
        elif len(medium_colleges) >= 9:
            college_data = medium_colleges

        # Categorize based on calculated probabilities
        safety_colleges = []
        target_colleges = []
        reach_colleges = []

        for college in college_data:
            prob = college['probability']

            if prob >= 0.75:  # Safety: 75%+ chance
                safety_colleges.append(college)
            elif prob >= 0.25:  # Target: 25-75% chance
                target_colleges.append(college)
            elif prob >= 0.10:  # Reach: 10-25% chance
                reach_colleges.append(college)

        # Take top 3 from each category (sorted by major fit score)
        for college in safety_colleges[:3]:
            college['category'] = 'safety'
            suggestions.append(college)

        for college in target_colleges[:3]:
            college['category'] = 'target'
            suggestions.append(college)

        for college in reach_colleges[:3]:
            college['category'] = 'reach'
            suggestions.append(college)

        # If we don't have enough in any category, fill with the best available
        if len(suggestions) < 9:
            remaining_colleges = [c for c in college_data if c not in suggestions]
            remaining_colleges.sort(key=lambda x: x['major_fit_score'], reverse=True)

            for college in remaining_colleges[:9-len(suggestions)]:
                # Assign category based on probability
                prob = college['probability']
                if prob >= 0.75:
                    college['category'] = 'safety'
                elif prob >= 0.25:
                    college['category'] = 'target'
                else:
                    college['category'] = 'reach'
                suggestions.append(college)

        return suggestions

    def get_fallback_suggestions(self, major: str, academic_strength: float) -> List[Dict]:
        """Get fallback suggestions when major-specific colleges are limited"""
        suggestions = []

        # Get all colleges that offer this major
        ipeds_major = real_ipeds_mapping.map_major_name(major)
        all_colleges = real_ipeds_mapping.get_colleges_for_major(ipeds_major, limit=50)

        def is_cosmetology_school(name: str) -> bool:
            n = name.lower()
            return any(k in n for k in ["beauty", "cosmetology", "salon", "spa", "barber"])

        # Convert to college data and sort by major fit score
        college_data = []
        for college_name in all_colleges:
            college_row = self.college_df[self.college_df['name'] == college_name]

            if len(college_row) > 0:
                row = college_row.iloc[0]
                major_fit_score = real_ipeds_mapping.get_major_strength_score(college_name, ipeds_major)

                college_info = {
                    'name': college_name,
                    'unitid': row.get('unitid', 0),
                    'city': row.get('city', ''),
                    'state': row.get('state', ''),
                    'selectivity_tier': row.get('selectivity_tier', 'Moderately Selective'),
                    'acceptance_rate': row.get('acceptance_rate', 0.5),
                    'tuition_in_state': row.get('tuition_in_state_usd', 0),
                    'tuition_out_of_state': row.get('tuition_out_of_state_usd', 0),
                    'student_body_size': row.get('student_body_size', 0),
                    'major_fit_score': major_fit_score,
                    'ipeds_major': ipeds_major
                }

                college_data.append(college_info)

        # Hard filter: drop cosmetology/beauty/barber schools for non-VPA majors
        if ipeds_major not in ["Visual & Performing Arts", "Fashion Design", "Fine Arts"]:
            college_data = [c for c in college_data if not is_cosmetology_school(c['name'])]

        # Quality gate: require non-zero fit and reasonable size
        def size_ok_fallback(c):
            size = c.get('student_body_size') or 0
            try:
                return float(size) >= 1000.0
            except Exception:
                return False

        strict_filtered = [c for c in college_data if c['major_fit_score'] >= 0.35 and size_ok_fallback(c)]
        if len(strict_filtered) >= 9:
            college_data = strict_filtered
        else:
            relaxed = [c for c in college_data if c['major_fit_score'] >= 0.2 and (size_ok_fallback(c) or c.get('student_body_size', 0) > 0)]
            college_data = relaxed if relaxed else college_data

        # Sort by major fit score
        college_data.sort(key=lambda x: x['major_fit_score'], reverse=True)

        # Categorize based on acceptance rate and academic strength
        for i, college in enumerate(college_data[:9]):
            acceptance_rate = college['acceptance_rate']

            if acceptance_rate >= 0.75:
                category = 'safety'
            elif acceptance_rate >= 0.25:
                category = 'target'
            else:
                category = 'reach'

            college['category'] = category
            suggestions.append(college)

        return suggestions

# Global instance
real_college_suggestions = RealCollegeSuggestions()
