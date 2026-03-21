import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeMode } from '../constants/Colors';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: typeof Colors.dark;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@soutrali_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Determine if dark mode based on theme setting
  const isDark = useMemo(() => {
    if (theme === 'system') {
      return systemColorScheme === 'dark' || systemColorScheme === null;
    }
    return theme === 'dark';
  }, [theme, systemColorScheme]);

  // Get the appropriate colors
  const colors = useMemo(() => {
    return isDark ? Colors.dark : Colors.light;
  }, [isDark]);

  const value = useMemo(() => ({
    theme,
    isDark,
    colors,
    setTheme,
  }), [theme, isDark, colors]);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default dark theme if used outside provider
    return {
      theme: 'dark',
      isDark: true,
      colors: Colors.dark,
      setTheme: () => {},
    };
  }
  return context;
};
