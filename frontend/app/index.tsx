import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';
import { Loading } from '../components/Loading';

const ONBOARDING_KEY = '@onboarding_complete';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasSeenOnboarding(onboardingComplete === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasSeenOnboarding(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  useEffect(() => {
    console.log('Index - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user?.email, 'segments:', segments);
    console.log('Index - checkingOnboarding:', checkingOnboarding, 'hasSeenOnboarding:', hasSeenOnboarding);
    
    if (isLoading || checkingOnboarding) {
      console.log('Still loading...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';

    console.log('inAuthGroup:', inAuthGroup, 'inTabsGroup:', inTabsGroup, 'inOnboarding:', inOnboarding);

    if (!hasSeenOnboarding && !inOnboarding) {
      console.log('Redirecting to onboarding...');
      router.replace('/onboarding');
      return;
    }

    if (isAuthenticated && !inTabsGroup) {
      console.log('Redirecting to home...');
      router.replace('/(tabs)/home');
    } else if (!isAuthenticated && !inAuthGroup) {
      console.log('Redirecting to welcome...');
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated, isLoading, segments, user, checkingOnboarding, hasSeenOnboarding]);

  if (isLoading || checkingOnboarding) {
    return (
      <View style={styles.container}>
        <Loading message="Loading..." />
      </View>
    );
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