"""Test ML models through ngrok endpoint"""
import requests
import json

def test_ngrok_ml():
    print("=" * 70)
    print("TESTING ML MODELS VIA NGROK")
    print("=" * 70)
    print()
    
    # Test data - similar to what frontend sends
    test_request = {
        "gpa_unweighted": "3.8",
        "gpa_weighted": "4.2",
        "sat": "1500",
        "act": "34",
        "major": "Computer Science",
        "college": "college_2073268",  # Carnegie Mellon
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
    
    backend_url = "https://backendchancifyai.up.railway.app/api/predict/frontend"
    
    print(f"Testing: {ngrok_url}")
    print()
    
    try:
        response = requests.post(
            ngrok_url,
            json=test_request,
            headers={
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            timeout=20
        )
        
        print(f"Status Code: {response.status_code}")
        print()
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Request successful!")
            print()
            print(f"Probability: {data.get('probability', 0):.1%}")
            print(f"ML Probability: {data.get('ml_probability', 0):.1%}")
            print(f"Formula Probability: {data.get('formula_probability', 0):.1%}")
            print(f"Model Used: {data.get('model_used', 'unknown')}")
            print(f"Prediction Method: {data.get('prediction_method', 'unknown')}")
            print(f"Blend Weights: {data.get('blend_weights', {})}")
            print()
            
            model_used = data.get('model_used', '')
            prediction_method = data.get('prediction_method', '')
            
            if 'formula_only' in model_used or 'deterministic_fallback' in prediction_method:
                print("❌ WARNING: Using FALLBACK via ngrok!")
                print("   This means ML models are NOT accessible through ngrok")
                return False
            elif 'ensemble' in model_used or 'ml' in prediction_method.lower() or 'hybrid' in prediction_method.lower():
                print("✅ ML model IS being used via ngrok!")
                return True
            else:
                print(f"⚠️  Unknown model type: {model_used}")
                return False
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out - ngrok may not be running or backend is slow")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error: {e}")
        print("   Make sure ngrok is running and backend is accessible")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_ngrok_ml()
    print()
    print("=" * 70)
    if success:
        print("✅ ML models ARE working through ngrok!")
    else:
        print("❌ ML models are NOT working through ngrok!")
        print("   This could be why you see fallbacks on the website.")
    print("=" * 70)

