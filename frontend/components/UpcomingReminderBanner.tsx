import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

interface UpcomingReminderBannerProps {
  taskDate: string;
  status: string;
}

export default function UpcomingReminderBanner({ taskDate, status }: UpcomingReminderBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [urgency, setUrgency] = useState<'normal' | 'soon' | 'urgent'>('normal');
  const [visible, setVisible] = useState(false);

  const isEn = i18n.locale === 'en';

  useEffect(() => {
    const calculateTime = () => {
      if (!taskDate) {
        setVisible(false);
        return;
      }

      // Don't show for completed or cancelled tasks
      if (['completed', 'cancelled'].includes(status)) {
        setVisible(false);
        return;
      }

      const now = new Date();
      const task = new Date(taskDate);
      const diffMs = task.getTime() - now.getTime();
      const hoursUntil = diffMs / (1000 * 60 * 60);

      // Don't show if task is past or more than 48 hours away
      if (hoursUntil < 0 || hoursUntil > 48) {
        setVisible(false);
        return;
      }

      setVisible(true);

      // Determine urgency and message
      if (hoursUntil <= 2) {
        const minutes = Math.round(hoursUntil * 60);
        setTimeLeft(
          isEn 
            ? `Starting in ${minutes} minute${minutes !== 1 ? 's' : ''}!`
            : `Commence dans ${minutes} minute${minutes !== 1 ? 's' : ''} !`
        );
        setUrgency('urgent');
      } else if (hoursUntil <= 24) {
        const hours = Math.round(hoursUntil);
        setTimeLeft(
          isEn 
            ? `Starting in ${hours} hour${hours !== 1 ? 's' : ''}`
            : `Commence dans ${hours} heure${hours !== 1 ? 's' : ''}`
        );
        setUrgency('soon');
      } else {
        setTimeLeft(isEn ? 'Starting tomorrow' : 'Commence demain');
        setUrgency('normal');
      }
    };

    calculateTime();
    // Update every minute
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [taskDate, status, isEn]);

  if (!visible) return null;

  const getIcon = () => {
    switch (urgency) {
      case 'urgent': return 'flash';
      case 'soon': return 'alarm';
      default: return 'calendar';
    }
  };

  return (
    <View style={[styles.container, styles[urgency]]}>
      <Ionicons 
        name={getIcon()} 
        size={20} 
        color={urgency === 'urgent' ? '#dc2626' : urgency === 'soon' ? '#d97706' : '#2563eb'} 
      />
      <Text style={[styles.text, styles[`${urgency}Text`]]}>{timeLeft}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  normal: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  soon: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  urgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  normalText: {
    color: '#2563eb',
  },
  soonText: {
    color: '#d97706',
  },
  urgentText: {
    color: '#dc2626',
  },
});