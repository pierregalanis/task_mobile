#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Mobile App
Testing against: https://service-finder-225.preview.emergentagent.com/api

Test credentials:
- Client: testclient@demo.com / test123
- Tasker: testtasker@demo.com / test123
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Backend URL from frontend .env
BASE_URL = "https://service-finder-225.preview.emergentagent.com/api"

# Test credentials from review request
CLIENT_CREDENTIALS = {
    "username": "client@test.com",
    "password": "test123"
}

TASKER_CREDENTIALS = {
    "username": "tasker@test.com", 
    "password": "test123"
}

class BackendTester:
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.client_user = None
        self.tasker_user = None
        self.test_task_id = None
        self.available_taskers = []
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")
        
    def make_request(self, method, endpoint, data=None, token=None, params=None, form_data=False):
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = {}
        
        if not form_data:
            headers["Content-Type"] = "application/json"
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                if form_data:
                    response = requests.post(url, headers=headers, data=data, timeout=30)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"{method} {endpoint} -> {response.status_code}")
            
            if response.status_code >= 400:
                self.log(f"Error Response: {response.text}", "ERROR")
                
            return response
            
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed for {method} {endpoint}: {str(e)}", "ERROR")
            return None
    
    def test_1_authentication_client_login(self):
        """Test 1: Client Authentication - Login"""
        self.log("=== TEST 1: Client Login ===")
        
        # Try different login endpoints and formats
        login_attempts = [
            ("/auth/login", CLIENT_CREDENTIALS, False),  # JSON format
            ("/auth/login", CLIENT_CREDENTIALS, True),   # Form data format
            ("/token", CLIENT_CREDENTIALS, True),        # OAuth2 token endpoint
            ("/auth/token", CLIENT_CREDENTIALS, True),   # Alternative token endpoint
        ]
        
        for endpoint, credentials, use_form in login_attempts:
            self.log(f"Trying {endpoint} with {'form data' if use_form else 'JSON'}")
            response = self.make_request("POST", endpoint, credentials, form_data=use_form)
            
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    # Check for different token response formats
                    token = data.get("token") or data.get("access_token")
                    user = data.get("user")
                    
                    if token:
                        self.client_token = token
                        self.client_user = user
                        self.log(f"✅ Client login successful via {endpoint}. User: {user.get('full_name', 'Unknown') if user else 'Token only'}")
                        return True, f"Client login successful via {endpoint}"
                except json.JSONDecodeError:
                    continue
        
        return False, "All login attempts failed"
    
    def test_2_authentication_tasker_login(self):
        """Test 2: Tasker Authentication - Login"""
        self.log("=== TEST 2: Tasker Login ===")
        
        # Try different login endpoints and formats
        login_attempts = [
            ("/auth/login", TASKER_CREDENTIALS, False),  # JSON format
            ("/auth/login", TASKER_CREDENTIALS, True),   # Form data format
            ("/token", TASKER_CREDENTIALS, True),        # OAuth2 token endpoint
            ("/auth/token", TASKER_CREDENTIALS, True),   # Alternative token endpoint
        ]
        
        for endpoint, credentials, use_form in login_attempts:
            self.log(f"Trying {endpoint} with {'form data' if use_form else 'JSON'}")
            response = self.make_request("POST", endpoint, credentials, form_data=use_form)
            
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    # Check for different token response formats
                    token = data.get("token") or data.get("access_token")
                    user = data.get("user")
                    
                    if token:
                        self.tasker_token = token
                        self.tasker_user = user
                        self.log(f"✅ Tasker login successful via {endpoint}. User: {user.get('full_name', 'Unknown') if user else 'Token only'}")
                        return True, f"Tasker login successful via {endpoint}"
                except json.JSONDecodeError:
                    continue
        
        return False, "All login attempts failed"
    
    def test_3_auth_me_client(self):
        """Test 3: GET /auth/me (Client)"""
        self.log("=== TEST 3: GET /auth/me (Client) ===")
        
        if not self.client_token:
            return False, "No client token available"
            
        response = self.make_request("GET", "/auth/me", token=self.client_token)
        
        if not response:
            return False, "Request failed - connection error"
            
        if response.status_code == 200:
            try:
                user_data = response.json()
                self.log(f"✅ Client /auth/me successful. User: {user_data.get('full_name', 'Unknown')}")
                return True, "Client /auth/me working"
            except json.JSONDecodeError:
                return False, f"Invalid JSON response: {response.text}"
        else:
            return False, f"/auth/me failed with status {response.status_code}: {response.text}"
    
    def test_4_auth_me_tasker(self):
        """Test 4: GET /auth/me (Tasker)"""
        self.log("=== TEST 4: GET /auth/me (Tasker) ===")
        
        if not self.tasker_token:
            return False, "No tasker token available"
            
        response = self.make_request("GET", "/auth/me", token=self.tasker_token)
        
        if not response:
            return False, "Request failed - connection error"
            
        if response.status_code == 200:
            try:
                user_data = response.json()
                self.log(f"✅ Tasker /auth/me successful. User: {user_data.get('full_name', 'Unknown')}")
                return True, "Tasker /auth/me working"
            except json.JSONDecodeError:
                return False, f"Invalid JSON response: {response.text}"
        else:
            return False, f"/auth/me failed with status {response.status_code}: {response.text}"
    
    def test_5_browse_taskers(self):
        """Test 5: Browse Taskers - GET /taskers/search or equivalent"""
        self.log("=== TEST 5: Browse Taskers ===")
        
        # Try different possible endpoints for getting taskers
        endpoints_to_try = [
            "/taskers/search",
            "/taskers", 
            "/users/taskers",
            "/tasker/search"
        ]
        
        for endpoint in endpoints_to_try:
            self.log(f"Trying endpoint: {endpoint}")
            response = self.make_request("GET", endpoint)
            
            if response and response.status_code == 200:
                try:
                    taskers = response.json()
                    if isinstance(taskers, list) and len(taskers) > 0:
                        self.available_taskers = taskers
                        self.log(f"✅ Found {len(taskers)} taskers via {endpoint}")
                        
                        # Check if taskers have pricing information
                        first_tasker = taskers[0]
                        has_pricing = any(key in first_tasker for key in ['hourly_rate', 'fixed_price', 'pricing', 'tasker_profile'])
                        
                        if has_pricing:
                            self.log("✅ Taskers have pricing information")
                        else:
                            self.log("⚠️ Taskers missing pricing information")
                            
                        return True, f"Taskers endpoint working: {endpoint}"
                    else:
                        self.log(f"Empty or invalid taskers list from {endpoint}")
                except json.JSONDecodeError:
                    self.log(f"Invalid JSON from {endpoint}")
                    
        return False, "No working taskers endpoint found"
    
    def test_6_create_booking_task(self):
        """Test 6: Create Booking/Task - POST /tasks"""
        self.log("=== TEST 6: Create Booking/Task ===")
        
        if not self.client_token:
            return False, "No client token available"
            
        if not self.available_taskers:
            return False, "No available taskers to book"
            
        # Use first available tasker
        tasker = self.available_taskers[0]
        tasker_id = tasker.get('id') or tasker.get('user_id') or tasker.get('_id')
        
        if not tasker_id:
            return False, "Could not find tasker ID in tasker data"
        
        # Create booking data - try different field formats based on API requirements
        booking_attempts = [
            # Original format from review request
            {
                "title": "Test booking",
                "description": "Test description", 
                "category": "cleaning",
                "subcategory": "cleaning",
                "tasker_id": tasker_id,
                "scheduled_date": "2025-12-12T10:00:00Z",
                "duration_hours": 2,
                "address": "123 Test St",
                "city": "Abidjan",
                "latitude": 5.36,
                "longitude": -4.0,
                "pricing_type": "hourly",
                "hourly_rate": 2500,
                "estimated_total": 5000
            },
            # Format based on API error response
            {
                "title": "Test booking",
                "description": "Test description", 
                "category_id": 1,  # Assuming cleaning has ID 1
                "tasker_id": tasker_id,
                "task_date": "2025-12-12T10:00:00Z",
                "duration_hours": 2,
                "address": "123 Test St",
                "city": "Abidjan",
                "latitude": 5.36,
                "longitude": -4.0,
                "pricing_type": "hourly",
                "hourly_rate": 2500,
                "estimated_total": 5000
            },
            # Format based on exact API requirements
            {
                "title": "Test booking",
                "description": "Test description", 
                "category_id": "cleaning",  # String type as per error
                "tasker_id": tasker_id,
                "task_date": "2025-12-12T10:00:00Z",  # Combined date/time
                "duration_hours": 2,  # Required field
                "address": "123 Test St",
                "city": "Abidjan",
                "latitude": 5.36,
                "longitude": -4.0,
                "pricing_type": "hourly",
                "hourly_rate": 2500,
                "estimated_total": 5000
            }
        ]
        
        self.log(f"Creating booking with tasker_id: {tasker_id}")
        
        for i, booking_data in enumerate(booking_attempts):
            self.log(f"Trying booking format {i+1}/3")
            response = self.make_request("POST", "/tasks", booking_data, token=self.client_token)
            
            if response and response.status_code == 201:
                try:
                    task_data = response.json()
                    self.test_task_id = task_data.get('id')
                    self.log(f"✅ Task created successfully with format {i+1}. ID: {self.test_task_id}")
                    return True, f"Task creation successful with format {i+1}"
                except json.JSONDecodeError:
                    continue
            elif response:
                self.log(f"Format {i+1} failed: {response.text}", "ERROR")
        
        return False, "All task creation formats failed - API field requirements don't match"
    
    def test_7_get_client_tasks(self):
        """Test 7: Get Tasks (Client Side) - GET /tasks"""
        self.log("=== TEST 7: Get Client Tasks ===")
        
        if not self.client_token:
            return False, "No client token available"
            
        # Try different possible endpoints
        endpoints_to_try = ["/tasks", "/tasks/client", "/client/tasks"]
        
        for endpoint in endpoints_to_try:
            response = self.make_request("GET", endpoint, token=self.client_token)
            
            if response and response.status_code == 200:
                try:
                    tasks = response.json()
                    if isinstance(tasks, list):
                        self.log(f"✅ Client tasks retrieved via {endpoint}. Count: {len(tasks)}")
                        return True, f"Client tasks endpoint working: {endpoint}"
                except json.JSONDecodeError:
                    continue
                    
        return False, "No working client tasks endpoint found"
    
    def test_8_get_tasker_tasks(self):
        """Test 8: Get Tasks (Tasker Side) - GET /tasks"""
        self.log("=== TEST 8: Get Tasker Tasks ===")
        
        if not self.tasker_token:
            return False, "No tasker token available"
            
        # Try different possible endpoints
        endpoints_to_try = ["/tasks", "/tasks/tasker", "/tasker/tasks"]
        
        for endpoint in endpoints_to_try:
            response = self.make_request("GET", endpoint, token=self.tasker_token)
            
            if response and response.status_code == 200:
                try:
                    tasks = response.json()
                    if isinstance(tasks, list):
                        self.log(f"✅ Tasker tasks retrieved via {endpoint}. Count: {len(tasks)}")
                        
                        # Check for pending tasks
                        pending_tasks = [t for t in tasks if t.get('status') == 'pending']
                        self.log(f"Pending tasks visible: {len(pending_tasks)}")
                        
                        return True, f"Tasker tasks endpoint working: {endpoint}"
                except json.JSONDecodeError:
                    continue
                    
        return False, "No working tasker tasks endpoint found"
    
    def test_9_accept_task(self):
        """Test 9: Accept Task (Tasker) - POST /tasks/{id}/accept"""
        self.log("=== TEST 9: Accept Task ===")
        
        if not self.tasker_token:
            return False, "No tasker token available"
            
        if not self.test_task_id:
            return False, "No test task ID available"
            
        response = self.make_request("POST", f"/tasks/{self.test_task_id}/accept", token=self.tasker_token)
        
        if not response:
            return False, "Request failed - connection error"
            
        if response.status_code == 200:
            try:
                task_data = response.json()
                if task_data.get('status') == 'accepted':
                    self.log("✅ Task accepted successfully")
                    return True, "Task acceptance successful"
                else:
                    return False, f"Task status not updated to accepted: {task_data.get('status')}"
            except json.JSONDecodeError:
                return False, f"Invalid JSON response: {response.text}"
        else:
            return False, f"Task acceptance failed with status {response.status_code}: {response.text}"
    
    def run_all_tests(self):
        """Run all backend tests"""
        self.log("🚀 Starting Comprehensive Backend Testing")
        self.log(f"Testing against: {BASE_URL}")
        
        tests = [
            self.test_1_authentication_client_login,
            self.test_2_authentication_tasker_login, 
            self.test_3_auth_me_client,
            self.test_4_auth_me_tasker,
            self.test_5_browse_taskers,
            self.test_6_create_booking_task,
            self.test_7_get_client_tasks,
            self.test_8_get_tasker_tasks,
            self.test_9_accept_task
        ]
        
        results = []
        
        for test in tests:
            try:
                success, message = test()
                results.append({
                    'test': test.__name__,
                    'success': success,
                    'message': message
                })
                
                if success:
                    self.log(f"✅ {test.__name__}: {message}")
                else:
                    self.log(f"❌ {test.__name__}: {message}", "ERROR")
                    
            except Exception as e:
                self.log(f"❌ {test.__name__}: Exception - {str(e)}", "ERROR")
                results.append({
                    'test': test.__name__,
                    'success': False,
                    'message': f"Exception: {str(e)}"
                })
        
        # Summary
        self.log("\n" + "="*50)
        self.log("📊 TEST SUMMARY")
        self.log("="*50)
        
        passed = sum(1 for r in results if r['success'])
        total = len(results)
        
        self.log(f"Total Tests: {total}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {total - passed}")
        
        self.log("\n📋 DETAILED RESULTS:")
        for result in results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            self.log(f"{status}: {result['test']} - {result['message']}")
        
        if passed == total:
            self.log("\n🎉 ALL TESTS PASSED!")
        else:
            self.log(f"\n⚠️  {total - passed} TESTS FAILED - REQUIRES ATTENTION")
            
        return results

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    failed_count = sum(1 for r in results if not r['success'])
    sys.exit(failed_count)