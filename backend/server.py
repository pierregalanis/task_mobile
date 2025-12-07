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

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

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
                "tasker_profile": {
                    "services": [
                        {"category": "cleaning", "hourly_rate": 2500, "pricing_type": "hourly"}
                    ]
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
                "tasker_profile": {
                    "services": [
                        {"category": "plumbing", "hourly_rate": 3500, "pricing_type": "hourly"}
                    ]
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
                "tasker_profile": {
                    "services": [
                        {"category": "gardening", "hourly_rate": 2000, "pricing_type": "hourly"}
                    ]
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
                "tasker_profile": {
                    "services": [
                        {"category": "electrical", "hourly_rate": 4000, "pricing_type": "hourly"}
                    ]
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
                "tasker_profile": {
                    "services": [
                        {"category": "tutoring", "hourly_rate": 5000, "pricing_type": "hourly"}
                    ]
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
                "tasker_profile": {
                    "services": [
                        {"category": "painting", "fixed_price": 25000, "pricing_type": "fixed"}
                    ]
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
                "tasker_profile": {
                    "services": [
                        {"category": "delivery", "hourly_rate": 1500, "pricing_type": "hourly"}
                    ]
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
                "tasker_profile": {
                    "services": [
                        {"category": "carpentry", "hourly_rate": 3000, "pricing_type": "hourly"}
                    ]
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
