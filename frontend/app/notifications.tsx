import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
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

// Skeleton Components
const SkeletonBox = ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[{ width, height, backgroundColor: Colors.dark.border, borderRadius: 8, opacity }, style]}
    />
  );
};

const SkeletonNotificationCard = () => (
  <View style={styles.notificationCard}>
    <SkeletonBox width={48} height={48} style={{ borderRadius: 24 }} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <SkeletonBox width={120} height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width="90%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonBox width={60} height={12} style={{}} />
    </View>
  </View>
);

// Pulsing Unread Dot
const PulsingDot = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.pulsingDotContainer}>
      <Animated.View 
        style={[
          styles.pulsingDotOuter, 
          { transform: [{ scale: pulseAnim }], opacity: opacityAnim }
        ]} 
      />
      <View style={styles.unreadDot} />
    </View>
  );
};

// Animated Notification Card
const AnimatedNotificationCard = ({ 
  notification, 
  index, 
  onPress,
  icon,
  notifText,
}: { 
  notification: Notification; 
  index: number;
  onPress: () => void;
  icon: { name: string; color: string };
  notifText: { title: string; message: string };
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return i18n.locale === 'fr' ? 'À l\'instant' : 'Just now';
    if (diffMins < 60) return i18n.locale === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
    if (diffHours < 24) return i18n.locale === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`;
    if (diffDays < 7) return i18n.locale === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`;
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={[styles.notificationCard, !notification.is_read && styles.unreadCard]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !notification.is_read && styles.unreadTitle]} numberOfLines={1}>
              {notifText.title}
            </Text>
            {!notification.is_read && <PulsingDot />}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notifText.message}
          </Text>
          <View style={styles.notificationFooter}>
            <Ionicons name="time-outline" size={12} color={Colors.dark.textSecondary} />
            <Text style={styles.notificationTime}>{formatTimeAgo(notification.created_at)}</Text>
          </View>
        </View>
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const markAllScale = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

  const handleRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    Animated.sequence([
      Animated.timing(markAllScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(markAllScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      
      // Success animation
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) handleMarkAsRead(notification.id);
    if (notification.task_id) router.push(`/task/${notification.task_id}`);
  };

  const getNotificationText = (notification: Notification): { title: string; message: string } => {
    const { type, task_title, message } = notification;
    const title = task_title || (i18n.locale === 'fr' ? 'votre tâche' : 'your task');
    
    if (message) return { title: getNotificationTitle(type), message };
    
    const texts: { [key: string]: { fr: { title: string; message: string }; en: { title: string; message: string } } } = {
      task_accepted: { fr: { title: 'Tâche acceptée', message: `Votre tâche "${title}" a été acceptée !` }, en: { title: 'Task Accepted', message: `Your task "${title}" has been accepted!` } },
      task_rejected: { fr: { title: 'Tâche refusée', message: `Votre tâche "${title}" a été refusée.` }, en: { title: 'Task Declined', message: `Your task "${title}" was declined.` } },
      task_completed: { fr: { title: 'Tâche terminée', message: `La tâche "${title}" a été complétée.` }, en: { title: 'Task Completed', message: `Task "${title}" has been completed.` } },
      tasker_on_way: { fr: { title: 'Tâcheron en route', message: `Votre tâcheron est en route pour "${title}" !` }, en: { title: 'Tasker On The Way', message: `Your tasker is on the way for "${title}"!` } },
      new_message: { fr: { title: 'Nouveau message', message: `Nouveau message concernant "${title}".` }, en: { title: 'New Message', message: `New message regarding "${title}".` } },
      payment_confirmed: { fr: { title: 'Paiement confirmé', message: `Paiement confirmé pour "${title}".` }, en: { title: 'Payment Confirmed', message: `Payment confirmed for "${title}".` } },
      review_received: { fr: { title: 'Nouvel avis', message: `Vous avez reçu un avis pour "${title}" !` }, en: { title: 'Review Received', message: `You received a review for "${title}"!` } },
      new_task: { fr: { title: 'Nouvelle demande', message: `Vous avez une nouvelle demande : "${title}".` }, en: { title: 'New Request', message: `You have a new task request: "${title}".` } },
      task_started: { fr: { title: 'Tâche commencée', message: `Le travail a commencé pour "${title}".` }, en: { title: 'Task Started', message: `Work has started for "${title}".` } },
      task_cancelled: { fr: { title: 'Tâche annulée', message: `La tâche "${title}" a été annulée.` }, en: { title: 'Task Cancelled', message: `Task "${title}" has been cancelled.` } },
    };

    const lang = i18n.locale === 'fr' ? 'fr' : 'en';
    return texts[type]?.[lang] || { title: 'Notification', message: `Update for "${title}"` };
  };

  const getNotificationTitle = (type: string): string => {
    const titles: { [key: string]: { fr: string; en: string } } = {
      task_accepted: { fr: 'Tâche acceptée', en: 'Task Accepted' },
      task_rejected: { fr: 'Tâche refusée', en: 'Task Declined' },
      task_completed: { fr: 'Tâche terminée', en: 'Task Completed' },
      tasker_on_way: { fr: 'Tâcheron en route', en: 'Tasker On The Way' },
      new_message: { fr: 'Nouveau message', en: 'New Message' },
      payment_confirmed: { fr: 'Paiement confirmé', en: 'Payment Confirmed' },
      review_received: { fr: 'Nouvel avis', en: 'Review Received' },
      new_task: { fr: 'Nouvelle demande', en: 'New Request' },
      task_started: { fr: 'Tâche commencée', en: 'Task Started' },
      task_cancelled: { fr: 'Tâche annulée', en: 'Task Cancelled' },
    };
    return titles[type]?.[i18n.locale === 'fr' ? 'fr' : 'en'] || 'Notification';
  };

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: { name: string; color: string } } = {
      task_accepted: { name: 'checkmark-circle', color: Colors.dark.success },
      task_rejected: { name: 'close-circle', color: Colors.dark.error },
      task_started: { name: 'play-circle', color: '#8b5cf6' },
      task_completed: { name: 'trophy', color: '#f59e0b' },
      tasker_on_way: { name: 'car', color: '#3b82f6' },
      new_message: { name: 'chatbubble', color: '#3b82f6' },
      payment_confirmed: { name: 'wallet', color: Colors.dark.success },
      review_received: { name: 'star', color: '#f59e0b' },
      new_task: { name: 'briefcase', color: Colors.dark.primary },
      task_cancelled: { name: 'close-circle', color: Colors.dark.error },
    };
    return icons[type] || { name: 'notifications', color: Colors.dark.primary };
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
      groupKey = i18n.locale === 'fr' ? 'Plus ancien' : 'Earlier';
    }

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(notif);
    return groups;
  }, {});

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.backButton}>
            <SkeletonBox width={24} height={24} style={{ borderRadius: 12 }} />
          </View>
          <SkeletonBox width={120} height={24} style={{}} />
          <SkeletonBox width={70} height={32} style={{ borderRadius: 16 }} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <SkeletonBox width={80} height={16} style={{ marginBottom: 16 }} />
          <SkeletonNotificationCard />
          <SkeletonNotificationCard />
          <SkeletonNotificationCard />
          <SkeletonBox width={80} height={16} style={{ marginTop: 24, marginBottom: 16 }} />
          <SkeletonNotificationCard />
          <SkeletonNotificationCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Success Toast */}
      <Animated.View style={[styles.successToast, { opacity: successAnim, transform: [{ translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }] }]}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.successToastText}>
          {i18n.locale === 'fr' ? 'Tout marqué comme lu' : 'All marked as read'}
        </Text>
      </Animated.View>

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{i18n.locale === 'fr' ? 'Notifications' : 'Notifications'}</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <Animated.View style={{ transform: [{ scale: markAllScale }] }}>
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton} disabled={markingAll} activeOpacity={0.8}>
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={styles.markAllText}>{i18n.locale === 'fr' ? 'Tout lire' : 'Read all'}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.dark.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-outline" size={48} color={Colors.dark.primary} />
            </View>
            <Text style={styles.emptyTitle}>{i18n.locale === 'fr' ? 'Aucune notification' : 'No notifications'}</Text>
            <Text style={styles.emptySubtitle}>
              {i18n.locale === 'fr' ? 'Vous recevrez des notifications ici' : 'You\'ll receive notifications here'}
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={styles.emptyButtonText}>{i18n.locale === 'fr' ? 'Retour' : 'Go Back'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(groupedNotifications).map(([date, notifs]: [string, any], groupIndex) => (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateHeaderContainer}>
                <View style={styles.dateHeaderLine} />
                <Text style={styles.dateHeader}>{date}</Text>
                <View style={styles.dateHeaderLine} />
              </View>
              {notifs.map((notification: Notification, index: number) => (
                <AnimatedNotificationCard
                  key={notification.id}
                  notification={notification}
                  index={groupIndex * 3 + index}
                  onPress={() => handleNotificationPress(notification)}
                  icon={getNotificationIcon(notification.type)}
                  notifText={getNotificationText(notification)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  
  // Success Toast
  successToast: {
    position: 'absolute', top: 100, left: 24, right: 24, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.dark.success, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
    shadowColor: Colors.dark.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  successToastText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.dark.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.dark.text },
  headerBadge: {
    backgroundColor: Colors.dark.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  markAllButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.dark.primary,
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  placeholder: { width: 90 },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIconContainer: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.dark.text },
  emptySubtitle: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 8, textAlign: 'center' },
  emptyButton: {
    marginTop: 24, backgroundColor: Colors.dark.card, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: Colors.dark.text },
  
  // Date Groups
  dateGroup: { marginBottom: 24 },
  dateHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  dateHeaderLine: { flex: 1, height: 1, backgroundColor: Colors.dark.border },
  dateHeader: { fontSize: 12, fontWeight: '600', color: Colors.dark.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Notification Card
  notificationCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card,
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.dark.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  unreadCard: { borderColor: Colors.dark.primary, backgroundColor: `${Colors.dark.primary}08` },
  iconContainer: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationTitle: { fontSize: 15, fontWeight: '500', color: Colors.dark.text, flex: 1 },
  unreadTitle: { fontWeight: '700' },
  
  // Pulsing Dot
  pulsingDotContainer: { position: 'relative', width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  pulsingDotOuter: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.dark.primary,
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.primary },
  
  notificationMessage: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 4, lineHeight: 18 },
  notificationFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  notificationTime: { fontSize: 11, color: Colors.dark.textSecondary },
  chevronContainer: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.dark.background,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
});
