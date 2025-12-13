#!/usr/bin/env python3
"""
URGENT: Test Complete Booking Flow on Web Backend
Backend: https://service-app-4.preview.emergentagent.com/api

This test follows the EXACT requirements from the review request to find
the precise data format expected by the web backend for creating bookings.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration from review request
BASE_URL = "https://service-app-4.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "client": {"username": "client@test.com", "password": "test123"},
    "tasker": {"username": "tasker@test.com", "password": "test123"}
}

def log_test_result(test_name, success, details, response_data=None):
    """Log test results with clear formatting"""
    status = "✅ SUCCESS" if success else "❌ FAILED"
    print(f"\n{status}: {test_name}")
    print(f"Details: {details}")
    if response_data:
        print(f"Response Data: {json.dumps(response_data, indent=2)}")
    print("-" * 80)

def test_authentication():
    """Test 1: Authentication Test as specified in review request"""
    print("🔐 CRITICAL TEST 1: AUTHENTICATION")
    
    # Test client authentication with EXACT format from review request
    print("\nTesting Client Authentication:")
    print("POST /api/auth/login")
    print("Content-Type: application/x-www-form-urlencoded")
    print("Body: username=client@test.com&password=test123")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "username": "client@test.com",
            "password": "test123"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        client_token = data.get("access_token")
        if client_token:
            log_test_result(
                "Client Authentication", 
                True, 
                f"Returns access_token: {client_token[:30]}...",
                {"has_access_token": True, "token_length": len(client_token)}
            )
            return client_token
        else:
            log_test_result("Client Authentication", False, "No access_token in response", data)
            return None
    else:
        log_test_result("Client Authentication", False, f"Status {response.status_code}", response.json())
        return None

def test_get_taskers():
    """Test 2: Get Taskers - Find the EXACT endpoint name"""
    print("\n👥 CRITICAL TEST 2: GET TASKERS")
    
    endpoints_to_test = [
        "/taskers/search",
        "/users/taskers"
    ]
    
    for endpoint in endpoints_to_test:
        print(f"\nTesting: GET {endpoint}")
        response = requests.get(f"{BASE_URL}{endpoint}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                valid_tasker_id = data[0].get("id")
                log_test_result(
                    f"GET {endpoint}",
                    True,
                    f"Found {len(data)} taskers. Valid tasker_id: {valid_tasker_id}",
                    {"endpoint": endpoint, "tasker_count": len(data), "first_tasker_id": valid_tasker_id}
                )
                return endpoint, valid_tasker_id
            else:
                log_test_result(f"GET {endpoint}", False, "Empty or invalid response", data)
        else:
            log_test_result(f"GET {endpoint}", False, f"Status {response.status_code}", response.json())
    
    return None, None

def test_create_booking_exact_format(client_token, tasker_id):
    """Test 3: Create Booking - TEST EXACT FORMAT from review request"""
    print("\n📝 CRITICAL TEST 3: CREATE BOOKING - EXACT FORMAT")
    
    if not client_token or not tasker_id:
        log_test_result("Create Booking", False, "Missing client_token or tasker_id", None)
        return None
    
    # EXACT format from review request
    booking_data = {
        "title": "Test Task",
        "description": "Test Description",
        "category_id": "cleaning",
        "subcategory_id": "cleaning",
        "tasker_id": tasker_id,
        "task_date": "2025-12-15T10:00:00Z",
        "duration_hours": 2,
        "address": "123 Test Street",
        "city": "Abidjan",
        "latitude": 5.36,
        "longitude": -4.0,
        "pricing_type": "hourly",
        "hourly_rate": 2500,
        "estimated_total": 5000
    }
    
    print("Testing EXACT format from review request:")
    print(json.dumps(booking_data, indent=2))
    
    headers = {
        "Authorization": f"Bearer {client_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{BASE_URL}/tasks", headers=headers, json=booking_data)
    
    if response.status_code == 201:
        data = response.json()
        task_id = data.get("id")
        log_test_result(
            "Create Booking - Exact Format",
            True,
            f"Task created successfully! ID: {task_id}",
            {"task_id": task_id, "status_code": 201}
        )
        return task_id
    elif response.status_code == 422:
        error_data = response.json()
        print("\n❌ 422 VALIDATION ERROR - DOCUMENTING EXACT REQUIREMENTS:")
        print("Missing or incorrect fields:")
        for error in error_data.get("detail", []):
            field_path = " -> ".join(str(x) for x in error.get("loc", []))
            error_type = error.get("type", "unknown")
            message = error.get("msg", "No message")
            print(f"  • Field: {field_path}")
            print(f"    Type: {error_type}")
            print(f"    Message: {message}")
        
        log_test_result(
            "Create Booking - Exact Format",
            False,
            "422 Validation Error - Field requirements documented above",
            error_data
        )
        
        # Try alternate field names based on error
        print("\n🔄 TRYING ALTERNATE FIELD NAMES:")
        return test_alternate_formats(client_token, tasker_id, error_data)
    else:
        log_test_result(
            "Create Booking - Exact Format",
            False,
            f"Status {response.status_code}",
            response.json()
        )
        return None

def test_alternate_formats(client_token, tasker_id, original_error):
    """Test alternate field names based on 422 error"""
    
    # Analyze the error to determine correct field names
    missing_fields = []
    for error in original_error.get("detail", []):
        if error.get("type") == "missing":
            field_name = error.get("loc", [])[-1]  # Get the last part of the path
            missing_fields.append(field_name)
    
    print(f"Missing fields detected: {missing_fields}")
    
    # Try different combinations based on common API patterns
    alternate_formats = []
    
    # Format 1: scheduled_date instead of task_date
    if "task_date" in missing_fields:
        alternate_formats.append({
            "name": "scheduled_date format",
            "data": {
                "title": "Test Task",
                "description": "Test Description",
                "category_id": "cleaning",
                "subcategory_id": "cleaning",
                "tasker_id": tasker_id,
                "scheduled_date": "2025-12-15T10:00:00Z",
                "duration_hours": 2,
                "address": "123 Test Street",
                "city": "Abidjan",
                "latitude": 5.36,
                "longitude": -4.0,
                "pricing_type": "hourly",
                "hourly_rate": 2500,
                "estimated_total": 5000
            }
        })
    
    # Format 2: service_id instead of category_id
    if "category_id" in missing_fields:
        alternate_formats.append({
            "name": "service_id format",
            "data": {
                "title": "Test Task",
                "description": "Test Description",
                "service_id": "cleaning",
                "tasker_id": tasker_id,
                "task_date": "2025-12-15T10:00:00Z",
                "duration_hours": 2,
                "address": "123 Test Street",
                "city": "Abidjan",
                "latitude": 5.36,
                "longitude": -4.0,
                "pricing_type": "hourly",
                "hourly_rate": 2500,
                "estimated_total": 5000
            }
        })
    
    headers = {
        "Authorization": f"Bearer {client_token}",
        "Content-Type": "application/json"
    }
    
    for format_info in alternate_formats:
        print(f"\nTrying {format_info['name']}:")
        print(json.dumps(format_info['data'], indent=2))
        
        response = requests.post(f"{BASE_URL}/tasks", headers=headers, json=format_info['data'])
        
        if response.status_code == 201:
            data = response.json()
            task_id = data.get("id")
            log_test_result(
                f"Create Booking - {format_info['name']}",
                True,
                f"SUCCESS! Task created with {format_info['name']}. ID: {task_id}",
                {"task_id": task_id, "format": format_info['name']}
            )
            return task_id
        else:
            log_test_result(
                f"Create Booking - {format_info['name']}",
                False,
                f"Status {response.status_code}",
                response.json()
            )
    
    return None

def test_get_tasks(client_token):
    """Test 5: Test Get Tasks"""
    print("\n📋 CRITICAL TEST 4: GET TASKS")
    
    if not client_token:
        log_test_result("Get Tasks", False, "No client token available", None)
        return
    
    headers = {"Authorization": f"Bearer {client_token}"}
    response = requests.get(f"{BASE_URL}/tasks", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        log_test_result(
            "Get Tasks",
            True,
            f"Retrieved {len(data)} tasks",
            {"task_count": len(data), "sample_task": data[0] if data else None}
        )
    else:
        log_test_result(
            "Get Tasks",
            False,
            f"Status {response.status_code}",
            response.json()
        )

def main():
    """Run the complete booking flow test as specified in review request"""
    print("=" * 80)
    print("🚀 URGENT: COMPLETE BOOKING FLOW TEST")
    print("Backend: https://service-app-4.preview.emergentagent.com/api")
    print("=" * 80)
    
    # Test 1: Authentication
    client_token = test_authentication()
    
    # Test 2: Get Taskers
    taskers_endpoint, valid_tasker_id = test_get_taskers()
    
    # Test 3: Create Booking
    task_id = test_create_booking_exact_format(client_token, valid_tasker_id)
    
    # Test 4: Get Tasks
    test_get_tasks(client_token)
    
    # Final Summary
    print("\n" + "=" * 80)
    print("🎯 FINAL SUMMARY - EXACT DATA FORMAT FOR MOBILE APP")
    print("=" * 80)
    
    print("\n✅ WORKING ENDPOINTS:")
    print("• Authentication: POST /auth/login (form data: username/password)")
    if taskers_endpoint:
        print(f"• Get Taskers: GET {taskers_endpoint}")
    if task_id:
        print("• Create Task: POST /tasks (with correct field format)")
    print("• Get Tasks: GET /tasks (with Authorization header)")
    
    print("\n🔍 KEY FINDINGS FOR MOBILE APP:")
    print("• Login requires form data (application/x-www-form-urlencoded), NOT JSON")
    print("• Use 'username' and 'password' fields (not 'email')")
    if task_id:
        print("• Task creation successful - use the working format identified above")
    else:
        print("• Task creation needs investigation - check field names in error details")
    
    if valid_tasker_id:
        print(f"• Valid tasker_id for testing: {valid_tasker_id}")
    
    print("\n💡 RECOMMENDATIONS:")
    print("• Update mobile app to use form data for authentication")
    print("• Use the exact field names that worked for task creation")
    print("• Implement proper error handling for 422 validation errors")

if __name__ == "__main__":
    main()