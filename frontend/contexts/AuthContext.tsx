import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, LoginCredentials, RegisterData, User } from '../services/api';
import { storage } from '../utils/storage';
import { registerForPushNotificationsAsync, savePushToken, removePushToken } from '../services/notifications';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext: Initializing...');
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      console.log('AuthContext: Loading user...');
      const token = await storage.getToken();
      console.log('AuthContext: Token exists:', !!token);
      if (token) {
        console.log('AuthContext: Fetching current user...');
        const userData = await authAPI.getCurrentUser();
        console.log('AuthContext: User loaded:', userData.email);
        setUser(userData);
      } else {
        console.log('AuthContext: No token found');
      }
    } catch (error) {
      console.error('AuthContext: Error loading user:', error);
      await storage.clearAll();
    } finally {
      console.log('AuthContext: Loading complete');
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('Attempting login with:', credentials.email);
      const response = await authAPI.login(credentials);
      console.log('Login response:', response);
      
      // Handle both 'token' and 'access_token' response formats
      const token = response.token || response.access_token;
      console.log('Token extracted:', token ? 'YES' : 'NO');
      await storage.saveToken(token);
      console.log('Token saved');
      
      // Get user data after login
      console.log('Fetching user data...');
      const userData = await authAPI.getCurrentUser();
      console.log('User data received:', userData);
      await storage.saveUser(userData);
      console.log('User data saved');
      setUser(userData);
      console.log('User state updated');
      
      // Register for push notifications after successful login
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await savePushToken(pushToken);
          console.log('Push notifications registered successfully');
        }
      } catch (error) {
        console.error('Failed to register push notifications:', error);
      }
      
      console.log('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      console.log('Registration attempt:', data.email);
      const response = await authAPI.register(data);
      console.log('Registration successful');
      
      // Production API returns user data without token
      // User needs to login after registration
      // The signup screen handles redirecting to login
      
      // If response includes a token (some backends auto-login), handle it
      const token = response.token || response.access_token;
      if (token) {
        await storage.saveToken(token);
        
        // Use user data from response if available, otherwise fetch
        let userData = response.user || response;
        if (!userData.id) {
          userData = await authAPI.getCurrentUser();
        }
        await storage.saveUser(userData);
        setUser(userData);
        
        // Register for push notifications after successful registration
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await savePushToken(pushToken);
            console.log('Push notifications registered successfully');
          }
        } catch (error) {
          console.error('Failed to register push notifications:', error);
        }
      }
      
      // Return the response so signup screen knows registration succeeded
      return response;
    } catch (error: any) {
      console.error('Register error:', error);
      console.error('Register error details:', error.response?.data);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      // Unregister push token before logging out
      try {
        await removePushToken();
        console.log('Push token unregistered');
      } catch (error) {
        console.error('Error removing push token:', error);
      }
      
      await storage.clearAll();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      await storage.saveUser(userData);
      setUser(userData);
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}