"""Complete website test - tests all endpoints through ngrok"""
import requests
import time
import sys

NGROK_URL = "https://unsmug-untensely-elroy.ngrok-free.dev"
LOCAL_URL = "http://localhost:8000"

def test_endpoint(name, url, headers=None, method="GET", data=None):
    """Test a single endpoint"""
    print(f"\n{'='*70}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    print(f"{'='*70}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "OPTIONS":
            response = requests.options(url, headers=headers, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                json_data = response.json()
                print(f"Response: {json_data}")
                print("✅ SUCCESS")
                return True
            except:
                print(f"Response: {response.text[:100]}")
                print("✅ SUCCESS (non-JSON)")
                return True
        else:
            print(f"Response: {response.text[:200]}")
            print(f"❌ FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("="*70)
    print("COMPLETE WEBSITE TEST")
    print("="*70)
    print(f"Ngrok URL: {NGROK_URL}")
    print(f"Local URL: {LOCAL_URL}")
    print("="*70)
    
    ngrok_headers = {'ngrok-skip-browser-warning': 'true'}
    cors_headers = {
        'Origin': 'https://chancifyaipresidential.up.railway.app',
        'ngrok-skip-browser-warning': 'true'
    }
    
    results = []
    
    # Test 1: Health endpoint (local)
    results.append(("Local Health", test_endpoint(
        "Local Health Check",
        f"{LOCAL_URL}/api/health"
    )))
    
    # Test 2: Health endpoint (ngrok)
    results.append(("Ngrok Health", test_endpoint(
        "Ngrok Health Check",
        f"{NGROK_URL}/api/health",
        headers=ngrok_headers
    )))
    
    # Test 3: Auth endpoint OPTIONS (CORS preflight)
    results.append(("Auth OPTIONS", test_endpoint(
        "Auth OPTIONS (CORS Preflight)",
        f"{NGROK_URL}/api/auth/me",
        headers={**cors_headers, 'Access-Control-Request-Method': 'GET'},
        method="OPTIONS"
    )))
    
    # Test 4: Auth endpoint GET (no auth)
    results.append(("Auth GET (no auth)", test_endpoint(
        "Auth GET (No Authentication)",
        f"{NGROK_URL}/api/auth/me",
        headers=ngrok_headers
    )))
    
    # Test 5: College suggestions OPTIONS
    results.append(("Suggest OPTIONS", test_endpoint(
        "College Suggestions OPTIONS",
        f"{NGROK_URL}/api/suggest/colleges",
        headers={**cors_headers, 'Access-Control-Request-Method': 'POST'},
        method="OPTIONS"
    )))
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {name}")
    print("="*70)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Website should work correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

