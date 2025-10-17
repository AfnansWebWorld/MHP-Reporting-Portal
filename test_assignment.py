#!/usr/bin/env python3
"""
Test script to verify the user-to-user client assignment functionality works end-to-end.
This script tests the complete flow including authentication and client assignment.
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# Test user credentials (regular user for testing)
TEST_USER_EMAIL = "afnan@mhp.com"
TEST_USER_PASSWORD = "testpassword"

def test_authentication():
    """Test user authentication"""
    print("Testing authentication...")
    
    # Login endpoint
    login_data = {
        "username": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"✓ Authentication successful")
        print(f"  Token: {token_data['access_token'][:20]}...")
        return token_data['access_token']
    else:
        print(f"✗ Authentication failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return None

def test_client_assignment(token):
    """Test the client assignment functionality"""
    print("\nTesting client assignment...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Assignment data
    assignment_data = {
        "source_user_id": 5,  # afnan@mhp.com
        "target_user_id": 4   # user@mhp.com
    }
    
    response = requests.post(
        f"{BASE_URL}/admin/assign-user-clients",
        headers=headers,
        json=assignment_data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Client assignment successful")
        print(f"  Message: {result['message']}")
        print(f"  Assignments created: {result['assignments_created']}")
        return True
    else:
        print(f"✗ Client assignment failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def test_frontend_health():
    """Test frontend health"""
    print("\nTesting frontend health...")
    
    try:
        response = requests.get(f"{FRONTEND_URL}/login")
        if response.status_code == 200:
            print("✓ Frontend is accessible")
            return True
        else:
            print(f"✗ Frontend returned status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Frontend not accessible: {e}")
        return False

def main():
    """Main test function"""
    print("=== User-to-User Client Assignment Test ===")
    print(f"Backend: {BASE_URL}")
    print(f"Frontend: {FRONTEND_URL}")
    print()
    
    # Test 1: Frontend health
    frontend_ok = test_frontend_health()
    
    # Test 2: Authentication
    token = test_authentication()
    
    if token:
        # Test 3: Client assignment
        assignment_ok = test_client_assignment(token)
        
        if assignment_ok:
            print("\n=== SUCCESS: All tests passed! ===")
            print("The user-to-user client assignment feature is working correctly.")
            print("\nNext steps:")
            print("1. Test with admin user for full admin functionality")
            print("2. Test the frontend admin interface")
            print("3. Verify client data integrity after assignment")
        else:
            print("\n=== FAILURE: Client assignment test failed ===")
    else:
        print("\n=== FAILURE: Authentication test failed ===")
    
    print("\nTest completed.")

if __name__ == "__main__":
    main()