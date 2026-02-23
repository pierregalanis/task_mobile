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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { taskerAPI, categoryAPI } from '../../services/api';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';

export default function SelectTaskerScreen() {
  const router = useRouter();
  const { 
    categoryId, 
    subcategoryId, 
    serviceName,
    categoryName,    // English category name for API filtering
    subcategoryName  // English subcategory name for API filtering
  } = useLocalSearchParams();
  
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
        
        // Fetch taskers using the new API parameters
        // Use subcategory name for filtering - only taskers offering this specific service
        const data = await taskerAPI.getTaskers({ 
          subcategory: subcategoryName as string,
          is_available: true 
        });
        
        // Additional client-side filtering to ensure taskers have the exact service
        // This handles any edge cases where backend filtering might be incomplete
        const filteredTaskers = Array.isArray(data) ? data.filter((tasker: any) => {
          const services = tasker.tasker_profile?.services || [];
          // Check if tasker has a service matching the selected subcategory
          return services.some((s: any) => 
            s.subcategory === subcategoryName || 
            s.subcategory?.toLowerCase() === (subcategoryName as string)?.toLowerCase()
          );
        }) : [];
        
        setTaskers(filteredTaskers);
      } catch (error) {
        console.error('Error fetching taskers:', error);
        setTaskers([]);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [categoryId, subcategoryName]);

  const getCategoryName = () => {
    if (!category) return '';
    return i18n.locale === 'fr' ? category.name_fr : category.name_en;
  };

  const getServiceName = () => {
    return serviceName as string || '';
  };

  // Find the specific service matching the selected category/subcategory
  const getTaskerService = (tasker: any) => {
    const services = tasker.tasker_profile?.services || [];
    return services.find((s: any) => 
      s.subcategory === subcategoryName || 
      s.subcategory?.toLowerCase() === (subcategoryName as string)?.toLowerCase()
    );
  };

  const handleTaskerSelect = (tasker: any) => {
    // Get pricing info from the matching service
    const service = getTaskerService(tasker);
    
    router.push({
      pathname: '/booking/create',
      params: {
        taskerId: tasker.id,
        categoryId,
        subcategoryId,
        serviceName: getServiceName(),
        categoryName,
        subcategoryName,
        pricingType: service?.pricing_type || 'hourly',
        hourlyRate: service?.hourly_rate?.toString() || '0',
        fixedPrice: service?.fixed_price?.toString() || '0',
        maxTravelDistance: service?.max_travel_distance?.toString() || '50',
        taskerLatitude: tasker.latitude?.toString() || '',
        taskerLongitude: tasker.longitude?.toString() || '',
      },
    });
  };

  // Get rating from tasker profile
  const getTaskerRating = (tasker: any) => {
    return tasker.tasker_profile?.average_rating || tasker.rating || null;
  };

  // Get completed tasks count
  const getCompletedTasks = (tasker: any) => {
    return tasker.tasker_profile?.completed_tasks || tasker.completed_tasks || 0;
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
            {getServiceName() || (i18n.locale === 'fr' ? 'Sélectionner un tâcheron' : 'Select a tasker')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getCategoryName()}
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
                {i18n.locale === 'fr' 
                  ? 'Aucun tâcheron disponible pour ce service' 
                  : 'No taskers available for this service'}
              </Text>
              <Text style={styles.emptySubtext}>
                {i18n.locale === 'fr' 
                  ? 'Essayez un autre service ou revenez plus tard' 
                  : 'Try another service or check back later'}
              </Text>
            </View>
          ) : (
            taskers.map((tasker) => {
              const service = getTaskerService(tasker);
              const rating = getTaskerRating(tasker);
              const completedTasks = getCompletedTasks(tasker);
              
              return (
                <TouchableOpacity
                  key={tasker.id}
                  style={styles.taskerCard}
                  onPress={() => handleTaskerSelect(tasker)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  {tasker.profile_image ? (
                    <Image 
                      source={{ uri: tasker.profile_image }} 
                      style={styles.taskerAvatar}
                    />
                  ) : (
                    <View style={[styles.taskerAvatar, styles.taskerAvatarPlaceholder]}>
                      <Text style={styles.taskerInitials}>
                        {tasker.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.taskerInfo}>
                    <Text style={styles.taskerName}>{tasker.full_name}</Text>
                    
                    {/* Rating and Tasks */}
                    <View style={styles.taskerMeta}>
                      {rating && rating > 0 ? (
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={14} color="#fbbf24" />
                          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                        </View>
                      ) : null}
                      {completedTasks > 0 && (
                        <Text style={styles.tasksText}>
                          {completedTasks} {i18n.locale === 'fr' ? 'tâches' : 'tasks'}
                        </Text>
                      )}
                    </View>
                    
                    {/* Price and Location */}
                    <View style={styles.priceRow}>
                      {service ? (
                        <Text style={styles.taskerPrice}>
                          {service.pricing_type === 'fixed' 
                            ? `${service.fixed_price || 0} XOF`
                            : `${service.hourly_rate || 0} XOF/h`
                          }
                        </Text>
                      ) : (
                        <Text style={styles.taskerPrice}>
                          {i18n.locale === 'fr' ? 'Prix sur demande' : 'Price on request'}
                        </Text>
                      )}
                      {tasker.city && (
                        <Text style={styles.taskerLocation}>{tasker.city}</Text>
                      )}
                    </View>
                  </View>
                  
                  <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
                </TouchableOpacity>
              );
            })
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
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
    marginRight: 16,
  },
  taskerAvatarPlaceholder: {
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
