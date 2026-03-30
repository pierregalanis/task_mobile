import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { taskAPI, notificationAPI, taskerAPI, verificationAPI, VerificationStatus } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { showMessage, showConfirm } from '../../utils/alert';

const { width } = Dimensions.get('window');

// Skeleton Loading Component
const SkeletonBox = ({ width: w, height, style }: { width: number | string; height: number; style?: any }) => {
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
      style={[{ width: w, height, backgroundColor: Colors.dark.border, borderRadius: 8, opacity }, style]}
    />
  );
};

// Skeleton Stats Card
const SkeletonStatCard = () => (
  <View style={[styles.statCard, { backgroundColor: Colors.dark.card }]}>
    <SkeletonBox width={24} height={24} style={{ borderRadius: 12 }} />
    <SkeletonBox width={40} height={28} style={{ marginTop: 8 }} />
    <SkeletonBox width={50} height={12} style={{ marginTop: 6 }} />
  </View>
);

// Skeleton Task Card
const SkeletonTaskCard = () => (
  <View style={styles.bookingCard}>
    <SkeletonBox width={150} height={18} style={{}} />
    <SkeletonBox width={70} height={24} style={{ borderRadius: 12, marginTop: 8 }} />
    <SkeletonBox width={200} height={14} style={{ marginTop: 12 }} />
    <SkeletonBox width={120} height={14} style={{ marginTop: 8 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
      <SkeletonBox width={80} height={20} style={{}} />
      <SkeletonBox width={100} height={20} style={{}} />
    </View>
  </View>
);

// Animated Stat Card
const AnimatedStatCard = ({
  icon,
  iconColor,
  bgColor,
  value,
  label,
  subLabel,
  index,
  onPress
}: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.statCard, { backgroundColor: bgColor }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.statIconContainer}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={[styles.statNumber, { color: iconColor }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subLabel && <Text style={styles.statSubLabel}>{subLabel}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Task Card Component
const AnimatedTaskCard = ({ children, index, style }: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

export default function TaskerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [stats, setStats] = useState({
    rating: 0,
    totalReviews: 0,
    completedTasks: 0,
    totalEarnings: 0,
  });

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [activeTaskTimer, setActiveTaskTimer] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const notificationScale = useRef(new Animated.Value(1)).current;
  const welcomeSlide = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(welcomeSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.role === 'tasker') {
        fetchData();
      }
    }, [user])
  );

  useEffect(() => {
    if (user?.role === 'tasker') {
      const pollInterval = setInterval(fetchData, 30000);
      return () => clearInterval(pollInterval);
    }
  }, [user]);

  useEffect(() => {
    if (activeTaskTimer) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTaskTimer]);

  useEffect(() => {
    const activeTask = tasks.find(t => t.status === 'in_progress' && t.timer_started_at);
    if (activeTask) {
      setActiveTaskTimer(activeTask.id);
      const startTime = new Date(activeTask.timer_started_at).getTime();
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }
  }, [tasks]);

  const fetchData = async () => {
    try {
      const [tasksData, unreadData, profileData, verificationData] = await Promise.all([
        taskAPI.getTaskerTasks(),
        notificationAPI.getUnreadCount(),
        taskerAPI.getMyProfile().catch(() => null),
        verificationAPI.getStatus().catch(() => null),
      ]);

      setVerificationStatus(verificationData);

      const taskList = tasksData || [];
      setTasks(taskList);
      setUnreadCount(unreadData?.unread_count || 0);

      const completedTasks = taskList.filter((t: any) => t.status === 'completed');
      const paidTasks = completedTasks.filter((t: any) => t.is_paid === true || t.payment_status === 'paid');
      const totalEarnings = paidTasks.reduce((sum: number, t: any) =>
        sum + (t.final_price || t.total_cost || t.estimated_total || 0), 0);

      const rating = profileData?.average_rating || profileData?.tasker_profile?.average_rating || user?.tasker_profile?.average_rating || 0;
      const totalReviews = profileData?.total_reviews || profileData?.tasker_profile?.total_reviews || user?.tasker_profile?.total_reviews || 0;

      setStats({ rating, totalReviews, completedTasks: completedTasks.length, totalEarnings });
    } catch (error) {
      console.error('Error fetching tasker data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const handleNotificationPress = () => {
    Animated.sequence([
      Animated.timing(notificationScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(notificationScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    router.push('/notifications');
  };

  const handleAcceptTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await taskAPI.acceptTask(taskId);
      showMessage(i18n.locale === 'fr' ? 'Succes' : 'Success', i18n.locale === 'fr' ? 'Tache acceptee!' : 'Task accepted!');
      fetchData();
    } catch (error: any) {
      showMessage(i18n.locale === 'fr' ? 'Erreur' : 'Error', error.response?.data?.detail || 'Failed to accept task');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    showConfirm(
      i18n.locale === 'fr' ? 'Refuser la tache?' : 'Reject task?',
      i18n.locale === 'fr' ? 'Etes-vous sur?' : 'Are you sure?',
      async () => {
        try {
          setActionLoading(taskId);
          await taskAPI.rejectTask(taskId);
          showMessage(i18n.locale === 'fr' ? 'Tache refusee' : 'Task rejected', '');
          fetchData();
        } catch (error: any) {
          showMessage('Error', error.response?.data?.detail || 'Failed');
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  const handleStartTimer = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await taskAPI.startTimer(taskId);
      setActiveTaskTimer(taskId);
      setElapsedTime(0);
      showMessage(i18n.locale === 'fr' ? 'Chronometre demarre' : 'Timer Started', '');
      fetchData();
    } catch (error: any) {
      showMessage('Error', error.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnRoute = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await taskAPI.startTracking(taskId);
      fetchData();
      router.push(`/tracking/${taskId}?mode=tasker`);
    } catch (error: any) {
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        (error.response?.data?.detail || (i18n.locale === 'fr' ? 'Echec de la mise a jour' : 'Failed to start en route'))
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopTimer = async (taskId: string) => {
    showConfirm(
      i18n.locale === 'fr' ? 'Terminer?' : 'Finish work?',
      i18n.locale === 'fr' ? 'Arreter le chronometre?' : 'Stop timer and complete?',
      async () => {
        try {
          setActionLoading(taskId);
          await taskAPI.stopTimer(taskId);
          setActiveTaskTimer(null);
          setElapsedTime(0);
          showMessage(i18n.locale === 'fr' ? 'Termine!' : 'Completed!', '');
          fetchData();
        } catch (error: any) {
          showMessage('Error', error.response?.data?.detail || 'Failed');
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatTaskDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  };

  const formatTaskTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return Colors.dark.success;
      default: return Colors.dark.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    if (i18n.locale === 'fr') {
      switch (status) {
        case 'pending': return 'En attente';
        case 'accepted': return 'Acceptee';
        case 'in_progress': return 'En cours';
        case 'completed': return 'Terminee';
        default: return status;
      }
    }
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const acceptedTasks = tasks.filter(t => t.status === 'accepted');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed').slice(0, 5);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.welcomeSection}>
            <SkeletonBox width={200} height={24} style={{}} />
            <SkeletonBox width={44} height={44} style={{ borderRadius: 22 }} />
          </View>
          <View style={styles.statsRow}>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <SkeletonTaskCard />
            <SkeletonTaskCard />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.dark.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Welcome Header */}
        <Animated.View style={{ opacity: headerFade, transform: [{ translateY: welcomeSlide }] }}>
          <LinearGradient
            colors={[Colors.dark.primary, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeSection}
          >
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeHand}>👋</Text>
                <Text style={styles.welcomeText}>
                  {i18n.locale === 'fr' ? 'Bonjour,' : 'Welcome,'} {user?.full_name?.split(' ')[0]}!
                </Text>
              </View>
              <Text style={styles.motivationalText}>
                {i18n.locale === 'fr' ? "Pret a ameliorer la journee de quelqu'un" : "Ready to make someone's day better"}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ scale: notificationScale }] }}>
              <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress} activeOpacity={0.8}>
                <Ionicons name="notifications" size={24} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
            <View style={styles.decorCircle1} pointerEvents="none" />
            <View style={styles.decorCircle2} pointerEvents="none" />
          </LinearGradient>
        </Animated.View>

        {/* Verification Status Banner */}
        {verificationStatus && !verificationStatus.is_verified && verificationStatus.status !== 'approved' && (
          verificationStatus.status === 'pending' ? (
            <View style={styles.verificationBanner}>
              <LinearGradient
                colors={['#3b82f6', '#4f46e5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.verificationGradient}
              >
                <View style={styles.verificationIconCircle}>
                  <Ionicons name="hourglass" size={22} color="#fff" />
                </View>
                <View style={styles.verificationTextContainer}>
                  <Text style={styles.verificationTitle}>
                    {i18n.locale === 'fr' ? 'vérification en Cours' : 'Verification In Progress'}
                  </Text>
                  <Text style={styles.verificationSubtitle}>
                    {i18n.locale === 'fr'
                      ? "L'examen prend 24-48h. Votre profil sera visible apres approbation."
                      : 'Review takes 24-48 hours. Your profile will be visible once approved.'}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.verificationBanner}>
              <LinearGradient
                colors={['#f97316', '#ea580c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.verificationGradient}
              >
                <View style={styles.verificationIconCircle}>
                  <Ionicons name="eye-off" size={22} color="#fff" />
                </View>
                <View style={styles.verificationTextContainer}>
                  <Text style={styles.verificationTitle}>
                    {i18n.locale === 'fr' ? 'Votre Profil est Masque' : 'Your Profile is Hidden'}
                  </Text>
                  <Text style={styles.verificationSubtitle}>
                    {i18n.locale === 'fr'
                      ? 'Completez la vérification pour apparaitre dans les recherches.'
                      : 'Complete verification to appear in search and receive bookings.'}
                  </Text>
                  {verificationStatus.status === 'rejected' && verificationStatus.rejection_reason && (
                    <View style={styles.rejectionReasonBox}>
                      <Text style={styles.rejectionReasonText}>
                        {i18n.locale === 'fr' ? 'Raison' : 'Reason'}: {verificationStatus.rejection_reason}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
              <TouchableOpacity
                style={styles.verifyNowButton}
                onPress={() => router.push('/tasker/verification')}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={18} color="#f97316" />
                <Text style={styles.verifyNowText}>
                  {verificationStatus.status === 'rejected'
                    ? (i18n.locale === 'fr' ? 'Resoumettre la vérification' : 'Resubmit Verification')
                    : (i18n.locale === 'fr' ? 'Vérifier Maintenant' : 'Verify Now')}
                </Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* Animated Stats Row */}
        <View style={styles.statsRow}>
          <AnimatedStatCard
            icon="star"
            iconColor="#f59e0b"
            bgColor="#f59e0b15"
            value={stats.rating > 0 ? stats.rating.toFixed(1) : '-'}
            label={i18n.locale === 'fr' ? 'Note' : 'Rating'}
            subLabel={`(${stats.totalReviews})`}
            index={0}
            onPress={() => router.push('/tasker/my-reviews')}
          />
          <AnimatedStatCard
            icon="clipboard-outline"
            iconColor="#3b82f6"
            bgColor="#3b82f615"
            value={stats.completedTasks}
            label={i18n.locale === 'fr' ? 'Taches' : 'Tasks'}
            subLabel={i18n.locale === 'fr' ? 'terminees' : 'complete'}
            index={1}
            onPress={() => {}}
          />
          <AnimatedStatCard
            icon="wallet-outline"
            iconColor={Colors.dark.success}
            bgColor="#10b98115"
            value={stats.totalEarnings > 1000 ? `${Math.round(stats.totalEarnings / 1000)}K` : stats.totalEarnings}
            label={i18n.locale === 'fr' ? 'Revenus' : 'Earned'}
            subLabel="XOF"
            index={2}
            onPress={() => router.push('/tasker/my-earnings')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'person-outline', label: i18n.locale === 'fr' ? 'Profil' : 'Profile', route: '/tasker/edit-profile' },
            { icon: 'construct-outline', label: i18n.locale === 'fr' ? 'Services' : 'Services', route: '/tasker/manage-services' },
            { icon: 'chatbubbles-outline', label: i18n.locale === 'fr' ? 'Avis' : 'Reviews', route: '/tasker/my-reviews' },
            { icon: 'cash-outline', label: i18n.locale === 'fr' ? 'Revenus' : 'Earnings', route: '/tasker/my-earnings' },
          ].map((action) => (
            <TouchableOpacity
              key={action.route}
              style={styles.quickActionBtn}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={action.icon as any} size={20} color={Colors.dark.primary} />
              <Text style={styles.quickActionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pending Tasks - Urgent Section */}
        {pendingTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.urgentBadge}>
                  <Ionicons name="alert-circle" size={16} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>
                  {i18n.locale === 'fr' ? 'Demandes en attente' : 'Pending Requests'}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pendingTasks.length}</Text>
              </View>
            </View>

            {pendingTasks.map((task, index) => (
              <AnimatedTaskCard key={task.id} index={index}>
                <View style={styles.pendingCard}>
                  <View style={styles.pendingHeader}>
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingTitle}>{task.title}</Text>
                      <View style={styles.pendingMeta}>
                        {task.client_profile_image ? (
                          <Image source={{ uri: task.client_profile_image }} style={styles.pendingAvatar} />
                        ) : (
                          <Ionicons name="person" size={14} color={Colors.dark.textSecondary} />
                        )}
                        <Text style={styles.pendingMetaText}>{task.client_name || 'Client'}</Text>
                      </View>
                      <View style={styles.pendingMeta}>
                        <Ionicons name="calendar" size={14} color={Colors.dark.textSecondary} />
                        <Text style={styles.pendingMetaText}>{formatDate(task.scheduled_date || task.task_date)}</Text>
                      </View>
                      <View style={styles.pendingMeta}>
                        <Ionicons name="location" size={14} color={Colors.dark.textSecondary} />
                        <Text style={styles.pendingMetaText}>{task.city || task.address}</Text>
                      </View>
                    </View>
                    <View style={styles.pendingPrice}>
                      <Text style={styles.pendingPriceValue}>{(task.estimated_total || task.total_cost || 0).toLocaleString()}</Text>
                      <Text style={styles.pendingPriceCurrency}>XOF</Text>
                    </View>
                  </View>

                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleRejectTask(task.id)}
                      disabled={actionLoading === task.id}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={18} color={Colors.dark.error} />
                      <Text style={styles.rejectBtnText}>{i18n.locale === 'fr' ? 'Refuser' : 'Reject'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => handleAcceptTask(task.id)}
                      disabled={actionLoading === task.id}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.acceptBtnText}>{i18n.locale === 'fr' ? 'Accepter' : 'Accept'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </AnimatedTaskCard>
            ))}
          </View>
        )}

        {/* Accepted Tasks */}
        {acceptedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.locale === 'fr' ? 'Pret a commencer' : 'Ready to Start'}</Text>
            {acceptedTasks.map((task, index) => (
              <AnimatedTaskCard key={task.id} index={index}>
                <TouchableOpacity
                  style={styles.bookingCard}
                  onPress={() => router.push(`/task/${task.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingTitleContainer}>
                      <Text style={styles.bookingTitle}>{task.title}</Text>
                      <View style={[styles.bookingBadge, { backgroundColor: getStatusColor(task.status) }]}>
                        <Text style={styles.bookingBadgeText}>{getStatusText(task.status)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bookingMeta}>
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.dark.textSecondary} />
                      <Text style={styles.bookingMetaText}>{formatTaskDate(task.scheduled_date || task.task_date)}</Text>
                    </View>
                    <View style={styles.bookingMetaDivider} />
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="time-outline" size={14} color={Colors.dark.textSecondary} />
                      <Text style={styles.bookingMetaText}>{formatTaskTime(task.scheduled_date || task.task_date)}</Text>
                    </View>
                    <View style={styles.bookingMetaDivider} />
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
                      <Text style={styles.bookingMetaText}>{task.city || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <View style={styles.bookingPersonInfo}>
                      {task.client_profile_image ? (
                        <Image source={{ uri: task.client_profile_image }} style={styles.clientAvatar} />
                      ) : (
                        <Ionicons name="person-circle-outline" size={20} color={Colors.dark.textSecondary} />
                      )}
                      <Text style={styles.bookingPersonName}>{task.client_name || 'Client'}</Text>
                    </View>
                    <Text style={styles.bookingPrice}>{(task.estimated_total || task.total_cost || 0).toLocaleString()} XOF</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.chatActionBtn}
                    onPress={() => router.push(`/chat/${task.id}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-ellipses" size={18} color={Colors.dark.primary} />
                    <Text style={styles.chatActionBtnText}>{i18n.locale === 'fr' ? 'Discuter' : 'Chat'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.enRouteBtn}
                    onPress={() => handleEnRoute(task.id)}
                    disabled={actionLoading === task.id}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="navigate" size={18} color={Colors.dark.background} />
                    <Text style={styles.enRouteBtnText}>{i18n.locale === 'fr' ? 'En route' : 'En Route'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </AnimatedTaskCard>
            ))}
          </View>
        )}

        {/* In Progress Tasks */}
        {inProgressTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.locale === 'fr' ? 'En cours' : 'In Progress'}</Text>
            {inProgressTasks.map((task, index) => (
              <AnimatedTaskCard key={task.id} index={index}>
                <TouchableOpacity
                  style={styles.bookingCard}
                  onPress={() => router.push(`/task/${task.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingTitleContainer}>
                      <Text style={styles.bookingTitle}>{task.title}</Text>
                      <View style={[styles.bookingBadge, { backgroundColor: getStatusColor(task.status) }]}>
                        <Text style={styles.bookingBadgeText}>{getStatusText(task.status)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bookingMeta}>
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.dark.textSecondary} />
                      <Text style={styles.bookingMetaText}>{formatTaskDate(task.scheduled_date || task.task_date)}</Text>
                    </View>
                    <View style={styles.bookingMetaDivider} />
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="time-outline" size={14} color={Colors.dark.textSecondary} />
                      <Text style={styles.bookingMetaText}>{formatTaskTime(task.scheduled_date || task.task_date)}</Text>
                    </View>
                    <View style={styles.bookingMetaDivider} />
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
                      <Text style={styles.bookingMetaText}>{task.city || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <View style={styles.bookingPersonInfo}>
                      {task.client_profile_image ? (
                        <Image source={{ uri: task.client_profile_image }} style={styles.clientAvatar} />
                      ) : (
                        <Ionicons name="person-circle-outline" size={20} color={Colors.dark.textSecondary} />
                      )}
                      <Text style={styles.bookingPersonName}>{task.client_name || 'Client'}</Text>
                    </View>
                    <Text style={styles.bookingPrice}>{(task.estimated_total || task.total_cost || 0).toLocaleString()} XOF</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.chatActionBtn}
                    onPress={() => router.push(`/chat/${task.id}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-ellipses" size={18} color={Colors.dark.primary} />
                    <Text style={styles.chatActionBtnText}>{i18n.locale === 'fr' ? 'Discuter' : 'Chat'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => handleStopTimer(task.id)}
                    disabled={actionLoading === task.id}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.completeBtnText}>
                      {i18n.locale === 'fr' ? 'Marquer comme terminee' : 'Mark as Completed'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </AnimatedTaskCard>
            ))}
          </View>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.locale === 'fr' ? 'Recemment terminees' : 'Recently Completed'}</Text>
            {completedTasks.map((task, index) => (
              <AnimatedTaskCard key={task.id} index={index}>
                <TouchableOpacity
                  style={styles.bookingCard}
                  onPress={() => router.push(`/task/${task.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingTitleContainer}>
                      <Text style={styles.bookingTitle}>{task.title}</Text>
                      <View style={[styles.bookingBadge, { backgroundColor: Colors.dark.success }]}>
                        <Text style={styles.bookingBadgeText}>{getStatusText(task.status)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bookingMeta}>
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.dark.textSecondary} />
                      <Text style={styles.bookingMetaText}>{formatTaskDate(task.completed_at || task.scheduled_date || task.task_date)}</Text>
                    </View>
                    <View style={styles.bookingMetaDivider} />
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
                      <Text style={styles.bookingMetaText}>{task.city || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <View style={styles.bookingPersonInfo}>
                      {task.client_profile_image ? (
                        <Image source={{ uri: task.client_profile_image }} style={styles.clientAvatar} />
                      ) : (
                        <Ionicons name="person-circle-outline" size={20} color={Colors.dark.textSecondary} />
                      )}
                      <Text style={styles.bookingPersonName}>{task.client_name || 'Client'}</Text>
                    </View>
                    <Text style={styles.bookingPrice}>{(task.final_price || task.estimated_total || task.total_cost || 0).toLocaleString()} XOF</Text>
                  </View>
                </TouchableOpacity>
              </AnimatedTaskCard>
            ))}
          </View>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="briefcase-outline" size={48} color={Colors.dark.primary} />
            </View>
            <Text style={styles.emptyTitle}>{i18n.locale === 'fr' ? 'Aucune tache' : 'No tasks yet'}</Text>
            <Text style={styles.emptySubtitle}>
              {i18n.locale === 'fr' ? 'Les nouvelles demandes apparaitront ici' : 'New task requests will appear here'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Welcome Section
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    overflow: 'hidden',
  },
  welcomeContent: { flex: 1 },
  welcomeTextContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  welcomeHand: { fontSize: 24 },
  welcomeText: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  motivationalText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4, marginLeft: 32 },
  notificationButton: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: Colors.dark.error, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.dark.primary,
  },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  decorCircle1: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -50, right: 60,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Verification Banner
  verificationBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  verificationGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  verificationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  verificationSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  rejectionReasonBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  rejectionReasonText: {
    color: '#fff',
    fontSize: 12,
  },
  verifyNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    gap: 8,
  },
  verifyNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 20, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  statIconContainer: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  statSubLabel: { fontSize: 10, color: Colors.dark.textSecondary },

  // Quick Actions
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 24, gap: 8,
  },
  quickActionBtn: {
    flex: 1, backgroundColor: Colors.dark.card, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.dark.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  quickActionText: { fontSize: 11, color: Colors.dark.text, fontWeight: '600' },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentBadge: {
    backgroundColor: '#f59e0b', borderRadius: 12,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text, letterSpacing: -0.3 },
  countBadge: {
    backgroundColor: Colors.dark.primary, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Pending Card
  pendingCard: {
    backgroundColor: Colors.dark.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 2, borderColor: '#f59e0b',
    shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pendingInfo: { flex: 1 },
  pendingTitle: { fontSize: 16, fontWeight: '600', color: Colors.dark.text, marginBottom: 8 },
  pendingMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pendingMetaText: { fontSize: 13, color: Colors.dark.textSecondary },
  pendingAvatar: { width: 16, height: 16, borderRadius: 8 },
  pendingPrice: { alignItems: 'flex-end' },
  pendingPriceValue: { fontSize: 22, fontWeight: 'bold', color: Colors.dark.primary },
  pendingPriceCurrency: { fontSize: 12, color: Colors.dark.textSecondary },
  pendingActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, gap: 6,
  },
  rejectBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: Colors.dark.error },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: Colors.dark.error },
  acceptBtn: { backgroundColor: Colors.dark.primary },
  acceptBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Booking-style Card
  bookingCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingTitleContainer: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  bookingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingMetaText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  bookingMetaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textSecondary,
    marginHorizontal: 8,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingPersonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  bookingPersonName: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
  chatActionBtn: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  chatActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  enRouteBtn: {
    marginTop: 12,
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  enRouteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  completeBtn: {
    marginTop: 12,
    backgroundColor: Colors.dark.success,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text, marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 8, textAlign: 'center' },
});