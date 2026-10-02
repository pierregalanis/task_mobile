import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TabsLayout() {
  const { activeMode } = useAuth();
  const { locale, t } = useLanguage();
  const insets = useSafeAreaInsets();
  // Tab visibility follows the current mode, not the account's real role —
  // a tasker browsing in client mode sees the client tabs, and vice versa.
  const isTasker = activeMode === 'tasker';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.dark.card,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          paddingHorizontal: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      
      {/* Tasker Dashboard - Only for taskers */}
      <Tabs.Screen
        name="tasker-dashboard"
        options={{
          title: locale === 'fr' ? 'Mes Tâches' : 'My Tasks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
          href: isTasker ? '/tasker-dashboard' : null,
        }}
      />

      <Tabs.Screen
        name="taskers"
        options={{
          title: t('taskers.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          // Hide for taskers - they don't need to browse other taskers
          href: isTasker ? null : '/taskers',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('bookings.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      
      {/* Hidden screens that are part of tabs but not shown in tab bar */}
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
