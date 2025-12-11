import axios from 'axios';
import { storage } from '../utils/storage';
import Constants from 'expo-constants';

// Use local backend URL from environment
const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
  ? `${Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL}/api`
  : process.env.EXPO_PUBLIC_BACKEND_URL 
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : 'http://localhost:8001/api';

console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await storage.clearAll();
      // You might want to redirect to login here
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  country: string;
  role: 'client' | 'tasker';
  language?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  country: string;
  role: 'client' | 'tasker';
  language?: string;
  latitude?: number;
  longitude?: number;
}

export const authAPI = {
  async login(credentials: LoginCredentials) {
    // Web backend expects form data with username/password (not email/password)
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await api.post('/auth/login', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/users/me');
    return response.data;
  },
};

export const taskerAPI = {
  async getTaskers(params?: any) {
    const response = await api.get('/users/taskers', { params });
    return response.data;
  },

  async getTasker(userId: string) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  async getTaskerProfile(userId: string) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
};

export const categoryAPI = {
  async getCategories() {
    const response = await api.get('/categories');
    return response.data;
  },
};

export const taskAPI = {
  async createTask(taskData: any) {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  async getClientTasks() {
    const response = await api.get('/tasks/client');
    return response.data;
  },

  async getTaskerTasks() {
    const response = await api.get('/tasks/tasker');
    return response.data;
  },

  async acceptTask(taskId: string) {
    const response = await api.post(`/tasks/${taskId}/accept`);
    return response.data;
  },

  async updateTaskStatus(taskId: string, status: string, cancellationReason?: string) {
    const response = await api.put(`/tasks/${taskId}/status`, {
      status,
      cancellation_reason: cancellationReason,
    });
    return response.data;
  },

  // GPS Tracking
  async startJourney(taskId: string, latitude: number, longitude: number) {
    const response = await api.post(`/tasks/${taskId}/start-journey`, {
      latitude,
      longitude,
    });
    return response.data;
  },

  async updateLocation(taskId: string, latitude: number, longitude: number) {
    const response = await api.put(`/tasks/${taskId}/location`, {
      latitude,
      longitude,
    });
    return response.data;
  },

  async getTaskLocation(taskId: string) {
    const response = await api.get(`/tasks/${taskId}/location`);
    return response.data;
  },

  async markArrival(taskId: string) {
    const response = await api.post(`/tasks/${taskId}/arrive`);
    return response.data;
  },
};

export const reviewAPI = {
  async getTaskerReviews(taskerId: string) {
    const response = await api.get(`/reviews/tasker/${taskerId}`);
    return response.data;
  },

  async createReview(reviewData: any) {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },
};

export const favoriteAPI = {
  async toggleFavorite(taskerId: string) {
    const response = await api.post('/favorites/toggle', { tasker_id: taskerId });
    return response.data;
  },

  async getFavorites() {
    const response = await api.get('/favorites');
    return response.data;
  },
};

export const chatAPI = {
  async sendMessage(taskId: string, receiverId: string, message: string) {
    const response = await api.post('/chat/send', {
      task_id: taskId,
      receiver_id: receiverId,
      message,
    });
    return response.data;
  },

  async getMessages(taskId: string) {
    const response = await api.get(`/chat/${taskId}`);
    return response.data;
  },

  async getUnreadCount(taskId: string) {
    const response = await api.get(`/chat/${taskId}/unread-count`);
    return response.data;
  },
};

export default api;
