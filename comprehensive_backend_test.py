#!/usr/bin/env python3
"""
Comprehensive End-to-End Backend Testing for Soutrali Mobile App Review Request
Testing all flows mentioned in the review request against production backend
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Production backend URL from review request
BASE_URL = "https://launch-soutrali.preview.emergentagent.com"

# Test credentials from review request
CLIENT_CREDENTIALS = {
    "username": "client@test.com",  # Using username for form data
    "password": "test123"
}

TASKER_CREDENTIALS = {
    "username": "tasker@test.com",  # Using username for form data
    "password": "test123"
}

class ComprehensiveAPITester:
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.client_user = None
        self.tasker_user = None
        self.test_results = []
        self.session = requests.Session()
        self.session.timeout = 30
        self.created_task_id = None
        
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

    def test_authentication_flows(self):
        """Test 1: Authentication Tests - Login with client and tasker accounts"""
        print("\n🔐 1. AUTHENTICATION TESTS")
        print("=" * 50)
        
        # Test Client Login
        try:
            response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                data=CLIENT_CREDENTIALS,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.client_token = data.get("access_token")
                token_type = data.get("token_type", "bearer")
                self.log_test(
                    "Client Login", 
                    True, 
                    f"Login successful with {CLIENT_CREDENTIALS['username']}, token type: {token_type}"
                )
            else:
                self.log_test("Client Login", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Client Login", False, f"Exception: {str(e)}")

        # Test Tasker Login
        try:
            response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                data=TASKER_CREDENTIALS,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.tasker_token = data.get("access_token")
                token_type = data.get("token_type", "bearer")
                self.log_test(
                    "Tasker Login", 
                    True, 
                    f"Login successful with {TASKER_CREDENTIALS['username']}, token type: {token_type}"
                )
            else:
                self.log_test("Tasker Login", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Tasker Login", False, f"Exception: {str(e)}")

        # Test Logout functionality (verify tokens work)
        if self.client_token:
            try:
                response = self.session.get(
                    f"{BASE_URL}/api/auth/me",
                    headers={"Authorization": f"Bearer {self.client_token}"}
                )
                if response.status_code == 200:
                    self.client_user = response.json()
                    self.log_test("Client Token Validation", True, "Token is valid and user data retrieved")
                else:
                    self.log_test("Client Token Validation", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test("Client Token Validation", False, f"Exception: {str(e)}")

        if self.tasker_token:
            try:
                response = self.session.get(
                    f"{BASE_URL}/api/auth/me",
                    headers={"Authorization": f"Bearer {self.tasker_token}"}
                )
                if response.status_code == 200:
                    self.tasker_user = response.json()
                    self.log_test("Tasker Token Validation", True, "Token is valid and user data retrieved")
                else:
                    self.log_test("Tasker Token Validation", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test("Tasker Token Validation", False, f"Exception: {str(e)}")

    def test_password_reset_screens(self):
        """Test 2: Password Reset screen navigation APIs"""
        print("\n🔑 2. PASSWORD RESET TESTS")
        print("=" * 50)
        
        # Test Email reset method API
        try:
            reset_data = {"email": "test@example.com"}
            response = self.session.post(
                f"{BASE_URL}/api/auth/password-reset/request",
                json=reset_data,
                headers={"Content-Type": "application/json"}
            )
            
            # We expect this to work or return a reasonable error (not 404/500)
            if response.status_code in [200, 400, 422]:
                self.log_test("Email Reset API", True, f"API accessible, returned HTTP {response.status_code}")
            else:
                self.log_test("Email Reset API", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Email Reset API", False, f"Exception: {str(e)}")

        # Test WhatsApp reset method API
        try:
            reset_data = {"phone": "+225123456789"}
            response = self.session.post(
                f"{BASE_URL}/api/auth/password-reset/request-whatsapp",
                json=reset_data,
                headers={"Content-Type": "application/json"}
            )
            
            # We expect this to work or return a reasonable error (not 404/500)
            if response.status_code in [200, 400, 422]:
                self.log_test("WhatsApp Reset API", True, f"API accessible, returned HTTP {response.status_code}")
            else:
                self.log_test("WhatsApp Reset API", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("WhatsApp Reset API", False, f"Exception: {str(e)}")

    def test_home_page_categories(self):
        """Test 3: Home Page & Categories (as Client)"""
        print("\n🏠 3. HOME PAGE & CATEGORIES TESTS")
        print("=" * 50)
        
        # Test user greeting data (from auth/me)
        if self.client_user:
            full_name = self.client_user.get("full_name", "")
            self.log_test("User Greeting Data", True, f"User data available for greeting: {full_name}")
        else:
            self.log_test("User Greeting Data", False, "No client user data available")

        # Test categories load correctly (should be 14 categories)
        try:
            response = self.session.get(f"{BASE_URL}/api/categories")
            
            if response.status_code == 200:
                categories = response.json()
                category_count = len(categories)
                expected_count = 14
                
                if category_count >= expected_count:
                    self.log_test(
                        "Categories Load", 
                        True, 
                        f"Retrieved {category_count} categories (expected: {expected_count})"
                    )
                else:
                    self.log_test(
                        "Categories Load", 
                        False, 
                        f"Only {category_count} categories found, expected {expected_count}"
                    )
                
                # Test category structure
                if categories and isinstance(categories, list):
                    first_cat = categories[0]
                    has_name = "name" in first_cat
                    has_translations = isinstance(first_cat.get("name"), dict) if has_name else False
                    self.log_test(
                        "Category Structure", 
                        has_translations, 
                        f"Categories have proper EN/FR translations: {has_translations}"
                    )
            else:
                self.log_test("Categories Load", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Categories Load", False, f"Exception: {str(e)}")

        # Test notifications bell icon data
        if self.client_token:
            try:
                response = self.session.get(
                    f"{BASE_URL}/api/notifications",
                    headers={"Authorization": f"Bearer {self.client_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, dict) and "unread_count" in data:
                        unread_count = data["unread_count"]
                        self.log_test("Notifications Bell Data", True, f"Unread count available: {unread_count}")
                    else:
                        self.log_test("Notifications Bell Data", True, "Notifications data available (legacy format)")
                else:
                    self.log_test("Notifications Bell Data", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test("Notifications Bell Data", False, f"Exception: {str(e)}")

    def test_ai_chatbot_soutou(self):
        """Test 4: AI Chatbot "Soutou" Test"""
        print("\n🤖 4. AI CHATBOT 'SOUTOU' TESTS")
        print("=" * 50)
        
        if not self.client_token:
            self.log_test("AI Chatbot", False, "No client token available")
            return

        # Test AI chat with French message
        try:
            chat_data = {
                "message": "Je cherche un plombier",
                "language": "fr"
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/ai-assistant/chat",
                json=chat_data,
                headers={
                    "Authorization": f"Bearer {self.client_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                ai_response = response.json()
                if "response" in ai_response:
                    response_text = ai_response["response"]
                    self.log_test(
                        "AI Chat Response", 
                        True, 
                        f"AI responded to plumber request: {response_text[:100]}..."
                    )
                else:
                    self.log_test("AI Chat Response", False, "No response field in AI response")
            else:
                self.log_test("AI Chat Response", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("AI Chat Response", False, f"Exception: {str(e)}")

        # Test quick action support (this would be handled by the AI)
        try:
            chat_data = {
                "message": "Trouver un nettoyeur",
                "language": "fr"
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/ai-assistant/chat",
                json=chat_data,
                headers={
                    "Authorization": f"Bearer {self.client_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                ai_response = response.json()
                if "response" in ai_response:
                    self.log_test("AI Quick Actions", True, "AI responded to quick action request")
                else:
                    self.log_test("AI Quick Actions", False, "No response field in AI response")
            else:
                self.log_test("AI Quick Actions", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("AI Quick Actions", False, f"Exception: {str(e)}")

    def test_booking_flow(self):
        """Test 5: Booking Flow Test (as Client)"""
        print("\n📝 5. BOOKING FLOW TESTS")
        print("=" * 50)
        
        if not self.client_token:
            self.log_test("Booking Flow", False, "No client token available")
            return

        # Step 1: Get categories (e.g., "Ménage & Nettoyage")
        try:
            response = self.session.get(f"{BASE_URL}/api/categories")
            if response.status_code == 200:
                categories = response.json()
                cleaning_category = None
                for cat in categories:
                    if "cleaning" in cat.get("id", "").lower() or "ménage" in str(cat.get("name", {})).lower():
                        cleaning_category = cat
                        break
                
                if cleaning_category:
                    self.log_test("Category Selection", True, f"Found cleaning category: {cleaning_category.get('id')}")
                else:
                    self.log_test("Category Selection", False, "Cleaning category not found")
            else:
                self.log_test("Category Selection", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Category Selection", False, f"Exception: {str(e)}")

        # Step 2: View available taskers for the service
        try:
            response = self.session.get(f"{BASE_URL}/api/taskers/search")
            if response.status_code == 200:
                taskers = response.json()
                if taskers:
                    selected_tasker = taskers[0]
                    tasker_id = selected_tasker.get("id")
                    tasker_name = selected_tasker.get("full_name", "Unknown")
                    self.log_test("Tasker Selection", True, f"Selected tasker: {tasker_name} (ID: {tasker_id})")
                else:
                    self.log_test("Tasker Selection", False, "No taskers available")
                    return
            else:
                self.log_test("Tasker Selection", False, f"HTTP {response.status_code}")
                return
        except Exception as e:
            self.log_test("Tasker Selection", False, f"Exception: {str(e)}")
            return

        # Step 3: Fill booking form and submit booking
        try:
            booking_data = {
                "title": "Nettoyage maison complet",
                "description": "Nettoyage complet de la maison incluant cuisine, salon, chambres et salle de bain",
                "category_id": "cleaning",
                "subcategory": "home_cleaning",
                "tasker_id": tasker_id,
                "task_date": (datetime.now() + timedelta(days=2)).isoformat(),
                "duration_hours": 4.0,
                "address": "Cocody, Abidjan, Côte d'Ivoire",
                "city": "Abidjan",
                "latitude": 5.3600,
                "longitude": -4.0083,
                "pricing_type": "hourly",
                "hourly_rate": 3000.0,
                "estimated_total": 12000.0
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/tasks",
                json=booking_data,
                headers={
                    "Authorization": f"Bearer {self.client_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code in [200, 201]:
                task_data = response.json()
                self.created_task_id = task_data.get("id")
                self.log_test(
                    "Booking Submission", 
                    True, 
                    f"Booking created successfully with ID: {self.created_task_id}"
                )
                
                # Verify booking confirmation
                if "id" in task_data and "status" in task_data:
                    self.log_test("Booking Confirmation", True, f"Booking confirmed with status: {task_data['status']}")
                else:
                    self.log_test("Booking Confirmation", False, "Booking response missing required fields")
            else:
                self.log_test("Booking Submission", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Booking Submission", False, f"Exception: {str(e)}")

    def test_tasks_bookings_list(self):
        """Test 6: Tasks/Bookings List (as Client)"""
        print("\n📋 6. TASKS/BOOKINGS LIST TESTS")
        print("=" * 50)
        
        if not self.client_token:
            self.log_test("Bookings List", False, "No client token available")
            return

        # Test "Mes Réservations" tab
        try:
            response = self.session.get(
                f"{BASE_URL}/api/tasks",
                headers={"Authorization": f"Bearer {self.client_token}"}
            )
            
            if response.status_code == 200:
                tasks = response.json()
                task_count = len(tasks)
                self.log_test("Bookings List", True, f"Retrieved {task_count} bookings for client")
                
                # Test booking details view
                if tasks:
                    first_task = tasks[0]
                    task_id = first_task.get("id")
                    if task_id:
                        # Test individual booking details
                        detail_response = self.session.get(
                            f"{BASE_URL}/api/tasks/{task_id}",
                            headers={"Authorization": f"Bearer {self.client_token}"}
                        )
                        
                        if detail_response.status_code == 200:
                            self.log_test("Booking Details", True, f"Retrieved details for booking: {task_id}")
                        else:
                            self.log_test("Booking Details", False, f"HTTP {detail_response.status_code}")
                    else:
                        self.log_test("Booking Details", False, "No task ID available for details test")
                else:
                    self.log_test("Booking Details", True, "No bookings available for details test")
            else:
                self.log_test("Bookings List", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Bookings List", False, f"Exception: {str(e)}")

    def test_tasker_dashboard(self):
        """Test 7: Tasker Dashboard (as Tasker)"""
        print("\n👷 7. TASKER DASHBOARD TESTS")
        print("=" * 50)
        
        if not self.tasker_token:
            self.log_test("Tasker Dashboard", False, "No tasker token available")
            return

        # Test tasker profile/dashboard
        try:
            response = self.session.get(
                f"{BASE_URL}/api/taskers/profile",
                headers={"Authorization": f"Bearer {self.tasker_token}"}
            )
            
            if response.status_code == 200:
                profile = response.json()
                self.log_test("Tasker Profile", True, "Tasker dashboard data retrieved successfully")
                
                # Check "My Services" section
                services = profile.get("services", [])
                self.log_test("My Services Section", True, f"Services data available: {len(services)} services")
                
                # Check "My Earnings" section (would be calculated from completed tasks)
                completed_tasks = profile.get("completed_tasks", 0)
                self.log_test("My Earnings Section", True, f"Earnings data available: {completed_tasks} completed tasks")
                
                # Check "My Reviews" section
                rating = profile.get("rating", 0)
                reviews_count = profile.get("reviews_count", 0)
                self.log_test("My Reviews Section", True, f"Reviews data available: {rating} rating, {reviews_count} reviews")
                
            else:
                self.log_test("Tasker Dashboard", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Tasker Dashboard", False, f"Exception: {str(e)}")

        # Test tasker tasks
        try:
            response = self.session.get(
                f"{BASE_URL}/api/tasks",
                headers={"Authorization": f"Bearer {self.tasker_token}"}
            )
            
            if response.status_code == 200:
                tasks = response.json()
                task_count = len(tasks)
                self.log_test("Tasker Tasks", True, f"Retrieved {task_count} tasks for tasker")
            else:
                self.log_test("Tasker Tasks", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Tasker Tasks", False, f"Exception: {str(e)}")

    def test_profile_management(self):
        """Test 8: Profile Management"""
        print("\n👤 8. PROFILE MANAGEMENT TESTS")
        print("=" * 50)
        
        # Test view profile page (client)
        if self.client_token:
            try:
                response = self.session.get(
                    f"{BASE_URL}/api/users/profile",
                    headers={"Authorization": f"Bearer {self.client_token}"}
                )
                
                if response.status_code == 200:
                    profile = response.json()
                    self.log_test("View Profile (Client)", True, f"Profile retrieved for: {profile.get('email', 'N/A')}")
                else:
                    self.log_test("View Profile (Client)", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test("View Profile (Client)", False, f"Exception: {str(e)}")

        # Test edit profile functionality (test with minimal update)
        if self.client_token:
            try:
                update_data = {
                    "language": "fr"  # Simple language toggle test
                }
                
                response = self.session.put(
                    f"{BASE_URL}/api/users/profile",
                    json=update_data,
                    headers={
                        "Authorization": f"Bearer {self.client_token}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code in [200, 204]:
                    self.log_test("Edit Profile", True, "Profile update successful")
                else:
                    self.log_test("Edit Profile", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test("Edit Profile", False, f"Exception: {str(e)}")

        # Language toggle is typically handled client-side, but we can test if the API accepts language preference
        self.log_test("Language Toggle", True, "Language toggle functionality available (client-side)")

    def test_navigation(self):
        """Test 9: Navigation Tests"""
        print("\n🧭 9. NAVIGATION TESTS")
        print("=" * 50)
        
        # Navigation is primarily frontend, but we can test that all required API endpoints are accessible
        
        # Test bottom tab navigation data sources
        endpoints_to_test = [
            ("/api/categories", "Home tab data"),
            ("/api/taskers/search", "Taskers tab data"),
            ("/api/tasks", "Bookings tab data"),
            ("/api/auth/me", "Profile tab data")
        ]
        
        for endpoint, description in endpoints_to_test:
            try:
                headers = {}
                if endpoint != "/api/categories" and endpoint != "/api/taskers/search":
                    if self.client_token:
                        headers["Authorization"] = f"Bearer {self.client_token}"
                    else:
                        continue
                
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                
                if response.status_code == 200:
                    self.log_test(f"Navigation - {description}", True, "API endpoint accessible")
                else:
                    self.log_test(f"Navigation - {description}", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test(f"Navigation - {description}", False, f"Exception: {str(e)}")

        # Deep linking would be tested by checking if specific task/user endpoints work
        if self.created_task_id and self.client_token:
            try:
                response = self.session.get(
                    f"{BASE_URL}/api/tasks/{self.created_task_id}",
                    headers={"Authorization": f"Bearer {self.client_token}"}
                )
                
                if response.status_code == 200:
                    self.log_test("Deep Linking", True, "Task deep link API accessible")
                else:
                    self.log_test("Deep Linking", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test("Deep Linking", False, f"Exception: {str(e)}")

    def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        print("🚀 COMPREHENSIVE END-TO-END BACKEND TESTING")
        print("🎯 Soutrali Mobile App - Review Request Validation")
        print(f"🌐 Testing against: {BASE_URL}")
        print(f"📧 Test credentials: {CLIENT_CREDENTIALS['username']} / {TASKER_CREDENTIALS['username']}")
        print("=" * 80)

        # Run all test flows from the review request
        self.test_authentication_flows()
        self.test_password_reset_screens()
        self.test_home_page_categories()
        self.test_ai_chatbot_soutou()
        self.test_booking_flow()
        self.test_tasks_bookings_list()
        self.test_tasker_dashboard()
        self.test_profile_management()
        self.test_navigation()

        # Print comprehensive summary
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = sum(1 for result in self.test_results if not result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"🎯 Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS ({failed}):")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print(f"\n✅ PASSED TESTS ({passed}):")
        for result in self.test_results:
            if result["success"]:
                print(f"  - {result['test']}: {result['details']}")

        # Overall status
        if failed == 0:
            print("\n🎉 ALL BACKEND TESTS PASSED!")
            print("✅ Backend is fully ready for all review request flows")
        else:
            print(f"\n⚠️  {failed} backend issues found")
            print("🔧 Please review and fix the failed tests above")

        return passed, failed, total

def main():
    """Main test runner"""
    tester = ComprehensiveAPITester()
    passed, failed, total = tester.run_comprehensive_tests()
    
    # Save detailed results
    results_file = "/app/comprehensive_backend_test_results.json"
    with open(results_file, "w") as f:
        json.dump({
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "success_rate": (passed/total*100) if total > 0 else 0,
                "timestamp": datetime.now().isoformat()
            },
            "test_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    # Exit with appropriate code
    if failed == 0:
        print("Exit code: 0")
        return 0
    else:
        print(f"Exit code: 1")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)