import axios from 'axios';
import { storage } from '../utils/storage';
import { Platform } from 'react-native';

// Production Backend - soutrali.net
// Native apps connect directly to production API
// Web uses local proxy to avoid CORS issues
const API_BASE_URL = Platform.OS === 'web' 
  ? '' 
  : 'https://soutrali.net';

console.log('Platform:', Platform.OS);
console.log('API URL:', API_BASE_URL || 'Local Proxy (Web)');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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
  city?: string;
  latitude?: number;
  longitude?: number;
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
  is_identity_verified?: boolean;
  verification?: {
    status?: 'not_submitted' | 'pending' | 'approved' | 'rejected';
    rejection_reason?: string | null;
  };
}

export interface PortfolioImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  image_url?: string; // Legacy support
  service_category: string;
  service_subcategory: string;
  category?: string; // Legacy support
  subcategory?: string; // Legacy support
  caption?: string;
  description?: string; // Legacy support
  is_featured?: boolean;
  is_before?: boolean;
  is_after?: boolean;
  uploaded_at?: string;
  created_at?: string;
}

// Pending Review type (from /api/reviews/pending)
export interface PendingReview {
  task_id: string;
  task_title: string;
  completed_at: string;
  days_remaining: number;
  tasker_id: string;
  tasker_name: string;
  tasker_profile_image: string | null;
  total_cost: number;
}


// ==================== SEARCH FILTER TYPES ====================

export interface SearchFilters {
  categoryId?: string;
  subcategory?: string;
  service?: string;
  isAvailable?: boolean;
  city?: string;
  country?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  availableOnDate?: string;  // YYYY-MM-DD format
  sortBy?: 'rating' | 'price-low' | 'price-high' | 'reviews';
  skip?: number;
  limit?: number;
}

export interface TaskerService {
  category: string;
  subcategory: string;
  hourly_rate: number;
  pricing_type: 'hourly' | 'fixed';
  bio: string;
  max_travel_distance: number;
  fixed_price?: number;
}

export interface TaskerProfileData {
  services: TaskerService[];
  hourly_rate: number;
  bio: string;
  max_travel_distance: number;
  is_available: boolean;
  average_rating: number;
  total_reviews: number;
  completed_tasks: number;
  certifications?: string[];
}

export interface Tasker {
  id: string;
  email?: string;
  full_name: string;
  phone?: string;
  city?: string;
  country?: string;
  profile_image: string | null;
  role?: 'tasker';
  language?: string;
  latitude?: number | null;
  longitude?: number | null;
  tasker_profile?: TaskerProfileData;
}

// ==================== AUTH API ====================

export const authAPI = {
  async login(credentials: LoginCredentials) {
    try {
      // Production backend uses form data
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);
      
      console.log('Login attempt for:', credentials.email);
      
      const response = await api.post('/api/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      
      console.log('Login successful');
      
      return {
        token: response.data.access_token,
        token_type: response.data.token_type || 'bearer',
      };
    } catch (error: any) {
      console.error('Login error:', error.message);
      console.error('Login error details:', error.response?.data);
      throw error;
    }
  },

  async register(data: RegisterData) {
    try {
      console.log('Registration attempt for:', data.email);
      const response = await api.post('/api/auth/register', data);
      console.log('Registration successful');
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error.message);
      console.error('Registration error details:', error.response?.data);
      throw error;
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  // Password Reset — single identifier (email or phone), backend resolves the account
  // and sends the code/link only to the registered contact on file.
  async requestPasswordReset(method: 'whatsapp' | 'email', identifier: string) {
    const response = await api.post('/api/auth/forgot-password', { method, identifier });
    return response.data as {
      success: boolean;
      method: 'whatsapp' | 'email';
      expires_in_minutes: number;
      masked_phone?: string | null;
      masked_email?: string | null;
      whatsapp_sent?: boolean;
      email_sent?: boolean;
    };
  },

  // Verify WhatsApp reset code — same identifier from the request step, NOT a phone
  async verifyWhatsAppCode(identifier: string, code: string) {
    const response = await api.post('/api/auth/verify-whatsapp-code', { identifier, code });
    return response.data as { valid: boolean; token: string; email?: string };
  },

  // Reset password with token (from email link or WhatsApp code verification)
  async resetPasswordWithToken(token: string, newPassword: string) {
    const response = await api.post('/api/auth/reset-password', {
      token,
      new_password: newPassword
    });
    return response.data;
  },

  // Resend email verification link
  async resendVerification(email: string) {
    const response = await api.post('/api/auth/resend-verification', { email });
    return response.data;
  },
};

// ==================== PAYMENT API (AFRIBAPAY) ====================

export const afribaPayAPI = {
  // Initiate an inline payment (Orange Money or Wave)
  async payin(
    taskId: string,
    rail: 'orange_money' | 'wave',
    phoneNumber: string,
    amount: number,
    country: string,
    otpCode?: string,
  ) {
    const body: Record<string, any> = {
      task_id: taskId,
      rail,
      phone_number: phoneNumber,
      amount: Math.round(amount),
      country,
    };
    if (otpCode) body.otp_code = otpCode;
    const response = await api.post('/api/payments/afribapay/payin', body);
    return response.data as {
      order_id: string;
      status: string;
      afribapay_status_code?: string;
      message?: string;
      provider_link?: string; // present for Wave (SN+CI) and Orange Money SN — must be opened
    };
  },

  // Poll for payment status
  async getStatus(orderId: string) {
    const response = await api.get(`/api/payments/afribapay/status/${orderId}`);
    return response.data as {
      order_id: string;
      status: 'pending' | 'success' | 'failed' | 'cancelled' | 'expired';
      amount: number;
      rail: string;
      updated_at: string;
    };
  },
};

// Export the raw axios instance so components can use it directly (e.g. polling in AfribaPayModal)
export { api as apiInstance };

// ==================== TASKER API ====================

export const taskerAPI = {
  /**
   * Search for taskers with advanced filters
   * Supports rating, price range, availability date, text search, and sorting
   */
  async searchTaskers(filters: SearchFilters = {}): Promise<Tasker[]> {
    const params = new URLSearchParams();
    
    // Category filters
    if (filters.categoryId) params.append('category_id', filters.categoryId);
    if (filters.subcategory) params.append('subcategory', filters.subcategory);
    if (filters.service) params.append('service', filters.service);
    
    // Location filters
    if (filters.city) params.append('city', filters.city);
    if (filters.country) params.append('country', filters.country);
    
    // Availability
    if (filters.isAvailable !== undefined) {
      params.append('is_available', filters.isAvailable.toString());
    }
    
    // Rating filter
    if (filters.minRating && filters.minRating > 0) {
      params.append('min_rating', filters.minRating.toString());
    }
    
    // Price range
    if (filters.minPrice) {
      params.append('min_price', filters.minPrice.toString());
    }
    if (filters.maxPrice) {
      params.append('max_price', filters.maxPrice.toString());
    }
    
    // Text search
    if (filters.searchQuery) {
      params.append('search_query', filters.searchQuery);
    }
    
    // Availability date
    if (filters.availableOnDate) {
      params.append('available_on_date', filters.availableOnDate);
    }
    
    // Sorting
    if (filters.sortBy) {
      params.append('sort_by', filters.sortBy);
    }
    
    // Pagination
    if (filters.skip) params.append('skip', filters.skip.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/api/taskers/search?${queryString}` : '/api/taskers/search';
    
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Legacy method - uses searchTaskers internally for backward compatibility
   */
  async getTaskers(params?: {
    category_id?: string;
    subcategory?: string;
    service?: string;
    is_available?: boolean;
    country?: string;
    city?: string;
    skip?: number;
    limit?: number;
  }): Promise<Tasker[]> {
    const filters: SearchFilters = {
      categoryId: params?.category_id,
      subcategory: params?.subcategory,
      service: params?.service,
      isAvailable: params?.is_available,
      country: params?.country,
      city: params?.city,
      skip: params?.skip,
      limit: params?.limit,
    };
    return this.searchTaskers(filters);
  },

  async getTasker(userId: string): Promise<Tasker> {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  async getTaskerProfile(userId: string): Promise<Tasker> {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  // Get current tasker's own profile (recommended for mobile)
  async getMyProfile() {
    const response = await api.get('/api/taskers/profile/me');
    return response.data;
  },

  // Update tasker profile with JSON (recommended for mobile - ensures sync with website)
  async updateProfileJson(profileData: {
    services?: any[];
    bio?: string;
    is_available?: boolean;
  }) {
    const response = await api.put('/api/taskers/profile/json', profileData);
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

  // Get client's own tasks
  async getClientTasks() {
    const response = await api.get('/api/tasks/my-tasks');
    return response.data;
  },

  // Get all tasks for the current user (role-aware: client → client_id, tasker → assigned_tasker_id)
  // Preferred over getTaskerTasks() — no static status filter, future-proof
  async getMyTasks() {
    const response = await api.get('/api/tasks/my-tasks');
    return response.data;
  },

  // Get available tasks for tasker (legacy — static status filter, use getMyTasks() instead)
  async getTaskerTasks() {
    const response = await api.get('/api/tasks/available');
    return response.data;
  },
  
  // Get all tasks (legacy - fallback)
  async getAllTasks() {
    const response = await api.get('/api/tasks');
    return response.data;
  },

  async getTask(taskId: string) {
    const response = await api.get(`/api/tasks/${taskId}`);
    return response.data;
  },

  // ==================== TASK ACTIONS ====================

  async acceptTask(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/accept`);
    return response.data;
  },

  async rejectTask(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/reject`);
    return response.data;
  },

  async cancelTask(taskId: string, reason?: string) {
    const response = await api.post(`/api/tasks/${taskId}/cancel`, { reason });
    return response.data;
  },

  // Complete task - use query param to match website
  async completeTask(taskId: string) {
    const response = await api.put(`/api/tasks/${taskId}/status?new_status=completed`);
    return response.data;
  },

  // Update task status (generic)
  async updateTaskStatus(taskId: string, status: string, cancellationReason?: string) {
    const response = await api.put(`/api/tasks/${taskId}/status?new_status=${status}`, {
      cancellation_reason: cancellationReason,
    });
    return response.data;
  },


  // ==================== TIMER ====================

  async startTimer(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/start-timer`);
    return response.data;
  },

  async stopTimer(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/stop-timer`);
    return response.data;
  },

  async getTimerStatus(taskId: string) {
    const response = await api.get(`/api/tasks/${taskId}/timer-status`);
    return response.data;
  },

  // ==================== GPS TRACKING ====================

  // Start GPS tracking (tasker clicks "En Route")
  async startTracking(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/start-tracking`);
    return response.data;
  },

  // Update tasker location (called every 10-15 seconds)
  async updateLocation(taskId: string, latitude: number, longitude: number) {
    const response = await api.post(`/api/tasks/${taskId}/update-location`, {
      latitude,
      longitude,
    });
    return response.data;
  },

  // Stop GPS tracking
  async stopTracking(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/stop-tracking`);
    return response.data;
  },

  // Get current tasker location (for client to track live on map)
  async getTaskerLocation(taskId: string) {
    const response = await api.get(`/api/tasks/${taskId}/tasker-location`);
    return response.data as {
      tracking_available: boolean;
      location?: {
        latitude: number;
        longitude: number;
        updated_at: string;
      };
      message?: string;
    };
  },

  // Deprecated alias — kept so old callers don't crash during migration
  async getTaskLocation(taskId: string) {
    return this.getTaskerLocation(taskId);
  },

  // Legacy methods (keeping for backward compatibility)
  async startJourney(taskId: string, latitude: number, longitude: number) {
    const response = await api.post(`/api/tasks/${taskId}/start-tracking`);
    return response.data;
  },

  async markArrival(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/arrive`);
    return response.data;
  },

};

// ==================== REVIEW API ====================

export const reviewAPI = {
  // Get all pending reviews for current client
  async getPendingReviews(): Promise<{ pending_reviews: PendingReview[]; count: number }> {
    const response = await api.get('/api/reviews/pending');
    return response.data;
  },

  // Check if specific task can be reviewed
  async canReviewTask(taskId: string): Promise<{ can_review: boolean; reason: string }> {
    const response = await api.get(`/api/reviews/task/${taskId}/can-review`);
    return response.data;
  },

  // Get reviews for a tasker
  async getTaskerReviews(taskerId: string) {
    const response = await api.get(`/api/reviews/tasker/${taskerId}`);
    return response.data;
  },

  // Submit a review
  async createReview(reviewData: {
    task_id: string;
    rating: number;
    comment?: string;
  }) {
    const response = await api.post('/api/reviews', reviewData);
    return response.data;
  },

  // Legacy alias for canReviewTask
  async canReview(taskId: string) {
    return this.canReviewTask(taskId);
  },

  // Live rating + task count for a tasker (never cached)
  async getTaskerRating(taskerId: string): Promise<{
    tasker_id: string;
    average_rating: number;
    total_reviews: number;
    total_completed_tasks: number;
    rating_distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  }> {
    const response = await api.get(`/api/reviews/tasker/${taskerId}/rating`);
    return response.data;
  },
};

// ==================== FAVORITE API ====================

export interface Favorite {
  id: string;
  user_id: string;
  tasker_id: string;
  tasker_name: string;
  tasker_rating: number;
  tasker_profile_image?: string | null;
  tasker_services: string[];
  added_at: string;
}

export const favoriteAPI = {
  // Add a tasker to favorites
  async addFavorite(taskerId: string): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('tasker_id', taskerId);
    
    const response = await api.post('/api/favorites', formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
    });
    return response.data;
  },

  // Remove a tasker from favorites
  async removeFavorite(taskerId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/favorites/${taskerId}`);
    return response.data;
  },

  // Check if a tasker is favorited
  async checkIsFavorite(taskerId: string): Promise<{ is_favorite: boolean }> {
    const response = await api.get(`/api/favorites/check/${taskerId}`);
    return response.data;
  },

  // Get all favorites for current user
  async getFavorites(): Promise<Favorite[]> {
    const response = await api.get('/api/favorites');
    return response.data;
  },

  // Toggle favorite status (convenience method)
  async toggleFavorite(taskerId: string): Promise<{ is_favorite: boolean; message: string }> {
    const { is_favorite } = await this.checkIsFavorite(taskerId);
    
    if (is_favorite) {
      await this.removeFavorite(taskerId);
      return { is_favorite: false, message: 'Removed from favorites' };
    } else {
      await this.addFavorite(taskerId);
      return { is_favorite: true, message: 'Added to favorites' };
    }
  },
};

// ==================== CHAT API ====================

export const chatAPI = {
  // Send a message (matches website endpoint)
  async sendMessage(taskId: string, receiverId: string, content: string) {
    const response = await api.post('/api/messages', {
      task_id: taskId,
      receiver_id: receiverId,
      content,
    });
    return response.data;
  },

  // Get messages for a task (matches website endpoint)
  async getMessages(taskId: string) {
    const response = await api.get(`/api/messages/task/${taskId}`);
    return response.data;
  },

  // Get unread message count
  async getUnreadCount() {
    const response = await api.get('/api/messages/unread');
    return response.data;
  },
};

// ==================== NOTIFICATION API ====================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    task_id?: string;
    sender_id?: string;
    [key: string]: any;
  };
  task_id?: string;
  is_read: boolean;
  created_at: string;
}

export const notificationAPI = {
  // Get all notifications with unread count
  async getNotifications(): Promise<{ notifications: Notification[]; unread_count: number }> {
    const response = await api.get('/api/notifications');
    return {
      notifications: response.data.notifications || response.data || [],
      unread_count: response.data.unread_count || 0,
    };
  },

  // Get unread count only
  async getUnreadCount(): Promise<{ unread_count: number }> {
    const response = await api.get('/api/notifications');
    return { 
      unread_count: response.data.unread_count || 0 
    };
  },

  // Mark single notification as read
  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ success: boolean }> {
    const response = await api.put('/api/notifications/mark-all-read');
    return response.data;
  },

  // Delete single notification
  async deleteNotification(notificationId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },

  // Clear all notifications
  async clearAllNotifications(): Promise<{ success: boolean; deleted_count: number }> {
    const response = await api.delete('/api/notifications/clear-all');
    return response.data;
  },
};

// ==================== PUSH TOKEN API ====================

export const pushTokenAPI = {
  // Register FCM token for push notifications
  async registerToken(token: string, platform: string = 'ios', deviceName?: string) {
    const response = await api.post('/api/push/register-token', {
      fcm_token: token,
      device_type: platform,
      device_name: deviceName || `${platform} device`,
    });
    return response.data;
  },

  // Unregister token on logout
  async unregisterToken() {
    const response = await api.delete('/api/push/unregister-token');
    return response.data;
  },

  // Get notification preferences
  async getPreferences() {
    const response = await api.get('/api/push/preferences');
    return response.data;
  },

  // Update notification preferences
  async updatePreferences(preferences: {
    task_applications?: boolean;
    task_updates?: boolean;
    messages?: boolean;
    payments?: boolean;
    reviews?: boolean;
    marketing?: boolean;
  }) {
    const response = await api.put('/api/push/preferences', preferences);
    return response.data;
  },
};

//==================== IMAGE API ====================

export const imageAPI = {
  // Upload profile picture
  async uploadProfileImage(imageUri: string) {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile_image.jpg',
    } as any);

    const response = await api.post('/api/images/profile', formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
    });
    return response.data;
  },

  // Upload work portfolio image with enhanced options
  async uploadWorkPortfolioImage(
    imageUri: string,
    serviceCategory: string,
    serviceSubcategory: string,
    options?: {
      caption?: string;
      isFeatured?: boolean;
      isBefore?: boolean;
      isAfter?: boolean;
    }
  ) {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'work_image.jpg',
    } as any);
    formData.append('service_category', serviceCategory);
    formData.append('service_subcategory', serviceSubcategory);
    
    // Enhanced options
    if (options?.caption) formData.append('caption', options.caption);
    if (options?.isFeatured) formData.append('is_featured', 'true');
    if (options?.isBefore) formData.append('is_before', 'true');
    if (options?.isAfter) formData.append('is_after', 'true');

    const response = await api.post('/api/images/work-portfolio', formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
    });
    return response.data;
  },

  // NEW: Update existing portfolio image metadata
  async updateWorkPortfolioImage(
    imageId: string,
    updates: {
      caption?: string;
      isFeatured?: boolean;
      isBefore?: boolean;
      isAfter?: boolean;
    }
  ) {
    const formData = new FormData();
    if (updates.caption !== undefined) formData.append('caption', updates.caption);
    if (updates.isFeatured !== undefined) formData.append('is_featured', String(updates.isFeatured));
    if (updates.isBefore !== undefined) formData.append('is_before', String(updates.isBefore));
    if (updates.isAfter !== undefined) formData.append('is_after', String(updates.isAfter));

    const response = await api.patch(`/api/images/work-portfolio/${imageId}`, formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
    });
    return response.data;
  },

  // Get all work portfolio images for current user
  async getWorkPortfolio() {
    const response = await api.get('/api/images/work-portfolio');
    return response.data;
  },

  // Get work portfolio images filtered by service
  async getWorkPortfolioByService(category: string, subcategory: string) {
    const response = await api.get('/api/images/work-portfolio/by-service', {
      params: { category, subcategory },
    });
    return response.data;
  },

  // Get a tasker's work portfolio (public)
  async getTaskerWorkPortfolio(taskerId: string) {
    const response = await api.get(`/api/images/work-portfolio/${taskerId}`);
    return response.data;
  },

  // Delete a work portfolio image
  async deleteWorkPortfolioImage(imageId: string) {
    const response = await api.delete(`/api/images/work-portfolio/${imageId}`);
    return response.data;
  },
};


// ==================== AI ASSISTANT API ====================
// Using the mobile-optimized AI assistant with full app context

export const aiAPI = {
  async chat(message: string, sessionId?: string, chatHistory?: any[]) {
    // Generate a session ID if not provided (required by the backend)
    const effectiveSessionId = sessionId || `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('AI Chat Request:', { message, session_id: effectiveSessionId });
    
    const response = await api.post('/api/ai-assistant/chat', {
      message,
      session_id: effectiveSessionId,
      chat_history: chatHistory || [],
    });
    
    console.log('AI Chat Response:', response.data);
    
    return response.data;
  },
};
// ==================== DISPUTE API ====================

export const disputeAPI = {
  // Create a dispute for a completed task
  async createDispute(taskId: string, reason: string, description: string) {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('reason', reason);
    formData.append('description', description);
    
    const response = await api.post('/api/disputes', formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
    });
    return response.data;
  },

  // Get user's disputes
  async getMyDisputes() {
    const response = await api.get('/api/disputes');
    return response.data;
  },

  // Get specific dispute
  async getDispute(disputeId: string) {
    const response = await api.get(`/api/disputes/${disputeId}`);
    return response.data;
  },
};

// ==================== AVAILABILITY API ====================

export interface DaySchedule {
  enabled: boolean;
  start_time: string;  // "HH:MM" format
  end_time: string;    // "HH:MM" format
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface BlockedDate {
  date: string;       // "YYYY-MM-DD"
  reason?: string;
}

export interface AvailabilitySettings {
  weekly_schedule: WeeklySchedule;
  blocked_dates: BlockedDate[];
  timezone: string;
  min_booking_notice_hours: number;
}

export interface TimeSlot {
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  available: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  day_name: string;
  is_available: boolean;
  slots: TimeSlot[];
  message?: string;
}

export interface CalendarDay {
  date: string;
  day: number;
  day_name: string;
  status: 'available' | 'day_off' | 'blocked' | 'past';
}

export interface CalendarResponse {
  month: number;
  year: number;
  month_name: string;
  days: CalendarDay[];
}

export const availabilityAPI = {
  // ============ TASKER ENDPOINTS ============
  
  // Get tasker's own schedule
  async getMySchedule(): Promise<AvailabilitySettings> {
    const response = await api.get('/api/availability/my-schedule');
    return response.data;
  },

  // Update tasker's schedule
  async updateMySchedule(settings: Partial<AvailabilitySettings>): Promise<{ success: boolean; message: string }> {
    const response = await api.put('/api/availability/my-schedule', settings);
    return response.data;
  },

  // Block a date
  async blockDate(date: string, reason: string = ''): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/api/availability/block-date', { date, reason });
    return response.data;
  },

  // Unblock a date
  async unblockDate(date: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/availability/block-date/${date}`);
    return response.data;
  },

  // ============ CLIENT ENDPOINTS ============
  
  // Get available slots for a tasker on a date
  async getAvailableSlots(taskerId: string, dateStr: string, durationHours: number = 1): Promise<AvailableSlotsResponse> {
    const params = new URLSearchParams({
      date_str: dateStr,
      duration_hours: durationHours.toString()
    });
    const response = await api.get(`/api/availability/tasker/${taskerId}/slots?${params}`);
    return response.data;
  },

  // Get monthly calendar for a tasker
  async getTaskerCalendar(taskerId: string, month: number, year: number): Promise<CalendarResponse> {
    const params = new URLSearchParams({
      month: month.toString(),
      year: year.toString()
    });
    const response = await api.get(`/api/availability/tasker/${taskerId}/calendar?${params}`);
    return response.data;
  }
};


// ==================== SETTINGS API ====================

export interface NotificationPreferences {
  push_notifications: boolean;
  task_updates: boolean;
  messages: boolean;
  payments: boolean;
  reviews: boolean;
  marketing: boolean;
}

export const settingsAPI = {
  // Get notification preferences
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/api/push/preferences');
    return response.data;
  },

  // Update notification preferences
  async updateNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put('/api/push/preferences', prefs);
    return response.data;
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  // Delete account
  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    const response = await api.delete('/api/auth/delete-account');
    return response.data;
  },
};

// ─── Unified Search API ──────────────────────────────────────────
export interface UnifiedSearchResults {
  query: string;
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    type: 'category';
  }>;
  subcategories: Array<{
    name: string;
    category_id: string;
    category_name: string;
    icon: string;
    type: 'subcategory';
  }>;
  taskers: Array<{
    id: string;
    name: string;
    profile_image: string | null;
    rating: number;
    reviews: number;
    hourly_rate: number;
    is_verified: boolean;
    type: 'tasker';
  }>;
}

export const searchAPI = {
  async unifiedSearch(query: string, lang: string = 'en', limit: number = 10): Promise<UnifiedSearchResults> {
    const response = await api.get('/api/search/unified', {
      params: { q: query, lang, limit },
    });
    return response.data;
  },
};

// ==================== VERIFICATION API ====================

export interface VerificationStatus {
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  is_verified: boolean;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  has_id_document: boolean;
  has_selfie: boolean;
}

export const verificationAPI = {
  // Get current verification status
  async getStatus(): Promise<VerificationStatus> {
    const response = await api.get('/api/verification/status');
    return response.data;
  },

  // Submit verification documents (first time)
  async submit(idDocumentUri: string, selfieUri: string, idType: string) {
    const formData = new FormData();
    formData.append('id_document', {
      uri: idDocumentUri,
      type: 'image/jpeg',
      name: 'id_document.jpg',
    } as any);
    formData.append('selfie_with_id', {
      uri: selfieUri,
      type: 'image/jpeg',
      name: 'selfie_with_id.jpg',
    } as any);
    formData.append('id_type', idType);

    const response = await api.post('/api/verification/submit', formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
      timeout: 60000,
    });
    return response.data;
  },

  // Resubmit after rejection
  async resubmit(idDocumentUri: string, selfieUri: string, idType: string) {
    const formData = new FormData();
    formData.append('id_document', {
      uri: idDocumentUri,
      type: 'image/jpeg',
      name: 'id_document.jpg',
    } as any);
    formData.append('selfie_with_id', {
      uri: selfieUri,
      type: 'image/jpeg',
      name: 'selfie_with_id.jpg',
    } as any);
    formData.append('id_type', idType);

    const response = await api.post('/api/verification/resubmit', formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
      timeout: 60000,
    });
    return response.data;
  },
};

// ==================== SOS API ====================

export interface SOSResponse {
  success: boolean;
  alert_id: string;
  message: string;
  emergency_contacts: EmergencyContact[];
  emergency_numbers: Record<string, string>;
  location_link: string | null;
  task_info: any | null;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

  export const sosAPI = {
  async triggerAlert(params: {
    task_id?: string;
    latitude?: number;
    longitude?: number;
    message?: string;
  }): Promise<SOSResponse> {
    const response = await api.post('/api/sos/alert', {
      task_id: params.task_id,
      latitude: params.latitude,
      longitude: params.longitude,
      message: params.message,
    });
    return response.data;
  },
};

// ==================== EMERGENCY CONTACTS API ====================

export const emergencyContactsAPI = {
  async getContacts(): Promise<{ contacts: EmergencyContact[] }> {
    const response = await api.get('/api/emergency-contacts');
    return response.data;
  },

  async updateContacts(contacts: EmergencyContact[]): Promise<{ success: boolean; message: string; contacts: EmergencyContact[] }> {
    const response = await api.put('/api/emergency-contacts', { contacts });
    return response.data;
  },
};

// ==================== WORK ASSESSMENT (CERTIFY) ====================

export type AssessmentAction = 'certify' | 'request_adjustment' | 'decline';
export type ClientResponseAction = 'accept' | 'decline' | 'counter_offer';

export type AssessmentStatusValue =
  | 'certified'
  | 'adjustment_requested'
  | 'adjustment_approved'
  | 'adjustment_declined'
  | 'declined_by_tasker';

export interface AssessmentPhoto {
  url: string;
  uploaded_at: string;
  filename: string;
}

export interface WorkAssessment {
  status: AssessmentStatusValue;
  assessed_at: string;
  certified: boolean;
  original_price: number;
  final_agreed_price?: number;
  proposed_price?: number;
  adjustment_reason?: string;
  decline_reason?: string;
  assessment_notes?: string;
  client_response?: 'accepted' | 'declined' | 'counter_offer';
  client_counter_offer?: number;
  counter_offer_note?: string;
  response_note?: string;
  assessment_photos?: AssessmentPhoto[];
  expires_at?: string;
}

export interface AssessmentStatusResponse {
  task_id: string;
  task_status: string;
  assessment: WorkAssessment | null;
  requires_assessment: boolean;
  waiting_for_client: boolean;
  waiting_for_tasker: boolean;
}

export const assessmentAPI = {
  // --------- TASKER ACTIONS ---------

  // Submit the work assessment (called after the tasker arrives)
  async submitAssessment(
    taskId: string,
    payload: {
      action: AssessmentAction;
      proposed_price?: number;      // required when action = 'request_adjustment'
      adjustment_reason?: string;   // required when action = 'request_adjustment'
      decline_reason?: string;      // required when action = 'decline'
      assessment_notes?: string;
    }
  ) {
    const response = await api.post(`/api/tasks/${taskId}/assess`, payload);
    return response.data as {
      success: boolean;
      message: string;
      status: string;
      assessment: WorkAssessment;
      can_start_timer?: boolean;
      waiting_for_client?: boolean;
    };
  },

  // Upload up to 5 photos to support an adjustment request
  async uploadAssessmentPhotos(taskId: string, photoUris: string[]) {
    const formData = new FormData();
    photoUris.slice(0, 5).forEach((uri, idx) => {
      formData.append('photos', {
        uri,
        type: 'image/jpeg',
        name: `assessment_${Date.now()}_${idx}.jpg`,
      } as any);
    });
    const response = await api.post(
      `/api/tasks/${taskId}/assess/photos`,
      formData,
      {
        headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
        timeout: 60000,
      }
    );
    return response.data as {
      success: boolean;
      message: string;
      photos: AssessmentPhoto[];
    };
  },

  // Tasker accepts the client's counter-offer
  async acceptCounterOffer(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/assess/accept-counter`);
    return response.data as {
      success: boolean;
      message: string;
      status: string;
      final_price: number;
      can_start_timer: boolean;
    };
  },

  // Tasker declines the client's counter-offer (task will be cancelled)
  async declineCounterOffer(taskId: string) {
    const response = await api.post(`/api/tasks/${taskId}/assess/decline-counter`);
    return response.data as {
      success: boolean;
      message: string;
      status: string;
    };
  },

  // --------- CLIENT ACTIONS ---------

  // Client responds to the tasker's adjustment request
  async respondToAdjustment(
    taskId: string,
    payload: {
      action: ClientResponseAction;
      counter_offer_price?: number; // required when action = 'counter_offer'
      response_note?: string;
    }
  ) {
    const response = await api.post(`/api/tasks/${taskId}/assess/respond`, payload);
    return response.data as {
      success: boolean;
      message: string;
      status: string;
      final_price?: number;
      counter_offer?: number;
      assessment: WorkAssessment;
    };
  },

  // --------- SHARED ---------

  // Poll to know if an assessment step is required / pending
  async getAssessmentStatus(taskId: string): Promise<AssessmentStatusResponse> {
    const response = await api.get(`/api/tasks/${taskId}/assessment`);
    return response.data;
  },
};

export default api;
