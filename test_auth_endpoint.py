"""Test script to verify /api/auth/me endpoint works without authentication"""
import requests
import sys

def test_auth_endpoint():
    print("=" * 70)
    print("Testing /api/auth/me endpoint")
    print("=" * 70)
    
    # Test 1: Without authentication (should return 200 OK with authenticated: false)
    print("\n1. Testing WITHOUT authentication header...")
    try:
        response = requests.get('http://localhost:8000/api/auth/me', timeout=5)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('authenticated') == False:
                print("   ✅ CORRECT: Returns 200 OK with authenticated: false")
                return True
            else:
                print("   ❌ WRONG: Returns 200 but authenticated is not false")
                return False
        elif response.status_code == 403:
            print("   ❌ WRONG: Still returning 403 Forbidden")
            print("   ⚠️  Backend needs to be RESTARTED to apply changes!")
            return False
        else:
            print(f"   ❌ UNEXPECTED: Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False
    
    # Test 2: Via ngrok
    print("\n2. Testing via ngrok WITHOUT authentication...")
    try:
        response = requests.get(
            'https://chancifybackendnonpostrges.up.railway.app/api/auth/me',
            headers={'ngrok-skip-browser-warning': 'true'},
            timeout=10
        )
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('authenticated') == False:
                print("   ✅ CORRECT: Returns 200 OK with authenticated: false")
                return True
            else:
                print("   ❌ WRONG: Returns 200 but authenticated is not false")
                return False
        elif response.status_code == 403:
            print("   ❌ WRONG: Still returning 403 Forbidden")
            print("   ⚠️  Backend needs to be RESTARTED to apply changes!")
            return False
        else:
            print(f"   ❌ UNEXPECTED: Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    success = test_auth_endpoint()
    if not success:
        print("\n" + "=" * 70)
        print("⚠️  SOLUTION: Restart your backend server!")
        print("=" * 70)
        print("1. Stop the current backend (Ctrl+C in the terminal)")
        print("2. Restart it: cd backend && python main.py")
        print("3. Wait for: 'INFO: Application startup complete'")
        print("4. Run this test again: python test_auth_endpoint.py")
        print("=" * 70)
    sys.exit(0 if success else 1)

