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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { taskerAPI, categoryAPI } from '../../services/api';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';

export default function SelectTaskerScreen() {
  const router = useRouter();
  const { categoryId, subcategoryId, serviceName } = useLocalSearchParams();
  const [taskers, setTaskers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<any>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Fetch category info
        const categories = await categoryAPI.getCategories();
        const found = categories.find((cat: any) => cat.id === categoryId);
        setCategory(found);
        
        // Fetch taskers
        const data = await taskerAPI.getTaskers({ category: categoryId });
        setTaskers(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [categoryId]);

  const getCategoryName = () => {
    if (!category) return '';
    return i18n.locale === 'fr' ? category.name_fr : category.name_en;
  };

  const getServiceName = () => {
    return serviceName as string || '';
  };

  const handleTaskerSelect = (tasker: any) => {
    // Get pricing info from tasker's service
    const service = tasker.tasker_profile?.services?.find(
      (s: any) => s.category === categoryId
    ); 
      ? getSubcategoryName(subcategory, i18n.locale) 
      : (category ? getCategoryName(category, i18n.locale) : 'Service');
    
    router.push({
      pathname: '/booking/create',
      params: {
        taskerId: tasker.id,
        categoryId,
        subcategoryId,
        serviceName,
        pricingType: service?.pricing_type || 'hourly',
        hourlyRate: service?.hourly_rate?.toString() || '0',
        fixedPrice: service?.fixed_price?.toString() || '0',
        maxTravelDistance: service?.max_travel_distance?.toString() || '50',
        taskerLatitude: tasker.latitude?.toString() || '',
        taskerLongitude: tasker.longitude?.toString() || '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {subcategory ? getSubcategoryName(subcategory, i18n.locale) : 'Sélectionner un tâcheron'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {category ? getCategoryName(category, i18n.locale) : ''}
          </Text>
        </View>
      </View>

      {/* Taskers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {taskers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={64} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyText}>
                {i18n.locale === 'fr' ? 'Aucun tâcheron disponible' : 'No taskers available'}
              </Text>
            </View>
          ) : (
            taskers.map((tasker) => (
              <TouchableOpacity
                key={tasker.id}
                style={styles.taskerCard}
                onPress={() => handleTaskerSelect(tasker)}
                activeOpacity={0.7}
              >
                <View style={styles.taskerAvatar}>
                  <Text style={styles.taskerInitials}>
                    {tasker.full_name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.taskerInfo}>
                  <Text style={styles.taskerName}>{tasker.full_name}</Text>
                  <View style={styles.taskerMeta}>
                    {tasker.rating && (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.ratingText}>{tasker.rating}</Text>
                      </View>
                    )}
                    {tasker.completed_tasks > 0 && (
                      <Text style={styles.tasksText}>
                        {tasker.completed_tasks} {i18n.locale === 'fr' ? 'tâches' : 'tasks'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.priceRow}>
                    {tasker.tasker_profile?.services?.[0]?.pricing_type === 'hourly' ? (
                      <Text style={styles.taskerPrice}>
                        {tasker.tasker_profile.services[0].hourly_rate} XOF/h
                      </Text>
                    ) : (
                      <Text style={styles.taskerPrice}>
                        {tasker.tasker_profile?.services?.[0]?.fixed_price} XOF
                      </Text>
                    )}
                    <Text style={styles.taskerLocation}>{tasker.city}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
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
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 16,
  },
  taskerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  taskerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  taskerInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.background,
  },
  taskerInfo: {
    flex: 1,
  },
  taskerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  taskerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  tasksText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  taskerPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
  taskerLocation: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
});
