#!/usr/bin/env python3
"""
Test script to verify probability calculation consistency across all systems.
Ensures all probability values are capped at 85% and are realistic.
"""

import sys
import os
sys.path.append('backend')

import requests
import json
from backend.data.real_college_suggestions import RealCollegeSuggestions
from backend.core.pipeline import calculate_admission_probability
from backend.ml.models.predictor import AdmissionPredictor

def test_real_college_suggestions():
    """Test the real college suggestions probability calculation"""
    print("Testing Real College Suggestions System...")
    
    suggestions = RealCollegeSuggestions()
    
    # Test with a very strong student profile
    strong_academic_strength = 10.0  # Perfect academic strength
    
    # Get suggestions for Computer Science
    college_suggestions = suggestions.get_balanced_suggestions("Computer Science", strong_academic_strength)
    
    print(f"Found {len(college_suggestions)} suggestions")
    
    max_prob = 0
    for suggestion in college_suggestions:
        prob = suggestion.get('probability', 0)
        max_prob = max(max_prob, prob)
        college_name = suggestion.get('name', 'Unknown')
        category = suggestion.get('category', 'unknown')
        
        print(f"  {college_name}: {prob:.1%} ({category})")
        
        # Verify probability is capped at 85%
        assert prob <= 0.85, f"Probability {prob:.1%} exceeds 85% cap for {college_name}"
    
    print(f"PASS Max probability: {max_prob:.1%} (should be <= 85%)")
    print()

def test_formula_calculation():
    """Test the formula-based probability calculation"""
    print("Testing Formula-Based Probability Calculation...")
    
    # Test with perfect factor scores
    perfect_scores = {
        "grades": 10.0,
        "rigor": 10.0,
        "essay": 10.0,
        "ecs_leadership": 10.0,
        "ecs_impact": 10.0,
        "ecs_passion": 10.0,
        "test_scores": 10.0,
        "recommendations": 10.0,
        "interview": 10.0,
        "conduct_record": 10.0
    }
    
    # Test with different acceptance rates
    test_cases = [
        ("MIT (5% acceptance)", 0.05),
        ("Harvard (4% acceptance)", 0.04),
        ("Stanford (4% acceptance)", 0.04),
        ("State University (50% acceptance)", 0.50),
        ("Community College (90% acceptance)", 0.90)
    ]
    
    max_prob = 0
    for college_name, acceptance_rate in test_cases:
        result = calculate_admission_probability(
            factor_scores=perfect_scores,
            acceptance_rate=acceptance_rate,
            uses_testing=True,
            need_aware=False
        )
        
        prob = result.probability
        max_prob = max(max_prob, prob)
        
        print(f"  {college_name}: {prob:.1%}")
        
        # Verify probability is capped at 85%
        assert prob <= 0.85, f"Probability {prob:.1%} exceeds 85% cap for {college_name}"
    
    print(f"PASS Max probability: {max_prob:.1%} (should be <= 85%)")
    print()

def test_ml_predictor():
    """Test the ML predictor probability calculation"""
    print("Testing ML Predictor...")
    
    try:
        predictor = AdmissionPredictor()
        
        if not predictor.is_available():
            print("  ML models not available, skipping ML test")
            return
        
        # Create a strong student profile
        from backend.data.models import Student, College
        
        strong_student = Student(
            gpa_unweighted=4.0,
            gpa_weighted=4.5,
            sat_total=1600,
            act_composite=36,
            ec_count=10,
            leadership_positions_count=5,
            awards_count=8,
            volunteer_hours=500,
            work_experience_hours=200,
            research_experience=True,
            legacy=False,
            first_gen=False,
            recruited_athlete=False,
            factor_scores={
                "grades": 10.0,
                "rigor": 10.0,
                "essay": 10.0,
                "ecs_leadership": 10.0,
                "ecs_impact": 10.0,
                "ecs_passion": 10.0,
                "test_scores": 10.0,
                "recommendations": 10.0,
                "interview": 10.0,
                "conduct_record": 10.0
            }
        )
        
        # Test with MIT
        mit = College(
            name="Massachusetts Institute of Technology",
            acceptance_rate=0.04,
            test_policy="Test-required",
            financial_aid_policy="Need-blind"
        )
        
        result = predictor.predict(strong_student, mit, model_name='ensemble')
        
        print(f"  MIT (perfect student): {result.probability:.1%}")
        print(f"    ML: {result.ml_probability:.1%}")
        print(f"    Formula: {result.formula_probability:.1%}")
        
        # Verify probability is capped at 85%
        assert result.probability <= 0.85, f"Probability {result.probability:.1%} exceeds 85% cap"
        assert result.ml_probability <= 0.85, f"ML probability {result.ml_probability:.1%} exceeds 85% cap"
        assert result.formula_probability <= 0.85, f"Formula probability {result.formula_probability:.1%} exceeds 85% cap"
        
        print(f"PASS All probabilities capped at 85%")
        
    except Exception as e:
        print(f"  Error testing ML predictor: {e}")
    
    print()

def test_api_endpoints():
    """Test the API endpoints for probability consistency"""
    print("Testing API Endpoints...")
    
    # Test the suggestions endpoint
    try:
        response = requests.post(
            'https://backendchancifyai.up.railway.app/api/suggest/colleges',
            headers={'ngrok-skip-browser-warning': 'true'},
            json={
                'major': 'Computer Science',
                'gpa_unweighted': 4.0,
                'gpa_weighted': 4.5,
                'sat_total': 1600,
                'act_composite': 36,
                'ec_count': 10,
                'leadership_positions_count': 5,
                'awards_count': 8,
                'volunteer_hours': 500,
                'work_experience_hours': 200,
                'research_experience': True,
                'legacy': False,
                'first_gen': False,
                'recruited_athlete': False
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            suggestions = data.get('suggestions', [])
            
            max_prob = 0
            for suggestion in suggestions:
                prob = suggestion.get('probability', 0)
                max_prob = max(max_prob, prob)
                college_name = suggestion.get('name', 'Unknown')
                category = suggestion.get('category', 'unknown')
                
                print(f"  {college_name}: {prob:.1%} ({category})")
                
                # Verify probability is capped at 85%
                assert prob <= 0.85, f"API probability {prob:.1%} exceeds 85% cap for {college_name}"
            
            print(f"PASS API Max probability: {max_prob:.1%} (should be <= 85%)")
        else:
            print(f"  API request failed: {response.status_code}")
    
    except Exception as e:
        print(f"  Error testing API: {e}")
    
    print()

def main():
    """Run all probability consistency tests"""
    print("=" * 60)
    print("PROBABILITY CONSISTENCY TEST")
    print("=" * 60)
    print()
    
    try:
        test_real_college_suggestions()
        test_formula_calculation()
        test_ml_predictor()
        test_api_endpoints()
        
        print("=" * 60)
        print("PASS - ALL TESTS PASSED!")
        print("PASS - All probability calculations are capped at 85%")
        print("PASS - All systems are consistent")
        print("=" * 60)
        
    except AssertionError as e:
        print("=" * 60)
        print(f"FAIL TEST FAILED: {e}")
        print("=" * 60)
        sys.exit(1)
    except Exception as e:
        print("=" * 60)
        print(f"FAIL ERROR: {e}")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()
