import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { taskAPI, categoryAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { Category, getCategoryById, getCategoryName } from '../../constants/Categories';
import { formatTaskPrice } from '../../utils/pricingUtils';

const { width } = Dimensions.get('window');
const TAB_WIDTH = (width - 32 - 16) / 3;

type ClientTab = 'pending' | 'upcoming' | 'completed';
type TaskerTab = 'pending' | 'active' | 'completed';

// Skeleton Components
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

const SkeletonTaskCard = () => (
  <View style={styles.taskCard}>
    <View style={styles.taskHeader}>
      <SkeletonBox width={180} height={20} style={{}} />
      <SkeletonBox width={80} height={24} style={{ borderRadius: 12 }} />
    </View>
    <SkeletonBox width={120} height={16} style={{ marginTop: 8, marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <SkeletonBox width={80} height={14} style={{}} />
      <SkeletonBox width={60} height={14} style={{}} />
      <SkeletonBox width={70} height={14} style={{}} />
    </View>
    <View style={[styles.taskFooter, { marginTop: 16 }]}>
      <SkeletonBox width={100} height={16} style={{}} />
      <SkeletonBox width={90} height={24} style={{}} />
    </View>
  </View>
);

// Animated Task Card
const AnimatedTaskCard = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
      onTouchCancel={handlePressOut}
    >
      {children}
    </Animated.View>
  );
};

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientTab | TaskerTab>('pending');

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;

  const isClient = user?.role === 'client';
  const isTasker = user?.role === 'tasker';

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    fetchData();
  }, []);

  // Animate tab indicator
  useEffect(() => {
    let position = 0;
    if (activeTab === 'pending') position = 0;
    else if (activeTab === 'upcoming' || activeTab === 'active') position = 1;
    else if (activeTab === 'completed') position = 2;

    Animated.spring(tabIndicatorPosition, {
      toValue: position * (TAB_WIDTH + 8),
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, tasksData] = await Promise.all([
        categoryAPI.getCategories().catch(() => []),
        isClient ? taskAPI.getClientTasks() : taskAPI.getTaskerTasks()
      ]);
      setCategories(categoriesData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = isClient ? await taskAPI.getClientTasks() : await taskAPI.getTaskerTasks();
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchTasks(); };

  const handleAcceptTask = async (taskId: string) => {
    try { await taskAPI.acceptTask(taskId); fetchTasks(); } catch (error) { console.error('Error:', error); }
  };

  const handleRejectTask = async (taskId: string) => {
    try { await taskAPI.rejectTask(taskId); fetchTasks(); } catch (error) { console.error('Error:', error); }
  };

  const handleCompleteTask = async (taskId: string) => {
    try { await taskAPI.completeTask(taskId); fetchTasks(); } catch (error) { console.error('Error:', error); }
  };

  const handleMarkPaidCash = async (taskId: string) => {
    try { await taskAPI.markPaidCash(taskId); fetchTasks(); } catch (error) { console.error('Error:', error); }
  };

  const getStatusColor = (status: string, isPaid?: boolean) => {
    if (status === 'completed' && isPaid) return Colors.dark.success;
    switch (status) {
      case 'assigned': case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'en_route': case 'in_progress': return '#8b5cf6';
      case 'completed': return '#f59e0b';
      case 'cancelled': return Colors.dark.error;
      default: return Colors.dark.textSecondary;
    }
  };

  const getStatusText = (status: string, isPaid?: boolean) => {
    if (i18n.locale === 'fr') {
      if (status === 'completed' && isPaid) return 'Payé';
      if (status === 'completed' && !isPaid) return 'En attente paiement';
      switch (status) {
        case 'assigned': case 'pending': return 'En attente';
        case 'accepted': return 'Acceptée';
        case 'en_route': return 'En route';
        case 'in_progress': return 'En cours';
        case 'completed': return 'Terminée';
        case 'cancelled': return 'Annulée';
        default: return status;
      }
    }
    if (status === 'completed' && isPaid) return 'Paid';
    if (status === 'completed' && !isPaid) return 'Awaiting Payment';
    switch (status) {
      case 'assigned': return 'Pending Approval';
      case 'pending': return 'Pending';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'assigned' || t.status === 'pending');
  const activeTasks = tasks.filter(t => ['accepted', 'en_route', 'in_progress'].includes(t.status));
  const completedTasks = tasks.filter(t => ['completed', 'cancelled'].includes(t.status));

  const getDisplayTasks = () => {
    switch (activeTab) {
      case 'pending': return pendingTasks;
      case 'upcoming': case 'active': return activeTasks;
      case 'completed': return completedTasks;
      default: return [];
    }
  };

  const displayTasks = getDisplayTasks();

  const getTabLabel = (tab: string) => {
    if (i18n.locale === 'fr') {
      switch (tab) {
        case 'pending': return 'En attente';
        case 'upcoming': return 'À venir';
        case 'active': return 'Actif';
        case 'completed': return 'Terminé';
        default: return tab;
      }
    }
    switch (tab) {
      case 'pending': return 'Pending';
      case 'upcoming': return 'Upcoming';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      default: return tab;
    }
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'pending': return pendingTasks.length;
      case 'upcoming': case 'active': return activeTasks.length;
      case 'completed': return completedTasks.length;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <SkeletonBox width={150} height={28} style={{}} />
          <SkeletonBox width={100} height={16} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.tabsContainer}>
          <SkeletonBox width={TAB_WIDTH} height={44} style={{ borderRadius: 12 }} />
          <SkeletonBox width={TAB_WIDTH} height={44} style={{ borderRadius: 12 }} />
          <SkeletonBox width={TAB_WIDTH} height={44} style={{ borderRadius: 12 }} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Réservations' : 'Bookings'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {tasks.length} {i18n.locale === 'fr' ? 'réservations au total' : 'total bookings'}
        </Text>
      </Animated.View>

      {/* Animated Tabs */}
      <View style={styles.tabsContainer}>
        <Animated.View
          style={[
            styles.tabIndicator,
            { transform: [{ translateX: tabIndicatorPosition }], width: TAB_WIDTH }
          ]}
        />
        
        {/* Tab 1: Pending */}
        <TouchableOpacity
          style={[styles.tab, { width: TAB_WIDTH }]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            {getTabLabel('pending')}
          </Text>
          <View style={[styles.tabBadge, activeTab === 'pending' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.tabBadgeTextActive]}>
              {pendingTasks.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Tab 2: Active/Upcoming */}
        <TouchableOpacity
          style={[styles.tab, { width: TAB_WIDTH }]}
          onPress={() => setActiveTab(isClient ? 'upcoming' : 'active')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, (activeTab === 'active' || activeTab === 'upcoming') && styles.tabTextActive]}>
            {getTabLabel(isClient ? 'upcoming' : 'active')}
          </Text>
          <View style={[styles.tabBadge, (activeTab === 'active' || activeTab === 'upcoming') && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, (activeTab === 'active' || activeTab === 'upcoming') && styles.tabBadgeTextActive]}>
              {activeTasks.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Tab 3: Completed */}
        <TouchableOpacity
          style={[styles.tab, { width: TAB_WIDTH }]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            {getTabLabel('completed')}
          </Text>
          <View style={[styles.tabBadge, activeTab === 'completed' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'completed' && styles.tabBadgeTextActive]}>
              {completedTasks.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />}
      >
        {displayTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.dark.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {i18n.locale === 'fr' ? 'Aucune réservation' : 'No bookings'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending' 
                ? (i18n.locale === 'fr' ? 'Aucune tâche en attente' : 'No pending tasks')
                : activeTab === 'completed'
                  ? (i18n.locale === 'fr' ? 'Aucune tâche terminée' : 'No completed tasks')
                  : (i18n.locale === 'fr' ? 'Aucune tâche active' : 'No active tasks')
              }
            </Text>
            {isClient && activeTab === 'pending' && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/home')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>
                  {i18n.locale === 'fr' ? 'Réserver un service' : 'Book a Service'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayTasks.map((task, index) => {
            const categoryId = task.category_id || task.category;
            const category = getCategoryById(categories, categoryId);
            const categoryName = category ? getCategoryName(category, i18n.locale) : (task.title || categoryId || 'Service');
            
            const taskDate = task.task_date || task.scheduled_date;
            const totalCost = task.total_cost || task.estimated_total || 0;
            const isPaid = task.is_paid === true;
            
            const formatTaskDate = (dateStr: string) => {
              if (!dateStr) return 'N/A';
              const date = new Date(dateStr);
              return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
            };
            
            const formatTaskTime = (dateStr: string) => {
              if (!dateStr) return '';
              const date = new Date(dateStr);
              return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            const status = task.status;
            const isPending = status === 'assigned' || status === 'pending';
            const isActive = ['accepted', 'en_route', 'in_progress'].includes(status);
            const isCompleted = status === 'completed';

            const showAcceptReject = isTasker && isPending;
            const showWaitingMessage = isClient && isPending;
            const showChat = isActive;
            const showEnRoute = isTasker && status === 'accepted';
            const showStartWork = isTasker && status === 'en_route';
            const showTrack = isClient && (status === 'en_route' || status === 'in_progress');
            const showComplete = isTasker && status === 'in_progress';
            const showPaymentButtons = isTasker && isCompleted && !isPaid;
            const showLeaveReview = isClient && isCompleted && !task.review_submitted;
            
            return (
              <AnimatedTaskCard key={task.id} index={index}>
                <TouchableOpacity
                  style={styles.taskCard}
                  onPress={() => router.push(`/task/${task.id}`)}
                  activeOpacity={0.9}
                >
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleContainer}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status, isPaid) }]}>
                        <Text style={styles.statusBadgeText}>{getStatusText(status, isPaid)}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.taskCategory}>{categoryName}</Text>

                  <View style={styles.taskMeta}>
                    <View style={styles.metaItem}>
                      <View style={styles.metaIconContainer}>
                        <Ionicons name="calendar-outline" size={12} color={Colors.dark.primary} />
                      </View>
                      <Text style={styles.metaText}>{formatTaskDate(taskDate)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <View style={styles.metaIconContainer}>
                        <Ionicons name="time-outline" size={12} color={Colors.dark.primary} />
                      </View>
                      <Text style={styles.metaText}>{formatTaskTime(taskDate)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <View style={styles.metaIconContainer}>
                        <Ionicons name="location-outline" size={12} color={Colors.dark.primary} />
                      </View>
                      <Text style={styles.metaText}>{task.city || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.taskFooter}>
                    <View style={styles.personInfo}>
                      <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={16} color={Colors.dark.primary} />
                      </View>
                      <Text style={styles.personName}>
                        {isClient ? (task.tasker_name || 'Tasker') : (task.client_name || 'Client')}
                      </Text>
                    </View>
                    <Text style={styles.taskPrice}>{formatTaskPrice(totalCost, i18n.locale)}</Text>
                  </View>

                  {/* Waiting Message for Client */}
                  {showWaitingMessage && (
                    <View style={styles.waitingMessage}>
                      <View style={styles.pulsingDot} />
                      <Text style={styles.waitingMessageText}>
                        {i18n.locale === 'fr' ? 'En attente de confirmation du tâcheron' : 'Waiting for tasker approval'}
                      </Text>
                    </View>
                  )}

                  {/* Accept/Reject Buttons for Tasker */}
                  {showAcceptReject && (
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={(e) => { e.stopPropagation(); handleRejectTask(task.id); }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={18} color={Colors.dark.error} />
                        <Text style={styles.rejectButtonText}>{i18n.locale === 'fr' ? 'Refuser' : 'Decline'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={(e) => { e.stopPropagation(); handleAcceptTask(task.id); }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.acceptButtonText}>{i18n.locale === 'fr' ? 'Accepter' : 'Accept'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Chat Button */}
                  {showChat && (
                    <TouchableOpacity
                      style={styles.chatActionButton}
                      onPress={(e) => { e.stopPropagation(); router.push(`/chat/${task.id}`); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubble-ellipses" size={18} color={Colors.dark.primary} />
                      <Text style={styles.chatActionButtonText}>{i18n.locale === 'fr' ? 'Discuter' : 'Chat'}</Text>
                    </TouchableOpacity>
                  )}

                  {/* En Route Button */}
                  {showEnRoute && (
                    <TouchableOpacity
                      style={styles.enRouteButton}
                      onPress={(e) => { e.stopPropagation(); router.push(`/tracking/${task.id}?mode=tasker`); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="navigate" size={18} color="#fff" />
                      <Text style={styles.enRouteButtonText}>{i18n.locale === 'fr' ? 'En route' : 'On My Way'}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Start Work Button */}
                  {showStartWork && (
                    <TouchableOpacity
                      style={styles.startWorkButton}
                      onPress={(e) => { e.stopPropagation(); router.push(`/task/${task.id}`); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play-circle" size={18} color="#fff" />
                      <Text style={styles.startWorkButtonText}>{i18n.locale === 'fr' ? 'Commencer' : 'Start Work'}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Track Button */}
                  {showTrack && (
                    <TouchableOpacity
                      style={styles.trackButton}
                      onPress={(e) => { e.stopPropagation(); router.push(`/tracking/${task.id}?mode=client`); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="location" size={18} color="#fff" />
                      <Text style={styles.trackButtonText}>{i18n.locale === 'fr' ? 'Suivre' : 'Track Tasker'}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Complete Button */}
                  {showComplete && (
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.completeButtonText}>{i18n.locale === 'fr' ? 'Terminer' : 'Complete'}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Payment Section */}
                  {showPaymentButtons && (
                    <View style={styles.paymentSection}>
                      <View style={styles.awaitingPaymentBadge}>
                        <Ionicons name="wallet-outline" size={16} color="#f59e0b" />
                        <Text style={styles.awaitingPaymentText}>
                          {i18n.locale === 'fr' ? 'En attente de paiement' : 'Awaiting Payment'}
                        </Text>
                      </View>
                      <View style={styles.paymentButtonsRow}>
                        <TouchableOpacity
                          style={styles.chatPaymentButton}
                          onPress={(e) => { e.stopPropagation(); router.push(`/chat/${task.id}`); }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chatbubble" size={16} color={Colors.dark.primary} />
                          <Text style={styles.chatPaymentButtonText}>{i18n.locale === 'fr' ? 'Discuter' : 'Chat'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.confirmCashButton}
                          onPress={(e) => { e.stopPropagation(); handleMarkPaidCash(task.id); }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="cash" size={16} color="#fff" />
                          <Text style={styles.confirmCashButtonText}>{i18n.locale === 'fr' ? 'Confirmer' : 'Confirm Cash'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Paid Badge */}
                  {isCompleted && isPaid && (
                    <View style={styles.paidBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.dark.success} />
                      <Text style={styles.paidBadgeText}>{i18n.locale === 'fr' ? 'Payé' : 'Paid'}</Text>
                    </View>
                  )}

                  {/* Leave Review */}
                  {showLeaveReview && (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={(e) => { e.stopPropagation(); router.push(`/task/${task.id}`); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="star" size={18} color="#f59e0b" />
                      <Text style={styles.reviewButtonText}>{i18n.locale === 'fr' ? 'Laisser un avis' : 'Leave Review'}</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </AnimatedTaskCard>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { paddingHorizontal: 24, paddingVertical: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.dark.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 4 },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8, position: 'relative',
  },
  tabIndicator: {
    position: 'absolute', top: 0, left: 16, height: '100%',
    backgroundColor: Colors.dark.primary, borderRadius: 12, zIndex: 0,
  },
  tab: {
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', zIndex: 1,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.dark.textSecondary },
  tabTextActive: { color: '#fff' },
  tabBadge: {
    backgroundColor: Colors.dark.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.dark.textSecondary },
  tabBadgeTextActive: { color: '#fff' },
  
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIconContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text, marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 8, textAlign: 'center' },
  emptyButton: {
    flexDirection: 'row', backgroundColor: Colors.dark.primary, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, alignItems: 'center', gap: 8, marginTop: 24,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  // Task Card
  taskCard: {
    backgroundColor: Colors.dark.card, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.dark.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  taskTitleContainer: { flex: 1 },
  taskTitle: { fontSize: 17, fontWeight: '600', color: Colors.dark.text, marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  taskCategory: { fontSize: 14, color: Colors.dark.primary, fontWeight: '500', marginBottom: 12 },
  
  taskMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaIconContainer: {
    width: 24, height: 24, borderRadius: 8, backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  metaText: { fontSize: 12, color: Colors.dark.textSecondary, fontWeight: '500' },
  
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarContainer: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  personName: { fontSize: 14, color: Colors.dark.text, fontWeight: '500' },
  taskPrice: { fontSize: 18, fontWeight: '700', color: Colors.dark.primary },
  
  // Waiting Message
  waitingMessage: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12, borderRadius: 12, marginTop: 12, gap: 10,
  },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  waitingMessageText: { fontSize: 13, color: '#f59e0b', flex: 1, fontWeight: '500' },
  
  // Action Buttons
  actionButtonsRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  rejectButton: {
    flex: 1, flexDirection: 'row', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: Colors.dark.error,
  },
  rejectButtonText: { fontSize: 14, fontWeight: '600', color: Colors.dark.error },
  acceptButton: {
    flex: 1, flexDirection: 'row', backgroundColor: Colors.dark.primary, padding: 12,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  acceptButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  chatActionButton: {
    marginTop: 12, flexDirection: 'row', backgroundColor: Colors.dark.card, padding: 12,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: Colors.dark.primary,
  },
  chatActionButtonText: { fontSize: 14, fontWeight: '600', color: Colors.dark.primary },
  enRouteButton: {
    marginTop: 12, backgroundColor: '#8b5cf6', padding: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  enRouteButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  startWorkButton: {
    marginTop: 12, backgroundColor: Colors.dark.primary, padding: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  startWorkButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  trackButton: {
    marginTop: 12, backgroundColor: '#f59e0b', padding: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  trackButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  completeButton: {
    marginTop: 12, backgroundColor: Colors.dark.success, padding: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  completeButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  // Payment
  paymentSection: { marginTop: 12 },
  awaitingPaymentBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10, borderRadius: 10, gap: 8, marginBottom: 10,
  },
  awaitingPaymentText: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },
  paymentButtonsRow: { flexDirection: 'row', gap: 10 },
  chatPaymentButton: {
    flex: 1, flexDirection: 'row', backgroundColor: Colors.dark.card, padding: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: Colors.dark.primary,
  },
  chatPaymentButtonText: { fontSize: 12, fontWeight: '600', color: Colors.dark.primary },
  confirmCashButton: {
    flex: 1, flexDirection: 'row', backgroundColor: Colors.dark.success, padding: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  confirmCashButtonText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  paidBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12, borderRadius: 12, marginTop: 12, gap: 8, justifyContent: 'center',
  },
  paidBadgeText: { fontSize: 14, color: Colors.dark.success, fontWeight: '700' },
  reviewButton: {
    marginTop: 12, flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#f59e0b',
  },
  reviewButtonText: { fontSize: 14, fontWeight: '600', color: '#f59e0b' },
});