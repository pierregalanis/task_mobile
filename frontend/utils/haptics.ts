import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Light tap feedback — selections, toggles, accepting a task.
 */
export const hapticLight = () => {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/**
 * Success feedback — payment received, task completed, booking confirmed.
 */
export const hapticSuccess = () => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/**
 * Warning feedback — invalid code, declined task, payment failed.
 */
export const hapticWarning = () => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
