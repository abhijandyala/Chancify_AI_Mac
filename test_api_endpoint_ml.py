"""Test the /api/predict/frontend endpoint to verify ML models are used"""
import requests
import json

def test_api_endpoint():
    print("=" * 70)
    print("TESTING /api/predict/frontend ENDPOINT")
    print("=" * 70)
    print()
    
    # Test data - similar to what frontend sends
    test_request = {
        "gpa_unweighted": "3.8",
        "gpa_weighted": "4.2",
        "sat": "1500",
        "act": "34",
        "major": "Computer Science",
        "college": "college_2073268",  # MIT
        "extracurricular_depth": "8.5",
        "leadership_positions": "3",
        "awards_publications": "5",
        "essay_quality": "8.0",
        "recommendations": "8.5",
        "plan_timing": "7.5",
        "geography_residency": "7.0",
        "firstgen_diversity": "6.0",
        "ability_to_pay": "8.0",
        "portfolio_audition": "6.0",
        "policy_knob": "7.0",
        "demonstrated_interest": "7.5",
        "legacy_status": "0",
        "interview": "7.0",
        "conduct_record": "10.0",
        "hs_reputation": "8.0",
        "volunteer_work": "6.0"
    }
    
    # Test 1: Local endpoint
    print("1. Testing LOCAL endpoint (http://localhost:8000/api/predict/frontend)...")
    try:
        response = requests.post(
            "http://localhost:8000/api/predict/frontend",
            json=test_request,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Request successful!")
            print(f"   Probability: {data.get('probability', 0):.1%}")
            print(f"   ML Probability: {data.get('ml_probability', 0):.1%}")
            print(f"   Formula Probability: {data.get('formula_probability', 0):.1%}")
            print(f"   Model Used: {data.get('model_used', 'unknown')}")
            print(f"   Prediction Method: {data.get('prediction_method', 'unknown')}")
            print(f"   Blend Weights: {data.get('blend_weights', {})}")
            
            # Check if ML is being used
            model_used = data.get('model_used', '')
            prediction_method = data.get('prediction_method', '')
            
            if 'formula_only' in model_used or 'deterministic_fallback' in prediction_method:
                print("   ⚠️  WARNING: Using FALLBACK (ML not working!)")
                print("   This is why you see fallbacks on the website!")
                return False
            elif 'ensemble' in model_used or 'ml' in prediction_method.lower():
                print("   ✅ ML model IS being used!")
                return True
            else:
                print(f"   ⚠️  Unknown model type: {model_used}")
                return False
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    print()
    
    # Test 2: Via ngrok
    print("2. Testing via Railway (https://chancifybackendnonpostrges.up.railway.app/api/predict/frontend)...")
    try:
        response = requests.post(
            "https://chancifybackendnonpostrges.up.railway.app/api/predict/frontend",
            json=test_request,
            headers={
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            timeout=15
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Request successful!")
            print(f"   Probability: {data.get('probability', 0):.1%}")
            print(f"   ML Probability: {data.get('ml_probability', 0):.1%}")
            print(f"   Formula Probability: {data.get('formula_probability', 0):.1%}")
            print(f"   Model Used: {data.get('model_used', 'unknown')}")
            print(f"   Prediction Method: {data.get('prediction_method', 'unknown')}")
            
            model_used = data.get('model_used', '')
            if 'formula_only' in model_used or 'deterministic_fallback' in data.get('prediction_method', ''):
                print("   ⚠️  WARNING: Using FALLBACK via ngrok!")
                return False
            else:
                print("   ✅ ML model IS being used via ngrok!")
                return True
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_api_endpoint()
    print()
    print("=" * 70)
    if success:
        print("✅ ML models are working through the API!")
    else:
        print("❌ ML models are NOT working through the API!")
        print("   This is why you see fallbacks on the website.")
    print("=" * 70)

