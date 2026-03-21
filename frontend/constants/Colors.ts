export type ThemeMode = 'light' | 'dark' | 'system';

export const Colors = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    primary: '#10b981',
    primaryDark: '#059669',
    border: '#e2e8f0',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
  },
  dark: {
    background: '#0c0c0c',
    card: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    primary: '#10b981',
    primaryDark: '#059669',
    border: '#2a2a2a',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
  },
};

// Helper to get colors based on theme
export const getColors = (isDark: boolean) => {
  return isDark ? Colors.dark : Colors.light;
};