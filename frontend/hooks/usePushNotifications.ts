import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { pushTokenAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    let pushToken: string | null = null;

    // Check if running on a physical device
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      // For web/simulator, we can still set up the listeners but won't get a token
      if (Platform.OS === 'web') {
        console.log('Web platform detected - push notifications have limited support');
      }
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setError('Permission for push notifications was denied');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log('No project ID found - using default');
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      pushToken = tokenResponse.data;
      console.log('Expo Push Token:', pushToken);
      setExpoPushToken(pushToken);

      // Register token with backend if user is authenticated
      if (user && isAuthenticated && pushToken) {
        try {
          await pushTokenAPI.registerToken(pushToken, Platform.OS);
          console.log('Push token registered with backend');
        } catch (err) {
          console.error('Failed to register token with backend:', err);
        }
      }

    } catch (err: any) {
      console.error('Error registering for push notifications:', err);
      setError(err.message || 'Failed to register for push notifications');
    }

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
      });
    }

    return pushToken;
  }, [user, isAuthenticated]);

  // Handle notification received while app is open
  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
    console.log('Notification received:', notification);
    setNotification(notification);
  }, []);

  // Handle notification response (user tapped notification)
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    console.log('Notification response:', response);
    
    const data = response.notification.request.content.data;
    
    // Navigate based on notification data
    if (data?.task_id) {
      router.push(`/task/${data.task_id}`);
    } else if (data?.screen) {
      router.push(data.screen as string);
    }
  }, [router]);

  // Set up listeners on mount
  useEffect(() => {
    // Register for push notifications when user is authenticated
    if (user && token) {
      registerForPushNotifications();
    }

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        try {
          notificationListener.current.remove();
        } catch (e) {
          // Fallback for web where removeNotificationSubscription may not exist
          console.log('Could not remove notification listener');
        }
      }
      if (responseListener.current) {
        try {
          responseListener.current.remove();
        } catch (e) {
          // Fallback for web
          console.log('Could not remove response listener');
        }
      }
    };
  }, [user, registerForPushNotifications, handleNotificationReceived, handleNotificationResponse]);

  // Re-register token when user changes
  useEffect(() => {
    if (user && token && expoPushToken) {
      pushTokenAPI.registerToken(expoPushToken, Platform.OS)
        .then(() => console.log('Token re-registered for user:', user.id))
        .catch((err) => console.error('Failed to re-register token:', err));
    }
  }, [user?.id, token, expoPushToken]);

  // Unregister token on logout
  const unregisterToken = useCallback(async () => {
    if (expoPushToken) {
      try {
        await pushTokenAPI.unregisterToken(expoPushToken);
        console.log('Push token unregistered');
      } catch (err) {
        console.error('Failed to unregister token:', err);
      }
    }
  }, [expoPushToken]);

  return {
    expoPushToken,
    notification,
    error,
    registerForPushNotifications,
    unregisterToken,
  };
}

// Helper function to schedule a local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  seconds: number = 1
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}

// Helper function to cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Helper function to get badge count
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Helper function to set badge count
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export default usePushNotifications;
