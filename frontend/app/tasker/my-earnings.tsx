import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { taskAPI } from '../../services/api';

export default function MyEarningsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    pendingPayment: 0,
  });

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const allTasks = await taskAPI.getTaskerTasks();
      
      // Get ALL completed tasks (both paid and unpaid)
      const completed = (allTasks || []).filter(
        (t: any) => t.status === 'completed'
      );
      
      // Sort by date (most recent first)
      completed.sort((a: any, b: any) => {
        const dateA = new Date(a.completed_at || a.task_date || a.scheduled_date);
        const dateB = new Date(b.completed_at || b.task_date || b.scheduled_date);
        return dateB.getTime() - dateA.getTime();
      });
      
      setCompletedTasks(completed);
      
      // Only count revenue from PAID tasks (is_paid=true)
      const paidTasks = completed.filter(
        (t: any) => t.is_paid === true || t.payment_status === 'paid'
      );
      
      // Calculate earnings from PAID tasks only
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      let total = 0;
      let thisMonth = 0;
      let lastMonth = 0;
      
      paidTasks.forEach((task: any) => {
        const amount = task.final_price || task.total_cost || task.estimated_total || 0;
        const taskDate = new Date(task.completed_at || task.task_date || task.scheduled_date);
        
        total += amount;
        
        if (taskDate >= thisMonthStart) {
          thisMonth += amount;
        } else if (taskDate >= lastMonthStart && taskDate <= lastMonthEnd) {
          lastMonth += amount;
        }
      });
      
      // Calculate pending payment (completed but not paid)
      const unpaidTasks = completed.filter(
        (t: any) => t.is_paid !== true && t.payment_status !== 'paid'
      );
      const pendingPayment = unpaidTasks.reduce((sum: number, t: any) => 
        sum + (t.final_price || t.total_cost || t.estimated_total || 0), 0);
      
      setEarnings({ total, thisMonth, lastMonth, pendingPayment });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + ' XOF';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isTaskPaid = (task: any) => {
    return task.is_paid === true || task.payment_status === 'paid';
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Mes revenus' : 'My Earnings'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Total Earnings Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            {i18n.locale === 'fr' ? 'Revenus totaux (payés)' : 'Total Earnings (paid)'}
          </Text>
          <Text style={styles.totalAmount}>{formatCurrency(earnings.total)}</Text>
          <View style={styles.periodRow}>
            <View style={styles.periodItem}>
              <Text style={styles.periodLabel}>
                {i18n.locale === 'fr' ? 'Ce mois' : 'This Month'}
              </Text>
              <Text style={styles.periodAmount}>{formatCurrency(earnings.thisMonth)}</Text>
            </View>
            <View style={styles.periodDivider} />
            <View style={styles.periodItem}>
              <Text style={styles.periodLabel}>
                {i18n.locale === 'fr' ? 'Mois dernier' : 'Last Month'}
              </Text>
              <Text style={styles.periodAmount}>{formatCurrency(earnings.lastMonth)}</Text>
            </View>
          </View>
        </View>

        {/* Pending Payment Card (if any) */}
        {earnings.pendingPayment > 0 && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingIcon}>
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
            </View>
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingLabel}>
                {i18n.locale === 'fr' ? 'Paiements en attente' : 'Pending Payments'}
              </Text>
              <Text style={styles.pendingAmount}>{formatCurrency(earnings.pendingPayment)}</Text>
            </View>
          </View>
        )}

        {/* Earnings History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            {i18n.locale === 'fr' ? 'Historique des tâches' : 'Task History'}
          </Text>

          {completedTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyText}>
                {i18n.locale === 'fr' ? 'Aucune tâche terminée' : 'No completed tasks yet'}
              </Text>
            </View>
          ) : (
            completedTasks.map((task, index) => {
              const isPaid = isTaskPaid(task);
              const amount = task.final_price || task.total_cost || task.estimated_total || 0;
              
              return (
                <TouchableOpacity
                  key={task.id || index}
                  style={styles.earningCard}
                  onPress={() => router.push(`/task/${task.id}`)}
                >
                  <View style={styles.earningIcon}>
                    <Ionicons 
                      name={isPaid ? "checkmark-circle" : "time-outline"} 
                      size={24} 
                      color={isPaid ? Colors.dark.success : '#f59e0b'} 
                    />
                  </View>
                  <View style={styles.earningInfo}>
                    <Text style={styles.earningTitle}>{task.title}</Text>
                    <Text style={styles.earningDate}>
                      {formatDate(task.completed_at || task.task_date || task.scheduled_date)}
                    </Text>
                    {/* Payment Status Badge */}
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: isPaid ? Colors.dark.success : '#f59e0b' }
                      ]}>
                        {isPaid 
                          ? (i18n.locale === 'fr' ? 'Payé' : 'Paid')
                          : (i18n.locale === 'fr' ? 'En attente' : 'Pending')
                        }
                      </Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.earningAmount,
                    { color: isPaid ? Colors.dark.success : '#f59e0b' }
                  ]}>
                    {isPaid ? '+' : ''}{formatCurrency(amount)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text },
  scrollView: { flex: 1, padding: 24 },
  totalCard: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.dark.background,
    marginTop: 4,
  },
  periodRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  periodItem: { flex: 1 },
  periodDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  periodLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  periodAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.background,
    marginTop: 4,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pendingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingInfo: { flex: 1 },
  pendingLabel: { fontSize: 13, color: Colors.dark.textSecondary },
  pendingAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginTop: 2,
  },
  historySection: { flex: 1, marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 12 },
  earningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  earningIcon: { marginRight: 12 },
  earningInfo: { flex: 1 },
  earningTitle: { fontSize: 15, fontWeight: '500', color: Colors.dark.text },
  earningDate: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
