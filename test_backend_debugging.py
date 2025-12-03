#!/usr/bin/env python3
"""
Test the backend endpoint with debugging
"""

import requests
import json

def test_backend_with_debug():
    """Test the backend endpoint and see debugging output"""
    
    # Test data
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
    
    print("TESTING BACKEND WITH DEBUGGING")
    print("=" * 50)
    print(f"Request data: {json.dumps(test_data, indent=2)}")
    
    # Test the endpoint
    url = "https://backendchancifyai.up.railway.app/api/predict/frontend"
    headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    }
    
    try:
        print(f"\nMaking request to: {url}")
        response = requests.post(url, json=test_data, headers=headers)
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("SUCCESS! Response:")
            print(json.dumps(result, indent=2))
            
            # Check college_data specifically
            college_data = result.get('college_data', {})
            print(f"\nCOLLEGE DATA ANALYSIS:")
            print(f"  College Data Object: {college_data}")
            print(f"  Is Empty: {len(college_data) == 0}")
            print(f"  Keys: {list(college_data.keys())}")
            
            if college_data:
                print(f"  Name: {college_data.get('name', 'MISSING')}")
                print(f"  City: {college_data.get('city', 'MISSING')}")
                print(f"  State: {college_data.get('state', 'MISSING')}")
            else:
                print("  ❌ COLLEGE DATA IS EMPTY!")
                
        else:
            print(f"ERROR! Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    test_backend_with_debug()
