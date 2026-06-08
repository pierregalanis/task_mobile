import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { taskerAPI, categoryAPI, searchAPI, UnifiedSearchResults, SearchFilters as SearchFiltersType } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { calculateDistance } from '../../utils/distance';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { Category, getCategoryName, getCategoryById, getSubcategoryName } from '../../constants/Categories';
import SearchFilters from '../../components/SearchFilters';

export default function TaskersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [taskers, setTaskers] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Derived: category object for showing subcategory chips
  const selectedCategoryData = selectedCategory
    ? getCategoryById(categories, selectedCategory)
    : null;

  // Advanced filter state
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFiltersType>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Distance filter & sort (client-side, Haversine)
  const [maxDistance, setMaxDistance] = useState<number>(100); // 100 = "Any"
  type QuickSort = 'rating' | 'distance' | 'distance-far' | 'price-low' | 'price-high';
  const [quickSort, setQuickSort] = useState<QuickSort>('rating');

  const hasLocation = !!(user?.latitude && user?.longitude);

  // Unified search state
  const [unifiedResults, setUnifiedResults] = useState<UnifiedSearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEn = i18n.locale === 'en';

  const countryLabel =
    user?.country === 'senegal'     ? (isEn ? 'Senegal' : 'Sénégal') :
    user?.country === 'ivory_coast' ? (isEn ? 'Ivory Coast' : 'Côte d\'Ivoire') :
    null;

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

  // Fetch taskers with filters — always call the API, never filter client-side by subcategory
  const fetchTaskers = useCallback(async (filters: SearchFiltersType = {}) => {
    try {
      setLoading(true);

      const searchFilters: SearchFiltersType = {
        ...filters,
        isAvailable: true,
        limit: 50,
      };
      if (selectedCategory) searchFilters.categoryId = selectedCategory;
      // Send the subcategory label in the current UI language — backend resolves EN↔FR
      if (selectedSubcategory) searchFilters.subcategory = selectedSubcategory;

      const data = await taskerAPI.searchTaskers(searchFilters);
      setTaskers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching taskers:', error);
      setTaskers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedSubcategory]);

  // Refetch when category or subcategory changes
  useEffect(() => {
    fetchTaskers(activeFilters);
  }, [selectedCategory, selectedSubcategory, fetchTaskers]);

  // Re-fetch when tab gains focus (picks up new taskers registered on web)
  useFocusEffect(
    useCallback(() => {
      fetchTaskers(activeFilters);
    }, [fetchTaskers])
  );

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
    if (newFilters.searchQuery) {
      setSearchQuery(newFilters.searchQuery);
    }
    setActiveFilters(newFilters);
    setActiveFilterCount(calculateFilterCount(newFilters));
    fetchTaskers(newFilters);
  };

  // Debounced unified search
  const handleUnifiedSearch = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    if (query.length < 2) {
      setUnifiedResults(null);
      setShowSearchResults(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const lang = isEn ? 'en' : 'fr';
        const results = await searchAPI.unifiedSearch(query, lang);
        setUnifiedResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.log('Unified search error:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  // Handle search submit (when user finishes typing)
  const handleSearchSubmit = () => {
    setShowSearchResults(false);
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
    setSelectedSubcategory(null);
    setUnifiedResults(null);
    setShowSearchResults(false);
    fetchTaskers({});
  };

  // Decorate taskers with distance + reachability, then filter + sort
  const filteredTaskers = (() => {
    // 1. Decorate with distance
    const decorated = taskers.map((t) => {
      if (!hasLocation || !t.latitude || !t.longitude) {
        return { ...t, distance: null as number | null, canReach: true };
      }
      const d = calculateDistance(user!.latitude!, user!.longitude!, t.latitude, t.longitude);
      const maxTravel = t.tasker_profile?.max_travel_distance ?? 9999;
      return { ...t, distance: d, canReach: d <= maxTravel };
    });

    // 2. Filter out taskers outside their own travel range
    let out = decorated.filter((t) => t.canReach);

    // 3. Apply max-distance chip filter
    if (maxDistance < 100 && hasLocation) {
      out = out.filter((t) => t.distance == null || t.distance <= maxDistance);
    }

    // 4. Filter by search query
    if (searchQuery) {
      out = out.filter((t) =>
        t.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 5. Sort
    const bestRate = (t: any) =>
      t.tasker_profile?.services?.[0]?.hourly_rate ??
      t.tasker_profile?.services?.[0]?.fixed_price ?? 9999;
    if (quickSort === 'distance') {
      out = [...out].sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    } else if (quickSort === 'distance-far') {
      out = [...out].sort((a, b) => (b.distance ?? -1) - (a.distance ?? -1));
    } else if (quickSort === 'price-low') {
      out = [...out].sort((a, b) => bestRate(a) - bestRate(b));
    } else if (quickSort === 'price-high') {
      out = [...out].sort((a, b) => bestRate(b) - bestRate(a));
    }
    return out;
  })();

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

      {/* Country hint — tells user which market they're browsing */}
      {countryLabel ? (
        <View style={styles.countryHintBar}>
          <Ionicons name="location" size={14} color={Colors.dark.primary} />
          <Text style={styles.countryHintText}>
            {isEn ? `Pros available in ${countryLabel}` : `Pros disponibles en ${countryLabel}`}
          </Text>
        </View>
      ) : user && !user.country ? (
        <View style={styles.noCountryBar}>
          <Ionicons name="warning-outline" size={14} color="#f59e0b" />
          <Text style={styles.noCountryText}>
            {isEn
              ? 'Set your country in your profile to see available Pros.'
              : 'Définissez votre pays dans votre profil pour voir les Pros disponibles.'}
          </Text>
        </View>
      ) : null}

      {/* Distance chips + sort (only when user has saved location) */}
      {hasLocation ? (
        <View style={styles.distanceSection}>
          {/* Distance chips */}
          <View style={styles.distanceRow}>
            <Ionicons name="location" size={14} color={Colors.dark.primary} />
            <Text style={styles.distanceLabel}>{isEn ? 'Distance:' : 'Distance :'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.distanceChips}>
              {([
                { val: 5,   label: '≤ 5 km' },
                { val: 10,  label: '≤ 10 km' },
                { val: 25,  label: '≤ 25 km' },
                { val: 50,  label: '≤ 50 km' },
                { val: 100, label: isEn ? 'Any' : 'Toutes' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.val}
                  testID={`quick-distance-${opt.val}`}
                  onPress={() => setMaxDistance(opt.val)}
                  style={[styles.distanceChip, maxDistance === opt.val && styles.distanceChipActive]}
                >
                  <Text style={[styles.distanceChipText, maxDistance === opt.val && styles.distanceChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {/* Sort chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortChips}>
            {([
              { val: 'rating',        label: isEn ? 'Top Rated' : 'Mieux notés' },
              { val: 'distance',      label: isEn ? 'Nearest' : 'Plus proches' },
              { val: 'distance-far',  label: isEn ? 'Farthest' : 'Plus éloignés' },
              { val: 'price-low',     label: isEn ? 'Cheapest' : 'Moins chers' },
              { val: 'price-high',    label: isEn ? 'Priciest' : 'Plus chers' },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.val}
                onPress={() => setQuickSort(opt.val)}
                style={[styles.sortChip, quickSort === opt.val && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, quickSort === opt.val && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : user ? (
        /* Soft prompt when user exists but has no saved location */
        <TouchableOpacity style={styles.locationPromptBox} onPress={() => router.push('/settings')}>
          <Ionicons name="location-outline" size={18} color="#ca8a04" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationPromptTitle}>
              {isEn ? 'Set your location' : 'Définissez votre position'}
            </Text>
            <Text style={styles.locationPromptBody}>
              {isEn
                ? 'Update it in your profile to filter Pros by distance.'
                : 'Modifiez-la dans votre profil pour filtrer par distance.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ca8a04" />
        </TouchableOpacity>
      ) : null}

      {/* Search Bar with Filter Button */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.dark.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={isEn ? 'Search services, categories, taskers...' : 'Rechercher services, categories, taskers...'}
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={handleUnifiedSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setUnifiedResults(null);
              setShowSearchResults(false);
            }}>
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

      {/* Unified Search Results Overlay */}
      {showSearchResults && unifiedResults && (
        <View style={styles.searchOverlay}>
          <ScrollView style={styles.searchResultsScroll} keyboardShouldPersistTaps="handled">
            {searchLoading && (
              <View style={styles.searchLoadingRow}>
                <ActivityIndicator size="small" color={Colors.dark.primary} />
                <Text style={styles.searchLoadingText}>{isEn ? 'Searching...' : 'Recherche...'}</Text>
              </View>
            )}

            {/* Categories */}
            {unifiedResults.categories.length > 0 && (
              <>
                <Text style={styles.searchSectionHeader}>
                  {isEn ? 'CATEGORIES' : 'CATEGORIES'}
                </Text>
                {unifiedResults.categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setShowSearchResults(false);
                      setSearchQuery('');
                      setSelectedCategory(cat.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultIcon}>
                      <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                    </View>
                    <Text style={styles.searchResultText}>{cat.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Subcategories / Services */}
            {unifiedResults.subcategories.length > 0 && (
              <>
                <Text style={styles.searchSectionHeader}>
                  {isEn ? 'SERVICES' : 'SERVICES'}
                </Text>
                {unifiedResults.subcategories.map((sub, idx) => (
                  <TouchableOpacity
                    key={`sub-${idx}`}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setShowSearchResults(false);
                      setSearchQuery('');
                      setSelectedCategory(sub.category_id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultIcon}>
                      <Text style={{ fontSize: 20 }}>{sub.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultText}>{sub.name}</Text>
                      <Text style={styles.searchResultSub}>{sub.category_name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Taskers */}
            {unifiedResults.taskers.length > 0 && (
              <>
                <Text style={styles.searchSectionHeader}>
                  {isEn ? 'TASKERS' : 'TACHERONS'}
                </Text>
                {unifiedResults.taskers.map((tasker) => (
                  <TouchableOpacity
                    key={tasker.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setShowSearchResults(false);
                      setSearchQuery('');
                      router.push({
                        pathname: `/tasker/${tasker.id}`,
                        params: {
                          fromCategoryId: selectedCategory || '',
                          fromSubcategory: selectedSubcategory || '',
                        },
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultAvatar}>
                      {tasker.profile_image ? (
                        <Image source={{ uri: tasker.profile_image }} style={styles.searchResultAvatarImg} />
                      ) : (
                        <Ionicons name="person" size={20} color={Colors.dark.textSecondary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.searchResultText}>{tasker.name}</Text>
                        {tasker.is_verified && (
                          <Ionicons name="checkmark-circle" size={14} color={Colors.dark.primary} />
                        )}
                      </View>
                      <Text style={styles.searchResultSub}>
                        {tasker.rating.toFixed(1)} ({tasker.reviews} {isEn ? 'reviews' : 'avis'})
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* No results */}
            {!searchLoading && 
              unifiedResults.categories.length === 0 && 
              unifiedResults.subcategories.length === 0 && 
              unifiedResults.taskers.length === 0 && (
              <View style={styles.searchEmptyState}>
                <Ionicons name="search-outline" size={32} color={Colors.dark.textSecondary} />
                <Text style={styles.searchEmptyText}>
                  {isEn ? 'No results found' : 'Aucun resultat'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

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
          onPress={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
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
            onPress={() => { setSelectedCategory(category.id); setSelectedSubcategory(null); }}
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

      {/* Subcategory chips — only when a category with subcategories is selected */}
      {selectedCategoryData && selectedCategoryData.subcategories && selectedCategoryData.subcategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subFiltersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {/* "All" chip to clear subcategory */}
          <TouchableOpacity
            style={[styles.subFilterChip, !selectedSubcategory && styles.subFilterChipActive]}
            onPress={() => setSelectedSubcategory(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.subFilterChipText, !selectedSubcategory && styles.subFilterChipTextActive]}>
              {isEn ? 'All' : 'Tous'}
            </Text>
          </TouchableOpacity>
          {selectedCategoryData.subcategories.map((sub, idx) => {
            const label = getSubcategoryName(sub, i18n.locale);
            if (!label) return null;
            const isActive = selectedSubcategory === label;
            return (
              <TouchableOpacity
                key={sub.id ?? idx}
                style={[styles.subFilterChip, isActive && styles.subFilterChipActive]}
                onPress={() => setSelectedSubcategory(isActive ? null : label)}
                activeOpacity={0.7}
              >
                <Text style={[styles.subFilterChipText, isActive && styles.subFilterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />}
        >
          {filteredTaskers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyTitle}>
                {isEn ? 'No Pros found' : 'Aucun Pro trouvé'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {maxDistance < 100 && hasLocation
                  ? isEn
                    ? `No Pros within ${maxDistance} km — try widening your range.`
                    : `Aucun Pro à moins de ${maxDistance} km — élargissez votre rayon.`
                  : activeFilterCount > 0 || selectedCategory
                  ? isEn
                    ? 'Try adjusting your filters'
                    : 'Essayez de modifier vos filtres'
                  : countryLabel
                  ? isEn
                    ? `We don't have any Pros yet in ${countryLabel} for this service. Check back soon.`
                    : `Nous n'avons pas encore de Pros en ${countryLabel} pour ce service. Revenez bientôt.`
                  : isEn
                  ? 'Check back later for new Pros'
                  : 'Revenez plus tard pour de nouveaux Pros'}
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
                onPress={() => router.push({
                  pathname: `/tasker/${tasker.id}`,
                  params: {
                    fromCategoryId: selectedCategory || '',
                    fromSubcategory: selectedSubcategory || '',
                  },
                })}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.taskerName}>{tasker.full_name}</Text>
                    {(tasker.is_identity_verified || tasker.verification?.status === 'approved') && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#fff" />
                      </View>
                    )}
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

                  {/* Distance pill */}
                  {tasker.distance != null && (
                    <View style={styles.distancePill}>
                      <Ionicons name="location" size={12} color="#1d4ed8" />
                      <Text style={styles.distancePillText}>
                        {tasker.distance.toFixed(1)} km {isEn ? 'away' : 'de distance'}
                      </Text>
                    </View>
                  )}

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
                  {tasker.tasker_profile?.max_travel_distance && (
                    <View style={styles.travelRangeBadge}>
                      <Text style={styles.travelRangeText}>
                        🚗 {isEn ? 'Travels up to' : 'Se déplace jusqu\'à'} {tasker.tasker_profile.max_travel_distance} km
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
  
  // Distance filter section
  distanceSection: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingBottom: 10,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  distanceLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
    marginRight: 4,
  },
  distanceChips: {
    gap: 8,
    paddingRight: 16,
  },
  distanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  distanceChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  distanceChipText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  distanceChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sortChips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sortChipActive: {
    backgroundColor: '#1d4ed820',
    borderColor: '#1d4ed8',
  },
  sortChipText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  locationPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#422006',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef08a30',
  },
  locationPromptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fde68a',
    marginBottom: 2,
  },
  locationPromptBody: {
    fontSize: 12,
    color: '#ca8a04',
  },
  // Distance pill & travel range on card
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  distancePillText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  travelRangeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  travelRangeText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '500',
  },

  // Country hint bar
  countryHintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: `${Colors.dark.primary}12`,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  countryHintText: {
    fontSize: 13,
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  noCountryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#78350f20',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b40',
  },
  noCountryText: {
    fontSize: 13,
    color: '#f59e0b',
    flex: 1,
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

  // Subcategory chips
  subFiltersContainer: {
    maxHeight: 46,
    marginBottom: 10,
  },
  subFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  subFilterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  subFilterChipText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  subFilterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
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
  taskerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },

    verifiedBadge: {
    backgroundColor: '#10b981',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Unified Search Overlay
  searchOverlay: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.background,
    zIndex: 100,
  },
  searchResultsScroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  searchSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchResultAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchResultText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  searchResultSub: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  searchEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  searchEmptyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
});