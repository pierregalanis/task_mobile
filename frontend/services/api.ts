import axios from 'axios';
import { storage } from '../utils/storage';

// ONE backend for EVERYTHING - Production Backend
const API_BASE_URL = 'https://gethands.preview.emergentagent.com';

console.log('API URL:', API_BASE_URL);

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
  (error) => Promise.reject(error)
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

// ==================== TYPES ====================

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

// ==================== AUTH API ====================

export const authAPI = {
  async login(credentials: LoginCredentials) {
    // Production uses form data
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    
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
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// ==================== TASKER API ====================

export const taskerAPI = {
  async getTaskers(params?: any) {
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

// ==================== CATEGORY API ====================

export const categoryAPI = {
  async getCategories() {
    const response = await api.get('/api/categories');
    return response.data;
  },
};

// ==================== TASK API ====================

export const taskAPI = {
  async createTask(taskData: any) {
    // Use tasker_id field for production
    const prodTaskData = {
      ...taskData,
      tasker_id: taskData.assigned_tasker_id || taskData.tasker_id,
    };
    delete prodTaskData.assigned_tasker_id;
    
    const response = await api.post('/api/tasks', prodTaskData);
    return response.data;
  },

  async getClientTasks() {
    const response = await api.get('/api/tasks');
    return response.data;
  },

  async getTaskerTasks() {
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
    const response = await api.post(`/api/tasks/${taskId}/cancel`, { reason });
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

// ==================== REVIEW API ====================

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

// ==================== FAVORITE API ====================

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

// ==================== CHAT API ====================

export const chatAPI = {
  async sendMessage(taskId: string, receiverId: string, message: string) {
    const response = await api.post(`/api/messages/${taskId}`, {
      content: message,
    });
    return response.data;
  },

  async getMessages(taskId: string) {
    const response = await api.get(`/api/messages/${taskId}`);
    return response.data;
  },

  async getUnreadCount(taskId: string) {
    const response = await api.get(`/api/messages/${taskId}/unread`);
    return response.data;
  },
};

// ==================== NOTIFICATION API ====================

export const notificationAPI = {
  async getNotifications() {
    const response = await api.get('/api/notifications');
    // Production returns { notifications: [], unread_count }
    if (response.data.notifications) {
      return response.data.notifications;
    }
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get('/api/notifications');
    if (response.data.unread_count !== undefined) {
      return { unread_count: response.data.unread_count, count: response.data.unread_count };
    }
    return { unread_count: 0, count: 0 };
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

// ==================== PUSH TOKEN API ====================

export const pushTokenAPI = {
  async registerToken(token: string, platform: string = 'ios') {
    const response = await api.post('/api/push-tokens', {
      token: token,
      device_type: platform,
    });
    return response.data;
  },

  async unregisterToken(token: string) {
    const response = await api.delete(`/api/push-tokens/${token}`);
    return response.data;
  },
};

// ==================== AI ASSISTANT API ====================
// Using the mobile-optimized AI assistant with full app context

export const aiAPI = {
  async chat(message: string, sessionId?: string, chatHistory?: any[]) {
    const response = await api.post('/api/ai-assistant/chat', {
      message,
      session_id: sessionId,
      chat_history: chatHistory || [],
    });
    return response.data;
  },
};

export default api;
