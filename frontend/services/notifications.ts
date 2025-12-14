import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

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
    await api.post('/api/push-tokens', {
      token,
      device_type: Platform.OS,
    });
    console.log('Push token saved to backend');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

export function setupNotificationListeners(navigation: any) {
  // Handle notification when app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  // Handle notification response (when user taps on notification)
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data.type === 'new_message' && data.task_id) {
      navigation.navigate('chat', { id: data.task_id });
    } else if (data.type === 'new_booking' || data.type === 'task_accepted') {
      navigation.navigate('(tabs)', { screen: 'bookings' });
    } else if (data.type === 'en_route' || data.type === 'arrived') {
      navigation.navigate('(tabs)', { screen: 'bookings' });
    }
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
