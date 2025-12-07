#!/usr/bin/env python3
"""
Backend API Integration Tests for Mobile App Authentication
Testing external API at: https://taskrabbit-africa.preview.emergentagent.com/api
"""

import requests
import json
import jwt
from datetime import datetime
import time

# API Configuration
BASE_URL = "https://taskrabbit-africa.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "client": {"email": "testclient@demo.com", "password": "test123"},
    "tasker": {"email": "testtasker@demo.com", "password": "test123"}
}

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.tokens = {}
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def test_login_endpoint(self):
        """Test POST /api/auth/login endpoint"""
        print("=" * 60)
        print("TESTING LOGIN ENDPOINT")
        print("=" * 60)
        
        # Test 1: Valid client credentials
        try:
            login_data = {
                "username": TEST_CREDENTIALS["client"]["email"],
                "password": TEST_CREDENTIALS["client"]["password"]
            }
            
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            response = self.session.post(
                f"{self.base_url}/auth/login",
                data=login_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.tokens["client"] = data["access_token"]
                    # Verify JWT format
                    try:
                        decoded = jwt.decode(data["access_token"], options={"verify_signature": False})
                        self.log_test("Login with valid client credentials", True, 
                                    f"Token received, expires: {decoded.get('exp', 'N/A')}")
                    except Exception as e:
                        self.log_test("Login with valid client credentials", False, 
                                    f"Invalid JWT format: {str(e)}")
                else:
                    self.log_test("Login with valid client credentials", False, 
                                "No access_token in response")
            else:
                self.log_test("Login with valid client credentials", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Login with valid client credentials", False, f"Exception: {str(e)}")
        
        # Test 2: Valid tasker credentials
        try:
            login_data = {
                "username": TEST_CREDENTIALS["tasker"]["email"],
                "password": TEST_CREDENTIALS["tasker"]["password"]
            }
            
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            response = self.session.post(
                f"{self.base_url}/auth/login",
                data=login_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.tokens["tasker"] = data["access_token"]
                    try:
                        decoded = jwt.decode(data["access_token"], options={"verify_signature": False})
                        self.log_test("Login with valid tasker credentials", True, 
                                    f"Token received, expires: {decoded.get('exp', 'N/A')}")
                    except Exception as e:
                        self.log_test("Login with valid tasker credentials", False, 
                                    f"Invalid JWT format: {str(e)}")
                else:
                    self.log_test("Login with valid tasker credentials", False, 
                                "No access_token in response")
            else:
                self.log_test("Login with valid tasker credentials", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Login with valid tasker credentials", False, f"Exception: {str(e)}")
        
        # Test 3: Invalid credentials
        try:
            login_data = {
                "username": "invalid@email.com",
                "password": "wrongpassword"
            }
            
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            response = self.session.post(
                f"{self.base_url}/auth/login",
                data=login_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [401, 400, 422]:
                self.log_test("Login with invalid credentials", True, 
                            f"Correctly rejected with status {response.status_code}")
            else:
                self.log_test("Login with invalid credentials", False, 
                            f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Login with invalid credentials", False, f"Exception: {str(e)}")
    
    def test_register_endpoint(self):
        """Test POST /api/auth/register endpoint"""
        print("=" * 60)
        print("TESTING REGISTER ENDPOINT")
        print("=" * 60)
        
        # Test 1: Register new client
        try:
            timestamp = int(time.time())
            register_data = {
                "email": f"newclient{timestamp}@test.com",
                "password": "testpass123",
                "full_name": "Test Client User",
                "phone": "+1234567890",
                "country": "US",
                "role": "client",
                "language": "en"
            }
            
            headers = {"Content-Type": "application/json"}
            response = self.session.post(
                f"{self.base_url}/auth/register",
                json=register_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                if "access_token" in data:
                    try:
                        decoded = jwt.decode(data["access_token"], options={"verify_signature": False})
                        self.log_test("Register new client account", True, 
                                    f"Account created, token received")
                    except Exception as e:
                        self.log_test("Register new client account", False, 
                                    f"Invalid JWT format: {str(e)}")
                else:
                    self.log_test("Register new client account", False, 
                                "No access_token in response")
            else:
                self.log_test("Register new client account", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Register new client account", False, f"Exception: {str(e)}")
        
        # Test 2: Register new tasker
        try:
            timestamp = int(time.time())
            register_data = {
                "email": f"newtasker{timestamp}@test.com",
                "password": "testpass123",
                "full_name": "Test Tasker User",
                "phone": "+1234567891",
                "country": "FR",
                "role": "tasker",
                "language": "fr"
            }
            
            headers = {"Content-Type": "application/json"}
            response = self.session.post(
                f"{self.base_url}/auth/register",
                json=register_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                if "access_token" in data:
                    try:
                        decoded = jwt.decode(data["access_token"], options={"verify_signature": False})
                        self.log_test("Register new tasker account", True, 
                                    f"Account created, token received")
                    except Exception as e:
                        self.log_test("Register new tasker account", False, 
                                    f"Invalid JWT format: {str(e)}")
                else:
                    self.log_test("Register new tasker account", False, 
                                "No access_token in response")
            else:
                self.log_test("Register new tasker account", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Register new tasker account", False, f"Exception: {str(e)}")
    
    def test_get_current_user(self):
        """Test GET /api/users/me endpoint"""
        print("=" * 60)
        print("TESTING GET CURRENT USER ENDPOINT")
        print("=" * 60)
        
        # Test 1: Get user with valid client token
        if "client" in self.tokens:
            try:
                headers = {"Authorization": f"Bearer {self.tokens['client']}"}
                response = self.session.get(
                    f"{self.base_url}/users/me",
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "email" in data:
                        self.log_test("Get current user with client token", True, 
                                    f"User data received: {data.get('email', 'N/A')}")
                    else:
                        self.log_test("Get current user with client token", False, 
                                    "No user data in response")
                else:
                    self.log_test("Get current user with client token", False, 
                                f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test("Get current user with client token", False, f"Exception: {str(e)}")
        else:
            self.log_test("Get current user with client token", False, "No client token available")
        
        # Test 2: Get user with valid tasker token
        if "tasker" in self.tokens:
            try:
                headers = {"Authorization": f"Bearer {self.tokens['tasker']}"}
                response = self.session.get(
                    f"{self.base_url}/users/me",
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "email" in data:
                        self.log_test("Get current user with tasker token", True, 
                                    f"User data received: {data.get('email', 'N/A')}")
                    else:
                        self.log_test("Get current user with tasker token", False, 
                                    "No user data in response")
                else:
                    self.log_test("Get current user with tasker token", False, 
                                f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test("Get current user with tasker token", False, f"Exception: {str(e)}")
        else:
            self.log_test("Get current user with tasker token", False, "No tasker token available")
        
        # Test 3: Get user with invalid token
        try:
            headers = {"Authorization": "Bearer invalid_token_here"}
            response = self.session.get(
                f"{self.base_url}/users/me",
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [401, 403]:
                self.log_test("Get current user with invalid token", True, 
                            f"Correctly rejected with status {response.status_code}")
            else:
                self.log_test("Get current user with invalid token", False, 
                            f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Get current user with invalid token", False, f"Exception: {str(e)}")
    
    def test_token_format(self):
        """Test JWT token format and structure"""
        print("=" * 60)
        print("TESTING TOKEN FORMAT")
        print("=" * 60)
        
        for role, token in self.tokens.items():
            try:
                # Decode without verification to check structure
                decoded = jwt.decode(token, options={"verify_signature": False})
                
                # Check required fields
                required_fields = ["exp", "sub"]
                missing_fields = [field for field in required_fields if field not in decoded]
                
                if not missing_fields:
                    exp_time = datetime.fromtimestamp(decoded["exp"])
                    current_time = datetime.now()
                    
                    if exp_time > current_time:
                        self.log_test(f"JWT token format for {role}", True, 
                                    f"Valid JWT with expiry: {exp_time}")
                    else:
                        self.log_test(f"JWT token format for {role}", False, 
                                    f"Token expired: {exp_time}")
                else:
                    self.log_test(f"JWT token format for {role}", False, 
                                f"Missing fields: {missing_fields}")
                    
            except Exception as e:
                self.log_test(f"JWT token format for {role}", False, f"Invalid JWT: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Backend API Integration Tests")
        print(f"Testing API at: {self.base_url}")
        print(f"Test time: {datetime.now()}")
        print()
        
        # Run tests in sequence
        self.test_login_endpoint()
        self.test_register_endpoint()
        self.test_get_current_user()
        self.test_token_format()
        
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Tokens obtained: {list(self.tokens.keys())}")
        print("All tests completed!")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()