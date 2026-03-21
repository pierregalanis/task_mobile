import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { pushTokenAPI, notificationAPI } from '../services/api';
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

// ==================== NOTIFICATION TYPES (match backend exactly) ====================
// All types use snake_case - no camelCase or kebab-case
const NotificationTypes = {
  // Core task notifications
  NEW_BOOKING_REQUEST: 'new_booking_request',
  TASK_ACCEPTED: 'task_accepted',
  TASK_REJECTED: 'task_rejected',
  TASK_COMPLETED: 'task_completed',
  TASK_CANCELLED: 'task_cancelled',
  TASK_APPLICATION: 'task_application',
  WORK_STARTED: 'work_started',
  TASK_REMINDER: 'task_reminder',
  
  // Location
  TASKER_ARRIVED: 'tasker_arrived',
  TASKER_ON_WAY: 'tasker_on_way',  // NOT "en_route"
  
  // Payment
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  
  // Communication
  NEW_MESSAGE: 'new_message',
  
  // Reviews
  NEW_REVIEW: 'new_review',
  REVIEW_RECEIVED: 'review_received',
  
  // Disputes
  DISPUTE_RAISED: 'dispute_raised',    // NOT "dispute_opened"
  DISPUTE_RESOLVED: 'dispute_resolved',
  
  // Other
  PROFILE_VERIFIED: 'profile_verified',
  GENERAL: 'general'
};

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
  // FLOW: Tap → Mark as read FIRST → Navigate to relevant screen
  const handleNotificationResponse = useCallback(async (response: Notifications.NotificationResponse) => {
    console.log('Notification tapped:', response);
    
    const data = response.notification.request.content.data;
    console.log('Notification data:', JSON.stringify(data, null, 2));
    
    // Backend uses snake_case: type, task_id, notification_id
    const notificationType = data?.type || '';
    const taskId = data?.task_id;
    const notificationId = data?.notification_id;

    // ✅ MARK AS READ FIRST (before navigating)
    if (notificationId) {
      try {
        await notificationAPI.markAsRead(notificationId);
        console.log('Notification marked as read:', notificationId);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        // Continue with navigation even if mark-as-read fails
      }
    }

    try {
      switch (notificationType) {
        // ==================== MESSAGES → CHAT ====================
        case NotificationTypes.NEW_MESSAGE:
          if (taskId) {
            console.log('Navigating to chat for task:', taskId);
            router.push(`/chat/${taskId}`);
          } else {
            router.push('/(tabs)/bookings');
          }
          break;

        // ==================== REVIEWS → REVIEWS SCREEN ====================
        case NotificationTypes.NEW_REVIEW:
        case NotificationTypes.REVIEW_RECEIVED:
          console.log('Navigating to reviews');
          router.push('/tasker/my-reviews');
          break;

        // ==================== PAYMENT RECEIVED → EARNINGS ====================
        case NotificationTypes.PAYMENT_RECEIVED:
          console.log('Navigating to earnings');
          router.push('/tasker/my-earnings');
          break;

        // ==================== PROFILE VERIFIED → PROFILE ====================
        case NotificationTypes.PROFILE_VERIFIED:
          console.log('Navigating to profile');
          router.push('/(tabs)/profile');
          break;

        // ==================== GENERAL → NOTIFICATIONS LIST ====================
        case NotificationTypes.GENERAL:
          console.log('Navigating to notifications');
          router.push('/notifications');
          break;

        // ==================== ALL TASK-RELATED → TASK DETAILS ====================
        case NotificationTypes.NEW_BOOKING_REQUEST:
        case NotificationTypes.TASK_ACCEPTED:
        case NotificationTypes.TASK_REJECTED:
        case NotificationTypes.TASK_COMPLETED:
        case NotificationTypes.TASK_CANCELLED:
        case NotificationTypes.TASK_APPLICATION:
        case NotificationTypes.WORK_STARTED:
        case NotificationTypes.TASK_REMINDER:
        case NotificationTypes.TASKER_ARRIVED:
        case NotificationTypes.TASKER_ON_WAY:
        case NotificationTypes.PAYMENT_CONFIRMED:
        case NotificationTypes.DISPUTE_RAISED:
        case NotificationTypes.DISPUTE_RESOLVED:
          if (taskId) {
            console.log('Navigating to task:', taskId);
            router.push(`/task/${taskId}`);
          } else {
            router.push('/(tabs)/bookings');
          }
          break;

        // ==================== DEFAULT ====================
        default:
          console.log('Unknown notification type:', notificationType);
          // If we have a task_id, go to that task
          if (taskId) {
            router.push(`/task/${taskId}`);
          } else {
            router.push('/notifications');
          }
          break;
      }
    } catch (err) {
      console.error('Error handling notification navigation:', err);
      router.push('/notifications');
    }
  }, [router]);

  // Set up listeners on mount
  useEffect(() => {
    // Register for push notifications when user is authenticated
    if (user && isAuthenticated) {
      registerForPushNotifications();
    }

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // Check if app was opened from a notification (cold start)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log('App opened from notification (cold start):', response);
        // Small delay to ensure router is ready
        setTimeout(() => {
          handleNotificationResponse(response);
        }, 500);
      }
    });

    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        try {
          notificationListener.current.remove();
        } catch (e) {
          console.log('Could not remove notification listener');
        }
      }
      if (responseListener.current) {
        try {
          responseListener.current.remove();
        } catch (e) {
          console.log('Could not remove response listener');
        }
      }
    };
  }, [user, registerForPushNotifications, handleNotificationReceived, handleNotificationResponse]);

  // Re-register token when user changes
  useEffect(() => {
    if (user && isAuthenticated && expoPushToken) {
      pushTokenAPI.registerToken(expoPushToken, Platform.OS)
        .then(() => console.log('Token re-registered for user:', user.id))
        .catch((err) => console.error('Failed to re-register token:', err));
    }
  }, [user?.id, isAuthenticated, expoPushToken]);

  // Unregister token on logout
  const unregisterToken = useCallback(async () => {
    if (expoPushToken) {
      try {
        await pushTokenAPI.unregisterToken();
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
