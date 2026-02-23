import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { notificationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

interface Notification {
  id: string;
  type: string;
  task_id?: string;
  task_title?: string;
  message?: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationAPI.getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.task_id) {
      router.push(`/task/${notification.task_id}`);
    }
  };

  // Generate notification text based on type and task_title
  const getNotificationText = (notification: Notification): { title: string; message: string } => {
    const { type, task_title, message } = notification;
    const title = task_title || (i18n.locale === 'fr' ? 'votre tâche' : 'your task');
    
    // If message exists, use it
    if (message) {
      return {
        title: getNotificationTitle(type),
        message: message,
      };
    }
    
    // Generate text based on type
    if (i18n.locale === 'fr') {
      switch (type) {
        case 'task_accepted':
          return {
            title: 'Tâche acceptée',
            message: `Votre tâche "${title}" a été acceptée !`,
          };
        case 'task_rejected':
          return {
            title: 'Tâche refusée',
            message: `Votre tâche "${title}" a été refusée.`,
          };
        case 'task_completed':
          return {
            title: 'Tâche terminée',
            message: `La tâche "${title}" a été complétée.`,
          };
        case 'tasker_on_way':
          return {
            title: 'Tâcheron en route',
            message: `Votre tâcheron est en route pour "${title}" !`,
          };
        case 'new_message':
          return {
            title: 'Nouveau message',
            message: `Nouveau message concernant "${title}".`,
          };
        case 'payment_confirmed':
          return {
            title: 'Paiement confirmé',
            message: `Paiement confirmé pour "${title}".`,
          };
        case 'review_received':
          return {
            title: 'Nouvel avis',
            message: `Vous avez reçu un avis pour "${title}" !`,
          };
        case 'new_task':
          return {
            title: 'Nouvelle demande',
            message: `Vous avez une nouvelle demande : "${title}".`,
          };
        case 'task_started':
          return {
            title: 'Tâche commencée',
            message: `Le travail a commencé pour "${title}".`,
          };
        case 'task_cancelled':
          return {
            title: 'Tâche annulée',
            message: `La tâche "${title}" a été annulée.`,
          };
        default:
          return {
            title: 'Notification',
            message: `Mise à jour pour "${title}"`,
          };
      }
    } else {
      // English
      switch (type) {
        case 'task_accepted':
          return {
            title: 'Task Accepted',
            message: `Your task "${title}" has been accepted!`,
          };
        case 'task_rejected':
          return {
            title: 'Task Declined',
            message: `Your task "${title}" was declined.`,
          };
        case 'task_completed':
          return {
            title: 'Task Completed',
            message: `Task "${title}" has been completed.`,
          };
        case 'tasker_on_way':
          return {
            title: 'Tasker On The Way',
            message: `Your tasker is on the way for "${title}"!`,
          };
        case 'new_message':
          return {
            title: 'New Message',
            message: `New message regarding "${title}".`,
          };
        case 'payment_confirmed':
          return {
            title: 'Payment Confirmed',
            message: `Payment confirmed for "${title}".`,
          };
        case 'review_received':
          return {
            title: 'Review Received',
            message: `You received a review for "${title}"!`,
          };
        case 'new_task':
          return {
            title: 'New Request',
            message: `You have a new task request: "${title}".`,
          };
        case 'task_started':
          return {
            title: 'Task Started',
            message: `Work has started for "${title}".`,
          };
        case 'task_cancelled':
          return {
            title: 'Task Cancelled',
            message: `Task "${title}" has been cancelled.`,
          };
        default:
          return {
            title: 'Notification',
            message: `Update for task "${title}"`,
          };
      }
    }
  };

  // Get notification title for display
  const getNotificationTitle = (type: string): string => {
    if (i18n.locale === 'fr') {
      switch (type) {
        case 'task_accepted': return 'Tâche acceptée';
        case 'task_rejected': return 'Tâche refusée';
        case 'task_completed': return 'Tâche terminée';
        case 'tasker_on_way': return 'Tâcheron en route';
        case 'new_message': return 'Nouveau message';
        case 'payment_confirmed': return 'Paiement confirmé';
        case 'review_received': return 'Nouvel avis';
        case 'new_task': return 'Nouvelle demande';
        case 'task_started': return 'Tâche commencée';
        case 'task_cancelled': return 'Tâche annulée';
        default: return 'Notification';
      }
    } else {
      switch (type) {
        case 'task_accepted': return 'Task Accepted';
        case 'task_rejected': return 'Task Declined';
        case 'task_completed': return 'Task Completed';
        case 'tasker_on_way': return 'Tasker On The Way';
        case 'new_message': return 'New Message';
        case 'payment_confirmed': return 'Payment Confirmed';
        case 'review_received': return 'Review Received';
        case 'new_task': return 'New Request';
        case 'task_started': return 'Task Started';
        case 'task_cancelled': return 'Task Cancelled';
        default: return 'Notification';
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_accepted':
        return { name: 'checkmark-circle', color: Colors.dark.success };
      case 'task_rejected':
        return { name: 'close-circle', color: Colors.dark.error };
      case 'task_started':
        return { name: 'play-circle', color: '#8b5cf6' };
      case 'task_completed':
        return { name: 'trophy', color: '#f59e0b' };
      case 'tasker_on_way':
        return { name: 'car', color: '#3b82f6' };
      case 'new_message':
        return { name: 'chatbubble', color: '#3b82f6' };
      case 'payment_confirmed':
        return { name: 'wallet', color: Colors.dark.success };
      case 'review_received':
        return { name: 'star', color: '#f59e0b' };
      case 'new_task':
        return { name: 'briefcase', color: Colors.dark.primary };
      case 'task_cancelled':
        return { name: 'close-circle', color: Colors.dark.error };
      default:
        return { name: 'notifications', color: Colors.dark.primary };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return i18n.locale === 'fr' ? 'À l\'instant' : 'Just now';
    } else if (diffMins < 60) {
      return i18n.locale === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return i18n.locale === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return i18n.locale === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups: any, notif) => {
    const date = new Date(notif.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = i18n.locale === 'fr' ? 'Aujourd\'hui' : 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = i18n.locale === 'fr' ? 'Hier' : 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notif);
    return groups;
  }, {});

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Notifications' : 'Notifications'}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>
              {i18n.locale === 'fr' ? 'Tout lire' : 'Read all'}
            </Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.placeholder} />}
      </View>

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="mail-unread" size={16} color={Colors.dark.primary} />
          <Text style={styles.unreadBannerText}>
            {unreadCount} {i18n.locale === 'fr' 
              ? (unreadCount === 1 ? 'notification non lue' : 'notifications non lues')
              : (unreadCount === 1 ? 'unread notification' : 'unread notifications')}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.dark.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyTitle}>
              {i18n.locale === 'fr' ? 'Aucune notification' : 'No notifications'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {i18n.locale === 'fr' 
                ? 'Vous recevrez des notifications ici'
                : 'You\'ll receive notifications here'}
            </Text>
          </View>
        ) : (
          Object.entries(groupedNotifications).map(([date, notifs]: [string, any]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {notifs.map((notification: Notification) => {
                const icon = getNotificationIcon(notification.type);
                const notifText = getNotificationText(notification);
                
                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationCard,
                      !notification.is_read && styles.unreadCard,
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
                      <Ionicons name={icon.name as any} size={24} color={icon.color} />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={[styles.notificationTitle, !notification.is_read && styles.unreadTitle]}>
                          {notifText.title}
                        </Text>
                        {!notification.is_read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notifText.message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {formatTimeAgo(notification.created_at)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.primary,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  placeholder: {
    width: 60,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.dark.primary}15`,
    paddingVertical: 10,
    gap: 8,
  },
  unreadBannerText: {
    fontSize: 13,
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  unreadCard: {
    borderColor: Colors.dark.primary,
    backgroundColor: `${Colors.dark.primary}08`,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.dark.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
  },
  notificationMessage: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginTop: 6,
  },
});
