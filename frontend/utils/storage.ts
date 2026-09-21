import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const LANGUAGE_KEY = 'app_language';
const BLOCKED_USERS_KEY = 'blocked_users';

export const storage = {
  // Token management
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // User data management
  async saveUser(user: any): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  async getUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  // Language preference
  async saveLanguage(language: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  },

  async getLanguage(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LANGUAGE_KEY);
    } catch (error) {
      console.error('Error getting language:', error);
      return null;
    }
  },

  // Blocked users — client-side enforcement of the in-app "block" mechanism.
  // Prevents further contact with a specific user within chat on this device.
  async getBlockedUsers(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }
  },

  async isUserBlocked(userId: string): Promise<boolean> {
    const blocked = await this.getBlockedUsers();
    return blocked.includes(userId);
  },

  async blockUser(userId: string): Promise<void> {
    try {
      const blocked = await this.getBlockedUsers();
      if (!blocked.includes(userId)) {
        await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify([...blocked, userId]));
      }
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  },

  async unblockUser(userId: string): Promise<void> {
    try {
      const blocked = await this.getBlockedUsers();
      await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blocked.filter(id => id !== userId)));
    } catch (error) {
      console.error('Error unblocking user:', error);
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
