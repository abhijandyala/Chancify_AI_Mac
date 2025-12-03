"""Complete CORS test with detailed output"""
import requests
import sys
import time

def test_cors():
    base_url = "http://localhost:8000"
    origin = "https://chancifyaipresidential.up.railway.app"
    
    print("=" * 70)
    print("BACKEND CORS VERIFICATION TEST")
    print("=" * 70)
    print(f"Backend URL: {base_url}")
    print(f"Origin: {origin}")
    print("=" * 70)
    print()
    
    # Test 1: Health endpoint OPTIONS
    print("1. Testing /api/health OPTIONS preflight...")
    try:
        response = requests.options(
            f"{base_url}/api/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type"
            },
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        if cors_headers:
            print("   ✅ CORS Headers Found:")
            for k, v in cors_headers.items():
                print(f"      {k}: {v}")
        else:
            print("   ❌ NO CORS HEADERS FOUND!")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend is NOT running!")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    print()
    
    # Test 2: /api/auth/me OPTIONS
    print("2. Testing /api/auth/me OPTIONS preflight...")
    try:
        response = requests.options(
            f"{base_url}/api/auth/me",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization"
            },
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        if cors_headers:
            print("   ✅ CORS Headers Found:")
            for k, v in cors_headers.items():
                print(f"      {k}: {v}")
        else:
            print("   ❌ NO CORS HEADERS FOUND!")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    print()
    
    # Test 3: /api/suggest/colleges OPTIONS
    print("3. Testing /api/suggest/colleges OPTIONS preflight...")
    try:
        response = requests.options(
            f"{base_url}/api/suggest/colleges",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            },
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        if cors_headers:
            print("   ✅ CORS Headers Found:")
            for k, v in cors_headers.items():
                print(f"      {k}: {v}")
        else:
            print("   ❌ NO CORS HEADERS FOUND!")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    print()
    print("=" * 70)
    print("✅ ALL CORS TESTS PASSED!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = test_cors()
    sys.exit(0 if success else 1)

