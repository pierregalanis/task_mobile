import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on both mobile and web
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>
) => {
  if (Platform.OS === 'web') {
    // Web: Use browser's confirm/alert
    if (buttons && buttons.length > 1) {
      // Has multiple buttons - use confirm
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      const cancelButton = buttons.find(b => b.style === 'cancel');
      
      const confirmed = window.confirm(`${title}\n\n${message || ''}`);
      
      if (confirmed && confirmButton?.onPress) {
        confirmButton.onPress();
      } else if (!confirmed && cancelButton?.onPress) {
        cancelButton.onPress();
      }
    } else if (buttons && buttons.length === 1) {
      // Single button - use alert
      window.alert(`${title}\n\n${message || ''}`);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else {
      // No buttons - just show alert
      window.alert(`${title}\n\n${message || ''}`);
    }
  } else {
    // Mobile: Use native Alert
    Alert.alert(title, message, buttons);
  }
};

/**
 * Simple alert for error/info messages
 */
export const showMessage = (title: string, message?: string, onOk?: () => void) => {
  showAlert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
};

/**
 * Confirmation dialog
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'OK',
  cancelText: string = 'Cancel'
) => {
  showAlert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
};

export default { showAlert, showMessage, showConfirm };
