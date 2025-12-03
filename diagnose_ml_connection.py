"""Comprehensive diagnostic for ML model connection"""
import requests
import json
import os
from pathlib import Path

def check_model_files():
    """Check if ML model files exist"""
    print("=" * 70)
    print("1. CHECKING ML MODEL FILES")
    print("=" * 70)
    
    model_dir = Path("backend/data/models")
    required_files = [
        "ensemble.joblib",
        "scaler.joblib",
        "feature_selector.joblib",
        "metadata.json"
    ]
    
    print(f"Model directory: {model_dir.absolute()}")
    print(f"Directory exists: {model_dir.exists()}")
    print()
    
    if not model_dir.exists():
        print("❌ Model directory does not exist!")
        return False
    
    all_exist = True
    for filename in required_files:
        filepath = model_dir / filename
        exists = filepath.exists()
        status = "✅" if exists else "❌"
        print(f"{status} {filename}: {exists}")
        if not exists:
            all_exist = False
    
    print()
    return all_exist

def test_localhost_endpoint():
    """Test localhost endpoint"""
    print("=" * 70)
    print("2. TESTING LOCALHOST ENDPOINT")
    print("=" * 70)
    
    test_request = {
        "gpa_unweighted": "3.8",
        "gpa_weighted": "4.2",
        "sat": "1500",
        "act": "34",
        "major": "Computer Science",
        "college": "college_2073268",
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
    
    try:
        response = requests.post(
            "http://localhost:8000/api/predict/frontend",
            json=test_request,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            model_used = data.get('model_used', '')
            prediction_method = data.get('prediction_method', '')
            
            print(f"Status: {response.status_code}")
            print(f"Model Used: {model_used}")
            print(f"Prediction Method: {prediction_method}")
            print(f"ML Probability: {data.get('ml_probability', 0):.1%}")
            print(f"Formula Probability: {data.get('formula_probability', 0):.1%}")
            
            if 'formula_only' in model_used or 'deterministic_fallback' in prediction_method:
                print("❌ Using FALLBACK on localhost")
                return False
            else:
                print("✅ ML models working on localhost")
                return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_ngrok_endpoint():
    """Test ngrok endpoint"""
    print()
    print("=" * 70)
    print("3. TESTING NGROK ENDPOINT")
    print("=" * 70)
    
    test_request = {
        "gpa_unweighted": "3.8",
        "gpa_weighted": "4.2",
        "sat": "1500",
        "act": "34",
        "major": "Computer Science",
        "college": "college_2073268",
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
        
        if response.status_code == 200:
            data = response.json()
            model_used = data.get('model_used', '')
            prediction_method = data.get('prediction_method', '')
            
            print(f"Status: {response.status_code}")
            print(f"Model Used: {model_used}")
            print(f"Prediction Method: {prediction_method}")
            print(f"ML Probability: {data.get('ml_probability', 0):.1%}")
            print(f"Formula Probability: {data.get('formula_probability', 0):.1%}")
            
            if 'formula_only' in model_used or 'deterministic_fallback' in prediction_method:
                print("❌ Using FALLBACK via ngrok")
                return False
            else:
                print("✅ ML models working via ngrok")
                return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_frontend_config():
    """Check frontend configuration"""
    print()
    print("=" * 70)
    print("4. CHECKING FRONTEND CONFIGURATION")
    print("=" * 70)
    
    config_file = Path("frontend/lib/config.ts")
    if not config_file.exists():
        print("❌ Config file not found")
        return False
    
    content = config_file.read_text()
    
    # Check for ngrok URL
    if "backendchancifyai.up.railway.app" in content:
        print("✅ Ngrok URL found in config")
    else:
        print("❌ Ngrok URL NOT found in config")
    
    # Check priority order
    if "NGROK_API_URL" in content and "DEFAULT_API_URL" in content:
        print("✅ URL constants defined")
    else:
        print("❌ URL constants missing")
    
    # Check getApiBaseUrl function
    if "getApiBaseUrl" in content:
        print("✅ getApiBaseUrl function found")
    else:
        print("❌ getApiBaseUrl function missing")
    
    return True

if __name__ == "__main__":
    print()
    print("🔍 COMPREHENSIVE ML CONNECTION DIAGNOSTIC")
    print()
    
    results = {
        "model_files": check_model_files(),
        "localhost": test_localhost_endpoint(),
        "ngrok": test_ngrok_endpoint(),
        "frontend_config": check_frontend_config()
    }
    
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    for test, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test}")
    
    print()
    if all(results.values()):
        print("✅ ALL TESTS PASSED - ML models should be working!")
    else:
        print("❌ SOME TESTS FAILED - See details above")
    print("=" * 70)

