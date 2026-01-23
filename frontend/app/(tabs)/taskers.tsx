import React, { useState, useEffect } from 'react';
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
import { taskerAPI, categoryAPI } from '../../services/api';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { Category, getCategoryName, getCategoryById } from '../../constants/Categories';

export default function TaskersScreen() {
  const router = useRouter();
  const [taskers, setTaskers] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTaskers();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const data = await categoryAPI.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTaskers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      const data = await taskerAPI.getTaskers(params);
      setTaskers(data);
    } catch (error) {
      console.error('Error fetching taskers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
    fetchTaskers();
  };

  const filteredTaskers = taskers.filter((tasker) =>
    tasker.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Trouver un Tasker' : 'Find a Tasker'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {filteredTaskers.length} {i18n.locale === 'fr' ? 'disponibles' : 'available'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.dark.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.locale === 'fr' ? 'Rechercher un tasker...' : 'Search taskers...'}
          placeholderTextColor={Colors.dark.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

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
            {i18n.locale === 'fr' ? 'Tous' : 'All'}
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
      {loading ? (
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
              <Ionicons name="people-outline" size={64} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyTitle}>
                {i18n.locale === 'fr' ? 'Aucun tasker trouvé' : 'No taskers found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {i18n.locale === 'fr'
                  ? 'Essayez de modifier vos filtres'
                  : 'Try adjusting your filters'}
              </Text>
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
                  {tasker.profile_photo ? (
                    <Image source={{ uri: tasker.profile_photo }} style={styles.taskerImage} />
                  ) : (
                    <View style={[styles.taskerImage, styles.taskerImagePlaceholder]}>
                      <Text style={styles.taskerInitials}>
                        {tasker.full_name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {tasker.is_available && <View style={styles.availableBadge} />}
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
                        {tasker.rating || '5.0'} ({tasker.reviews_count || 0})
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.dark.primary} />
                      <Text style={styles.metaText}>{tasker.completed_tasks || 0} {i18n.locale === 'fr' ? 'tâches' : 'tasks'}</Text>
                    </View>
                    {tasker.distance && (
                      <>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                          <Ionicons name="location" size={14} color={Colors.dark.textSecondary} />
                          <Text style={styles.metaText}>{tasker.distance} km</Text>
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
                            const category = getCategoryById(s.category);
                            return category ? getCategoryName(category, i18n.locale) : s.category;
                          })
                          .join(', ')}
                        {tasker.tasker_profile.services.length > 2 && ' +' + (tasker.tasker_profile.services.length - 2)}
                      </Text>
                    </View>
                  )}

                  {tasker.tasker_profile?.services?.[0] && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>
                        {i18n.locale === 'fr' ? 'À partir de' : 'Starting at'}
                      </Text>
                      <Text style={styles.priceAmount}>
                        {tasker.tasker_profile.services[0].pricing_type === 'hourly'
                          ? `${tasker.tasker_profile.services[0].hourly_rate} XOF/h`
                          : `${tasker.tasker_profile.services[0].fixed_price} XOF`}
                      </Text>
                    </View>
                  )}
                </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    marginHorizontal: 24,
    marginVertical: 16,
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
  },
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
    color: Colors.dark.text,
  },
  availableBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.success,
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
