import axios from 'axios';
import { storage } from '../utils/storage';
import Constants from 'expo-constants';

// Production backend URL
const PRODUCTION_API_URL = 'https://gethands.preview.emergentagent.com';

// Local backend URL (for features not in production like AI, push tokens)
const LOCAL_API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
  || process.env.EXPO_PUBLIC_BACKEND_URL 
  || 'http://localhost:8001';

console.log('Production API URL:', PRODUCTION_API_URL);
console.log('Local API URL:', LOCAL_API_URL);

// Main API client for production backend
const api = axios.create({
  baseURL: PRODUCTION_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Local API client for features not in production
const localApi = axios.create({
  baseURL: LOCAL_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token - production API
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

// Request interceptor to add token - local API
localApi.interceptors.request.use(
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
      await storage.clearAll();
    }
    return Promise.reject(error);
  }
);

localApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.clearAll();
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
  tasker_profile?: any;
}

export const authAPI = {
  async login(credentials: LoginCredentials) {
    // Production API expects form data with username/password
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // Map production response to expected format
    return {
      token: response.data.access_token,
      token_type: response.data.token_type,
    };
  },

  async register(data: RegisterData) {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    // Production uses /api/auth/me instead of /api/users/me
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

export const taskerAPI = {
  async getTaskers(params?: any) {
    // Production uses /api/taskers/search
    const response = await api.get('/api/taskers/search', { params });
    return response.data;
  },

  async getTasker(userId: string) {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  async getTaskerProfile(userId: string) {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },
};

export const categoryAPI = {
  async getCategories() {
    const response = await api.get('/api/categories');
    return response.data;
  },
};

export const taskAPI = {
  async createTask(taskData: any) {
    // Production expects tasker_id, not assigned_tasker_id
    const prodTaskData = {
      ...taskData,
      tasker_id: taskData.assigned_tasker_id || taskData.tasker_id,
    };
    // Remove the old field name if present
    delete prodTaskData.assigned_tasker_id;
    
    const response = await api.post('/api/tasks', prodTaskData);
    return response.data;
  },

  async getClientTasks() {
    // Production returns all tasks for the authenticated user
    const response = await api.get('/api/tasks');
    return response.data;
  },

  async getTaskerTasks() {
    // Production returns all tasks for the authenticated user
    const response = await api.get('/api/tasks');
    return response.data;
  },

  async getTask(taskId: string) {
    const response = await api.get(`/api/tasks/${taskId}`);
    return response.data;
  },

  async acceptTask(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/accept`);
    return response.data;
  },

  async rejectTask(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/reject`);
    return response.data;
  },

  async startTimer(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/start-timer`);
    return response.data;
  },

  async stopTimer(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/stop-timer`);
    return response.data;
  },

  async updateTaskStatus(taskId: string, status: string, cancellationReason?: string) {
    const response = await api.put(`/api/tasks/${taskId}/status`, {
      status,
      cancellation_reason: cancellationReason,
    });
    return response.data;
  },

  async cancelTask(taskId: string, reason?: string) {
    const response = await api.post(`/api/tasks/${taskId}/cancel`, {
      reason,
    });
    return response.data;
  },

  async completeTask(taskId: string, paymentMethod?: string) {
    const response = await api.post(`/api/tasks/${taskId}/complete`, {
      payment_method: paymentMethod,
    });
    return response.data;
  },

  // GPS Tracking
  async startJourney(taskId: string, latitude: number, longitude: number) {
    const response = await api.post(`/api/tasks/${taskId}/start-journey`, {
      latitude,
      longitude,
    });
    return response.data;
  },

  async updateLocation(taskId: string, latitude: number, longitude: number) {
    const response = await api.put(`/api/tasks/${taskId}/location`, {
      latitude,
      longitude,
    });
    return response.data;
  },

  async getTaskLocation(taskId: string) {
    const response = await api.get(`/api/tasks/${taskId}/location`);
    return response.data;
  },

  async markArrival(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/arrive`);
    return response.data;
  },
};

export const reviewAPI = {
  async getTaskerReviews(taskerId: string) {
    const response = await api.get(`/api/reviews/tasker/${taskerId}`);
    return response.data;
  },

  async createReview(reviewData: any) {
    const response = await api.post('/api/reviews', reviewData);
    return response.data;
  },
};

export const favoriteAPI = {
  async toggleFavorite(taskerId: string) {
    const response = await api.post('/api/favorites/toggle', { tasker_id: taskerId });
    return response.data;
  },

  async getFavorites() {
    const response = await api.get('/api/favorites');
    return response.data;
  },
};

export const chatAPI = {
  async sendMessage(taskId: string, receiverId: string, message: string) {
    // Try production first, fallback to local
    try {
      const response = await api.post(`/api/messages/${taskId}`, {
        content: message,
      });
      return response.data;
    } catch (error) {
      // Fallback to local API
      const response = await localApi.post('/api/chat/send', {
        task_id: taskId,
        receiver_id: receiverId,
        message,
      });
      return response.data;
    }
  },

  async getMessages(taskId: string) {
    // Try production first, fallback to local
    try {
      const response = await api.get(`/api/messages/${taskId}`);
      return response.data;
    } catch (error) {
      // Fallback to local API
      const response = await localApi.get(`/api/chat/${taskId}`);
      return response.data;
    }
  },

  async getUnreadCount(taskId: string) {
    try {
      const response = await api.get(`/api/messages/${taskId}/unread`);
      return response.data;
    } catch (error) {
      const response = await localApi.get(`/api/chat/${taskId}/unread-count`);
      return response.data;
    }
  },
};

export const notificationAPI = {
  async getNotifications() {
    const response = await api.get('/api/notifications');
    // Production returns { notifications: [], unread_count: int }
    // Normalize to array format for compatibility
    if (response.data.notifications) {
      return response.data.notifications;
    }
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get('/api/notifications');
    // Production includes unread_count in the notifications response
    if (response.data.unread_count !== undefined) {
      return { unread_count: response.data.unread_count, count: response.data.unread_count };
    }
    // Fallback to separate endpoint
    try {
      const countResponse = await api.get('/api/notifications/unread-count');
      return countResponse.data;
    } catch {
      return { unread_count: 0, count: 0 };
    }
  },

  async markAsRead(notificationId: string) {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.post('/api/notifications/read-all');
    return response.data;
  },
};

// Push tokens - use local API since production may not have this
export const pushTokenAPI = {
  async registerToken(token: string, deviceType?: string) {
    try {
      // Try production first
      const response = await api.post('/api/push-tokens', {
        token,
        device_type: deviceType,
      });
      return response.data;
    } catch (error) {
      // Fallback to local
      const response = await localApi.post('/api/push-tokens', {
        token,
        device_type: deviceType,
      });
      return response.data;
    }
  },

  async unregisterToken(token: string) {
    try {
      const response = await api.delete(`/api/push-tokens/${token}`);
      return response.data;
    } catch (error) {
      const response = await localApi.delete(`/api/push-tokens/${token}`);
      return response.data;
    }
  },
};

// AI Assistant - uses local API with OpenAI integration
export const aiAPI = {
  async chat(message: string, sessionId?: string) {
    const response = await localApi.post('/api/ai/chat', {
      message,
      session_id: sessionId,
    });
    return response.data;
  },
};

// Google Places - uses local proxy to avoid CORS
export const googlePlacesAPI = {
  async autocomplete(input: string) {
    const response = await localApi.get('/api/google/places/autocomplete', {
      params: { input },
    });
    return response.data;
  },

  async getPlaceDetails(placeId: string) {
    const response = await localApi.get('/api/google/places/details', {
      params: { place_id: placeId },
    });
    return response.data;
  },
};

export default api;
