import React, { createContext, useContext, ReactNode } from 'react';
import usePushNotifications, { PushNotificationState } from '../hooks/usePushNotifications';
import * as Notifications from 'expo-notifications';

interface PushNotificationContextType extends PushNotificationState {
  registerForPushNotifications: () => Promise<string | null>;
  unregisterToken: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | null>(null);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const pushNotifications = usePushNotifications();

  return (
    <PushNotificationContext.Provider value={pushNotifications}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotificationContext must be used within a PushNotificationProvider');
  }
  return context;
}

export default PushNotificationProvider;
