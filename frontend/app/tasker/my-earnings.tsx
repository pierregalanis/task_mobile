import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { taskAPI } from '../../services/api';

const { width } = Dimensions.get('window');

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

  const opacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return <Animated.View style={[{ width: w, height, backgroundColor: Colors.dark.border, borderRadius: 8, opacity }, style]} />;
};

const SkeletonEarningCard = () => (
  <View style={styles.earningCard}>
    <SkeletonBox width={48} height={48} style={{ borderRadius: 14 }} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <SkeletonBox width={140} height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width={90} height={12} style={{ marginBottom: 6 }} />
      <SkeletonBox width={60} height={20} style={{ borderRadius: 8 }} />
    </View>
    <SkeletonBox width={80} height={20} style={{}} />
  </View>
);

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1500 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(Math.floor(v));
    });

    return () => animatedValue.removeListener(listener);
  }, [value]);

  return <Text style={styles.totalAmount}>{displayValue.toLocaleString()} XOF</Text>;
};

// Growth Indicator Component
const GrowthIndicator = ({ current, previous }: { current: number; previous: number }) => {
  const percentage = previous > 0 ? Math.round(((current - previous) / previous) * 100) : (current > 0 ? 100 : 0);
  const isPositive = percentage >= 0;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.growthBadge, 
        { backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' },
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Ionicons 
        name={isPositive ? "trending-up" : "trending-down"} 
        size={14} 
        color={isPositive ? '#10b981' : '#ef4444'} 
      />
      <Text style={[styles.growthText, { color: isPositive ? '#10b981' : '#ef4444' }]}>
        {isPositive ? '+' : ''}{percentage}%
      </Text>
      <Text style={styles.growthLabel}>
        {i18n.locale === 'fr' ? 'vs mois dernier' : 'vs last month'}
      </Text>
    </Animated.View>
  );
};

// Earnings Chart Component - NEW!
const EarningsChart = ({ dailyData }: { dailyData: { day: string; amount: number; date: Date }[] }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const barAnims = useRef(dailyData.map(() => new Animated.Value(0))).current;

  const maxAmount = Math.max(...dailyData.map(d => d.amount), 1);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    
    // Animate bars sequentially
    const animations = barAnims.map((anim, index) => 
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: false,
      })
    );
    Animated.stagger(50, animations).start();
  }, []);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toString();
  };

  return (
    <Animated.View style={[styles.chartSection, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>
        {i18n.locale === 'fr' ? '7 derniers jours' : 'Last 7 Days'}
      </Text>
      <View style={styles.chartCard}>
        {/* Y-axis labels */}
        <View style={styles.chartYAxis}>
          <Text style={styles.chartYLabel}>{formatAmount(maxAmount)}</Text>
          <Text style={styles.chartYLabel}>{formatAmount(maxAmount / 2)}</Text>
          <Text style={styles.chartYLabel}>0</Text>
        </View>

        {/* Chart bars */}
        <View style={styles.chartBarsContainer}>
          {dailyData.map((item, index) => {
            const barHeight = barAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, (item.amount / maxAmount) * 120],
            });

            const isSelected = selectedDay === index;
            const hasEarnings = item.amount > 0;

            return (
              <TouchableOpacity
                key={index}
                style={styles.chartBarWrapper}
                onPress={() => setSelectedDay(isSelected ? null : index)}
                activeOpacity={0.7}
              >
                {/* Amount tooltip */}
                {isSelected && item.amount > 0 && (
                  <View style={styles.chartTooltip}>
                    <Text style={styles.chartTooltipText}>{item.amount.toLocaleString()}</Text>
                  </View>
                )}
                
                {/* Bar */}
                <View style={styles.chartBarOuter}>
                  <Animated.View
                    style={[
                      styles.chartBar,
                      {
                        height: barHeight,
                        backgroundColor: isSelected ? Colors.dark.primary : (hasEarnings ? `${Colors.dark.primary}90` : Colors.dark.border),
                      },
                    ]}
                  />
                </View>
                
                {/* Day label */}
                <Text style={[styles.chartDayLabel, isSelected && styles.chartDayLabelActive]}>
                  {item.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
};

// Revenue By Service Component
const RevenueByService = ({ data }: { data: { category: string; amount: number; percentage: number; color: string }[] }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();
  }, []);

  if (data.length === 0) return null;

  return (
    <Animated.View style={[styles.revenueSection, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>
        {i18n.locale === 'fr' ? 'Revenus par service' : 'Revenue by Service'}
      </Text>
      <View style={styles.revenueCard}>
        {/* Progress Bar */}
        <View style={styles.revenueBarContainer}>
          {data.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.revenueBarSegment, 
                { 
                  backgroundColor: item.color, 
                  flex: item.percentage,
                  borderTopLeftRadius: index === 0 ? 6 : 0,
                  borderBottomLeftRadius: index === 0 ? 6 : 0,
                  borderTopRightRadius: index === data.length - 1 ? 6 : 0,
                  borderBottomRightRadius: index === data.length - 1 ? 6 : 0,
                }
              ]} 
            />
          ))}
        </View>

        {/* Legend */}
        <View style={styles.revenueLegend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={styles.legendLeft}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendCategory}>{item.category}</Text>
              </View>
              <View style={styles.legendRight}>
                <Text style={styles.legendAmount}>{item.amount.toLocaleString()}</Text>
                <Text style={styles.legendPercent}>{item.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

// Animated Earning Card
const AnimatedEarningCard = ({ 
  task, 
  index, 
  onPress, 
  formatDate, 
  formatCurrency 
}: { 
  task: any; 
  index: number; 
  onPress: () => void;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
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

  const isPaid = task.is_paid === true || task.payment_status === 'paid';
  const amount = task.final_price || task.total_cost || task.estimated_total || 0;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.earningCard, isPaid && styles.paidCard]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.earningIcon, { backgroundColor: isPaid ? `${Colors.dark.success}15` : 'rgba(245, 158, 11, 0.15)' }]}>
          <Ionicons 
            name={isPaid ? "checkmark-circle" : "time-outline"} 
            size={22} 
            color={isPaid ? Colors.dark.success : '#f59e0b'} 
          />
        </View>
        <View style={styles.earningInfo}>
          <Text style={styles.earningTitle} numberOfLines={1}>{task.title}</Text>
          <Text style={styles.earningDate}>
            {formatDate(task.completed_at || task.task_date || task.scheduled_date)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
            <View style={[styles.statusDot, { backgroundColor: isPaid ? Colors.dark.success : '#f59e0b' }]} />
            <Text style={[styles.statusText, { color: isPaid ? Colors.dark.success : '#f59e0b' }]}>
              {isPaid ? (i18n.locale === 'fr' ? 'Payé' : 'Paid') : (i18n.locale === 'fr' ? 'En attente' : 'Pending')}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.earningAmount, { color: isPaid ? Colors.dark.success : '#f59e0b' }]}>
            {isPaid ? '+' : ''}{amount.toLocaleString()}
          </Text>
          <Text style={styles.currencyLabel}>XOF</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Category colors for the revenue breakdown
const CATEGORY_COLORS: { [key: string]: string } = {
  'Cleaning': '#10b981',
  'Ménage': '#10b981',
  'Plumbing': '#3b82f6',
  'Plomberie': '#3b82f6',
  'Electrical': '#f59e0b',
  'Électricité': '#f59e0b',
  'Moving': '#8b5cf6',
  'Déménagement': '#8b5cf6',
  'Gardening': '#22c55e',
  'Jardinage': '#22c55e',
  'Painting': '#ec4899',
  'Peinture': '#ec4899',
  'Carpentry': '#f97316',
  'Menuiserie': '#f97316',
  'Other': '#6b7280',
  'Autre': '#6b7280',
};

const DEFAULT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#22c55e', '#f97316', '#6b7280'];

// Day name helpers
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function MyEarningsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    pendingPayment: 0,
    paidCount: 0,
    pendingCount: 0,
  });
  const [revenueByService, setRevenueByService] = useState<{ category: string; amount: number; percentage: number; color: string }[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState<{ day: string; amount: number; date: Date }[]>([]);

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const filterIndicator = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
    fetchEarnings();
  }, []);

  // Animate filter indicator
  useEffect(() => {
    let position = 0;
    if (filter === 'all') position = 0;
    else if (filter === 'paid') position = 1;
    else if (filter === 'pending') position = 2;

    Animated.spring(filterIndicator, {
      toValue: position * ((width - 48 - 8) / 3),
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [filter]);

  const fetchEarnings = async () => {
    try {
      const allTasks = await taskAPI.getTaskerTasks();
      const completed = (allTasks || []).filter((t: any) => t.status === 'completed');
      
      completed.sort((a: any, b: any) => {
        const dateA = new Date(a.completed_at || a.task_date || a.scheduled_date);
        const dateB = new Date(b.completed_at || b.task_date || b.scheduled_date);
        return dateB.getTime() - dateA.getTime();
      });
      
      setCompletedTasks(completed);
      
      const paidTasks = completed.filter((t: any) => t.is_paid === true || t.payment_status === 'paid');
      const unpaidTasks = completed.filter((t: any) => t.is_paid !== true && t.payment_status !== 'paid');
      
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      let total = 0, thisMonth = 0, lastMonth = 0;
      
      // Calculate revenue by service category
      const categoryTotals: { [key: string]: number } = {};
      
      // Calculate daily earnings for last 7 days
      const dayNames = i18n.locale === 'fr' ? DAY_NAMES_FR : DAY_NAMES_EN;
      const last7Days: { day: string; amount: number; date: Date }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last7Days.push({
          day: dayNames[date.getDay()],
          amount: 0,
          date: date,
        });
      }
      
      paidTasks.forEach((task: any) => {
        const amount = task.final_price || task.total_cost || task.estimated_total || 0;
        const taskDate = new Date(task.completed_at || task.task_date || task.scheduled_date);
        total += amount;
        
        if (taskDate >= thisMonthStart) {
          thisMonth += amount;
        } else if (taskDate >= lastMonthStart && taskDate <= lastMonthEnd) {
          lastMonth += amount;
        }
        
        // Group by category
        const category = task.category || task.service_category || (i18n.locale === 'fr' ? 'Autre' : 'Other');
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        
        // Add to daily earnings
        const taskDateOnly = new Date(taskDate);
        taskDateOnly.setHours(0, 0, 0, 0);
        const dayIndex = last7Days.findIndex(d => d.date.getTime() === taskDateOnly.getTime());
        if (dayIndex !== -1) {
          last7Days[dayIndex].amount += amount;
        }
      });
      
      setDailyEarnings(last7Days);
      
      // Calculate revenue by service breakdown
      const serviceBreakdown = Object.entries(categoryTotals)
        .map(([category, amount], index) => ({
          category,
          amount,
          percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
          color: CATEGORY_COLORS[category] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 categories
      
      setRevenueByService(serviceBreakdown);
      
      const pendingPayment = unpaidTasks.reduce((sum: number, t: any) => 
        sum + (t.final_price || t.total_cost || t.estimated_total || 0), 0);
      
      setEarnings({ 
        total, 
        thisMonth, 
        lastMonth, 
        pendingPayment,
        paidCount: paidTasks.length,
        pendingCount: unpaidTasks.length,
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  const formatCurrency = (amount: number) => amount.toLocaleString() + ' XOF';

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'paid':
        return completedTasks.filter(t => t.is_paid === true || t.payment_status === 'paid');
      case 'pending':
        return completedTasks.filter(t => t.is_paid !== true && t.payment_status !== 'paid');
      default:
        return completedTasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.backBtn}><SkeletonBox width={24} height={24} style={{ borderRadius: 12 }} /></View>
          <SkeletonBox width={120} height={20} style={{}} />
          <View style={{ width: 44 }} />
        </View>
        <ScrollView style={styles.scrollView}>
          <SkeletonBox width="100%" height={200} style={{ borderRadius: 20, marginBottom: 16 }} />
          <SkeletonBox width="100%" height={180} style={{ borderRadius: 16, marginBottom: 16 }} />
          <SkeletonBox width="100%" height={150} style={{ borderRadius: 16, marginBottom: 16 }} />
          <SkeletonBox width="100%" height={80} style={{ borderRadius: 16, marginBottom: 24 }} />
          <SkeletonEarningCard />
          <SkeletonEarningCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.locale === 'fr' ? 'Mes revenus' : 'My Earnings'}</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
            colors={[Colors.dark.primary]}
          />
        }
      >
        {/* Total Earnings Card with Gradient */}
        <Animated.View style={{ opacity: cardFade, transform: [{ scale: cardScale }] }}>
          <LinearGradient
            colors={[Colors.dark.primary, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalCard}
          >
            <View style={styles.totalHeader}>
              <View style={styles.totalIconContainer}>
                <Ionicons name="wallet" size={24} color={Colors.dark.primary} />
              </View>
              <Text style={styles.totalLabel}>
                {i18n.locale === 'fr' ? 'Revenus totaux' : 'Total Earnings'}
              </Text>
            </View>
            <AnimatedCounter value={earnings.total} />
            
            {/* Growth Indicator */}
            <GrowthIndicator current={earnings.thisMonth} previous={earnings.lastMonth} />
            
            <View style={styles.periodRow}>
              <View style={styles.periodItem}>
                <Text style={styles.periodLabel}>{i18n.locale === 'fr' ? 'Ce mois' : 'This Month'}</Text>
                <Text style={styles.periodAmount}>{formatCurrency(earnings.thisMonth)}</Text>
              </View>
              <View style={styles.periodDivider} />
              <View style={styles.periodItem}>
                <Text style={styles.periodLabel}>{i18n.locale === 'fr' ? 'Mois dernier' : 'Last Month'}</Text>
                <Text style={styles.periodAmount}>{formatCurrency(earnings.lastMonth)}</Text>
              </View>
            </View>
            
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
          </LinearGradient>
        </Animated.View>

        {/* Earnings Chart - NEW! */}
        <EarningsChart dailyData={dailyEarnings} />

        {/* Revenue By Service */}
        <RevenueByService data={revenueByService} />

        {/* Pending Payment Card */}
        {earnings.pendingPayment > 0 && (
          <Animated.View style={[styles.pendingCard, { opacity: cardFade }]}>
            <View style={styles.pendingIcon}>
              <Ionicons name="hourglass-outline" size={22} color="#f59e0b" />
            </View>
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingLabel}>
                {i18n.locale === 'fr' ? 'Paiements en attente' : 'Pending Payments'}
              </Text>
              <Text style={styles.pendingAmount}>{formatCurrency(earnings.pendingPayment)}</Text>
            </View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{earnings.pendingCount}</Text>
            </View>
          </Animated.View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <Text style={styles.sectionTitle}>
            {i18n.locale === 'fr' ? 'Historique' : 'History'}
          </Text>
          <View style={styles.filterTabs}>
            <Animated.View
              style={[styles.filterIndicator, { transform: [{ translateX: filterIndicator }], width: (width - 48 - 8) / 3 }]}
            />
            {(['all', 'paid', 'pending'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={styles.filterTab}
                onPress={() => setFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? (i18n.locale === 'fr' ? 'Tout' : 'All') :
                   f === 'paid' ? (i18n.locale === 'fr' ? 'Payé' : 'Paid') :
                   (i18n.locale === 'fr' ? 'En attente' : 'Pending')}
                </Text>
                <Text style={[styles.filterCount, filter === f && styles.filterCountActive]}>
                  {f === 'all' ? completedTasks.length :
                   f === 'paid' ? earnings.paidCount : earnings.pendingCount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Earnings History */}
        <View style={styles.historySection}>
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="receipt-outline" size={40} color={Colors.dark.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {i18n.locale === 'fr' ? 'Aucune tâche' : 'No tasks'}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'paid' 
                  ? (i18n.locale === 'fr' ? 'Aucun paiement reçu' : 'No payments received')
                  : filter === 'pending'
                    ? (i18n.locale === 'fr' ? 'Aucun paiement en attente' : 'No pending payments')
                    : (i18n.locale === 'fr' ? 'Aucune tâche terminée' : 'No completed tasks')
                }
              </Text>
            </View>
          ) : (
            filteredTasks.map((task, index) => (
              <AnimatedEarningCard
                key={task.id || index}
                task={task}
                index={index}
                onPress={() => router.push(`/task/${task.id}`)}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.dark.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text },
  
  scrollView: { flex: 1, padding: 24 },
  
  // Total Card
  totalCard: {
    borderRadius: 24, padding: 24, marginBottom: 20, overflow: 'hidden',
    shadowColor: Colors.dark.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  totalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  totalIconContainer: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  totalAmount: { fontSize: 40, fontWeight: '700', color: '#fff', marginVertical: 8 },
  periodRow: {
    flexDirection: 'row', marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
  },
  periodItem: { flex: 1 },
  periodDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 },
  periodLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  periodAmount: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 4 },
  decorCircle1: {
    position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -40, right: 50, width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  
  // Growth Indicator
  growthBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4,
    marginTop: 4,
  },
  growthText: { fontSize: 13, fontWeight: '700' },
  growthLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginLeft: 4 },
  
  // Earnings Chart - NEW!
  chartSection: { marginBottom: 20 },
  chartCard: {
    backgroundColor: Colors.dark.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.border, flexDirection: 'row',
  },
  chartYAxis: { width: 35, justifyContent: 'space-between', paddingVertical: 4, marginRight: 8 },
  chartYLabel: { fontSize: 10, color: Colors.dark.textSecondary, textAlign: 'right' },
  chartBarsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  chartBarWrapper: { alignItems: 'center', flex: 1 },
  chartBarOuter: { height: 120, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: 20, borderRadius: 6, minHeight: 4 },
  chartDayLabel: { fontSize: 11, color: Colors.dark.textSecondary, marginTop: 8 },
  chartDayLabelActive: { color: Colors.dark.primary, fontWeight: '600' },
  chartTooltip: {
    position: 'absolute', top: -28, backgroundColor: Colors.dark.primary,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 10,
  },
  chartTooltipText: { fontSize: 10, color: '#fff', fontWeight: '600' },

  // Revenue By Service
  revenueSection: { marginBottom: 20 },
  revenueCard: {
    backgroundColor: Colors.dark.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  revenueBarContainer: {
    flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 16,
    backgroundColor: Colors.dark.border,
  },
  revenueBarSegment: { height: '100%' },
  revenueLegend: { gap: 12 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendCategory: { fontSize: 14, color: Colors.dark.text, fontWeight: '500' },
  legendRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendAmount: { fontSize: 14, color: Colors.dark.text, fontWeight: '600' },
  legendPercent: { fontSize: 12, color: Colors.dark.textSecondary, minWidth: 35, textAlign: 'right' },
  
  // Section Title
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text, marginBottom: 12 },
  
  // Pending Card
  pendingCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card,
    borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)',
    shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  pendingIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  pendingInfo: { flex: 1 },
  pendingLabel: { fontSize: 13, color: Colors.dark.textSecondary },
  pendingAmount: { fontSize: 20, fontWeight: '700', color: '#f59e0b', marginTop: 2 },
  pendingBadge: {
    backgroundColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  
  // Filter
  filterContainer: { marginBottom: 16 },
  filterTabs: {
    flexDirection: 'row', backgroundColor: Colors.dark.card, borderRadius: 14, padding: 4,
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute', top: 4, left: 4, bottom: 4,
    backgroundColor: Colors.dark.primary, borderRadius: 10,
  },
  filterTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center', zIndex: 1,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.dark.textSecondary },
  filterTextActive: { color: '#fff' },
  filterCount: {
    fontSize: 11, fontWeight: '700', color: Colors.dark.textSecondary,
    backgroundColor: Colors.dark.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' },
  
  // History
  historySection: { marginBottom: 24 },
  
  // Earning Card
  earningCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card,
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.dark.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  paidCard: { borderColor: `${Colors.dark.success}30` },
  earningIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  earningInfo: { flex: 1 },
  earningTitle: { fontSize: 15, fontWeight: '600', color: Colors.dark.text },
  earningDate: { fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  amountContainer: { alignItems: 'flex-end' },
  earningAmount: { fontSize: 16, fontWeight: '700' },
  currencyLabel: { fontSize: 10, color: Colors.dark.textSecondary, marginTop: 2 },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIconContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text },
  emptyText: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 8, textAlign: 'center' },
});
