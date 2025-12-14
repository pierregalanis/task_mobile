import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { reviewAPI } from '../../services/api';

export default function MyReviewsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const data = await reviewAPI.getTaskerReviews(user?.id || '');
      setReviews(data.reviews || data || []);
      
      // Calculate stats
      const reviewList = data.reviews || data || [];
      if (reviewList.length > 0) {
        const total = reviewList.length;
        const sum = reviewList.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
        const average = sum / total;
        
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviewList.forEach((r: any) => {
          const rating = Math.round(r.rating || 0);
          if (rating >= 1 && rating <= 5) {
            breakdown[rating as keyof typeof breakdown]++;
          }
        });
        
        setStats({ average, total, breakdown });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return i18n.locale === 'fr' ? 'Aujourd\'hui' : 'Today';
    if (diffDays === 1) return i18n.locale === 'fr' ? 'Hier' : 'Yesterday';
    if (diffDays < 7) return `${diffDays} ${i18n.locale === 'fr' ? 'jours' : 'days ago'}`;
    
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={16}
        color={i < rating ? '#f59e0b' : Colors.dark.textSecondary}
      />
    ));
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
          {i18n.locale === 'fr' ? 'Mes avis' : 'My Reviews'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overall Rating */}
        <View style={styles.overallSection}>
          <View style={styles.ratingBig}>
            <Text style={styles.ratingNumber}>{stats.average.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {renderStars(Math.round(stats.average))}
            </View>
            <Text style={styles.totalReviews}>
              {stats.total} {i18n.locale === 'fr' ? 'avis' : 'reviews'}
            </Text>
          </View>

          {/* Rating Breakdown */}
          <View style={styles.breakdown}>
            {[5, 4, 3, 2, 1].map((star) => (
              <View key={star} style={styles.breakdownRow}>
                <Text style={styles.breakdownStar}>{star}</Text>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <View style={styles.breakdownBarBg}>
                  <View
                    style={[
                      styles.breakdownBarFill,
                      { width: `${stats.total > 0 ? (stats.breakdown[star as keyof typeof stats.breakdown] / stats.total) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownCount}>
                  {stats.breakdown[star as keyof typeof stats.breakdown]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>
            {i18n.locale === 'fr' ? 'Tous les avis' : 'All Reviews'}
          </Text>

          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyText}>
                {i18n.locale === 'fr' ? 'Aucun avis pour le moment' : 'No reviews yet'}
              </Text>
            </View>
          ) : (
            reviews.map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {renderStars(review.rating)}
                  </View>
                  <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                </View>

                <View style={styles.reviewerInfo}>
                  {review.client_avatar ? (
                    <Image source={{ uri: review.client_avatar }} style={styles.reviewerAvatar} />
                  ) : (
                    <View style={styles.reviewerAvatarPlaceholder}>
                      <Ionicons name="person" size={16} color={Colors.dark.textSecondary} />
                    </View>
                  )}
                  <Text style={styles.reviewerName}>{review.client_name || 'Client'}</Text>
                </View>

                {review.comment && (
                  <Text style={styles.reviewComment}>"{review.comment}"</Text>
                )}

                {review.task_title && (
                  <View style={styles.taskTag}>
                    <Ionicons name="briefcase-outline" size={12} color={Colors.dark.textSecondary} />
                    <Text style={styles.taskTagText}>{review.task_title}</Text>
                  </View>
                )}
              </View>
            ))
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
  scrollView: { flex: 1 },
  overallSection: {
    flexDirection: 'row',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  ratingBig: { alignItems: 'center', marginRight: 24 },
  ratingNumber: { fontSize: 48, fontWeight: 'bold', color: Colors.dark.text },
  starsRow: { flexDirection: 'row', marginTop: 4 },
  totalReviews: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 4 },
  breakdown: { flex: 1, justifyContent: 'center', gap: 6 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownStar: { fontSize: 13, color: Colors.dark.textSecondary, width: 12 },
  breakdownBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBarFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  breakdownCount: { fontSize: 12, color: Colors.dark.textSecondary, width: 20, textAlign: 'right' },
  reviewsSection: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text, marginBottom: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 12 },
  reviewCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 12, color: Colors.dark.textSecondary },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  reviewerAvatar: { width: 32, height: 32, borderRadius: 16 },
  reviewerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: { fontSize: 14, fontWeight: '500', color: Colors.dark.text },
  reviewComment: {
    fontSize: 14,
    color: Colors.dark.text,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.background,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskTagText: { fontSize: 12, color: Colors.dark.textSecondary },
});
