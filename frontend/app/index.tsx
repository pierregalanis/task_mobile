import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/Loading';
import { Colors } from '../constants/Colors';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (isAuthenticated && !inTabsGroup) {
      // User is authenticated, redirect to main app
      router.replace('/(tabs)/home');
    } else if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated, redirect to welcome
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return <Loading message="Loading..." />;
  }

  return (
    <View style={styles.container}>
      <Loading />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
});
