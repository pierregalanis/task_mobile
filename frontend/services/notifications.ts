import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { pushTokenAPI } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Get FCM token for Firebase Cloud Messaging
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id' // This will use the default Expo project ID
    })).data;
    
    console.log('Push token:', token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushToken(token: string) {
  try {
    // Use the new FCM token registration endpoint
    await pushTokenAPI.registerToken(
      token,
      Platform.OS,
      `${Platform.OS} ${Device.modelName || 'device'}`
    );
    console.log('Push token saved to backend');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

export async function removePushToken() {
  try {
    // Unregister token on logout
    await pushTokenAPI.unregisterToken();
    console.log('Push token removed from backend');
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

/**
 * Handle notification routing based on notification type and data
 * Uses Expo Router for navigation
 */
export function handleNotificationNavigation(data: any) {
  console.log('Handling notification navigation:', data);
  
  const notificationType = data.type || data.notification_type;
  const taskId = data.task_id || data.taskId;
  const taskerId = data.tasker_id || data.taskerId;
  const reviewId = data.review_id || data.reviewId;

  try {
    switch (notificationType) {
      // ==================== MESSAGE NOTIFICATIONS ====================
      case 'new_message':
      case 'message':
      case 'chat_message':
        if (taskId) {
          router.push(`/chat/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      // ==================== TASK NOTIFICATIONS ====================
      case 'task_application':
      case 'new_task':
      case 'task_assigned':
        // Tasker received a new task request
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      case 'task_accepted':
      case 'task_confirmed':
        // Client's task was accepted by tasker
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      case 'task_rejected':
      case 'task_declined':
        // Task was declined
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      case 'task_cancelled':
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      case 'task_completed':
      case 'task_finished':
        // Task was marked as completed
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      case 'task_update':
      case 'task_status':
        // Generic task status update
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      // ==================== TRACKING NOTIFICATIONS ====================
      case 'en_route':
      case 'tasker_en_route':
        // Tasker is on the way - open tracking
        if (taskId) {
          router.push(`/tracking/${taskId}?mode=client`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      case 'arrived':
      case 'tasker_arrived':
        // Tasker has arrived
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      case 'timer_started':
      case 'work_started':
        // Work timer started
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      // ==================== PAYMENT NOTIFICATIONS ====================
      case 'payment_received':
      case 'payment_completed':
      case 'payment':
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/tasker/my-earnings');
        }
        break;

      case 'payment_pending':
      case 'awaiting_payment':
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      // ==================== REVIEW NOTIFICATIONS ====================
      case 'new_review':
      case 'review_received':
      case 'review':
        // Someone left a review - go to task details or reviews page
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else if (taskerId) {
          router.push(`/tasker/${taskerId}`);
        } else {
          router.push('/(tabs)/profile');
        }
        break;

      case 'review_reminder':
      case 'pending_review':
        // Reminder to leave a review
        if (taskId) {
          router.push(`/review?taskId=${taskId}`);
        } else {
          router.push('/(tabs)/home');
        }
        break;

      // ==================== DISPUTE NOTIFICATIONS ====================
      case 'dispute_opened':
      case 'dispute_update':
      case 'dispute_resolved':
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          router.push('/(tabs)/bookings');
        }
        break;

      // ==================== PROMO/MARKETING ====================
      case 'promo':
      case 'marketing':
      case 'announcement':
        router.push('/(tabs)/home');
        break;

      // ==================== DEFAULT ====================
      default:
        console.log('Unknown notification type:', notificationType);
        // If we have a task_id, go to that task
        if (taskId) {
          router.push(`/task/${taskId}`);
        } else {
          // Otherwise go to notifications list
          router.push('/notifications');
        }
        break;
    }
  } catch (error) {
    console.error('Error navigating from notification:', error);
    // Fallback to notifications screen
    router.push('/notifications');
  }
}

export function setupNotificationListeners() {
  // Handle notification when app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received (foreground):', notification);
    // Optionally show an in-app alert or update badge
  });

  // Handle notification response (when user taps on notification)
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    
    const data = response.notification.request.content.data;
    handleNotificationNavigation(data);
  });

  return { notificationListener, responseListener };
}

export function cleanupNotificationListeners(listeners: any) {
  if (listeners.notificationListener) {
    Notifications.removeNotificationSubscription(listeners.notificationListener);
  }
  if (listeners.responseListener) {
    Notifications.removeNotificationSubscription(listeners.responseListener);
  }
}

/**
 * Check if app was opened from a notification (cold start)
 * Call this in your root layout's useEffect
 */
export async function getInitialNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    console.log('App opened from notification:', response);
    const data = response.notification.request.content.data;
    // Small delay to ensure router is ready
    setTimeout(() => {
      handleNotificationNavigation(data);
    }, 500);
  }
}
