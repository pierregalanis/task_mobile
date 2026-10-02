import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, LoginCredentials, RegisterData, User } from '../services/api';
import { storage } from '../utils/storage';
import { removePushToken } from '../services/notifications';

type ActiveMode = 'client' | 'tasker';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeMode: ActiveMode;
  switchMode: (mode: ActiveMode) => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Default 'client' is only ever visible for an instant before resolveActiveMode
  // runs — client accounts never get a switch, so it's always correct for them.
  const [activeMode, setActiveMode] = useState<ActiveMode>('client');

  // Client accounts are always in client mode. Tasker accounts default to
  // 'tasker' (pro) unless they'd previously switched to client mode.
  const resolveActiveMode = async (userData: User) => {
    if (userData.role !== 'tasker') {
      setActiveMode('client');
      return;
    }
    const savedMode = await storage.getActiveMode();
    setActiveMode(savedMode ?? 'tasker');
  };

  const switchMode = async (mode: ActiveMode) => {
    if (user?.role !== 'tasker') return; // only tasker accounts can switch
    setActiveMode(mode);
    await storage.saveActiveMode(mode);
  };

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
        await resolveActiveMode(userData);
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
      await resolveActiveMode(userData);
      console.log('User state updated');

      // Push token registration happens in usePushNotifications' own effect,
      // which re-runs whenever `user` changes (including this login) — no
      // need to duplicate it here.

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
        await resolveActiveMode(userData);

        // Push token registration happens in usePushNotifications' own
        // effect, which re-runs whenever `user` changes — no duplicate call
        // needed here.
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
      setActiveMode('client');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      await storage.saveUser(userData);
      setUser(userData);
      // Re-resolve mode too — matters right after becoming a pro, where role
      // just flipped client -> tasker and there's no saved mode yet (defaults
      // to 'tasker' so the user lands in pro-profile setup, per spec).
      await resolveActiveMode(userData);
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
        activeMode,
        switchMode,
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