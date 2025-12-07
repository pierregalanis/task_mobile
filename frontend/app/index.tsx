import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/Loading';
import { Colors } from '../constants/Colors';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    console.log('Index - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user?.email, 'segments:', segments);
    
    if (isLoading) {
      console.log('Still loading auth state...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('inAuthGroup:', inAuthGroup, 'inTabsGroup:', inTabsGroup);

    if (isAuthenticated && !inTabsGroup) {
      console.log('Redirecting to home...');
      router.replace('/(tabs)/home');
    } else if (!isAuthenticated && !inAuthGroup) {
      console.log('Redirecting to welcome...');
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated, isLoading, segments, user]);

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
