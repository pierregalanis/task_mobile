#!/usr/bin/env python3
"""
Soutrali Local Backend API Testing - Booking Flow End-to-End
Testing the complete booking flow as specified in the review request
Backend URL: http://localhost:8001
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Test Configuration - As specified in review request
BACKEND_URL = "http://localhost:8001"
API_BASE = f"{BACKEND_URL}/api"

# Test Credentials from review request
CLIENT_CREDENTIALS = {
    "email": "client@test.com",
    "password": "test123"
}

TASKER_CREDENTIALS = {
    "email": "nettoyage@test.com", 
    "password": "test123"
}

class LocalBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.client_token = None
        self.tasker_token = None
        self.tasker_id = None
        self.task_id = None
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        print()
        
    def test_1_client_authentication(self):
        """Test 1: POST /api/auth/login with client credentials"""
        print("🔐 Testing Client Authentication...")
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=CLIENT_CREDENTIALS,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.client_token = data["token"]
                    user = data["user"]
                    self.log_test(
                        "Client Login", 
                        True, 
                        f"Token received, User: {user.get('full_name', 'N/A')} ({user.get('email', 'N/A')})"
                    )
                    return True
                else:
                    self.log_test("Client Login", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_test("Client Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Client Login", False, f"Exception: {str(e)}")
            return False
    
    def test_2_user_info_with_token(self):
        """Test 2: GET /api/users/me with token"""
        print("👤 Testing User Info Retrieval...")
        
        if not self.client_token:
            self.log_test("Get User Info", False, "No client token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{API_BASE}/users/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                self.log_test(
                    "Get User Info", 
                    True, 
                    f"User: {user_data.get('full_name', 'N/A')}, Role: {user_data.get('role', 'N/A')}"
                )
                return True
            else:
                self.log_test("Get User Info", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get User Info", False, f"Exception: {str(e)}")
            return False
    
    def test_3_get_categories(self):
        """Test 3: GET /api/categories"""
        print("📋 Testing Categories Retrieval...")
        
        try:
            response = self.session.get(f"{API_BASE}/categories", timeout=10)
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    category_names = [cat.get('name', {}).get('en', 'Unknown') for cat in categories]
                    self.log_test(
                        "Get Categories", 
                        True, 
                        f"Found {len(categories)} categories: {', '.join(category_names[:3])}..."
                    )
                    return True
                else:
                    self.log_test("Get Categories", False, "Empty or invalid categories list")
                    return False
            else:
                self.log_test("Get Categories", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Categories", False, f"Exception: {str(e)}")
            return False
    
    def test_4_get_taskers(self):
        """Test 4: GET /api/users/taskers"""
        print("👷 Testing Taskers Retrieval...")
        
        try:
            response = self.session.get(f"{API_BASE}/users/taskers", timeout=10)
            
            if response.status_code == 200:
                taskers = response.json()
                if isinstance(taskers, list) and len(taskers) > 0:
                    # Look for Aminata Diallo or any cleaning tasker
                    cleaning_taskers = []
                    for tasker in taskers:
                        if tasker.get('email') == 'nettoyage@test.com':
                            self.tasker_id = tasker.get('id')
                            cleaning_taskers.append(f"Aminata Diallo (ID: {self.tasker_id})")
                        elif 'cleaning' in str(tasker.get('tasker_profile', {})).lower():
                            cleaning_taskers.append(tasker.get('full_name', 'Unknown'))
                    
                    # If we didn't find the specific tasker, use the first available one
                    if not self.tasker_id and taskers:
                        self.tasker_id = taskers[0].get('id')
                        
                    self.log_test(
                        "Get Taskers", 
                        True, 
                        f"Found {len(taskers)} taskers. Selected tasker ID: {self.tasker_id}"
                    )
                    return True
                else:
                    self.log_test("Get Taskers", False, "No taskers found")
                    return False
            else:
                self.log_test("Get Taskers", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Taskers", False, f"Exception: {str(e)}")
            return False
    
    def test_5_create_booking(self):
        """Test 5: POST /api/tasks - Create booking with exact format from review request"""
        print("📝 Testing Task Creation (Booking)...")
        
        if not self.client_token:
            self.log_test("Create Booking", False, "No client token available")
            return False
            
        if not self.tasker_id:
            self.log_test("Create Booking", False, "No tasker ID available")
            return False
        
        try:
            # Use exact format from review request
            booking_data = {
                "title": "Test Nettoyage",
                "description": "Test booking",
                "category": "cleaning",
                "subcategory": "home_cleaning",
                "tasker_id": self.tasker_id,
                "scheduled_date": "2025-12-20T10:00:00Z",
                "duration_hours": 2,
                "address": "Test Address",
                "city": "Abidjan",
                "latitude": 5.36,
                "longitude": -4.0,
                "pricing_type": "hourly",
                "hourly_rate": 3000,
                "estimated_total": 6000
            }
            
            headers = {
                "Authorization": f"Bearer {self.client_token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.post(
                f"{API_BASE}/tasks",
                json=booking_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 201:
                task_data = response.json()
                self.task_id = task_data.get('id')
                self.log_test(
                    "Create Booking", 
                    True, 
                    f"Task created successfully. ID: {self.task_id}, Status: {task_data.get('status', 'N/A')}"
                )
                return True
            else:
                self.log_test("Create Booking", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Booking", False, f"Exception: {str(e)}")
            return False
    
    def test_6_get_client_tasks(self):
        """Test 6: GET /api/tasks/client - Get client's bookings"""
        print("📋 Testing Client Tasks Retrieval...")
        
        if not self.client_token:
            self.log_test("Get Client Tasks", False, "No client token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{API_BASE}/tasks/client", headers=headers, timeout=10)
            
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    # Check if our created task is in the list
                    created_task_found = False
                    if self.task_id:
                        for task in tasks:
                            if task.get('id') == self.task_id:
                                created_task_found = True
                                break
                    
                    self.log_test(
                        "Get Client Tasks", 
                        True, 
                        f"Found {len(tasks)} tasks. Created task in list: {created_task_found}"
                    )
                    return True
                else:
                    self.log_test("Get Client Tasks", False, "Invalid response format")
                    return False
            else:
                self.log_test("Get Client Tasks", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Client Tasks", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all booking flow tests"""
        print("🚀 Starting Soutrali Local Backend Booking Flow Tests")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 60)
        print()
        
        tests = [
            self.test_1_client_authentication,
            self.test_2_user_info_with_token,
            self.test_3_get_categories,
            self.test_4_get_taskers,
            self.test_5_create_booking,
            self.test_6_get_client_tasks
        ]
        
        passed = 0
        total = len(tests)
        failed_tests = []
        
        for test in tests:
            if test():
                passed += 1
            else:
                failed_tests.append(test.__name__)
        
        print("=" * 60)
        print(f"📊 TEST RESULTS: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Booking flow is working correctly!")
            return True, []
        else:
            print(f"⚠️  {total - passed} tests failed - Issues found in booking flow")
            print(f"Failed tests: {', '.join(failed_tests)}")
            return False, failed_tests

def main():
    """Main test execution"""
    tester = LocalBackendTester()
    success, failed_tests = tester.run_all_tests()
    
    if success:
        print("\n✅ Local backend booking flow is fully functional")
        return True
    else:
        print(f"\n❌ Local backend booking flow has issues: {failed_tests}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)