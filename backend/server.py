from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security configurations
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Soutrali API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserRole(str):
    CLIENT = "client"
    TASKER = "tasker"

class TaskerProfile(BaseModel):
    services: Optional[List[dict]] = []
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    availability: Optional[dict] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    country: str
    city: Optional[str] = "Abidjan"
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    role: Literal["client", "tasker"] = "client"
    language: Optional[str] = "en"
    tasker_profile: Optional[TaskerProfile] = None
    is_available: Optional[bool] = True
    rating: Optional[float] = None
    reviews_count: Optional[int] = 0
    completed_tasks: Optional[int] = 0

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_photo: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    token: str
    user: User

class TokenData(BaseModel):
    user_id: Optional[str] = None

# ==================== TASK MODELS ====================

class TaskStatus(str):
    PENDING = "pending"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskCreate(BaseModel):
    title: str
    description: str
    category: str
    subcategory: Optional[str] = None
    tasker_id: str
    scheduled_date: datetime
    duration_hours: Optional[float] = None
    address: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    special_instructions: Optional[str] = None
    pricing_type: Literal["hourly", "fixed"]
    hourly_rate: Optional[float] = None
    fixed_price: Optional[float] = None
    estimated_total: float

class Task(TaskCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    status: str = "pending"
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    en_route_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    location_updated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

class TaskStatusUpdate(BaseModel):
    status: Literal["in_progress", "completed", "cancelled"]
    cancellation_reason: Optional[str] = None

# ==================== REVIEW MODELS ====================

class ReviewCreate(BaseModel):
    task_id: str
    tasker_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class Review(ReviewCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_name: str
    service_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== FAVORITE MODELS ====================

class Favorite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    tasker_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== CHAT MODELS ====================

class MessageCreate(BaseModel):
    task_id: str
    receiver_id: str
    message: str

class Message(MessageCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_name: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== PUSH NOTIFICATION MODELS ====================

class PushTokenCreate(BaseModel):
    token: str
    device_type: Optional[str] = None

class PushToken(PushTokenCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== AUTH UTILITIES ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_by_email(email: str) -> Optional[UserInDB]:
    user_data = await db.users.find_one({"email": email})
    if user_data:
        return UserInDB(**user_data)
    return None

async def get_user_by_id(user_id: str) -> Optional[User]:
    user_data = await db.users.find_one({"id": user_id})
    if user_data:
        user_data.pop('hashed_password', None)
        return User(**user_data)
    return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
    
    user = await get_user_by_id(token_data.user_id)
    if user is None:
        raise credentials_exception
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_dict = user_data.dict()
    password = user_dict.pop('password')
    hashed_password = get_password_hash(password)
    
    user_in_db = UserInDB(**user_dict, hashed_password=hashed_password)
    user_dict_db = user_in_db.dict()
    
    # Insert into database
    await db.users.insert_one(user_dict_db)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_in_db.id}, expires_delta=access_token_expires
    )
    
    # Return user without hashed_password
    user = User(**{k: v for k, v in user_dict_db.items() if k != 'hashed_password'})
    
    return Token(token=access_token, user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await get_user_by_email(user_credentials.email)
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    # Return user without hashed_password
    user_data = user.dict()
    user_data.pop('hashed_password', None)
    user_response = User(**user_data)
    
    return Token(token=access_token, user=user_response)

# ==================== USER ENDPOINTS ====================

@api_router.get("/users/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/users/taskers")
async def get_taskers(
    category: Optional[str] = None,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
):
    query = {"role": "tasker"}
    if category:
        query["tasker_profile.services.category"] = category
    if country:
        query["country"] = country
    
    taskers = await db.users.find(query).to_list(100)
    return [User(**{k: v for k, v in tasker.items() if k != 'hashed_password'}).dict() for tasker in taskers]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

# ==================== TASK ENDPOINTS ====================

@api_router.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create tasks"
        )
    
    task_dict = task_data.dict()
    task_dict["client_id"] = current_user.id
    task_dict["id"] = str(uuid.uuid4())
    task_dict["status"] = "pending"
    task_dict["created_at"] = datetime.utcnow()
    task_dict["updated_at"] = datetime.utcnow()
    
    await db.tasks.insert_one(task_dict)
    return Task(**task_dict)

@api_router.get("/tasks/client")
async def get_client_tasks(current_user: User = Depends(get_current_user)):
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can access this endpoint"
        )
    
    tasks = await db.tasks.find({"client_id": current_user.id}).sort("created_at", -1).to_list(100)
    
    # Enrich tasks with tasker info
    for task in tasks:
        tasker = await get_user_by_id(task["tasker_id"])
        if tasker:
            task["tasker_name"] = tasker.full_name
            task["tasker_photo"] = tasker.profile_photo
            task["tasker_phone"] = tasker.phone
    
    return tasks

@api_router.get("/tasks/tasker")
async def get_tasker_tasks(current_user: User = Depends(get_current_user)):
    if current_user.role != "tasker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can access this endpoint"
        )
    
    tasks = await db.tasks.find({"tasker_id": current_user.id}).sort("created_at", -1).to_list(100)
    
    # Enrich tasks with client info
    for task in tasks:
        client = await get_user_by_id(task["client_id"])
        if client:
            task["client_name"] = client.full_name
            task["client_photo"] = client.profile_photo
            task["client_phone"] = client.phone
    
    return tasks

@api_router.post("/tasks/{task_id}/accept")
async def accept_task(task_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "tasker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can accept tasks"
        )
    
    task = await db.tasks.find_one({"id": task_id, "tasker_id": current_user.id})
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if task["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not in pending status"
        )
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": "accepted", "accepted_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )
    
    updated_task = await db.tasks.find_one({"id": task_id})
    return updated_task

@api_router.put("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status_update: TaskStatusUpdate, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permissions
    if current_user.role == "tasker" and task["tasker_id"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if current_user.role == "client" and task["client_id"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    update_data = {"status": status_update.status, "updated_at": datetime.utcnow()}
    
    if status_update.status == "in_progress":
        update_data["started_at"] = datetime.utcnow()
    elif status_update.status == "completed":
        update_data["completed_at"] = datetime.utcnow()
        # Update tasker's completed tasks count
        if current_user.role == "tasker":
            await db.users.update_one(
                {"id": current_user.id},
                {"$inc": {"completed_tasks": 1}}
            )
    elif status_update.status == "cancelled":
        update_data["cancelled_at"] = datetime.utcnow()
        update_data["cancellation_reason"] = status_update.cancellation_reason
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    updated_task = await db.tasks.find_one({"id": task_id})
    return updated_task

# ==================== GPS TRACKING ENDPOINTS ====================

@api_router.post("/tasks/{task_id}/start-journey")
async def start_journey(task_id: str, location: LocationUpdate, current_user: User = Depends(get_current_user)):
    """Tasker starts journey to client location"""
    if current_user.role != "tasker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can start journey"
        )
    
    task = await db.tasks.find_one({"id": task_id, "tasker_id": current_user.id})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task["status"] != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task must be in accepted status"
        )
    
    update_data = {
        "status": "en_route",
        "en_route_at": datetime.utcnow(),
        "current_latitude": location.latitude,
        "current_longitude": location.longitude,
        "location_updated_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    updated_task = await db.tasks.find_one({"id": task_id})
    return updated_task

@api_router.put("/tasks/{task_id}/location")
async def update_location(task_id: str, location: LocationUpdate, current_user: User = Depends(get_current_user)):
    """Update tasker's current location while en route"""
    if current_user.role != "tasker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can update location"
        )
    
    task = await db.tasks.find_one({"id": task_id, "tasker_id": current_user.id})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task["status"] != "en_route":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task must be in en_route status"
        )
    
    update_data = {
        "current_latitude": location.latitude,
        "current_longitude": location.longitude,
        "location_updated_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    return {"success": True, "latitude": location.latitude, "longitude": location.longitude}

@api_router.get("/tasks/{task_id}/location")
async def get_task_location(task_id: str, current_user: User = Depends(get_current_user)):
    """Get current location of tasker (for client to track)"""
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Check if user is part of this task
    if current_user.id not in [task["client_id"], task["tasker_id"]]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    if task["status"] != "en_route":
        return {
            "status": task["status"],
            "en_route": False,
            "message": "Tasker is not en route yet"
        }
    
    # Calculate distance and ETA (simple calculation)
    tasker_lat = task.get("current_latitude")
    tasker_lng = task.get("current_longitude")
    client_lat = task.get("latitude")
    client_lng = task.get("longitude")
    
    distance_km = None
    eta_minutes = None
    
    if tasker_lat and tasker_lng and client_lat and client_lng:
        # Haversine formula for distance
        from math import radians, cos, sin, asin, sqrt
        
        lon1, lat1, lon2, lat2 = map(radians, [tasker_lng, tasker_lat, client_lng, client_lat])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        distance_km = 6371 * c  # Radius of earth in kilometers
        
        # Estimate ETA (assuming avg speed of 30 km/h in city)
        eta_minutes = int((distance_km / 30) * 60)
    
    return {
        "status": "en_route",
        "en_route": True,
        "tasker_location": {
            "latitude": tasker_lat,
            "longitude": tasker_lng
        },
        "client_location": {
            "latitude": client_lat,
            "longitude": client_lng
        },
        "distance_km": round(distance_km, 2) if distance_km else None,
        "eta_minutes": eta_minutes,
        "last_updated": task.get("location_updated_at"),
        "en_route_since": task.get("en_route_at")
    }

@api_router.post("/tasks/{task_id}/arrive")
async def mark_arrival(task_id: str, current_user: User = Depends(get_current_user)):
    """Tasker marks arrival at client location"""
    if current_user.role != "tasker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can mark arrival"
        )
    
    task = await db.tasks.find_one({"id": task_id, "tasker_id": current_user.id})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task["status"] != "en_route":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task must be in en_route status"
        )
    
    update_data = {
        "status": "in_progress",
        "arrived_at": datetime.utcnow(),
        "started_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    updated_task = await db.tasks.find_one({"id": task_id})
    return updated_task

# ==================== REVIEW ENDPOINTS ====================

@api_router.get("/reviews/tasker/{tasker_id}")
async def get_tasker_reviews(tasker_id: str):
    reviews = await db.reviews.find({"tasker_id": tasker_id}).sort("created_at", -1).to_list(100)
    return reviews

@api_router.post("/reviews", response_model=Review, status_code=status.HTTP_201_CREATED)
async def create_review(review_data: ReviewCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can leave reviews"
        )
    
    # Check if task exists and is completed
    task = await db.tasks.find_one({"id": review_data.task_id, "client_id": current_user.id})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only review completed tasks"
        )
    
    # Check if review already exists
    existing_review = await db.reviews.find_one({"task_id": review_data.task_id})
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already exists for this task"
        )
    
    review_dict = review_data.dict()
    review_dict["id"] = str(uuid.uuid4())
    review_dict["client_id"] = current_user.id
    review_dict["client_name"] = current_user.full_name
    review_dict["service_name"] = task.get("title")
    review_dict["created_at"] = datetime.utcnow()
    
    await db.reviews.insert_one(review_dict)
    
    # Update tasker's average rating and review count
    all_reviews = await db.reviews.find({"tasker_id": review_data.tasker_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    
    await db.users.update_one(
        {"id": review_data.tasker_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(all_reviews)}}
    )
    
    return Review(**review_dict)

# ==================== FAVORITE ENDPOINTS ====================

@api_router.post("/favorites/toggle")
async def toggle_favorite(data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can favorite taskers"
        )
    
    tasker_id = data.get("tasker_id")
    if not tasker_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tasker_id required")
    
    existing = await db.favorites.find_one({"client_id": current_user.id, "tasker_id": tasker_id})
    
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"favorited": False, "message": "Removed from favorites"}
    else:
        favorite = {
            "id": str(uuid.uuid4()),
            "client_id": current_user.id,
            "tasker_id": tasker_id,
            "created_at": datetime.utcnow()
        }
        await db.favorites.insert_one(favorite)
        return {"favorited": True, "message": "Added to favorites"}

@api_router.get("/favorites")
async def get_favorites(current_user: User = Depends(get_current_user)):
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can view favorites"
        )
    
    favorites = await db.favorites.find({"client_id": current_user.id}).to_list(100)
    
    # Enrich with tasker info
    tasker_ids = [f["tasker_id"] for f in favorites]
    taskers = []
    for tasker_id in tasker_ids:
        tasker = await get_user_by_id(tasker_id)
        if tasker:
            taskers.append(tasker.dict())
    
    return taskers

# ==================== CHAT ENDPOINTS ====================

@api_router.post("/chat/send", response_model=Message)
async def send_message(message_data: MessageCreate, current_user: User = Depends(get_current_user)):
    # Verify task exists and user is part of it
    task = await db.tasks.find_one({"id": message_data.task_id})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if current_user.id not in [task["client_id"], task["tasker_id"]]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    message_dict = message_data.dict()
    message_dict["id"] = str(uuid.uuid4())
    message_dict["sender_id"] = current_user.id
    message_dict["sender_name"] = current_user.full_name
    message_dict["is_read"] = False
    message_dict["created_at"] = datetime.utcnow()
    
    await db.messages.insert_one(message_dict)
    return Message(**message_dict)

@api_router.get("/chat/{task_id}")
async def get_chat_messages(task_id: str, current_user: User = Depends(get_current_user)):
    # Verify task exists and user is part of it
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if current_user.id not in [task["client_id"], task["tasker_id"]]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    messages = await db.messages.find({"task_id": task_id}).sort("created_at", 1).to_list(1000)
    
    # Mark messages as read for current user
    await db.messages.update_many(
        {"task_id": task_id, "receiver_id": current_user.id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return messages

@api_router.get("/chat/{task_id}/unread-count")
async def get_unread_count(task_id: str, current_user: User = Depends(get_current_user)):
    count = await db.messages.count_documents({
        "task_id": task_id,
        "receiver_id": current_user.id,
        "is_read": False
    })
    return {"unread_count": count}

# ==================== PUSH NOTIFICATION HELPERS ====================

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send push notification to a user"""
    try:
        # Get user's push tokens
        tokens = await db.push_tokens.find({"user_id": user_id}).to_list(10)
        
        if not tokens:
            logger.info(f"No push tokens found for user {user_id}")
            return
        
        # Prepare Expo push notification payload
        messages = []
        for token_doc in tokens:
            messages.append({
                "to": token_doc["token"],
                "sound": "default",
                "title": title,
                "body": body,
                "data": data or {},
                "priority": "high",
            })
        
        # Send to Expo Push Notification service
        if messages:
            import requests
            response = requests.post(
                "https://exp.host/--/api/v2/push/send",
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json=messages,
            )
            logger.info(f"Push notification sent to user {user_id}: {response.status_code}")
            return response.json()
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")

# ==================== PUSH NOTIFICATION ENDPOINTS ====================

@api_router.post("/push-tokens")
async def register_push_token(token_data: PushTokenCreate, current_user: User = Depends(get_current_user)):
    """Register or update user's push notification token"""
    # Check if token already exists
    existing = await db.push_tokens.find_one({
        "user_id": current_user.id,
        "token": token_data.token
    })
    
    if existing:
        # Update timestamp
        await db.push_tokens.update_one(
            {"_id": existing["_id"]},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        return {"message": "Token updated"}
    
    # Create new token
    push_token = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "token": token_data.token,
        "device_type": token_data.device_type,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.push_tokens.insert_one(push_token)
    return {"message": "Token registered successfully"}

@api_router.delete("/push-tokens/{token}")
async def unregister_push_token(token: str, current_user: User = Depends(get_current_user)):
    """Unregister push notification token"""
    await db.push_tokens.delete_one({"user_id": current_user.id, "token": token})
    return {"message": "Token unregistered"}

# ==================== BASIC ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Soutrali API v1.0.0", "status": "online"}

@api_router.get("/status")
async def status_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Seed test data on startup
@app.on_event("startup")
async def seed_test_data():
    try:
        # Check if test users already exist
        test_client = await get_user_by_email("testclient@demo.com")
        test_tasker = await get_user_by_email("testtasker@demo.com")
        
        if not test_client:
            # Create test client
            client_data = UserCreate(
                email="testclient@demo.com",
                password="test123",
                full_name="Test Client",
                phone="+225 0123456789",
                country="Ivory Coast",
                city="Abidjan",
                role="client",
                language="en",
                latitude=5.36,
                longitude=-4.00
            )
            client_dict = client_data.dict()
            password = client_dict.pop('password')
            hashed_password = get_password_hash(password)
            client_user = UserInDB(**client_dict, hashed_password=hashed_password)
            await db.users.insert_one(client_user.dict())
            logger.info("Test client user created")
        
        if not test_tasker:
            # Create test tasker
            tasker_data = UserCreate(
                email="testtasker@demo.com",
                password="test123",
                full_name="Test Tasker",
                phone="+225 0987654321",
                country="Ivory Coast",
                city="Abidjan",
                role="tasker",
                language="en",
                latitude=5.36,
                longitude=-4.00
            )
            tasker_dict = tasker_data.dict()
            password = tasker_dict.pop('password')
            hashed_password = get_password_hash(password)
            tasker_user = UserInDB(**tasker_dict, hashed_password=hashed_password)
            await db.users.insert_one(tasker_user.dict())
            logger.info("Test tasker user created")
        
        # Create sample taskers with diverse profiles
        sample_taskers = [
            {
                "email": "marie.cleaning@demo.com",
                "full_name": "Marie Kouassi",
                "phone": "+225 0701234567",
                "country": "Ivory Coast",
                "city": "Abidjan",
                "role": "tasker",
                "latitude": 5.35,
                "longitude": -3.98,
                "is_available": True,
                "rating": 4.8,
                "reviews_count": 42,
                "completed_tasks": 87,
                "tasker_profile": {
                    "services": [
                        {"category": "cleaning", "hourly_rate": 2500, "pricing_type": "hourly"}
                    ],
                    "bio": "Professional cleaner with 5 years of experience"
                }
            },
            {
                "email": "john.plumber@demo.com",
                "full_name": "John Mensah",
                "phone": "+233 0501234567",
                "country": "Ghana",
                "city": "Accra",
                "role": "tasker",
                "latitude": 5.60,
                "longitude": -0.19,
                "is_available": True,
                "rating": 4.9,
                "reviews_count": 68,
                "completed_tasks": 134,
                "tasker_profile": {
                    "services": [
                        {"category": "plumbing", "hourly_rate": 3500, "pricing_type": "hourly"}
                    ],
                    "bio": "Licensed plumber, available 24/7 for emergencies"
                }
            },
            {
                "email": "fatou.gardening@demo.com",
                "full_name": "Fatou Diop",
                "phone": "+221 0771234567",
                "country": "Senegal",
                "city": "Dakar",
                "role": "tasker",
                "latitude": 14.69,
                "longitude": -17.44,
                "is_available": True,
                "rating": 4.7,
                "reviews_count": 35,
                "completed_tasks": 56,
                "tasker_profile": {
                    "services": [
                        {"category": "gardening", "hourly_rate": 2000, "pricing_type": "hourly"}
                    ],
                    "bio": "Passionate about creating beautiful gardens"
                }
            },
            {
                "email": "kwame.electrical@demo.com",
                "full_name": "Kwame Nkrumah",
                "phone": "+233 0241234567",
                "country": "Ghana",
                "city": "Kumasi",
                "role": "tasker",
                "latitude": 6.69,
                "longitude": -1.62,
                "is_available": False,
                "rating": 5.0,
                "reviews_count": 91,
                "completed_tasks": 203,
                "tasker_profile": {
                    "services": [
                        {"category": "electrical", "hourly_rate": 4000, "pricing_type": "hourly"}
                    ],
                    "bio": "Certified electrician with 10+ years experience"
                }
            },
            {
                "email": "aisha.tutoring@demo.com",
                "full_name": "Aisha Bello",
                "phone": "+234 0801234567",
                "country": "Nigeria",
                "city": "Lagos",
                "role": "tasker",
                "latitude": 6.52,
                "longitude": 3.37,
                "is_available": True,
                "rating": 4.9,
                "reviews_count": 127,
                "completed_tasks": 234,
                "tasker_profile": {
                    "services": [
                        {"category": "tutoring", "hourly_rate": 5000, "pricing_type": "hourly"}
                    ],
                    "bio": "Math and Science tutor, Masters degree holder"
                }
            },
            {
                "email": "pierre.painting@demo.com",
                "full_name": "Pierre Kamara",
                "phone": "+225 0721234567",
                "country": "Ivory Coast",
                "city": "Yamoussoukro",
                "role": "tasker",
                "latitude": 6.82,
                "longitude": -5.27,
                "is_available": True,
                "rating": 4.6,
                "reviews_count": 28,
                "completed_tasks": 45,
                "tasker_profile": {
                    "services": [
                        {"category": "painting", "fixed_price": 25000, "pricing_type": "fixed"}
                    ],
                    "bio": "Interior and exterior painting specialist"
                }
            },
            {
                "email": "amara.delivery@demo.com",
                "full_name": "Amara Toure",
                "phone": "+221 0781234567",
                "country": "Senegal",
                "city": "Thies",
                "role": "tasker",
                "latitude": 14.79,
                "longitude": -16.93,
                "is_available": True,
                "rating": 4.5,
                "reviews_count": 156,
                "completed_tasks": 312,
                "tasker_profile": {
                    "services": [
                        {"category": "delivery", "hourly_rate": 1500, "pricing_type": "hourly"}
                    ],
                    "bio": "Fast and reliable delivery service"
                }
            },
            {
                "email": "yaw.carpentry@demo.com",
                "full_name": "Yaw Asante",
                "phone": "+233 0551234567",
                "country": "Ghana",
                "city": "Accra",
                "role": "tasker",
                "latitude": 5.61,
                "longitude": -0.21,
                "is_available": True,
                "rating": 4.8,
                "reviews_count": 73,
                "completed_tasks": 119,
                "tasker_profile": {
                    "services": [
                        {"category": "carpentry", "hourly_rate": 3000, "pricing_type": "hourly"}
                    ],
                    "bio": "Custom furniture and woodwork expert"
                }
            }
        ]
        
        # Insert sample taskers if they don't exist
        for tasker_data in sample_taskers:
            existing = await get_user_by_email(tasker_data["email"])
            if not existing:
                hashed_password = get_password_hash("test123")
                user_in_db = {**tasker_data, "hashed_password": hashed_password, "id": str(uuid.uuid4()), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
                await db.users.insert_one(user_in_db)
                logger.info(f"Sample tasker created: {tasker_data['full_name']}")
            
    except Exception as e:
        logger.error(f"Error seeding test data: {e}")
