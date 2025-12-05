"""
Real IPEDS Major Mapping System
Uses actual IPEDS data for accurate major-college mappings
"""

import json
import os
from typing import Dict, List, Optional
import pandas as pd

class RealIPEDSMajorMapping:
    def __init__(self):
        """Initialize with real IPEDS data"""
        self.major_mapping = {}
        self.college_major_data = {}
        self.load_mappings()
    
    def load_mappings(self):
        """Load the pre-computed mappings"""
        try:
            # Load major mapping
            mapping_path = os.path.join(os.path.dirname(__file__), 'real_major_mapping.json')
            if os.path.exists(mapping_path):
                with open(mapping_path, 'r') as f:
                    self.major_mapping = json.load(f)
            
            # Load college major data
            college_data_path = os.path.join(os.path.dirname(__file__), 'college_major_data.json')
            if os.path.exists(college_data_path):
                with open(college_data_path, 'r') as f:
                    self.college_major_data = json.load(f)
            
            print(f"Loaded real major mapping: {len(self.major_mapping)} majors, {len(self.college_major_data)} colleges")
            
        except Exception as e:
            print(f"Error loading real major mappings: {e}")
            self.major_mapping = {}
            self.college_major_data = {}
    
    def get_colleges_for_major(self, major: str, tier: str = None, limit: int = None) -> List[str]:
        """Get colleges that offer a specific major, optionally filtered by tier"""
        if major not in self.major_mapping:
            return []
        
        colleges = self.major_mapping[major]
        
        # Filter by tier if specified
        if tier:
            tier_colleges = []
            for college_info in colleges:
                college_name = college_info['college']
                college_tier = self.get_college_tier(college_name)
                if college_tier == tier:
                    tier_colleges.append(college_name)
            colleges = tier_colleges
        else:
            colleges = [college_info['college'] for college_info in colleges]
        
        # Apply limit
        if limit:
            colleges = colleges[:limit]
        
        return colleges
    
    def get_college_tier(self, college_name: str) -> str:
        """Get the selectivity tier for a college"""
        # Load college data to get tier information
        try:
            college_df = pd.read_csv(os.path.join(os.path.dirname(__file__), 'raw', 'real_colleges_integrated.csv'))
            college_row = college_df[college_df['name'] == college_name]
            
            if len(college_row) == 0:
                return 'moderately_selective'
            
            tier = college_row.iloc[0]['selectivity_tier']
            tier_mapping = {
                'Elite': 'elite',
                'Highly Selective': 'highly_selective',
                'Moderately Selective': 'selective',
                'Less Selective': 'moderately_selective'
            }
            return tier_mapping.get(tier, 'moderately_selective')
        except:
            return 'moderately_selective'
    
    def get_major_strength_score(self, college_name: str, major: str) -> float:
        """Get strength score for a college in a specific major based on real data"""
        if college_name not in self.college_major_data:
            return 0.0
        
        college_data = self.college_major_data[college_name]
        
        # Check if college_data has the expected structure
        if 'majors' not in college_data:
            return 0.0
        
        # Find the major in the college's data
        for major_info in college_data['majors']:
            if major_info['name'] == major:
                # Calculate strength score based on percentage and rank
                percentage = major_info['percentage']
                rank = major_info['rank']
                
                # Base score from percentage (0-100% -> 0-1.0)
                base_score = percentage / 100.0
                
                # Rank bonus (1st major gets full score, 2nd gets 0.8x, 3rd gets 0.6x, etc.)
                rank_multiplier = max(0.3, 1.0 - (rank - 1) * 0.2)
                
                # Final score
                final_score = base_score * rank_multiplier
                
                # Add selectivity bonus
                tier = self.get_college_tier(college_name)
                selectivity_bonus = {
                    'elite': 0.2,
                    'highly_selective': 0.15,
                    'selective': 0.1,
                    'moderately_selective': 0.05
                }.get(tier, 0.0)
                
                return min(1.0, final_score + selectivity_bonus)
        
        return 0.0
    
    def get_major_relevance_info(self, college_name: str, major: str) -> Dict:
        """Get detailed major relevance information"""
        score = self.get_major_strength_score(college_name, major)
        
        # Determine match level based on score
        if score >= 0.7:
            match_level = "Strong Match"
            confidence = "High"
            is_relevant = True
            is_strong = True
        elif score >= 0.5:
            match_level = "Good Match"
            confidence = "High"
            is_relevant = True
            is_strong = False
        elif score >= 0.3:
            match_level = "Moderate Match"
            confidence = "Medium"
            is_relevant = True
            is_strong = False
        elif score >= 0.1:
            match_level = "Weak Match"
            confidence = "Low"
            is_relevant = False
            is_strong = False
        else:
            match_level = "No Match"
            confidence = "Low"
            is_relevant = False
            is_strong = False
        
        return {
            "score": score,
            "match_level": match_level,
            "confidence": confidence,
            "is_relevant": is_relevant,
            "is_strong": is_strong
        }
    
    def get_all_majors(self) -> List[str]:
        """Get list of all majors in the system"""
        return sorted(list(self.major_mapping.keys()))
    
    def get_college_majors(self, college_name: str) -> List[str]:
        """Get all majors offered by a specific college"""
        if college_name not in self.college_major_data:
            return []
        
        return [major_info['name'] for major_info in self.college_major_data[college_name]['majors']]
    
    def map_major_name(self, user_major: str) -> str:
        """Map user-selected major to IPEDS major name"""
        # Common mappings from user-friendly names to IPEDS names
        major_mappings = {
            'Computer Science': 'Computer & Information Sciences',
            'Business': 'Business, Management, Marketing & Support',
            'Engineering': 'Engineering',
            'Medicine': 'Health Professions & Related Programs',
            'Pre-Medicine': 'Health Professions & Related Programs',
            'Nursing': 'Health Professions & Related Programs',
            'Psychology': 'Psychology',
            'Biology': 'Biological & Biomedical Sciences',
            'Mathematics': 'Mathematics & Statistics',
            'Physics': 'Physical Sciences',
            'Chemistry': 'Physical Sciences',
            'English': 'English Language & Literature/Letters',
            'History': 'History',
            'Political Science': 'Social Sciences',
            'Sociology': 'Social Sciences',
            'Art': 'Visual & Performing Arts',
            'Music': 'Visual & Performing Arts',
            'Film': 'Visual & Performing Arts',
            'Education': 'Education',
            'Environmental Science': 'Biological & Biomedical Sciences',
            'Economics': 'Social Sciences',
            'Liberal Arts': 'Liberal Arts & Sciences, General Studies & Humanities',
            'Philosophy': 'Philosophy & Religious Studies',
            'Theology': 'Theology & Religious Vocations',
            'Criminal Justice': 'Homeland Security, Law Enforcement & Firefighting',
            'Communications': 'Communications Technologies & Support Services',
            'Journalism': 'Communications Technologies & Support Services',
            'Architecture': 'Engineering',
            'Agriculture': 'Biological & Biomedical Sciences',
            'Veterinary': 'Health Professions & Related Programs',
            'Dentistry': 'Health Professions & Related Programs',
            'Law': 'Legal Professions & Studies',
            'Social Work': 'Public Administration & Social Service Professions',
            'Public Health': 'Health Professions & Related Programs',
            'Kinesiology': 'Parks, Recreation, Leisure, Fitness & Kinesiology',
            'Sports Medicine': 'Health Professions & Related Programs',
            'Data Science': 'Computer & Information Sciences',
            'Information Technology': 'Computer & Information Sciences',
            'Cybersecurity': 'Computer & Information Sciences',
            'Software Engineering': 'Computer & Information Sciences',
            'Mechanical Engineering': 'Engineering',
            'Electrical Engineering': 'Engineering',
            'Civil Engineering': 'Engineering',
            'Chemical Engineering': 'Engineering',
            'Biomedical Engineering': 'Engineering',
            'Aerospace Engineering': 'Engineering',
            'Industrial Engineering': 'Engineering',
            'Environmental Engineering': 'Engineering',
            'Finance': 'Business, Management, Marketing & Support',
            'Accounting': 'Business, Management, Marketing & Support',
            'Marketing': 'Business, Management, Marketing & Support',
            'Management': 'Business, Management, Marketing & Support',
            'International Business': 'Business, Management, Marketing & Support',
            'Entrepreneurship': 'Business, Management, Marketing & Support',
            'Human Resources': 'Business, Management, Marketing & Support',
            'Operations Management': 'Business, Management, Marketing & Support',
            'Supply Chain Management': 'Business, Management, Marketing & Support',
            'Real Estate': 'Business, Management, Marketing & Support',
            'Hospitality Management': 'Business, Management, Marketing & Support',
            'Tourism': 'Business, Management, Marketing & Support',
            'Event Management': 'Business, Management, Marketing & Support',
            'Sports Management': 'Business, Management, Marketing & Support',
            'Healthcare Administration': 'Health Professions & Related Programs',
            'Public Administration': 'Public Administration & Social Service Professions',
            'International Relations': 'Social Sciences',
            'Anthropology': 'Social Sciences',
            'Geography': 'Social Sciences',
            'Urban Planning': 'Public Administration & Social Service Professions',
            'Criminology': 'Social Sciences',
            'Linguistics': 'Foreign Languages, Literatures & Linguistics',
            'Foreign Languages': 'Foreign Languages, Literatures & Linguistics',
            'Spanish': 'Foreign Languages, Literatures & Linguistics',
            'French': 'Foreign Languages, Literatures & Linguistics',
            'German': 'Foreign Languages, Literatures & Linguistics',
            'Chinese': 'Foreign Languages, Literatures & Linguistics',
            'Japanese': 'Foreign Languages, Literatures & Linguistics',
            'Arabic': 'Foreign Languages, Literatures & Linguistics',
            'Russian': 'Foreign Languages, Literatures & Linguistics',
            'Italian': 'Foreign Languages, Literatures & Linguistics',
            'Portuguese': 'Foreign Languages, Literatures & Linguistics',
            'Korean': 'Foreign Languages, Literatures & Linguistics',
            'Hebrew': 'Foreign Languages, Literatures & Linguistics',
            'Theater': 'Visual & Performing Arts',
            'Dance': 'Visual & Performing Arts',
            'Acting': 'Visual & Performing Arts',
            'Film Production': 'Visual & Performing Arts',
            'Photography': 'Visual & Performing Arts',
            'Graphic Design': 'Visual & Performing Arts',
            'Fashion Design': 'Visual & Performing Arts',
            'Interior Design': 'Visual & Performing Arts',
            'Architecture': 'Engineering',
            'Urban Design': 'Engineering',
            'Landscape Architecture': 'Engineering',
            'Industrial Design': 'Engineering',
            'Product Design': 'Engineering',
            'Game Design': 'Computer & Information Sciences',
            'Web Design': 'Computer & Information Sciences',
            'Digital Media': 'Computer & Information Sciences',
            'Animation': 'Visual & Performing Arts',
            'Illustration': 'Visual & Performing Arts',
            'Painting': 'Visual & Performing Arts',
            'Sculpture': 'Visual & Performing Arts',
            'Ceramics': 'Visual & Performing Arts',
            'Printmaking': 'Visual & Performing Arts',
            'Drawing': 'Visual & Performing Arts',
            'Art History': 'Visual & Performing Arts',
            'Music Performance': 'Visual & Performing Arts',
            'Music Education': 'Education',
            'Music Theory': 'Visual & Performing Arts',
            'Composition': 'Visual & Performing Arts',
            'Conducting': 'Visual & Performing Arts',
            'Jazz Studies': 'Visual & Performing Arts',
            'Music Technology': 'Visual & Performing Arts',
            'Audio Engineering': 'Visual & Performing Arts',
            'Sound Design': 'Visual & Performing Arts',
            'Music Therapy': 'Health Professions & Related Programs',
            'Elementary Education': 'Education',
            'Secondary Education': 'Education',
            'Special Education': 'Education',
            'Early Childhood Education': 'Education',
            'Physical Education': 'Education',
            'Educational Leadership': 'Education',
            'Curriculum and Instruction': 'Education',
            'Educational Psychology': 'Education',
            'Counseling': 'Education',
            'School Psychology': 'Psychology',
            'Clinical Psychology': 'Psychology',
            'Counseling Psychology': 'Psychology',
            'Developmental Psychology': 'Psychology',
            'Social Psychology': 'Psychology',
            'Cognitive Psychology': 'Psychology',
            'Behavioral Psychology': 'Psychology',
            'Experimental Psychology': 'Psychology',
            'Forensic Psychology': 'Psychology',
            'Health Psychology': 'Psychology',
            'Sports Psychology': 'Psychology',
            'Industrial Psychology': 'Psychology',
            'Organizational Psychology': 'Psychology',
            'Human Factors': 'Psychology',
            'Neuroscience': 'Biological & Biomedical Sciences',
            'Biochemistry': 'Biological & Biomedical Sciences',
            'Molecular Biology': 'Biological & Biomedical Sciences',
            'Cell Biology': 'Biological & Biomedical Sciences',
            'Genetics': 'Biological & Biomedical Sciences',
            'Microbiology': 'Biological & Biomedical Sciences',
            'Immunology': 'Biological & Biomedical Sciences',
            'Ecology': 'Biological & Biomedical Sciences',
            'Marine Biology': 'Biological & Biomedical Sciences',
            'Wildlife Biology': 'Biological & Biomedical Sciences',
            'Botany': 'Biological & Biomedical Sciences',
            'Zoology': 'Biological & Biomedical Sciences',
            'Entomology': 'Biological & Biomedical Sciences',
            'Paleontology': 'Biological & Biomedical Sciences',
            'Biotechnology': 'Biological & Biomedical Sciences',
            'Bioinformatics': 'Biological & Biomedical Sciences',
            'Biomedical Sciences': 'Biological & Biomedical Sciences',
            'Pre-Veterinary': 'Biological & Biomedical Sciences',
            'Pre-Dental': 'Biological & Biomedical Sciences',
            'Pre-Pharmacy': 'Biological & Biomedical Sciences',
            'Pre-Physical Therapy': 'Health Professions & Related Programs',
            'Pre-Occupational Therapy': 'Health Professions & Related Programs',
            'Pre-Speech Therapy': 'Health Professions & Related Programs',
            'Pre-Athletic Training': 'Health Professions & Related Programs',
            'Pre-Chiropractic': 'Health Professions & Related Programs',
            'Pre-Optometry': 'Health Professions & Related Programs',
            'Pre-Podiatry': 'Health Professions & Related Programs',
            'Pre-Audiology': 'Health Professions & Related Programs',
            'Pre-Nursing': 'Health Professions & Related Programs',
            'Pre-Physician Assistant': 'Health Professions & Related Programs',
            'Pre-Nurse Practitioner': 'Health Professions & Related Programs',
            'Pre-Midwifery': 'Health Professions & Related Programs',
            'Pre-Radiology': 'Health Professions & Related Programs',
            'Pre-Respiratory Therapy': 'Health Professions & Related Programs',
            'Pre-Medical Technology': 'Health Professions & Related Programs',
            'Pre-Medical Laboratory Science': 'Health Professions & Related Programs',
            'Pre-Nuclear Medicine': 'Health Professions & Related Programs',
            'Pre-Radiation Therapy': 'Health Professions & Related Programs',
            'Pre-Sonography': 'Health Professions & Related Programs',
            'Pre-MRI Technology': 'Health Professions & Related Programs',
            'Pre-CT Technology': 'Health Professions & Related Programs',
            'Pre-Ultrasound Technology': 'Health Professions & Related Programs',
            'Pre-Emergency Medical Services': 'Health Professions & Related Programs',
            'Pre-Paramedic': 'Health Professions & Related Programs',
            'Pre-Fire Science': 'Homeland Security, Law Enforcement & Firefighting',
            'Pre-Criminal Justice': 'Homeland Security, Law Enforcement & Firefighting',
            'Pre-Law Enforcement': 'Homeland Security, Law Enforcement & Firefighting',
            'Pre-Forensic Science': 'Biological & Biomedical Sciences',
            'Pre-Cybersecurity': 'Computer & Information Sciences',
            'Pre-Information Systems': 'Computer & Information Sciences',
            'Pre-Computer Engineering': 'Engineering',
            'Pre-Electrical Engineering': 'Engineering',
            'Pre-Mechanical Engineering': 'Engineering',
            'Pre-Civil Engineering': 'Engineering',
            'Pre-Chemical Engineering': 'Engineering',
            'Pre-Biomedical Engineering': 'Engineering',
            'Pre-Aerospace Engineering': 'Engineering',
            'Pre-Industrial Engineering': 'Engineering',
            'Pre-Environmental Engineering': 'Engineering',
            'Pre-Materials Engineering': 'Engineering',
            'Pre-Nuclear Engineering': 'Engineering',
            'Pre-Petroleum Engineering': 'Engineering',
            'Pre-Mining Engineering': 'Engineering',
            'Pre-Geological Engineering': 'Engineering',
            'Pre-Ocean Engineering': 'Engineering',
            'Pre-Agricultural Engineering': 'Engineering',
            'Pre-Biological Engineering': 'Engineering',
            'Pre-Food Engineering': 'Engineering',
            'Pre-Textile Engineering': 'Engineering',
            'Pre-Manufacturing Engineering': 'Engineering',
            'Pre-Systems Engineering': 'Engineering',
            'Pre-Operations Research': 'Engineering',
            'Pre-Engineering Physics': 'Engineering',
            'Pre-Engineering Mathematics': 'Engineering',
            'Pre-Engineering Chemistry': 'Engineering',
            'Pre-Engineering Biology': 'Engineering',
            'Pre-Engineering Economics': 'Engineering',
            'Pre-Engineering Management': 'Engineering',
            'Pre-Engineering Technology': 'Engineering Technologies & Related Fields',
            'Pre-Computer Technology': 'Engineering Technologies & Related Fields',
            'Pre-Electrical Technology': 'Engineering Technologies & Related Fields',
            'Pre-Mechanical Technology': 'Engineering Technologies & Related Fields',
            'Pre-Civil Technology': 'Engineering Technologies & Related Fields',
            'Pre-Chemical Technology': 'Engineering Technologies & Related Fields',
            'Pre-Biomedical Technology': 'Engineering Technologies & Related Fields',
            'Pre-Aerospace Technology': 'Engineering Technologies & Related Fields',
            'Pre-Industrial Technology': 'Engineering Technologies & Related Fields',
            'Pre-Environmental Technology': 'Engineering Technologies & Related Fields',
            'Pre-Materials Technology': 'Engineering Technologies & Related Fields',
            'Pre-Nuclear Technology': 'Engineering Technologies & Related Fields',
            'Pre-Petroleum Technology': 'Engineering Technologies & Related Fields',
            'Pre-Mining Technology': 'Engineering Technologies & Related Fields',
            'Pre-Geological Technology': 'Engineering Technologies & Related Fields',
            'Pre-Ocean Technology': 'Engineering Technologies & Related Fields',
            'Pre-Agricultural Technology': 'Engineering Technologies & Related Fields',
            'Pre-Biological Technology': 'Engineering Technologies & Related Fields',
            'Pre-Food Technology': 'Engineering Technologies & Related Fields',
            'Pre-Textile Technology': 'Engineering Technologies & Related Fields',
            'Pre-Manufacturing Technology': 'Engineering Technologies & Related Fields',
            'Pre-Systems Technology': 'Engineering Technologies & Related Fields',
            'Pre-Operations Technology': 'Engineering Technologies & Related Fields',
            'Pre-Engineering Technology': 'Engineering Technologies & Related Fields',
            'Pre-Computer Technology': 'Engineering Technologies & Related Fields',
            'Pre-Electrical Technology': 'Engineering Technologies & Related Fields',
            'Pre-Mechanical Technology': 'Engineering Technologies & Related Fields',
            'Pre-Civil Technology': 'Engineering Technologies & Related Fields',
            'Pre-Chemical Technology': 'Engineering Technologies & Related Fields',
            'Pre-Biomedical Technology': 'Engineering Technologies & Related Fields',
            'Pre-Aerospace Technology': 'Engineering Technologies & Related Fields',
            'Pre-Industrial Technology': 'Engineering Technologies & Related Fields',
            'Pre-Environmental Technology': 'Engineering Technologies & Related Fields',
            'Pre-Materials Technology': 'Engineering Technologies & Related Fields',
            'Pre-Nuclear Technology': 'Engineering Technologies & Related Fields',
            'Pre-Petroleum Technology': 'Engineering Technologies & Related Fields',
            'Pre-Mining Technology': 'Engineering Technologies & Related Fields',
            'Pre-Geological Technology': 'Engineering Technologies & Related Fields',
            'Pre-Ocean Technology': 'Engineering Technologies & Related Fields',
            'Pre-Agricultural Technology': 'Engineering Technologies & Related Fields',
            'Pre-Biological Technology': 'Engineering Technologies & Related Fields',
            'Pre-Food Technology': 'Engineering Technologies & Related Fields',
            'Pre-Textile Technology': 'Engineering Technologies & Related Fields',
            'Pre-Manufacturing Technology': 'Engineering Technologies & Related Fields',
            'Pre-Systems Technology': 'Engineering Technologies & Related Fields',
            'Pre-Operations Technology': 'Engineering Technologies & Related Fields'
        }
        
        mapped = major_mappings.get(user_major)
        if mapped:
            return mapped

        name = (user_major or "").strip()
        lower = name.lower()

        def has(*keywords):
            return any(k in lower for k in keywords)

        if has('engineer', 'mechatronic', 'robotic', 'aerospace', 'civil', 'electrical', 'mechanical', 'chemical', 'industrial', 'materials', 'automotive'):
            return 'Engineering'
        if has('computer', 'software', 'cyber', 'network', 'ai', 'machine learning', 'data', 'information', 'hci', 'ui/ux', 'game', 'app', 'web', 'cloud'):
            return 'Computer & Information Sciences'
        if has('business', 'finance', 'account', 'marketing', 'management', 'supply chain', 'logistics', 'real estate', 'entrepreneur', 'commerce', 'actuarial', 'analytics'):
            return 'Business, Management, Marketing & Support'
        if has('nurs', 'health', 'med', 'clinical', 'therapy', 'pharm', 'veter', 'dental', 'nutrition', 'kinesi', 'athletic', 'public health', 'occupational', 'speech', 'radiologic', 'respiratory'):
            return 'Health Professions & Related Programs'
        if has('bio', 'neuro', 'genetic', 'immuno', 'zoology', 'botany', 'marine', 'ecology', 'environment', 'plant', 'animal', 'biotech', 'biomedical'):
            return 'Biological & Biomedical Sciences'
        if has('chem', 'physics', 'geology', 'earth', 'meteorology', 'astrophysics', 'materials science', 'astronomy', 'oceanography', 'climate', 'meteorology'):
            return 'Physical Sciences'
        if has('math', 'stat', 'applied mathematics', 'quantitative'):
            return 'Mathematics & Statistics'
        if has('psych'):
            return 'Psychology'
        if has('political', 'policy', 'sociol', 'anthrop', 'crimin', 'geograph', 'international', 'global studies', 'urban studies', 'urban planning', 'economics', 'cognitive science'):
            return 'Social Sciences'
        if has('law', 'legal', 'paralegal'):
            return 'Legal Professions & Studies'
        if has('education', 'teaching', 'ed '):
            return 'Education'
        if has('art', 'music', 'dance', 'film', 'theater', 'theatre', 'design', 'fashion', 'graphic', 'studio', 'fine arts', 'photography', 'screenwriting', 'animation', 'perform'):
            return 'Visual & Performing Arts'
        if has('journalism', 'media', 'communication', 'broadcast', 'public relations', 'advertis'):
            return 'Communications Technologies & Support Services'
        if has('philosophy', 'religion', 'theology'):
            return 'Philosophy & Religious Studies'
        if has('language', 'linguistics', 'french', 'spanish', 'german', 'italian', 'japanese', 'korean', 'arabic', 'russian', 'chinese', 'portuguese', 'latin', 'hebrew', 'classical'):
            return 'Foreign Languages, Literatures & Linguistics'
        if has('agric', 'hort', 'animal science', 'forestry', 'fisheries', 'soil', 'agribusiness'):
            return 'CIP 1'  # Agriculture & related
        if has('construction', 'mechanic', 'repair', 'manufacturing', 'industrial design', 'automotive', 'mechatronics'):
            return 'Engineering Technologies & Related Fields'

        return 'Liberal Arts & Sciences, General Studies & Humanities'

# Global instance
real_ipeds_mapping = RealIPEDSMajorMapping()

# Convenience functions
def get_colleges_for_major(major: str, tier: str = None, limit: int = None) -> List[str]:
    """Get colleges that offer a specific major in a specific tier"""
    # Map user major to IPEDS major
    ipeds_major = real_ipeds_mapping.map_major_name(major)
    return real_ipeds_mapping.get_colleges_for_major(ipeds_major, tier, limit)

def get_major_strength_score(college_name: str, major: str) -> float:
    """Get strength score for a college in a specific major"""
    # Map user major to IPEDS major
    ipeds_major = real_ipeds_mapping.map_major_name(major)
    return real_ipeds_mapping.get_major_strength_score(college_name, ipeds_major)

def get_major_relevance_info(college_name: str, major: str) -> Dict:
    """Get detailed major relevance information"""
    # Map user major to IPEDS major
    ipeds_major = real_ipeds_mapping.map_major_name(major)
    return real_ipeds_mapping.get_major_relevance_info(college_name, ipeds_major)

def get_all_majors() -> List[str]:
    """Get list of all majors in the system"""
    return real_ipeds_mapping.get_all_majors()

def get_college_majors(college_name: str) -> List[str]:
    """Get all majors offered by a specific college"""
    return real_ipeds_mapping.get_college_majors(college_name)
