import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { taskerAPI, categoryAPI, SearchFilters as SearchFiltersType } from '../../services/api';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { Category, getCategoryName, getCategoryById } from '../../constants/Categories';
import SearchFilters from '../../components/SearchFilters';

export default function TaskersScreen() {
  const router = useRouter();
  const [taskers, setTaskers] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Advanced filter state
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFiltersType>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const isEn = i18n.locale === 'en';

  // Calculate active filter count (excluding searchQuery which is in the search bar)
  const calculateFilterCount = (filters: SearchFiltersType) => {
    let count = 0;
    if (filters.minRating && filters.minRating > 0) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.availableOnDate) count++;
    if (filters.sortBy && filters.sortBy !== 'rating') count++;
    return count;
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch taskers with filters
  const fetchTaskers = useCallback(async (filters: SearchFiltersType = {}) => {
    try {
      setLoading(true);
      
      // Build search params
      const searchFilters: SearchFiltersType = {
        ...filters,
        isAvailable: true,
        limit: 50,
      };
      
      // Add category filter if selected
      if (selectedCategory) {
        searchFilters.categoryId = selectedCategory;
      }

      const data = await taskerAPI.searchTaskers(searchFilters);
      setTaskers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching taskers:', error);
      setTaskers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  // Refetch when category changes
  useEffect(() => {
    fetchTaskers(activeFilters);
  }, [selectedCategory, fetchTaskers]);

  const fetchCategories = async () => {
    try {
      const data = await categoryAPI.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
    fetchTaskers(activeFilters);
  };

  // Handle advanced filter apply
  const handleApplyFilters = (newFilters: SearchFiltersType) => {
    // If there's a search query from the modal, update the search bar too
    if (newFilters.searchQuery) {
      setSearchQuery(newFilters.searchQuery);
    }
    setActiveFilters(newFilters);
    setActiveFilterCount(calculateFilterCount(newFilters));
    fetchTaskers(newFilters);
  };

  // Handle search submit (when user finishes typing)
  const handleSearchSubmit = () => {
    const filtersWithSearch = {
      ...activeFilters,
      searchQuery: searchQuery || undefined,
    };
    fetchTaskers(filtersWithSearch);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setActiveFilters({});
    setActiveFilterCount(0);
    setSearchQuery('');
    setSelectedCategory(null);
    fetchTaskers({});
  };

  // Client-side filter for instant search feedback
  const filteredTaskers = taskers.filter((tasker) =>
    tasker.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Text style={styles.headerTitle}>
          {isEn ? 'Find a Tasker' : 'Trouver un Tasker'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {filteredTaskers.length} {isEn ? 'available' : 'disponibles'}
        </Text>
      </View>

      {/* Search Bar with Filter Button */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.dark.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={isEn ? 'Search taskers...' : 'Rechercher un tasker...'}
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterIconButton,
            activeFilterCount > 0 && styles.filterIconButtonActive,
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options"
            size={22}
            color={activeFilterCount > 0 ? Colors.dark.background : Colors.dark.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Preview */}
      {(activeFilterCount > 0 || selectedCategory) && (
        <View style={styles.activeFiltersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersContent}>
            {/* Sort indicator */}
            <View style={styles.sortTag}>
              <Ionicons name="swap-vertical" size={12} color={Colors.dark.textSecondary} />
              <Text style={styles.sortTagText}>{getSortLabel()}</Text>
            </View>
            
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
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={handleClearFilters} style={styles.clearAllButton}>
              <Text style={styles.clearAllText}>{isEn ? 'Clear' : 'Effacer'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
          onPress={() => setSelectedCategory(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
            {isEn ? 'All' : 'Tous'}
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.filterChip, selectedCategory === category.id && styles.filterChipActive]}
            onPress={() => setSelectedCategory(category.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterChipIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === category.id && styles.filterChipTextActive,
              ]}
            >
              {getCategoryName(category, i18n.locale)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />}
        >
          {filteredTaskers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyTitle}>
                {isEn ? 'No taskers found' : 'Aucun tasker trouvé'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeFilterCount > 0 || selectedCategory
                  ? isEn
                    ? 'Try adjusting your filters'
                    : 'Essayez de modifier vos filtres'
                  : isEn
                  ? 'Check back later for new taskers'
                  : 'Revenez plus tard pour de nouveaux taskers'}
              </Text>
              {(activeFilterCount > 0 || selectedCategory) && (
                <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
                  <Text style={styles.clearFiltersButtonText}>
                    {isEn ? 'Clear All Filters' : 'Effacer tous les filtres'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredTaskers.map((tasker) => (
              <TouchableOpacity
                key={tasker.id}
                style={styles.taskerCard}
                onPress={() => router.push(`/tasker/${tasker.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.taskerImageContainer}>
                  {tasker.profile_image || tasker.profile_photo ? (
                    <Image source={{ uri: tasker.profile_image || tasker.profile_photo }} style={styles.taskerImage} />
                  ) : (
                    <View style={[styles.taskerImage, styles.taskerImagePlaceholder]}>
                      <Text style={styles.taskerInitials}>
                        {tasker.full_name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {(tasker.is_available || tasker.tasker_profile?.is_available) && <View style={styles.availableBadge} />}
                </View>

                <View style={styles.taskerInfo}>
                  <View style={styles.taskerHeader}>
                    <Text style={styles.taskerName}>{tasker.full_name}</Text>
                    <TouchableOpacity style={styles.favoriteButton}>
                      <Ionicons name="heart-outline" size={20} color={Colors.dark.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.taskerMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <Text style={styles.metaText}>
                        {(tasker.tasker_profile?.average_rating || tasker.rating || 0).toFixed(1)} ({tasker.tasker_profile?.total_reviews || tasker.reviews_count || 0})
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.dark.primary} />
                      <Text style={styles.metaText}>
                        {tasker.tasker_profile?.completed_tasks || tasker.completed_tasks || 0} {isEn ? 'tasks' : 'tâches'}
                      </Text>
                    </View>
                    {tasker.city && (
                      <>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                          <Ionicons name="location" size={14} color={Colors.dark.textSecondary} />
                          <Text style={styles.metaText}>{tasker.city}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {tasker.tasker_profile?.services && tasker.tasker_profile.services.length > 0 && (
                    <View style={styles.servicesContainer}>
                      <Text style={styles.servicesLabel} numberOfLines={1}>
                        {tasker.tasker_profile.services
                          .slice(0, 2)
                          .map((s: any) => {
                            const category = getCategoryById(categories, s.category);
                            return category ? getCategoryName(category, i18n.locale) : s.subcategory || s.category;
                          })
                          .join(', ')}
                        {tasker.tasker_profile.services.length > 2 && ' +' + (tasker.tasker_profile.services.length - 2)}
                      </Text>
                    </View>
                  )}

                  {tasker.tasker_profile?.services?.[0] && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>
                        {isEn ? 'Starting at' : 'À partir de'}
                      </Text>
                      <Text style={styles.priceAmount}>
                        {tasker.tasker_profile.services[0].pricing_type === 'fixed'
                          ? `${tasker.tasker_profile.services[0].fixed_price || 0} XOF`
                          : `${tasker.tasker_profile.services[0].hourly_rate || 0} XOF/h`}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Search Filters Modal */}
      <SearchFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        initialFilters={{ ...activeFilters, searchQuery }}
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
  
  // Search Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginVertical: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
  },
  filterIconButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterIconButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.dark.error || '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Active Filters Bar
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 12,
    paddingBottom: 12,
  },
  activeFiltersContent: {
    gap: 8,
    paddingRight: 8,
  },
  sortTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sortTagText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
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

  // Category Chips
  filtersContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterChipIcon: {
    fontSize: 16,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.dark.background,
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
    paddingHorizontal: 24,
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
    textAlign: 'center',
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
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  taskerImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  taskerImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  taskerImagePlaceholder: {
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskerInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.background,
  },
  availableBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.success || '#22c55e',
    borderWidth: 2,
    borderColor: Colors.dark.card,
  },
  taskerInfo: {
    flex: 1,
  },
  taskerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    flex: 1,
  },
  favoriteButton: {
    padding: 4,
  },
  taskerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
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
  servicesContainer: {
    marginBottom: 8,
  },
  servicesLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
});
