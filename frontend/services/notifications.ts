import { pushTokenAPI } from './api';

// Token registration happens in hooks/usePushNotifications.ts (the single
// live path, re-run whenever the authenticated user changes). Notification-
// tap navigation routing also lives there, via PushNotificationContext —
// don't duplicate either here.

export async function removePushToken() {
  try {
    // Unregister token on logout
    await pushTokenAPI.unregisterToken();
    console.log('Push token removed from backend');
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

