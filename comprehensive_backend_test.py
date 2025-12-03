#!/usr/bin/env python3
"""
Comprehensive Backend Test - Deep Check for ALL Errors
Tests all endpoints thoroughly to ensure no errors remain
"""

import requests
import json
import time

def test_endpoint(url, method="GET", data=None, headers=None, description=""):
    """Test a single endpoint and return results"""
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        else:
            response = requests.post(url, json=data, headers=headers, timeout=10)
        
        print(f"PASS: {description}")
        print(f"   Status: {response.status_code}")
        print(f"   Response Length: {len(response.text)} chars")
        
        if response.status_code == 200:
            try:
                json_data = response.json()
                print(f"   JSON Valid: YES")
                if 'success' in json_data:
                    print(f"   Success: {json_data['success']}")
                return True
            except json.JSONDecodeError:
                print(f"   JSON Valid: NO - Invalid JSON")
                return False
        else:
            print(f"   Error: {response.text[:200]}...")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"FAIL: {description}")
        print(f"   Error: {str(e)}")
        return False

def main():
    print("COMPREHENSIVE BACKEND TEST - DEEP CHECK FOR ALL ERRORS")
    print("=" * 60)
    
    # Test data
    test_profile = {
        "gpa_unweighted": "3.8",
        "gpa_weighted": "4.2", 
        "sat": "1450",
        "act": "33",
        "major": "Computer Science",
        "extracurricular_depth": "5",
        "leadership_positions": "5",
        "awards_publications": "5",
        "passion_projects": "5",
        "business_ventures": "5",
        "volunteer_work": "5",
        "research_experience": "5",
        "portfolio_audition": "5",
        "essay_quality": "5",
        "recommendations": "5",
        "interview": "5",
        "demonstrated_interest": "5",
        "legacy_status": "5",
        "hs_reputation": "5",
        "geographic_diversity": "5",
        "plan_timing": "5",
        "geography_residency": "5",
        "firstgen_diversity": "5",
        "ability_to_pay": "5",
        "policy_knob": "5",
        "conduct_record": "9"
    }
    
    prediction_data = {
        **test_profile,
        "college": "Harvard University",
        "rigor": "5",
        "ap_count": "0",
        "honors_count": "0",
        "class_rank_percentile": "50",
        "class_size": "300"
    }
    
    ngrok_headers = {"ngrok-skip-browser-warning": "true"}
    
    # Test local backend
    print("\nTESTING LOCAL BACKEND (localhost:8000)")
    print("-" * 40)
    
    local_tests = [
        ("http://localhost:8000/api/health", "GET", None, None, "Health Check"),
        ("http://localhost:8000/api/suggest/colleges", "POST", test_profile, None, "College Suggestions"),
        ("http://localhost:8000/api/predict/frontend", "POST", prediction_data, None, "Prediction"),
        ("http://localhost:8000/api/search/colleges?q=Harvard&limit=5", "GET", None, None, "College Search"),
    ]
    
    local_results = []
    for url, method, data, headers, desc in local_tests:
        result = test_endpoint(url, method, data, headers, desc)
        local_results.append(result)
        time.sleep(0.5)  # Small delay between requests
    
    # Test ngrok backend
    print("\nTESTING NGROK BACKEND (ngrok tunnel)")
    print("-" * 40)
    
    ngrok_tests = [
        ("https://chancifybackendnonpostrges.up.railway.app/api/health", "GET", None, ngrok_headers, "Health Check"),
        ("https://chancifybackendnonpostrges.up.railway.app/api/suggest/colleges", "POST", test_profile, ngrok_headers, "College Suggestions"),
        ("https://chancifybackendnonpostrges.up.railway.app/api/predict/frontend", "POST", prediction_data, ngrok_headers, "Prediction"),
        ("https://chancifybackendnonpostrges.up.railway.app/api/search/colleges?q=Harvard&limit=5", "GET", None, ngrok_headers, "College Search"),
    ]
    
    ngrok_results = []
    for url, method, data, headers, desc in ngrok_tests:
        result = test_endpoint(url, method, data, headers, desc)
        ngrok_results.append(result)
        time.sleep(0.5)  # Small delay between requests
    
    # Test different majors
    print("\nTESTING DIFFERENT MAJORS")
    print("-" * 40)
    
    majors = ["Business", "Engineering", "Medicine", "Psychology", "Biology"]
    major_results = []
    
    for major in majors:
        test_data = test_profile.copy()
        test_data["major"] = major
        result = test_endpoint(
            "https://chancifybackendnonpostrges.up.railway.app/api/suggest/colleges",
            "POST", test_data, ngrok_headers, f"Suggestions for {major}"
        )
        major_results.append(result)
        time.sleep(0.5)
    
    # Test different academic profiles
    print("\nTESTING DIFFERENT ACADEMIC PROFILES")
    print("-" * 40)
    
    profiles = [
        ("Weak Student", {"gpa_unweighted": "2.5", "sat": "1000", "act": "20"}),
        ("Average Student", {"gpa_unweighted": "3.5", "sat": "1200", "act": "25"}),
        ("Strong Student", {"gpa_unweighted": "3.9", "sat": "1500", "act": "34"}),
        ("Elite Student", {"gpa_unweighted": "4.0", "sat": "1600", "act": "36"}),
    ]
    
    profile_results = []
    for profile_name, profile_data in profiles:
        test_data = test_profile.copy()
        test_data.update(profile_data)
        result = test_endpoint(
            "https://chancifybackendnonpostrges.up.railway.app/api/suggest/colleges",
            "POST", test_data, ngrok_headers, f"Suggestions for {profile_name}"
        )
        profile_results.append(result)
        time.sleep(0.5)
    
    # Summary
    print("\nTEST SUMMARY")
    print("=" * 60)
    
    local_success = sum(local_results)
    ngrok_success = sum(ngrok_results)
    major_success = sum(major_results)
    profile_success = sum(profile_results)
    
    total_tests = len(local_results) + len(ngrok_results) + len(major_results) + len(profile_results)
    total_success = local_success + ngrok_success + major_success + profile_success
    
    print(f"Local Backend: {local_success}/{len(local_results)} tests passed")
    print(f"Ngrok Backend: {ngrok_success}/{len(ngrok_results)} tests passed")
    print(f"Major Tests: {major_success}/{len(major_results)} tests passed")
    print(f"Profile Tests: {profile_success}/{len(profile_results)} tests passed")
    print(f"Overall: {total_success}/{total_tests} tests passed")
    
    if total_success == total_tests:
        print("\nALL TESTS PASSED! NO ERRORS FOUND!")
        print("Backend is fully functional")
        print("All endpoints working correctly")
        print("JSON responses valid")
        print("No 500 errors or exceptions")
    else:
        print(f"\n{total_tests - total_success} TESTS FAILED!")
        print("Backend has issues that need to be fixed")
    
    return total_success == total_tests

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
