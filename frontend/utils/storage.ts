import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const LANGUAGE_KEY = 'app_language';

export const storage = {
  // Token management
  async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // User data management
  async saveUser(user: any): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  async getUser(): Promise<any | null> {
    try {
      const userData = await SecureStore.getItemAsync(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  // Language preference
  async saveLanguage(language: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  },

  async getLanguage(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(LANGUAGE_KEY);
    } catch (error) {
      console.error('Error getting language:', error);
      return null;
    }
  },

  // Clear all data
  async clearAll(): Promise<void> {
    try {
      await this.removeToken();
      await this.removeUser();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
