import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { taskAPI, notificationAPI, reviewAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { showMessage, showConfirm } from '../../utils/alert';
import { getCategoryById, getCategoryName, getSubcategoryById, getSubcategoryName } from '../../constants/Categories';

export default function TaskerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    rating: 0,
    totalReviews: 0,
    completedTasks: 0,
    totalEarnings: 0,
  });
  
  // Timer state
  const [activeTaskTimer, setActiveTaskTimer] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.role === 'tasker') {
        fetchData();
      }
    }, [user])
  );

  useEffect(() => {
    if (user?.role === 'tasker') {
      // Poll for new tasks every 30 seconds
      const pollInterval = setInterval(fetchData, 30000);
      return () => clearInterval(pollInterval);
    }
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (activeTaskTimer) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setElapsedTime(0);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeTaskTimer]);

  // Check for active timer on load
  useEffect(() => {
    const activeTask = tasks.find(t => t.status === 'in_progress' && t.timer_started_at);
    if (activeTask) {
      setActiveTaskTimer(activeTask.id);
      const startTime = new Date(activeTask.timer_started_at).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    }
  }, [tasks]);

  const fetchData = async () => {
    try {
      const [tasksData, unreadData] = await Promise.all([
        taskAPI.getTaskerTasks(),
        notificationAPI.getUnreadCount(),
      ]);
      
      const taskList = tasksData || [];
      setTasks(taskList);
      setUnreadCount(unreadData?.unread_count || 0);
      
      // Calculate stats from tasks
      const completedTasks = taskList.filter((t: any) => t.status === 'completed');
      const totalEarnings = completedTasks.reduce((sum: number, t: any) => 
        sum + (t.final_price || t.estimated_total || 0), 0);
      
      // Get rating from user profile or calculate from reviews
      const rating = user?.tasker_profile?.rating || 0;
      const totalReviews = user?.tasker_profile?.total_reviews || 0;
      
      setStats({
        rating: rating,
        totalReviews: totalReviews,
        completedTasks: completedTasks.length,
        totalEarnings: totalEarnings,
      });
    } catch (error) {
      console.error('Error fetching tasker data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAcceptTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await taskAPI.acceptTask(taskId);
      showMessage(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Tâche acceptée!' : 'Task accepted!'
      );
      fetchData();
    } catch (error: any) {
      console.error('Error accepting task:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible d\'accepter la tâche' : 'Failed to accept task')
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    showConfirm(
      i18n.locale === 'fr' ? 'Refuser la tâche?' : 'Reject task?',
      i18n.locale === 'fr' ? 'Êtes-vous sûr de vouloir refuser cette tâche?' : 'Are you sure you want to reject this task?',
      async () => {
        try {
          setActionLoading(taskId);
          await taskAPI.rejectTask(taskId);
          showMessage(
            i18n.locale === 'fr' ? 'Tâche refusée' : 'Task rejected',
            i18n.locale === 'fr' ? 'Le client sera notifié.' : 'The client will be notified.'
          );
          fetchData();
        } catch (error: any) {
          console.error('Error rejecting task:', error);
          showMessage(
            i18n.locale === 'fr' ? 'Erreur' : 'Error',
            error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible de refuser la tâche' : 'Failed to reject task')
          );
        } finally {
          setActionLoading(null);
        }
      },
      undefined,
      i18n.locale === 'fr' ? 'Oui, refuser' : 'Yes, reject',
      i18n.locale === 'fr' ? 'Non' : 'No'
    );
  };

  const handleStartTimer = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await taskAPI.startTimer(taskId);
      setActiveTaskTimer(taskId);
      setElapsedTime(0);
      showMessage(
        i18n.locale === 'fr' ? 'Chronomètre démarré' : 'Timer Started',
        i18n.locale === 'fr' ? 'Le client a été notifié que vous avez commencé.' : 'The client has been notified that you started.'
      );
      fetchData();
    } catch (error: any) {
      console.error('Error starting timer:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible de démarrer le chronomètre' : 'Failed to start timer')
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopTimer = async (taskId: string) => {
    showConfirm(
      i18n.locale === 'fr' ? 'Terminer le travail?' : 'Finish work?',
      i18n.locale === 'fr' ? 'Êtes-vous sûr de vouloir arrêter le chronomètre et terminer la tâche?' : 'Are you sure you want to stop the timer and complete the task?',
      async () => {
        try {
          setActionLoading(taskId);
          await taskAPI.stopTimer(taskId);
          setActiveTaskTimer(null);
          setElapsedTime(0);
          showMessage(
            i18n.locale === 'fr' ? 'Travail terminé!' : 'Work completed!',
            i18n.locale === 'fr' ? 'Le client a été notifié.' : 'The client has been notified.'
          );
          fetchData();
        } catch (error: any) {
          console.error('Error stopping timer:', error);
          showMessage(
            i18n.locale === 'fr' ? 'Erreur' : 'Error',
            error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible d\'arrêter le chronomètre' : 'Failed to stop timer')
          );
        } finally {
          setActionLoading(null);
        }
      },
      undefined,
      i18n.locale === 'fr' ? 'Oui, terminer' : 'Yes, finish',
      i18n.locale === 'fr' ? 'Non' : 'No'
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
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return Colors.dark.success;
      case 'cancelled':
      case 'rejected': return Colors.dark.error;
      default: return Colors.dark.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    if (i18n.locale === 'fr') {
      switch (status) {
        case 'pending': return 'En attente';
        case 'accepted': return 'Acceptée';
        case 'in_progress': return 'En cours';
        case 'completed': return 'Terminée';
        case 'cancelled': return 'Annulée';
        case 'rejected': return 'Refusée';
        default: return status;
      }
    }
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const acceptedTasks = tasks.filter(t => t.status === 'accepted');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed').slice(0, 5);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.dark.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeHand}>👋</Text>
              <Text style={styles.welcomeText}>
                {i18n.locale === 'fr' ? 'Bonjour,' : 'Welcome,'} {user?.full_name?.split(' ')[0]}!
              </Text>
            </View>
            <Text style={styles.motivationalText}>
              {i18n.locale === 'fr' 
                ? 'Prêt à améliorer la journée de quelqu\'un'
                : 'Ready to make someone\'s day better'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications" size={24} color={Colors.dark.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Cards - Clickable */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#f59e0b20' }]}
            onPress={() => router.push('/tasker/my-reviews')}
          >
            <Ionicons name="star" size={20} color="#f59e0b" />
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
              {stats.rating > 0 ? stats.rating.toFixed(1) : '-'}
            </Text>
            <Text style={styles.statLabel}>
              {i18n.locale === 'fr' ? 'Note' : 'Rating'}
            </Text>
            <Text style={styles.statSubLabel}>({stats.totalReviews})</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#3b82f620' }]}
            onPress={() => {/* Could navigate to completed tasks list */}}
          >
            <Ionicons name="clipboard-outline" size={20} color="#3b82f6" />
            <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{stats.completedTasks}</Text>
            <Text style={styles.statLabel}>
              {i18n.locale === 'fr' ? 'Tâches' : 'Tasks'}
            </Text>
            <Text style={styles.statSubLabel}>{i18n.locale === 'fr' ? 'terminées' : 'complete'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#10b98120' }]}
            onPress={() => router.push('/tasker/my-earnings')}
          >
            <Ionicons name="wallet-outline" size={20} color={Colors.dark.success} />
            <Text style={[styles.statNumber, { color: Colors.dark.success }]}>
              {stats.totalEarnings > 1000 
                ? `${Math.round(stats.totalEarnings / 1000)}K` 
                : stats.totalEarnings}
            </Text>
            <Text style={styles.statLabel}>
              {i18n.locale === 'fr' ? 'Revenus' : 'Earned'}
            </Text>
            <Text style={styles.statSubLabel}>XOF</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionBtn}
            onPress={() => router.push('/tasker/edit-profile')}
          >
            <Ionicons name="person-outline" size={20} color={Colors.dark.primary} />
            <Text style={styles.quickActionText}>
              {i18n.locale === 'fr' ? 'Profil' : 'Profile'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionBtn}
            onPress={() => router.push('/tasker/manage-services')}
          >
            <Ionicons name="construct-outline" size={20} color={Colors.dark.primary} />
            <Text style={styles.quickActionText}>
              {i18n.locale === 'fr' ? 'Services' : 'Services'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionBtn}
            onPress={() => router.push('/tasker/my-reviews')}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={Colors.dark.primary} />
            <Text style={styles.quickActionText}>
              {i18n.locale === 'fr' ? 'Avis' : 'Reviews'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionBtn}
            onPress={() => router.push('/tasker/my-earnings')}
          >
            <Ionicons name="cash-outline" size={20} color={Colors.dark.primary} />
            <Text style={styles.quickActionText}>
              {i18n.locale === 'fr' ? 'Revenus' : 'Earnings'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Task Requests - CRITICAL SECTION */}
        {pendingTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.urgentBadge}>
                  <Ionicons name="alert-circle" size={16} color={Colors.dark.background} />
                </View>
                <Text style={styles.sectionTitle}>
                  {i18n.locale === 'fr' ? 'Demandes en attente' : 'Pending Requests'}
                </Text>
              </View>
              <Text style={styles.taskCount}>{pendingTasks.length}</Text>
            </View>

            {pendingTasks.map((task) => {
              const category = getCategoryById(task.category);
              const subcategory = task.subcategory ? getSubcategoryById(task.category, task.subcategory) : null;

              return (
                <View key={task.id} style={styles.pendingCard}>
                  <View style={styles.pendingHeader}>
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingTitle}>{task.title}</Text>
                      <View style={styles.pendingMeta}>
                        <Ionicons name="person" size={14} color={Colors.dark.textSecondary} />
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
                    >
                      {actionLoading === task.id ? (
                        <ActivityIndicator size="small" color={Colors.dark.error} />
                      ) : (
                        <>
                          <Ionicons name="close" size={18} color={Colors.dark.error} />
                          <Text style={styles.rejectBtnText}>
                            {i18n.locale === 'fr' ? 'Refuser' : 'Reject'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => handleAcceptTask(task.id)}
                      disabled={actionLoading === task.id}
                    >
                      {actionLoading === task.id ? (
                        <ActivityIndicator size="small" color={Colors.dark.background} />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={18} color={Colors.dark.background} />
                          <Text style={styles.acceptBtnText}>
                            {i18n.locale === 'fr' ? 'Accepter' : 'Accept'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Accepted Tasks - Ready to Start */}
        {acceptedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {i18n.locale === 'fr' ? 'Prêt à commencer' : 'Ready to Start'}
            </Text>

            {acceptedTasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(task.status)}</Text>
                  </View>
                </View>
                <View style={styles.taskMeta}>
                  <Ionicons name="calendar" size={14} color={Colors.dark.textSecondary} />
                  <Text style={styles.taskMetaText}>{formatDate(task.scheduled_date || task.task_date)}</Text>
                  <Ionicons name="location" size={14} color={Colors.dark.textSecondary} style={{ marginLeft: 12 }} />
                  <Text style={styles.taskMetaText}>{task.city || task.address}</Text>
                </View>
                <View style={styles.taskFooter}>
                  <Text style={styles.taskPrice}>{(task.estimated_total || task.total_cost || 0).toLocaleString()} XOF</Text>
                  <TouchableOpacity
                    style={styles.startTimerBtn}
                    onPress={() => handleStartTimer(task.id)}
                    disabled={actionLoading === task.id}
                  >
                    {actionLoading === task.id ? (
                      <ActivityIndicator size="small" color={Colors.dark.background} />
                    ) : (
                      <>
                        <Ionicons name="play" size={18} color={Colors.dark.background} />
                        <Text style={styles.startTimerText}>
                          {i18n.locale === 'fr' ? 'Démarrer' : 'Start'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* In Progress Tasks with Timer */}
        {inProgressTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {i18n.locale === 'fr' ? 'En cours' : 'In Progress'}
            </Text>

            {inProgressTasks.map((task) => (
              <View key={task.id} style={[styles.taskCard, styles.activeTaskCard]}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#8b5cf6' }]}>
                    <Ionicons name="time" size={12} color={Colors.dark.background} />
                    <Text style={styles.statusText}>
                      {i18n.locale === 'fr' ? 'En cours' : 'Active'}
                    </Text>
                  </View>
                </View>

                {/* Timer Display */}
                <View style={styles.timerContainer}>
                  <View style={styles.timerDisplay}>
                    <Ionicons name="stopwatch" size={32} color={Colors.dark.primary} />
                    <Text style={styles.timerText}>
                      {activeTaskTimer === task.id ? formatTime(elapsedTime) : '--:--:--'}
                    </Text>
                  </View>
                  {task.pricing_type === 'hourly' && (
                    <Text style={styles.timerSubtext}>
                      {i18n.locale === 'fr' ? 'Taux:' : 'Rate:'} {task.hourly_rate?.toLocaleString()} XOF/h
                    </Text>
                  )}
                </View>

                <View style={styles.taskFooter}>
                  <View>
                    <Text style={styles.taskMetaText}>{task.address}</Text>
                    <Text style={styles.taskPrice}>{(task.estimated_total || task.total_cost || 0).toLocaleString()} XOF</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stopTimerBtn}
                    onPress={() => handleStopTimer(task.id)}
                    disabled={actionLoading === task.id}
                  >
                    {actionLoading === task.id ? (
                      <ActivityIndicator size="small" color={Colors.dark.background} />
                    ) : (
                      <>
                        <Ionicons name="stop" size={18} color={Colors.dark.background} />
                        <Text style={styles.stopTimerText}>
                          {i18n.locale === 'fr' ? 'Terminer' : 'Finish'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Completed */}
        {completedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {i18n.locale === 'fr' ? 'Récemment terminées' : 'Recently Completed'}
            </Text>

            {completedTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskCard, styles.completedCard]}
                onPress={() => router.push(`/task/${task.id}`)}
              >
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.dark.success }]}>
                    <Ionicons name="checkmark" size={12} color={Colors.dark.background} />
                    <Text style={styles.statusText}>{getStatusText(task.status)}</Text>
                  </View>
                </View>
                <View style={styles.taskMeta}>
                  <Ionicons name="calendar" size={14} color={Colors.dark.textSecondary} />
                  <Text style={styles.taskMetaText}>{formatDate(task.completed_at || task.scheduled_date || task.task_date)}</Text>
                </View>
                <Text style={styles.taskPrice}>
                  {(task.final_price || task.estimated_total || task.total_cost || 0).toLocaleString()} XOF
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyTitle}>
              {i18n.locale === 'fr' ? 'Aucune tâche' : 'No tasks yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {i18n.locale === 'fr'
                ? 'Les nouvelles demandes apparaîtront ici'
                : 'New task requests will appear here'}
            </Text>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Welcome Section
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    backgroundColor: Colors.dark.primary,
    marginHorizontal: -20,
    marginTop: -20,
    padding: 20,
    paddingTop: 16,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeHand: {
    fontSize: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.background,
  },
  motivationalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    marginLeft: 32,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.dark.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  statSubLabel: {
    fontSize: 10,
    color: Colors.dark.textSecondary,
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  quickActionText: {
    fontSize: 11,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  taskCount: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  // Pending Card
  pendingCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  pendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pendingMetaText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  pendingPrice: {
    alignItems: 'flex-end',
  },
  pendingPriceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  pendingPriceCurrency: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  rejectBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: Colors.dark.error,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.error,
  },
  acceptBtn: {
    backgroundColor: Colors.dark.primary,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  // Task Card
  taskCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  activeTaskCard: {
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },
  completedCard: {
    opacity: 0.8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  taskMetaText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  taskPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  startTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  startTimerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  stopTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  stopTimerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  timerContainer: {
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.dark.text,
    fontFamily: 'monospace',
  },
  timerSubtext: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 8,
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
});
