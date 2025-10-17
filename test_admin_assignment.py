#!/usr/bin/env python3
"""
Test script to verify the admin user-to-user client assignment functionality works end-to-end.
This script tests the complete flow including admin authentication and client assignment.
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# Admin credentials
ADMIN_EMAIL = "admin@mhp.com"
ADMIN_PASSWORD = "admin123"

def test_admin_authentication():
    """Test admin authentication"""
    print("Testing admin authentication...")
    
    # Login endpoint
    login_data = {
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"✓ Admin authentication successful")
        print(f"  Token: {token_data['access_token'][:20]}...")
        print(f"  Role: {token_data.get('role', 'unknown')}")
        return token_data['access_token']
    else:
        print(f"✗ Admin authentication failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return None

def test_admin_client_assignment(token):
    """Test the admin client assignment functionality"""
    print("\nTesting admin client assignment...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Assignment data - using valid user IDs from our database
    assignment_data = {
        "source_user_id": 5,  # afnan@mhp.com
        "target_user_id": 4   # user@mhp.com (Demo User)
    }
    
    response = requests.post(
        f"{BASE_URL}/admin/assign-user-clients",
        headers=headers,
        json=assignment_data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Admin client assignment successful")
        print(f"  Message: {result['message']}")
        print(f"  Assignments created: {result['assignments_created']}")
        return True
    else:
        print(f"✗ Admin client assignment failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def test_admin_permission_enforcement():
    """Test that admin permissions are properly enforced"""
    print("\nTesting admin permission enforcement...")
    
    # First, get a regular user token
    user_login_data = {
        "username": "afnan@mhp.com",
        "password": "testpassword"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", data=user_login_data)
    user_token = response.json()['access_token']
    
    headers = {
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json"
    }
    
    # Try to assign clients as regular user
    assignment_data = {
        "source_user_id": 5,
        "target_user_id": 4
    }
    
    response = requests.post(
        f"{BASE_URL}/admin/assign-user-clients",
        headers=headers,
        json=assignment_data
    )
    
    if response.status_code == 403:
        print("✓ Admin permission enforcement working correctly")
        print("  Regular user properly blocked from admin function")
        return True
    else:
        print(f"✗ Admin permission enforcement failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def test_frontend_admin_access():
    """Test frontend admin page accessibility"""
    print("\nTesting frontend admin page...")
    
    try:
        response = requests.get(f"{FRONTEND_URL}/admin")
        if response.status_code == 200:
            print("✓ Frontend admin page is accessible")
            return True
        else:
            print(f"✗ Frontend admin page returned status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Frontend admin page not accessible: {e}")
        return False

def main():
    """Main test function"""
    print("=== Admin User-to-User Client Assignment Test ===")
    print(f"Backend: {BASE_URL}")
    print(f"Frontend: {FRONTEND_URL}")
    print()
    
    # Test 1: Frontend admin page
    frontend_ok = test_frontend_admin_access()
    
    # Test 2: Admin permission enforcement
    permission_ok = test_admin_permission_enforcement()
    
    # Test 3: Admin authentication
    admin_token = test_admin_authentication()
    
    if admin_token:
        # Test 4: Admin client assignment
        assignment_ok = test_admin_client_assignment(admin_token)
        
        if assignment_ok and permission_ok and frontend_ok:
            print("\n=== SUCCESS: All admin tests passed! ===")
            print("✓ Frontend admin interface is accessible")
            print("✓ Admin permissions are properly enforced")
            print("✓ Admin authentication works correctly")
            print("✓ Admin client assignment functionality works")
            print("\n🎉 The user-to-user client assignment feature is fully functional!")
            print("\nSummary of what was implemented:")
            print("- Backend endpoint: POST /admin/assign-user-clients")
            print("- Admin authentication requirement")
            print("- JSON payload support for source_user_id and target_user_id")
            print("- Proper error handling and validation")
            print("- Frontend integration ready")
        else:
            print("\n=== FAILURE: Some admin tests failed ===")
    else:
        print("\n=== FAILURE: Admin authentication test failed ===")
    
    print("\nTest completed.")

if __name__ == "__main__":
    main()