import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { taskerAPI, categoryAPI, SearchFilters as SearchFiltersType } from '../../services/api';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import SearchFilters from '../../components/SearchFilters';
import { getServicePriceInfo } from '../../utils/pricingUtils';

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
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<any>(null);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFiltersType>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const isEn = i18n.locale === 'en';

  // Calculate active filter count
  const calculateFilterCount = (filters: SearchFiltersType) => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.minRating && filters.minRating > 0) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.availableOnDate) count++;
    if (filters.sortBy && filters.sortBy !== 'rating') count++;
    return count;
  };

  // Fetch taskers with filters
  const fetchTaskers = useCallback(async (filters: SearchFiltersType = {}) => {
    try {
      setLoading(true);
      
      // Build search params using new searchTaskers method
      const searchFilters: SearchFiltersType = {
        ...filters,
        subcategory: subcategoryName as string,
        isAvailable: true,
        limit: 50,
      };

      const data = await taskerAPI.searchTaskers(searchFilters);
      
      // Additional client-side filtering to ensure taskers have the exact service
      const filteredTaskers = Array.isArray(data) ? data.filter((tasker: any) => {
        const services = tasker.tasker_profile?.services || [];
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
      setRefreshing(false);
    }
  }, [subcategoryName]);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      try {
        const categories = await categoryAPI.getCategories();
        const found = categories.find((cat: any) => cat.id === categoryId);
        setCategory(found);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
      fetchTaskers(activeFilters);
    };
    initialize();
  }, [categoryId, fetchTaskers]);

  // Handle filter apply
  const handleApplyFilters = (newFilters: SearchFiltersType) => {
    setActiveFilters(newFilters);
    setActiveFilterCount(calculateFilterCount(newFilters));
    fetchTaskers(newFilters);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTaskers(activeFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setActiveFilters({});
    setActiveFilterCount(0);
    fetchTaskers({});
  };

  const getCategoryName = () => {
    if (!category) return '';
    return isEn ? category.name_en : category.name_fr;
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

  // Get total reviews
  const getTotalReviews = (tasker: any) => {
    return tasker.tasker_profile?.total_reviews || 0;
  };

  // Get sort label for display
  const getSortLabel = () => {
    switch (activeFilters.sortBy) {
      case 'price-low':
        return isEn ? 'Price ↑' : 'Prix ↑';
      case 'price-high':
        return isEn ? 'Price ↓' : 'Prix ↓';
      case 'reviews':
        return isEn ? 'Reviews' : 'Avis';
      default:
        return isEn ? 'Rating' : 'Note';
    }
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
            {getServiceName() || (isEn ? 'Select a tasker' : 'Sélectionner un tâcheron')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getCategoryName()}
          </Text>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <Text style={styles.resultCount}>
          {taskers.length} {isEn ? 'tasker' : 'tâcheron'}
          {taskers.length !== 1 ? 's' : ''}{' '}
          {isEn ? 'found' : 'trouvé'}
          {taskers.length !== 1 && !isEn ? 's' : ''}
        </Text>
        
        <View style={styles.filterActions}>
          {/* Sort indicator */}
          <View style={styles.sortBadge}>
            <Ionicons name="swap-vertical" size={14} color={Colors.dark.textSecondary} />
            <Text style={styles.sortText}>{getSortLabel()}</Text>
          </View>
          
          {/* Filter button */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options"
              size={18}
              color={activeFilterCount > 0 ? Colors.dark.background : Colors.dark.text}
            />
            <Text
              style={[
                styles.filterButtonText,
                activeFilterCount > 0 && styles.filterButtonTextActive,
              ]}
            >
              {isEn ? 'Filters' : 'Filtres'}
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Filters Preview */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersContent}>
            {activeFilters.searchQuery && (
              <View style={styles.filterTag}>
                <Ionicons name="search" size={12} color={Colors.dark.primary} />
                <Text style={styles.filterTagText}>"{activeFilters.searchQuery}"</Text>
              </View>
            )}
            {activeFilters.minRating && activeFilters.minRating > 0 && (
              <View style={styles.filterTag}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.filterTagText}>{activeFilters.minRating}+</Text>
              </View>
            )}
            {(activeFilters.minPrice || activeFilters.maxPrice) && (
              <View style={styles.filterTag}>
                <Ionicons name="cash" size={12} color={Colors.dark.primary} />
                <Text style={styles.filterTagText}>
                  {activeFilters.minPrice || '0'} - {activeFilters.maxPrice || '∞'} XOF
                </Text>
              </View>
            )}
            {activeFilters.availableOnDate && (
              <View style={styles.filterTag}>
                <Ionicons name="calendar" size={12} color={Colors.dark.primary} />
                <Text style={styles.filterTagText}>{activeFilters.availableOnDate}</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity onPress={handleClearFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>{isEn ? 'Clear' : 'Effacer'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Taskers List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.primary}
            />
          }
        >
          {taskers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyText}>
                {isEn ? 'No taskers found' : 'Aucun tâcheron trouvé'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeFilterCount > 0
                  ? isEn
                    ? 'Try adjusting your filters'
                    : 'Essayez de modifier vos filtres'
                  : isEn
                  ? 'Try another service or check back later'
                  : 'Essayez un autre service ou revenez plus tard'}
              </Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
                  <Text style={styles.clearFiltersButtonText}>
                    {isEn ? 'Clear Filters' : 'Effacer les filtres'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            taskers.map((tasker) => {
              const service = getTaskerService(tasker);
              const rating = getTaskerRating(tasker);
              const completedTasks = getCompletedTasks(tasker);
              const totalReviews = getTotalReviews(tasker);
              const globalRate = tasker.tasker_profile?.hourly_rate || 0;
              const priceInfo = getServicePriceInfo(service, globalRate, i18n.locale);
              
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
                          {totalReviews > 0 && (
                            <Text style={styles.reviewCount}>({totalReviews})</Text>
                          )}
                        </View>
                      ) : null}
                      {completedTasks > 0 && (
                        <Text style={styles.tasksText}>
                          {completedTasks} {isEn ? 'tasks' : 'tâches'}
                        </Text>
                      )}
                    </View>
                    
                    {/* Price and Location */}
                    <View style={styles.priceRow}>
                      <Text style={styles.taskerPrice}>
                        {priceInfo.displayText}
                      </Text>
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

      {/* Search Filters Modal */}
      <SearchFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
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
  
  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  resultCount: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.dark.background,
  },

  // Active Filters Bar
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 12,
    paddingVertical: 10,
    backgroundColor: Colors.dark.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  activeFiltersContent: {
    gap: 8,
    paddingRight: 8,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.dark.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterTagText: {
    fontSize: 12,
    color: Colors.dark.text,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 13,
    color: Colors.dark.primary,
    fontWeight: '500',
  },

  // Loading & Empty States
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
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
  clearFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  clearFiltersButtonText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Tasker Card
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
  reviewCount: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
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