#!/usr/bin/env python3
"""
Simple test to verify backend is working
"""

import requests
import json

def test_simple_backend():
    """Test if backend is responding"""
    
    url = "https://chancifybackendnonpostrges.up.railway.app/api/predict/frontend"
    headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    }
    
    # Minimal test data
    test_data = {
        "gpa_unweighted": "3.8",
        "gpa_weighted": "4.2", 
        "sat": "1500",
        "act": "34",
        "major": "Computer Science",
        "extracurricular_depth": "8",
        "leadership_positions": "7",
        "research_experience": "6",
        "community_service": "8",
        "athletic_achievements": "5",
        "artistic_talents": "4",
        "work_experience": "6",
        "international_experience": "3",
        "hs_reputation": "9",
        "college": "Harvard University"
    }
    
    print("Testing backend endpoint...")
    print(f"URL: {url}")
    
    try:
        response = requests.post(url, json=test_data, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("SUCCESS!")
            
            # Check if college_data exists
            college_data = result.get('college_data', {})
            print(f"College data exists: {bool(college_data)}")
            print(f"College data keys: {list(college_data.keys())}")
            
            if college_data:
                print("COLLEGE DATA FOUND!")
                print(f"  Name: {college_data.get('name', 'MISSING')}")
                print(f"  City: {college_data.get('city', 'MISSING')}")
                print(f"  State: {college_data.get('state', 'MISSING')}")
            else:
                print("COLLEGE DATA IS EMPTY!")
                
        else:
            print(f"ERROR: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    test_simple_backend()
