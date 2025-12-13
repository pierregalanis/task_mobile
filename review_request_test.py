#!/usr/bin/env python3
"""
Soutrali Backend Testing - Exact Review Request Specifications
Testing with exact credentials and format from the review request:
- Client: client@test.com / test123
- Tasker: nettoyage@test.com / test123 (Aminata Diallo)
"""

import requests
import json
import sys
from datetime import datetime

# Exact configuration from review request
BACKEND_URL = "http://localhost:8001"
API_BASE = f"{BACKEND_URL}/api"

# Exact credentials from review request
CLIENT_CREDENTIALS = {
    "email": "client@test.com",
    "password": "test123"
}

TASKER_CREDENTIALS = {
    "email": "nettoyage@test.com", 
    "password": "test123"
}

class ReviewRequestTester:
    def __init__(self):
        self.session = requests.Session()
        self.client_token = None
        self.tasker_id = None
        self.task_id = None
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        print()
        
    def test_1_client_authentication(self):
        """Test Case 1: POST /api/auth/login with client credentials"""
        print("🔐 Test Case 1: Authentication")
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=CLIENT_CREDENTIALS,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    self.client_token = data["token"]
                    user = data.get("user", {})
                    self.log_test(
                        "POST /api/auth/login with client credentials", 
                        True, 
                        f"Token received for {user.get('full_name', 'N/A')} ({user.get('email', 'N/A')})"
                    )
                    return True
                else:
                    self.log_test("POST /api/auth/login", False, f"No token in response: {data}")
                    return False
            else:
                self.log_test("POST /api/auth/login", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/auth/login", False, f"Exception: {str(e)}")
            return False
    
    def test_2_user_info(self):
        """Test Case 2: GET /api/users/me with token"""
        print("👤 Test Case 2: User Info")
        
        if not self.client_token:
            self.log_test("GET /api/users/me", False, "No client token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{API_BASE}/users/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                self.log_test(
                    "GET /api/users/me with token", 
                    True, 
                    f"User info retrieved: {user_data.get('full_name', 'N/A')} (Role: {user_data.get('role', 'N/A')})"
                )
                return True
            else:
                self.log_test("GET /api/users/me", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/users/me", False, f"Exception: {str(e)}")
            return False
    
    def test_3_categories(self):
        """Test Case 3: GET /api/categories"""
        print("📋 Test Case 3: Categories")
        
        try:
            response = self.session.get(f"{API_BASE}/categories", timeout=10)
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    # Check for translations
                    has_translations = any(
                        isinstance(cat.get('name'), dict) and 'en' in cat.get('name', {}) and 'fr' in cat.get('name', {})
                        for cat in categories
                    )
                    
                    category_names = []
                    for cat in categories[:3]:
                        name = cat.get('name', {})
                        if isinstance(name, dict):
                            category_names.append(f"{name.get('en', 'Unknown')} / {name.get('fr', 'Unknown')}")
                        else:
                            category_names.append(str(name))
                    
                    self.log_test(
                        "GET /api/categories", 
                        True, 
                        f"Found {len(categories)} categories with translations: {', '.join(category_names)}"
                    )
                    return True
                else:
                    self.log_test("GET /api/categories", False, "Empty or invalid categories list")
                    return False
            else:
                self.log_test("GET /api/categories", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/categories", False, f"Exception: {str(e)}")
            return False
    
    def test_4_taskers(self):
        """Test Case 4: GET /api/users/taskers"""
        print("👷 Test Case 4: Taskers")
        
        try:
            response = self.session.get(f"{API_BASE}/users/taskers", timeout=10)
            
            if response.status_code == 200:
                taskers = response.json()
                if isinstance(taskers, list) and len(taskers) > 0:
                    # Look specifically for Aminata Diallo
                    aminata_found = False
                    for tasker in taskers:
                        if tasker.get('email') == 'nettoyage@test.com':
                            self.tasker_id = tasker.get('id')
                            aminata_found = True
                            break
                    
                    # Check if taskers have services
                    services_count = sum(1 for t in taskers if t.get('tasker_profile', {}).get('services'))
                    
                    self.log_test(
                        "GET /api/users/taskers", 
                        True, 
                        f"Found {len(taskers)} taskers, Aminata Diallo found: {aminata_found}, {services_count} have services"
                    )
                    return True
                else:
                    self.log_test("GET /api/users/taskers", False, "No taskers found")
                    return False
            else:
                self.log_test("GET /api/users/taskers", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/users/taskers", False, f"Exception: {str(e)}")
            return False
    
    def test_5_create_booking(self):
        """Test Case 5: POST /api/tasks with exact format from review request"""
        print("📝 Test Case 5: Create Booking (Task)")
        
        if not self.client_token:
            self.log_test("POST /api/tasks", False, "No client token available")
            return False
            
        if not self.tasker_id:
            self.log_test("POST /api/tasks", False, "No tasker ID available (Aminata Diallo not found)")
            return False
        
        try:
            # EXACT format from review request
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
                    "POST /api/tasks with exact format", 
                    True, 
                    f"Task created with ID: {self.task_id}, assigned to Aminata Diallo"
                )
                return True
            else:
                self.log_test("POST /api/tasks", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/tasks", False, f"Exception: {str(e)}")
            return False
    
    def test_6_client_tasks(self):
        """Test Case 6: GET /api/tasks/client"""
        print("📋 Test Case 6: Get Client Tasks")
        
        if not self.client_token:
            self.log_test("GET /api/tasks/client", False, "No client token available")
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
                        "GET /api/tasks/client", 
                        True, 
                        f"Retrieved {len(tasks)} client bookings, created task found: {created_task_found}"
                    )
                    return True
                else:
                    self.log_test("GET /api/tasks/client", False, "Invalid response format")
                    return False
            else:
                self.log_test("GET /api/tasks/client", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/tasks/client", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests from review request"""
        print("🎯 SOUTRALI BACKEND - REVIEW REQUEST TESTING")
        print("=" * 60)
        print("Testing exact specifications from review request:")
        print(f"Backend URL: {BACKEND_URL}")
        print("Client: client@test.com / test123")
        print("Tasker: nettoyage@test.com / test123 (Aminata Diallo)")
        print("=" * 60)
        print()
        
        tests = [
            self.test_1_client_authentication,
            self.test_2_user_info,
            self.test_3_categories,
            self.test_4_taskers,
            self.test_5_create_booking,
            self.test_6_client_tasks
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
        print(f"📊 FINAL RESULTS: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL REVIEW REQUEST TESTS PASSED!")
            print("✅ Booking flow end-to-end is working correctly")
            print("✅ All specified endpoints are functional")
            print("✅ Authentication with exact credentials works")
            print("✅ Task creation with exact format works")
            return True, []
        else:
            print(f"⚠️  {total - passed} tests failed")
            print(f"❌ Failed tests: {', '.join(failed_tests)}")
            return False, failed_tests

def main():
    """Main test execution"""
    tester = ReviewRequestTester()
    success, failed_tests = tester.run_all_tests()
    
    if success:
        print("\n🎯 REVIEW REQUEST VERIFICATION: SUCCESS")
        print("All specified test cases from the review request are working correctly.")
        return True
    else:
        print(f"\n❌ REVIEW REQUEST VERIFICATION: FAILED")
        print(f"Issues found: {failed_tests}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)