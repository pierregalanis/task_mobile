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
import { taskAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { getCategoryById, getCategoryName } from '../../constants/Categories';

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = user?.role === 'client' 
        ? await taskAPI.getClientTasks()
        : await taskAPI.getTaskerTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
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

  const handleStatusUpdate = async (taskId: string, status: string) => {
    try {
      await taskAPI.updateTaskStatus(taskId, status);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return Colors.dark.success;
      case 'cancelled': return Colors.dark.error;
      default: return Colors.dark.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    if (i18n.locale === 'fr') {
      switch (status) {
        case 'pending': return 'En attente';
        case 'accepted': return 'Acceptée';
        case 'en_route': return 'En route';
        case 'in_progress': return 'En cours';
        case 'completed': return 'Terminée';
        case 'cancelled': return 'Annulée';
        default: return status;
      }
    }
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const activeTasks = tasks.filter(t => ['pending', 'accepted', 'en_route', 'in_progress'].includes(t.status));
  const completedTasks = tasks.filter(t => ['completed', 'cancelled'].includes(t.status));
  const displayTasks = activeTab === 'active' ? activeTasks : completedTasks;

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
          {i18n.t('bookings.title')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {tasks.length} {i18n.locale === 'fr' ? 'réservations' : 'bookings'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            {i18n.t('bookings.active')} ({activeTasks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            {i18n.t('bookings.completed')} ({completedTasks.length})
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
              {i18n.t('bookings.noBookings')}
            </Text>
          </View>
        ) : (
          displayTasks.map((task) => {
            const category = getCategoryById(task.category);
            const categoryName = category ? getCategoryName(category, i18n.locale) : task.category;
            
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
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                      <Text style={styles.statusBadgeText}>{getStatusText(task.status)}</Text>
                    </View>
                  </View>
                  {task.status === 'accepted' && (
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => router.push(`/chat/${task.id}`)}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color={Colors.dark.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.taskCategory}>{categoryName}</Text>

                <View style={styles.taskMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.dark.textSecondary} />
                    <Text style={styles.metaText}>
                      {new Date(task.scheduled_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.dark.textSecondary} />
                    <Text style={styles.metaText}>
                      {new Date(task.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
                    <Text style={styles.metaText}>{task.city}</Text>
                  </View>
                </View>

                <View style={styles.taskFooter}>
                  <View style={styles.personInfo}>
                    <Ionicons name="person-circle-outline" size={20} color={Colors.dark.textSecondary} />
                    <Text style={styles.personName}>
                      {user?.role === 'client' ? task.tasker_name : task.client_name}
                    </Text>
                  </View>
                  <Text style={styles.taskPrice}>{task.estimated_total} XOF</Text>
                </View>

                {/* Action Buttons for Tasker */}
                {user?.role === 'tasker' && task.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptTask(task.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.acceptButtonText}>
                      {i18n.locale === 'fr' ? 'Accepter la tâche' : 'Accept Task'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* En Route Button for Tasker */}
                {user?.role === 'tasker' && task.status === 'accepted' && (
                  <TouchableOpacity
                    style={styles.enRouteButton}
                    onPress={() => router.push(`/tracking/${task.id}?mode=tasker`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="navigate" size={18} color={Colors.dark.background} />
                    <Text style={styles.enRouteButtonText}>
                      {i18n.locale === 'fr' ? 'En route' : 'En Route'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Track Route Button for Client */}
                {user?.role === 'client' && task.status === 'en_route' && (
                  <TouchableOpacity
                    style={styles.trackButton}
                    onPress={() => router.push(`/tracking/${task.id}?mode=client`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location" size={18} color={Colors.dark.background} />
                    <Text style={styles.trackButtonText}>
                      {i18n.locale === 'fr' ? 'Suivre le trajet' : 'Track Route'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Action Buttons for In Progress */}
                {user?.role === 'tasker' && task.status === 'in_progress' && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleStatusUpdate(task.id, 'completed')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.completeButtonText}>
                      {i18n.locale === 'fr' ? 'Marquer comme terminée' : 'Mark as Completed'}
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
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
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
    fontSize: 14,
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
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  acceptButton: {
    marginTop: 16,
    backgroundColor: Colors.dark.primary,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  completeButton: {
    marginTop: 16,
    backgroundColor: Colors.dark.success,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.background,
  },
});
