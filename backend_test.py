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
    
    def test_api_accessibility(self):
        """Test if APIs are accessible"""
        print("=" * 60)
        print("TESTING API ACCESSIBILITY")
        print("=" * 60)
        
        # Test external API
        try:
            response = self.session.get(f"{EXTERNAL_API_URL}/", timeout=10)
            if response.status_code == 200:
                self.test_results["external_api"]["accessible"] = True
                self.log_test("External API accessibility", True, f"Status: {response.status_code}")
            else:
                self.log_test("External API accessibility", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("External API accessibility", False, f"Exception: {str(e)}")
        
        # Test local API
        try:
            response = self.session.get(f"{LOCAL_API_URL}/", timeout=10)
            if response.status_code == 200:
                self.test_results["local_api"]["accessible"] = True
                self.log_test("Local API accessibility", True, f"Status: {response.status_code}, Response: {response.text}")
            else:
                self.log_test("Local API accessibility", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Local API accessibility", False, f"Exception: {str(e)}")
        
        # Test frontend configured API
        try:
            response = self.session.get(f"{FRONTEND_CONFIGURED_URL}/", timeout=10)
            if response.status_code == 200:
                self.test_results["frontend_configured_api"]["accessible"] = True
                self.log_test("Frontend configured API accessibility", True, f"Status: {response.status_code}")
            else:
                self.log_test("Frontend configured API accessibility", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Frontend configured API accessibility", False, f"Exception: {str(e)}")

    def test_authentication_endpoints(self, base_url, api_name):
        """Test authentication endpoints for a specific API"""
        print(f"=" * 60)
        print(f"TESTING {api_name.upper()} AUTHENTICATION ENDPOINTS")
        print(f"=" * 60)
        
        # Test login endpoint
        try:
            login_data = {
                "username": TEST_CREDENTIALS["client"]["email"],
                "password": TEST_CREDENTIALS["client"]["password"]
            }
            
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            response = self.session.post(
                f"{base_url}/auth/login",
                data=login_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.tokens[f"{api_name}_client"] = data["access_token"]
                    self.log_test(f"{api_name} - Login endpoint", True, "Token received")
                    self.test_results[api_name]["endpoints"]["login"] = True
                else:
                    self.log_test(f"{api_name} - Login endpoint", False, "No access_token in response")
                    self.test_results[api_name]["endpoints"]["login"] = False
            else:
                self.log_test(f"{api_name} - Login endpoint", False, f"Status: {response.status_code}")
                self.test_results[api_name]["endpoints"]["login"] = False
                
        except Exception as e:
            self.log_test(f"{api_name} - Login endpoint", False, f"Exception: {str(e)}")
            self.test_results[api_name]["endpoints"]["login"] = False
        
        # Test register endpoint
        try:
            timestamp = int(time.time())
            register_data = {
                "email": f"newuser{timestamp}@test.com",
                "password": "testpass123",
                "full_name": "Test User",
                "phone": "+1234567890",
                "country": "US",
                "role": "client",
                "language": "en"
            }
            
            headers = {"Content-Type": "application/json"}
            response = self.session.post(
                f"{base_url}/auth/register",
                json=register_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                if "access_token" in data:
                    self.log_test(f"{api_name} - Register endpoint", True, "Account created, token received")
                    self.test_results[api_name]["endpoints"]["register"] = True
                else:
                    self.log_test(f"{api_name} - Register endpoint", False, "No access_token in response")
                    self.test_results[api_name]["endpoints"]["register"] = False
            else:
                self.log_test(f"{api_name} - Register endpoint", False, f"Status: {response.status_code}")
                self.test_results[api_name]["endpoints"]["register"] = False
                
        except Exception as e:
            self.log_test(f"{api_name} - Register endpoint", False, f"Exception: {str(e)}")
            self.test_results[api_name]["endpoints"]["register"] = False
        
        # Test users/me endpoint
        if f"{api_name}_client" in self.tokens:
            try:
                headers = {"Authorization": f"Bearer {self.tokens[f'{api_name}_client']}"}
                response = self.session.get(
                    f"{base_url}/users/me",
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "email" in data:
                        self.log_test(f"{api_name} - Get current user", True, f"User data: {data.get('email')}")
                        self.test_results[api_name]["endpoints"]["users_me"] = True
                    else:
                        self.log_test(f"{api_name} - Get current user", False, "No user data")
                        self.test_results[api_name]["endpoints"]["users_me"] = False
                else:
                    self.log_test(f"{api_name} - Get current user", False, f"Status: {response.status_code}")
                    self.test_results[api_name]["endpoints"]["users_me"] = False
                    
            except Exception as e:
                self.log_test(f"{api_name} - Get current user", False, f"Exception: {str(e)}")
                self.test_results[api_name]["endpoints"]["users_me"] = False
        else:
            self.log_test(f"{api_name} - Get current user", False, "No token available")
            self.test_results[api_name]["endpoints"]["users_me"] = False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Backend API Integration Tests for Mobile App")
        print(f"Test time: {datetime.now()}")
        print()
        print("APIs to test:")
        print(f"1. External API (from review request): {EXTERNAL_API_URL}")
        print(f"2. Local API: {LOCAL_API_URL}")
        print(f"3. Frontend configured API: {FRONTEND_CONFIGURED_URL}")
        print()
        
        # Test API accessibility first
        self.test_api_accessibility()
        
        # Test authentication endpoints for each accessible API
        if self.test_results["external_api"]["accessible"]:
            self.test_authentication_endpoints(EXTERNAL_API_URL, "external_api")
        
        if self.test_results["local_api"]["accessible"]:
            self.test_authentication_endpoints(LOCAL_API_URL, "local_api")
        
        if self.test_results["frontend_configured_api"]["accessible"]:
            self.test_authentication_endpoints(FRONTEND_CONFIGURED_URL, "frontend_configured_api")
        
        # Legacy tests for the original external API
        self.base_url = EXTERNAL_API_URL
        self.test_login_endpoint()
        self.test_register_endpoint()
        self.test_get_current_user()
        self.test_token_format()
        
        print("=" * 60)
        print("COMPREHENSIVE TEST SUMMARY")
        print("=" * 60)
        print("API Accessibility:")
        for api_name, results in self.test_results.items():
            status = "✅ ACCESSIBLE" if results["accessible"] else "❌ NOT ACCESSIBLE"
            print(f"  {api_name}: {status}")
        
        print("\nAuthentication Endpoints:")
        for api_name, results in self.test_results.items():
            if results["accessible"] and results["endpoints"]:
                print(f"  {api_name}:")
                for endpoint, working in results["endpoints"].items():
                    status = "✅ WORKING" if working else "❌ FAILED"
                    print(f"    {endpoint}: {status}")
        
        print(f"\nTokens obtained: {list(self.tokens.keys())}")
        print("All tests completed!")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()