#!/usr/bin/env python3
"""
Backend API Testing for Soutrali Mobile App
Testing PRODUCTION backend at https://gethands.preview.emergentagent.com
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Production backend URL from review request
BASE_URL = "https://gethands.preview.emergentagent.com"

# Test credentials from review request
CLIENT_CREDENTIALS = {
    "email": "client@test.com",
    "password": "test123"
}

TASKER_CREDENTIALS = {
    "email": "tasker@test.com", 
    "password": "test123"
}

class APITester:
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.test_results = []
        self.session = requests.Session()
        self.session.timeout = 30
        
    def log_test(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })
    
    def test_authentication_form_data(self, credentials: Dict[str, str], user_type: str) -> Optional[str]:
        """Test authentication with form data (application/x-www-form-urlencoded)"""
        try:
            # Use form data as specified in review request
            form_data = {
                "username": credentials["email"],  # Note: username field, not email
                "password": credentials["password"]
            }
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                data=form_data,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                # Check for access_token (not token) as specified in review request
                if "access_token" in data and "token_type" in data:
                    token = data["access_token"]
                    self.log_test(
                        f"Authentication ({user_type})",
                        True,
                        f"Login successful, token received. Token type: {data.get('token_type')}",
                        {"status_code": response.status_code, "has_token": True}
                    )
                    return token
                else:
                    self.log_test(
                        f"Authentication ({user_type})",
                        False,
                        f"Login response missing access_token or token_type. Response: {data}",
                        {"status_code": response.status_code, "response": data}
                    )
                    return None
            else:
                self.log_test(
                    f"Authentication ({user_type})",
                    False,
                    f"Login failed with status {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "error": response.text}
                )
                return None
                
        except Exception as e:
            self.log_test(
                f"Authentication ({user_type})",
                False,
                f"Authentication error: {str(e)}",
                {"error": str(e)}
            )
            return None
    
    def test_get_current_user(self, token: str, user_type: str):
        """Test GET /api/auth/me endpoint"""
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.get(f"{BASE_URL}/api/auth/me", headers=headers)
            
            if response.status_code == 200:
                user_data = response.json()
                required_fields = ["id", "email", "full_name", "role"]
                
                if all(field in user_data for field in required_fields):
                    self.log_test(
                        f"Get Current User ({user_type})",
                        True,
                        f"User data retrieved successfully. Role: {user_data.get('role')}, Email: {user_data.get('email')}",
                        {"status_code": response.status_code, "user_role": user_data.get('role')}
                    )
                else:
                    missing_fields = [f for f in required_fields if f not in user_data]
                    self.log_test(
                        f"Get Current User ({user_type})",
                        False,
                        f"Missing required fields: {missing_fields}. Response: {user_data}",
                        {"status_code": response.status_code, "missing_fields": missing_fields}
                    )
            else:
                self.log_test(
                    f"Get Current User ({user_type})",
                    False,
                    f"Failed with status {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "error": response.text}
                )
                
        except Exception as e:
            self.log_test(
                f"Get Current User ({user_type})",
                False,
                f"Error: {str(e)}",
                {"error": str(e)}
            )
    
    def test_get_categories(self):
        """Test GET /api/categories endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/api/categories")
            
            if response.status_code == 200:
                categories = response.json()
                
                if isinstance(categories, list) and len(categories) > 0:
                    # Check if categories have required structure
                    sample_category = categories[0]
                    required_fields = ["id", "name_en", "name_fr", "icon"]
                    
                    # Check for subcategories
                    has_subcategories = "subcategories" in sample_category
                    
                    self.log_test(
                        "Get Categories",
                        True,
                        f"Retrieved {len(categories)} categories. Has subcategories: {has_subcategories}",
                        {"status_code": response.status_code, "count": len(categories), "sample": sample_category}
                    )
                else:
                    self.log_test(
                        "Get Categories",
                        False,
                        f"Invalid categories response: {categories}",
                        {"status_code": response.status_code, "response": categories}
                    )
            else:
                self.log_test(
                    "Get Categories",
                    False,
                    f"Failed with status {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "error": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Get Categories",
                False,
                f"Error: {str(e)}",
                {"error": str(e)}
            )
    
    def test_get_taskers_search(self):
        """Test GET /api/taskers/search endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/api/taskers/search")
            
            if response.status_code == 200:
                taskers = response.json()
                
                if isinstance(taskers, list):
                    if len(taskers) > 0:
                        sample_tasker = taskers[0]
                        has_tasker_profile = "tasker_profile" in sample_tasker
                        
                        self.log_test(
                            "Get Taskers Search",
                            True,
                            f"Retrieved {len(taskers)} taskers. Has tasker_profile: {has_tasker_profile}",
                            {"status_code": response.status_code, "count": len(taskers), "sample": sample_tasker}
                        )
                        
                        # Return a tasker ID for task creation test
                        return sample_tasker.get("id")
                    else:
                        self.log_test(
                            "Get Taskers Search",
                            True,
                            "No taskers found (empty array)",
                            {"status_code": response.status_code, "count": 0}
                        )
                        return None
                else:
                    self.log_test(
                        "Get Taskers Search",
                        False,
                        f"Invalid taskers response format: {type(taskers)}",
                        {"status_code": response.status_code, "response_type": type(taskers)}
                    )
                    return None
            else:
                self.log_test(
                    "Get Taskers Search",
                    False,
                    f"Failed with status {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "error": response.text}
                )
                return None
                
        except Exception as e:
            self.log_test(
                "Get Taskers Search",
                False,
                f"Error: {str(e)}",
                {"error": str(e)}
            )
            return None
    
    def test_get_tasks(self, token: str, user_type: str):
        """Test GET /api/tasks endpoint"""
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.get(f"{BASE_URL}/api/tasks", headers=headers)
            
            if response.status_code == 200:
                tasks = response.json()
                
                if isinstance(tasks, list):
                    self.log_test(
                        f"Get Tasks ({user_type})",
                        True,
                        f"Retrieved {len(tasks)} tasks for {user_type}",
                        {"status_code": response.status_code, "count": len(tasks)}
                    )
                else:
                    self.log_test(
                        f"Get Tasks ({user_type})",
                        False,
                        f"Invalid tasks response format: {type(tasks)}",
                        {"status_code": response.status_code, "response_type": type(tasks)}
                    )
            else:
                self.log_test(
                    f"Get Tasks ({user_type})",
                    False,
                    f"Failed with status {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "error": response.text}
                )
                
        except Exception as e:
            self.log_test(
                f"Get Tasks ({user_type})",
                False,
                f"Error: {str(e)}",
                {"error": str(e)}
            )
    
    def test_create_task(self, token: str, tasker_id: str):
        """Test POST /api/tasks with exact format from review request"""
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Use EXACT format from review request
            task_data = {
                "title": "Test Task",
                "description": "Test",
                "category_id": "2a98920a-3536-4139-8f50-65c87574fae3",
                "duration_hours": 2,
                "hourly_rate": 5000,
                "task_date": "2025-12-20T10:00:00",
                "address": "123 Test St",
                "city": "Abidjan",
                "latitude": 5.36,
                "longitude": -4.0,
                "tasker_id": tasker_id
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/tasks",
                headers=headers,
                json=task_data
            )
            
            if response.status_code in [200, 201]:
                created_task = response.json()
                
                if "id" in created_task:
                    self.log_test(
                        "Create Task",
                        True,
                        f"Task created successfully with ID: {created_task.get('id')}",
                        {"status_code": response.status_code, "task_id": created_task.get('id')}
                    )
                    return created_task.get('id')
                else:
                    self.log_test(
                        "Create Task",
                        False,
                        f"Task creation response missing ID: {created_task}",
                        {"status_code": response.status_code, "response": created_task}
                    )
                    return None
            else:
                self.log_test(
                    "Create Task",
                    False,
                    f"Failed with status {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "error": response.text}
                )
                return None
                
        except Exception as e:
            self.log_test(
                "Create Task",
                False,
                f"Error: {str(e)}",
                {"error": str(e)}
            )
            return None
    
    def test_get_notifications(self, token: str, user_type: str):
        """Test GET /api/notifications endpoint"""
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.get(f"{BASE_URL}/api/notifications", headers=headers)
            
            if response.status_code == 200:
                notifications_data = response.json()
                
                # Check for expected format: { notifications: [], unread_count: int }
                if isinstance(notifications_data, dict):
                    if "notifications" in notifications_data and "unread_count" in notifications_data:
                        notifications = notifications_data["notifications"]
                        unread_count = notifications_data["unread_count"]
                        
                        self.log_test(
                            f"Get Notifications ({user_type})",
                            True,
                            f"Retrieved notifications in correct format. Count: {len(notifications)}, Unread: {unread_count}",
                            {"status_code": response.status_code, "count": len(notifications), "unread": unread_count}
                        )
                    else:
                        self.log_test(
                            f"Get Notifications ({user_type})",
                            False,
                            f"Notifications response missing required fields. Response: {notifications_data}",
                            {"status_code": response.status_code, "response": notifications_data}
                        )
                elif isinstance(notifications_data, list):
                    # If it's just an array, that's also acceptable
                    self.log_test(
                        f"Get Notifications ({user_type})",
                        True,
                        f"Retrieved {len(notifications_data)} notifications (array format)",
                        {"status_code": response.status_code, "count": len(notifications_data)}
                    )
                else:
                    self.log_test(
                        f"Get Notifications ({user_type})",
                        False,
                        f"Invalid notifications response format: {type(notifications_data)}",
                        {"status_code": response.status_code, "response_type": type(notifications_data)}
                    )
            else:
                self.log_test(
                    f"Get Notifications ({user_type})",
                    False,
                    f"Failed with status {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "error": response.text}
                )
                
        except Exception as e:
            self.log_test(
                f"Get Notifications ({user_type})",
                False,
                f"Error: {str(e)}",
                {"error": str(e)}
            )
    
    def run_comprehensive_test(self):
        """Run all API tests in sequence"""
        print(f"🎯 TESTING PRODUCTION BACKEND: {BASE_URL}")
        print(f"📅 Test started at: {datetime.now().isoformat()}")
        print("=" * 80)
        
        # 1. Test Client Authentication
        print("\n1️⃣ TESTING CLIENT AUTHENTICATION")
        self.client_token = self.test_authentication_form_data(CLIENT_CREDENTIALS, "Client")
        
        # 2. Test Tasker Authentication  
        print("\n2️⃣ TESTING TASKER AUTHENTICATION")
        self.tasker_token = self.test_authentication_form_data(TASKER_CREDENTIALS, "Tasker")
        
        # 3. Test Get Current User (both client and tasker)
        print("\n3️⃣ TESTING GET CURRENT USER")
        if self.client_token:
            self.test_get_current_user(self.client_token, "Client")
        if self.tasker_token:
            self.test_get_current_user(self.tasker_token, "Tasker")
        
        # 4. Test Categories (public endpoint)
        print("\n4️⃣ TESTING GET CATEGORIES")
        self.test_get_categories()
        
        # 5. Test Taskers Search (public endpoint)
        print("\n5️⃣ TESTING GET TASKERS SEARCH")
        available_tasker_id = self.test_get_taskers_search()
        
        # 6. Test Get Tasks
        print("\n6️⃣ TESTING GET TASKS")
        if self.client_token:
            self.test_get_tasks(self.client_token, "Client")
        if self.tasker_token:
            self.test_get_tasks(self.tasker_token, "Tasker")
        
        # 7. Test Create Task (if we have client token and tasker ID)
        print("\n7️⃣ TESTING CREATE TASK")
        if self.client_token and available_tasker_id:
            created_task_id = self.test_create_task(self.client_token, available_tasker_id)
        elif not self.client_token:
            self.log_test("Create Task", False, "Cannot test - no client token", {})
        elif not available_tasker_id:
            self.log_test("Create Task", False, "Cannot test - no available tasker ID", {})
        
        # 8. Test Notifications
        print("\n8️⃣ TESTING GET NOTIFICATIONS")
        if self.client_token:
            self.test_get_notifications(self.client_token, "Client")
        if self.tasker_token:
            self.test_get_notifications(self.tasker_token, "Tasker")
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\n🚨 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['details']}")
        
        print(f"\n🎯 PRODUCTION BACKEND STATUS: {'✅ OPERATIONAL' if passed_tests >= total_tests * 0.8 else '❌ ISSUES DETECTED'}")
        
        # Save detailed results to file
        with open('/app/production_api_test_results.json', 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "passed": passed_tests,
                    "failed": failed_tests,
                    "success_rate": passed_tests/total_tests*100,
                    "backend_url": BASE_URL,
                    "test_timestamp": datetime.now().isoformat()
                },
                "detailed_results": self.test_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: /app/production_api_test_results.json")

def main():
    """Main test execution"""
    tester = APITester()
    tester.run_comprehensive_test()
    
    # Return exit code based on results
    failed_tests = sum(1 for result in tester.test_results if not result["success"])
    return 1 if failed_tests > 0 else 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)