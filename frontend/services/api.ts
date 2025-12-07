import axios from 'axios';
import { storage } from '../utils/storage';
import Constants from 'expo-constants';

// Use local backend URL from environment
const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
  ? `${Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL}/api`
  : process.env.EXPO_PUBLIC_BACKEND_URL 
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : 'http://localhost:8001/api';

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
    const response = await api.post('/auth/login', credentials);
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
};

export default api;
