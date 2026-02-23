import React, { useState, useEffect } from 'react';
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
import { taskAPI, categoryAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { Category, getCategoryById, getCategoryName } from '../../constants/Categories';

// Tab types for different user roles
type ClientTab = 'pending' | 'upcoming' | 'completed';
type TaskerTab = 'pending' | 'active' | 'completed';

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientTab | TaskerTab>('pending');

  const isClient = user?.role === 'client';
  const isTasker = user?.role === 'tasker';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, tasksData] = await Promise.all([
        categoryAPI.getCategories().catch(() => []),
        isClient 
          ? taskAPI.getClientTasks()
          : taskAPI.getTaskerTasks()
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
      const data = isClient 
        ? await taskAPI.getClientTasks()
        : await taskAPI.getTaskerTasks();
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleAcceptTask = async (taskId: string) => {
    try {
      await taskAPI.acceptTask(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Error accepting task:', error);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      await taskAPI.rejectTask(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Error rejecting task:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await taskAPI.completeTask(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleMarkPaidCash = async (taskId: string) => {
    try {
      await taskAPI.markPaidCash(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  // Status color mapping
  const getStatusColor = (status: string, isPaid?: boolean) => {
    if (status === 'completed' && isPaid) return Colors.dark.success;
    switch (status) {
      case 'assigned': return '#f59e0b'; // Pending approval
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'en_route': return '#8b5cf6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return '#f59e0b'; // Awaiting payment
      case 'cancelled': return Colors.dark.error;
      default: return Colors.dark.textSecondary;
    }
  };

  // Status text mapping
  const getStatusText = (status: string, isPaid?: boolean) => {
    if (i18n.locale === 'fr') {
      if (status === 'completed' && isPaid) return 'Payé';
      if (status === 'completed' && !isPaid) return 'En attente paiement';
      switch (status) {
        case 'assigned': return 'En attente';
        case 'pending': return 'En attente';
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

  // Filter tasks based on tab and role
  // Website uses: assigned -> in_progress -> completed
  // assigned = pending (waiting for tasker to accept)
  // in_progress = active/upcoming (tasker accepted, work ongoing)
  // completed = done (check is_paid for payment status)

  const pendingTasks = tasks.filter(t => 
    t.status === 'assigned' || t.status === 'pending'
  );
  
  const activeTasks = tasks.filter(t => 
    ['accepted', 'en_route', 'in_progress'].includes(t.status)
  );
  
  const completedTasks = tasks.filter(t => 
    ['completed', 'cancelled'].includes(t.status)
  );

  // Get tasks for current tab
  const getDisplayTasks = () => {
    switch (activeTab) {
      case 'pending': return pendingTasks;
      case 'upcoming': return activeTasks; // Client uses "upcoming"
      case 'active': return activeTasks;   // Tasker uses "active"
      case 'completed': return completedTasks;
      default: return [];
    }
  };

  const displayTasks = getDisplayTasks();

  // Tab labels based on role
  const getTabLabel = (tab: string, count: number) => {
    if (i18n.locale === 'fr') {
      switch (tab) {
        case 'pending': return `En attente (${count})`;
        case 'upcoming': return `À venir (${count})`;
        case 'active': return `Actif (${count})`;
        case 'completed': return `Terminé (${count})`;
        default: return tab;
      }
    }
    switch (tab) {
      case 'pending': return `Pending (${count})`;
      case 'upcoming': return `Upcoming (${count})`;
      case 'active': return `Active (${count})`;
      case 'completed': return `Completed (${count})`;
      default: return tab;
    }
  };

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
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Réservations' : 'Bookings'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {tasks.length} {i18n.locale === 'fr' ? 'réservations' : 'bookings'}
        </Text>
      </View>

      {/* 3 Tabs */}
      <View style={styles.tabsContainer}>
        {/* Tab 1: Pending */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            {getTabLabel('pending', pendingTasks.length)}
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Active/Upcoming */}
        <TouchableOpacity
          style={[styles.tab, (activeTab === 'active' || activeTab === 'upcoming') && styles.tabActive]}
          onPress={() => setActiveTab(isClient ? 'upcoming' : 'active')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, (activeTab === 'active' || activeTab === 'upcoming') && styles.tabTextActive]}>
            {getTabLabel(isClient ? 'upcoming' : 'active', activeTasks.length)}
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Completed */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            {getTabLabel('completed', completedTasks.length)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
        }
      >
        {displayTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={Colors.dark.textSecondary} />
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
          </View>
        ) : (
          displayTasks.map((task) => {
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

            // Determine what buttons to show based on status and role
            const status = task.status;
            const isPending = status === 'assigned' || status === 'pending';
            const isActive = ['accepted', 'en_route', 'in_progress'].includes(status);
            const isCompleted = status === 'completed';
            const isCancelled = status === 'cancelled';

            // Button visibility
            const showAcceptReject = isTasker && isPending;
            const showWaitingMessage = isClient && isPending;
            const showChat = isActive; // Only show chat when in_progress/active
            const showEnRoute = isTasker && status === 'accepted';
            const showStartWork = isTasker && status === 'en_route';
            const showTrack = isClient && (status === 'en_route' || status === 'in_progress');
            const showTimer = isActive && task.timer_started;
            const showComplete = isTasker && status === 'in_progress';
            const showPaymentButtons = isTasker && isCompleted && !isPaid;
            const showLeaveReview = isClient && isCompleted && !task.review_submitted;
            
            return (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => router.push(`/task/${task.id}`)}
                activeOpacity={0.7}
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
                    <Ionicons name="calendar-outline" size={14} color={Colors.dark.textSecondary} />
                    <Text style={styles.metaText}>{formatTaskDate(taskDate)}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.dark.textSecondary} />
                    <Text style={styles.metaText}>{formatTaskTime(taskDate)}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
                    <Text style={styles.metaText}>{task.city || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.taskFooter}>
                  <View style={styles.personInfo}>
                    <Ionicons name="person-circle-outline" size={20} color={Colors.dark.textSecondary} />
                    <Text style={styles.personName}>
                      {isClient ? (task.tasker_name || 'Tasker') : (task.client_name || 'Client')}
                    </Text>
                  </View>
                  <Text style={styles.taskPrice}>{totalCost.toLocaleString()} XOF</Text>
                </View>

                {/* Waiting Message for Client */}
                {showWaitingMessage && (
                  <View style={styles.waitingMessage}>
                    <Ionicons name="hourglass-outline" size={16} color="#f59e0b" />
                    <Text style={styles.waitingMessageText}>
                      {i18n.locale === 'fr' 
                        ? 'En attente de confirmation du tâcheron' 
                        : 'Waiting for tasker approval'}
                    </Text>
                  </View>
                )}

                {/* Accept/Reject Buttons for Tasker */}
                {showAcceptReject && (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRejectTask(task.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={18} color={Colors.dark.error} />
                      <Text style={styles.rejectButtonText}>
                        {i18n.locale === 'fr' ? 'Refuser' : 'Decline'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAcceptTask(task.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark" size={18} color={Colors.dark.background} />
                      <Text style={styles.acceptButtonText}>
                        {i18n.locale === 'fr' ? 'Accepter' : 'Accept'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Chat Button - Only when active */}
                {showChat && (
                  <TouchableOpacity
                    style={styles.chatActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/chat/${task.id}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-ellipses" size={18} color={Colors.dark.primary} />
                    <Text style={styles.chatActionButtonText}>
                      {i18n.locale === 'fr' ? 'Discuter' : 'Chat'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* En Route Button for Tasker (when accepted) */}
                {showEnRoute && (
                  <TouchableOpacity
                    style={styles.enRouteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/tracking/${task.id}?mode=tasker`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="navigate" size={18} color={Colors.dark.background} />
                    <Text style={styles.enRouteButtonText}>
                      {i18n.locale === 'fr' ? 'En route' : 'On My Way'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Start Work Button for Tasker (when en_route) */}
                {showStartWork && (
                  <TouchableOpacity
                    style={styles.startWorkButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/task/${task.id}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play-circle" size={18} color={Colors.dark.background} />
                    <Text style={styles.startWorkButtonText}>
                      {i18n.locale === 'fr' ? 'Commencer le travail' : 'Start Work'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Track Route Button for Client */}
                {showTrack && (
                  <TouchableOpacity
                    style={styles.trackButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/tracking/${task.id}?mode=client`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location" size={18} color={Colors.dark.background} />
                    <Text style={styles.trackButtonText}>
                      {i18n.locale === 'fr' ? 'Suivre le trajet' : 'Track Tasker'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Complete Button for Tasker */}
                {showComplete && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCompleteTask(task.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={Colors.dark.background} />
                    <Text style={styles.completeButtonText}>
                      {i18n.locale === 'fr' ? 'Marquer terminée' : 'Mark Complete'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Payment Buttons for Tasker (completed but unpaid) */}
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
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/chat/${task.id}`);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chatbubble" size={16} color={Colors.dark.primary} />
                        <Text style={styles.chatPaymentButtonText}>
                          {i18n.locale === 'fr' ? 'Discuter paiement' : 'Chat Payment'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmCashButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarkPaidCash(task.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="cash" size={16} color={Colors.dark.background} />
                        <Text style={styles.confirmCashButtonText}>
                          {i18n.locale === 'fr' ? 'Confirmer espèces' : 'Confirm Cash'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Paid Badge */}
                {isCompleted && isPaid && (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.dark.success} />
                    <Text style={styles.paidBadgeText}>
                      {i18n.locale === 'fr' ? 'Payé' : 'Paid'}
                    </Text>
                  </View>
                )}

                {/* Leave Review for Client */}
                {showLeaveReview && (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/task/${task.id}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="star" size={18} color="#f59e0b" />
                    <Text style={styles.reviewButtonText}>
                      {i18n.locale === 'fr' ? 'Laisser un avis' : 'Leave Review'}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tabActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  tabTextActive: {
    color: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
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
  },
  taskCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  taskCategory: {
    fontSize: 14,
    color: Colors.dark.primary,
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textSecondary,
    marginHorizontal: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personName: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  taskPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
  // Waiting message for client
  waitingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  waitingMessageText: {
    fontSize: 13,
    color: '#f59e0b',
    flex: 1,
  },
  // Action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.error,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.error,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.primary,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  chatActionButton: {
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
  chatActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  enRouteButton: {
    marginTop: 12,
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  enRouteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  startWorkButton: {
    marginTop: 12,
    backgroundColor: Colors.dark.primary,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startWorkButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  trackButton: {
    marginTop: 12,
    backgroundColor: '#f59e0b',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  completeButton: {
    marginTop: 12,
    backgroundColor: Colors.dark.success,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  // Payment section
  paymentSection: {
    marginTop: 12,
  },
  awaitingPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  awaitingPaymentText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  paymentButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chatPaymentButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  chatPaymentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  confirmCashButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.success,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmCashButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
    justifyContent: 'center',
  },
  paidBadgeText: {
    fontSize: 14,
    color: Colors.dark.success,
    fontWeight: '700',
  },
  reviewButton: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
});