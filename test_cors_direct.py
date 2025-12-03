"""Test CORS directly to verify backend is working"""
import requests
import sys

def test_cors():
    base_url = "http://localhost:8000"
    origin = "https://chancifyaipresidential.up.railway.app"
    
    print("=" * 60)
    print("Testing CORS Configuration")
    print("=" * 60)
    
    # Test 1: OPTIONS preflight request
    print("\n1. Testing OPTIONS preflight request...")
    try:
        response = requests.options(
            f"{base_url}/api/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization,Content-Type"
            },
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        print(f"   CORS Headers:")
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        if cors_headers:
            for k, v in cors_headers.items():
                print(f"     {k}: {v}")
        else:
            print("     ❌ NO CORS HEADERS FOUND!")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend is NOT running on localhost:8000")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 2: Actual GET request
    print("\n2. Testing GET request with Origin header...")
    try:
        response = requests.get(
            f"{base_url}/api/health",
            headers={"Origin": origin},
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        if cors_headers:
            print(f"   CORS Headers:")
            for k, v in cors_headers.items():
                print(f"     {k}: {v}")
        else:
            print("   ❌ NO CORS HEADERS FOUND!")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 3: Test /api/auth/me endpoint
    print("\n3. Testing /api/auth/me OPTIONS request...")
    try:
        response = requests.options(
            f"{base_url}/api/auth/me",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization"
            },
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        if cors_headers:
            print(f"   CORS Headers:")
            for k, v in cors_headers.items():
                print(f"     {k}: {v}")
        else:
            print("   ❌ NO CORS HEADERS FOUND!")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 4: Test /api/suggest/colleges endpoint
    print("\n4. Testing /api/suggest/colleges OPTIONS request...")
    try:
        response = requests.options(
            f"{base_url}/api/suggest/colleges",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            },
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        if cors_headers:
            print(f"   CORS Headers:")
            for k, v in cors_headers.items():
                print(f"     {k}: {v}")
        else:
            print("   ❌ NO CORS HEADERS FOUND!")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All CORS tests passed!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_cors()
    sys.exit(0 if success else 1)

