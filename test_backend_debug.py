#!/usr/bin/env python3
"""
Deep test script to debug the backend endpoint and college data flow
"""

import requests
import json
import os
import sys

# Set OpenAI API key for testing
os.environ['OPENAI_API_KEY'] = 'sk-proj-your-key-here'  # Replace with actual key

def test_backend_endpoint():
    """Test the backend endpoint with real data"""
    
    # Test data - simulating what frontend sends
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
        "college": "Harvard University"  # Send college name, not ID
    }
    
    print("TESTING BACKEND ENDPOINT")
    print("=" * 50)
    print(f"Sending data to backend:")
    print(json.dumps(test_data, indent=2))
    print()
    
    # Test the endpoint
    url = "https://chancifybackendnonpostrges.up.railway.app/api/predict/frontend"
    headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    }
    
    try:
        print("Making request to:", url)
        response = requests.post(url, json=test_data, headers=headers)
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("SUCCESS! Backend response:")
            print(json.dumps(result, indent=2))
            
            # Check specific fields
            print("\nDETAILED ANALYSIS:")
            print(f"  College Name: {result.get('college_name', 'MISSING')}")
            print(f"  Probability: {result.get('probability', 'MISSING')}")
            print(f"  Acceptance Rate: {result.get('acceptance_rate', 'MISSING')}")
            print(f"  Selectivity Tier: {result.get('selectivity_tier', 'MISSING')}")
            
            college_data = result.get('college_data', {})
            print(f"  College Data Object: {college_data}")
            print(f"    City: {college_data.get('city', 'MISSING')}")
            print(f"    State: {college_data.get('state', 'MISSING')}")
            print(f"    Is Public: {college_data.get('is_public', 'MISSING')}")
            print(f"    Tuition In-State: {college_data.get('tuition_in_state', 'MISSING')}")
            print(f"    Tuition Out-State: {college_data.get('tuition_out_of_state', 'MISSING')}")
            
        else:
            print(f"ERROR! Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"EXCEPTION: {e}")

def test_college_data_function():
    """Test the get_college_data function directly"""
    
    print("\nTESTING COLLEGE DATA FUNCTION")
    print("=" * 50)
    
    # Import the function
    sys.path.append('.')
    
    try:
        from main import get_college_data
        
        test_colleges = [
            "Harvard University",
            "Stanford University", 
            "MIT",
            "college_166027",  # This should fail
            "Nonexistent College"  # This should fail
        ]
        
        for college_name in test_colleges:
            print(f"\nTesting: {college_name}")
            try:
                data = get_college_data(college_name)
                print(f"  SUCCESS!")
                print(f"    Name: {data.get('name', 'MISSING')}")
                print(f"    City: {data.get('city', 'MISSING')}")
                print(f"    State: {data.get('state', 'MISSING')}")
                print(f"    Acceptance Rate: {data.get('acceptance_rate', 'MISSING')}")
                print(f"    Tuition In-State: {data.get('tuition_in_state', 'MISSING')}")
            except Exception as e:
                print(f"  Error: {e}")
                
    except ImportError as e:
        print(f"Could not import get_college_data: {e}")

if __name__ == "__main__":
    print("STARTING DEEP BACKEND TEST")
    print("=" * 60)
    
    # Test 1: Backend endpoint
    test_backend_endpoint()
    
    # Test 2: College data function
    test_college_data_function()
    
    print("\nTEST COMPLETE")