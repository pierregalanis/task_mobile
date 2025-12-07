#!/usr/bin/env python3
"""
Backend API Testing Script for Soutrali App
Tests authentication, user endpoints, and tasker functionality
Focus: Testing the fixed /api/users/taskers endpoint and sample data
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend configuration
BACKEND_URL = "https://taskhub-mobile-1.preview.emergentagent.com/api"

TEST_CREDENTIALS = {
    "client": {"email": "testclient@demo.com", "password": "test123"},
    "tasker": {"email": "testtasker@demo.com", "password": "test123"}
}

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_basic_connectivity(self) -> bool:
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Basic API Connectivity", True, f"Status: {data.get('status', 'N/A')}")
                return True
            else:
                self.log_test("Basic API Connectivity", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Basic API Connectivity", False, f"Connection error: {str(e)}")
            return False
    
    def test_status_endpoint(self) -> bool:
        """Test status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/status")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Status Endpoint", True, f"Status: {data.get('status', 'N/A')}")
                return True
            else:
                self.log_test("Status Endpoint", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Status Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_taskers_endpoint_public(self) -> bool:
        """Test GET /api/users/taskers (public endpoint, no auth required)"""
        try:
            response = self.session.get(f"{self.base_url}/users/taskers")
            
            if response.status_code != 200:
                self.log_test("GET /users/taskers (Public)", False, 
                            f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Verify it's a list
            if not isinstance(data, list):
                self.log_test("GET /users/taskers (Public)", False, 
                            f"Expected list, got {type(data)}")
                return False
            
            # Check if we have taskers
            if len(data) == 0:
                self.log_test("GET /users/taskers (Public)", False, 
                            "No taskers returned")
                return False
            
            # Verify tasker structure
            sample_tasker = data[0]
            required_fields = ['full_name', 'email', 'role', 'rating', 'reviews_count', 
                             'completed_tasks', 'is_available', 'tasker_profile']
            
            missing_fields = [field for field in required_fields if field not in sample_tasker]
            if missing_fields:
                self.log_test("GET /users/taskers (Public)", False, 
                            f"Missing fields: {missing_fields}")
                return False
            
            # Verify role is tasker
            if sample_tasker.get('role') != 'tasker':
                self.log_test("GET /users/taskers (Public)", False, 
                            f"Expected role 'tasker', got '{sample_tasker.get('role')}'")
                return False
            
            # Verify tasker_profile structure (can be null for some taskers)
            tasker_profile = sample_tasker.get('tasker_profile')
            if tasker_profile is not None and 'services' not in tasker_profile:
                self.log_test("GET /users/taskers (Public)", False, 
                            "tasker_profile exists but missing services array")
                return False
            
            # Verify no hashed_password field is exposed
            if 'hashed_password' in sample_tasker:
                self.log_test("GET /users/taskers (Public)", False, 
                            "Security issue: hashed_password field exposed")
                return False
            
            self.log_test("GET /users/taskers (Public)", True, 
                        f"Found {len(data)} taskers with proper structure")
            return True
            
        except Exception as e:
            self.log_test("GET /users/taskers (Public)", False, f"Error: {str(e)}")
            return False
    
    def test_taskers_with_filters(self) -> bool:
        """Test taskers endpoint with category and country filters"""
        success_count = 0
        
        # Test category filter
        try:
            response = self.session.get(f"{self.base_url}/users/taskers?category=plumbing")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /users/taskers?category=plumbing", True, 
                            f"Found {len(data)} plumbing taskers")
                success_count += 1
            else:
                self.log_test("GET /users/taskers?category=plumbing", False, 
                            f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("GET /users/taskers?category=plumbing", False, f"Error: {str(e)}")
        
        # Test country filter
        try:
            response = self.session.get(f"{self.base_url}/users/taskers?country=Ghana")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /users/taskers?country=Ghana", True, 
                            f"Found {len(data)} taskers in Ghana")
                success_count += 1
            else:
                self.log_test("GET /users/taskers?country=Ghana", False, 
                            f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("GET /users/taskers?country=Ghana", False, f"Error: {str(e)}")
        
        return success_count == 2
    
    def test_authentication_login(self) -> bool:
        """Test authentication login with test credentials"""
        try:
            login_data = {
                "email": "testclient@demo.com",
                "password": "test123"
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code != 200:
                self.log_test("POST /auth/login", False, 
                            f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Verify response structure
            if 'token' not in data or 'user' not in data:
                self.log_test("POST /auth/login", False, 
                            "Missing 'token' or 'user' in response")
                return False
            
            # Store token for future requests
            self.auth_token = data['token']
            
            # Verify user data
            user = data['user']
            if user.get('email') != 'testclient@demo.com':
                self.log_test("POST /auth/login", False, 
                            f"Expected email 'testclient@demo.com', got '{user.get('email')}'")
                return False
            
            # Verify no hashed_password in response
            if 'hashed_password' in user:
                self.log_test("POST /auth/login", False, 
                            "Security issue: hashed_password in login response")
                return False
            
            self.log_test("POST /auth/login", True, 
                        f"Successfully logged in user: {user.get('full_name')}")
            return True
            
        except Exception as e:
            self.log_test("POST /auth/login", False, f"Error: {str(e)}")
            return False
    
    def test_authentication_register(self) -> bool:
        """Test user registration with new user data"""
        try:
            # Use unique email to avoid conflicts
            import time
            timestamp = int(time.time())
            
            register_data = {
                "email": f"newuser{timestamp}@demo.com",
                "password": "test123",
                "full_name": "New Test User",
                "phone": "+225 0123456789",
                "country": "Ivory Coast",
                "city": "Abidjan",
                "role": "client"
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=register_data)
            
            if response.status_code != 201:
                self.log_test("POST /auth/register", False, 
                            f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Verify response structure
            if 'token' not in data or 'user' not in data:
                self.log_test("POST /auth/register", False, 
                            "Missing 'token' or 'user' in response")
                return False
            
            # Verify user data
            user = data['user']
            if user.get('email') != register_data['email']:
                self.log_test("POST /auth/register", False, 
                            f"Email mismatch in response")
                return False
            
            # Verify no hashed_password in response
            if 'hashed_password' in user:
                self.log_test("POST /auth/register", False, 
                            "Security issue: hashed_password in register response")
                return False
            
            self.log_test("POST /auth/register", True, 
                        f"Successfully registered user: {user.get('full_name')}")
            return True
            
        except Exception as e:
            self.log_test("POST /auth/register", False, f"Error: {str(e)}")
            return False
    
    def test_get_current_user(self) -> bool:
        """Test GET /users/me with valid token"""
        if not self.auth_token:
            self.log_test("GET /users/me", False, "No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/users/me", headers=headers)
            
            if response.status_code != 200:
                self.log_test("GET /users/me", False, 
                            f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Verify user data
            if 'email' not in data or 'full_name' not in data:
                self.log_test("GET /users/me", False, 
                            "Missing required user fields")
                return False
            
            # Verify no hashed_password in response
            if 'hashed_password' in data:
                self.log_test("GET /users/me", False, 
                            "Security issue: hashed_password in user response")
                return False
            
            self.log_test("GET /users/me", True, 
                        f"Retrieved current user: {data.get('full_name')}")
            return True
            
        except Exception as e:
            self.log_test("GET /users/me", False, f"Error: {str(e)}")
            return False
    
    def test_get_user_by_id(self) -> bool:
        """Test GET /users/{user_id} with a valid tasker ID"""
        try:
            # First get taskers to get a valid user ID
            response = self.session.get(f"{self.base_url}/users/taskers")
            if response.status_code != 200:
                self.log_test("GET /users/{user_id}", False, 
                            "Could not get taskers list for user ID")
                return False
            
            taskers = response.json()
            if not taskers:
                self.log_test("GET /users/{user_id}", False, 
                            "No taskers available for testing")
                return False
            
            # Use first tasker's ID
            user_id = taskers[0].get('id')
            if not user_id:
                self.log_test("GET /users/{user_id}", False, 
                            "No user ID found in tasker data")
                return False
            
            # Test getting user by ID
            response = self.session.get(f"{self.base_url}/users/{user_id}")
            
            if response.status_code != 200:
                self.log_test("GET /users/{user_id}", False, 
                            f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Verify user data
            if data.get('id') != user_id:
                self.log_test("GET /users/{user_id}", False, 
                            "User ID mismatch in response")
                return False
            
            # Verify no hashed_password in response
            if 'hashed_password' in data:
                self.log_test("GET /users/{user_id}", False, 
                            "Security issue: hashed_password in user response")
                return False
            
            self.log_test("GET /users/{user_id}", True, 
                        f"Retrieved user: {data.get('full_name')}")
            return True
            
        except Exception as e:
            self.log_test("GET /users/{user_id}", False, f"Error: {str(e)}")
            return False
    
    def verify_sample_taskers(self) -> bool:
        """Verify the expected sample taskers are present"""
        try:
            response = self.session.get(f"{self.base_url}/users/taskers")
            if response.status_code != 200:
                self.log_test("Verify Sample Taskers", False, 
                            f"Could not fetch taskers: {response.status_code}")
                return False
            
            taskers = response.json()
            
            # Expected taskers from the review request
            expected_taskers = [
                "Marie Kouassi",
                "John Mensah", 
                "Fatou Diop",
                "Kwame Nkrumah"
            ]
            
            found_taskers = [tasker.get('full_name') for tasker in taskers]
            
            missing_taskers = [name for name in expected_taskers if name not in found_taskers]
            
            if missing_taskers:
                self.log_test("Verify Sample Taskers", False, 
                            f"Missing expected taskers: {missing_taskers}")
                return False
            
            # Verify specific tasker details
            marie = next((t for t in taskers if t.get('full_name') == 'Marie Kouassi'), None)
            if marie:
                if marie.get('country') != 'Ivory Coast' or marie.get('rating') != 4.8:
                    self.log_test("Verify Sample Taskers", False, 
                                "Marie Kouassi data doesn't match expected values")
                    return False
            
            kwame = next((t for t in taskers if t.get('full_name') == 'Kwame Nkrumah'), None)
            if kwame:
                if kwame.get('is_available') != False or kwame.get('rating') != 5.0:
                    self.log_test("Verify Sample Taskers", False, 
                                "Kwame Nkrumah data doesn't match expected values")
                    return False
            
            self.log_test("Verify Sample Taskers", True, 
                        f"Found all expected taskers. Total: {len(taskers)}")
            return True
            
        except Exception as e:
            self.log_test("Verify Sample Taskers", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity first
        if not self.test_basic_connectivity():
            print("\n❌ CRITICAL: Cannot connect to backend API")
            return False
        
        # Run all tests
        tests = [
            self.test_status_endpoint,
            self.test_taskers_endpoint_public,
            self.test_taskers_with_filters,
            self.test_authentication_login,
            self.test_authentication_register,
            self.test_get_current_user,
            self.test_get_user_by_id,
            self.verify_sample_taskers
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()