import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { favoriteAPI, Favorite } from '../services/api';
import FavoriteButton from '../components/FavoriteButton';

const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await favoriteAPI.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, []);

  const handleRemove = (taskerId: string) => {
    // Remove from local state when unfavorited
    setFavorites(favorites.filter(f => f.tasker_id !== taskerId));
  };

  const navigateToTaskerProfile = (taskerId: string) => {
    router.push(`/tasker-profile/${taskerId}`);
  };

  const renderFavoriteCard = ({ item }: { item: Favorite }) => (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        {/* Avatar */}
        {item.tasker_profile_image ? (
          <Image source={{ uri: item.tasker_profile_image }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {item.tasker_name?.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.taskerName}>{item.tasker_name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#fbbf24" />
            <Text style={styles.rating}>{item.tasker_rating?.toFixed(1) || '0.0'}</Text>
          </View>
        </View>

        {/* Favorite Button (to remove) */}
        <FavoriteButton
          taskerId={item.tasker_id}
          size={20}
          initialFavorite={true}
          showAlert={false}
          onToggle={(isFav) => {
            if (!isFav) handleRemove(item.tasker_id);
          }}
        />
      </View>

      {/* Services */}
      {item.tasker_services && item.tasker_services.length > 0 && (
        <View style={styles.servicesRow}>
          {item.tasker_services.slice(0, 2).map((service, idx) => (
            <View key={idx} style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>{service}</Text>
            </View>
          ))}
          {item.tasker_services.length > 2 && (
            <Text style={styles.moreServices}>
              +{item.tasker_services.length - 2} more
            </Text>
          )}
        </View>
      )}

      {/* View Profile Button */}
      <TouchableOpacity
        style={styles.viewProfileButton}
        onPress={() => navigateToTaskerProfile(item.tasker_id)}
        activeOpacity={0.8}
      >
        <Text style={styles.viewProfileText}>View Profile</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={64} color="#6b7280" />
      </View>
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptySubtitle}>
        Start adding taskers to your favorites to quickly find them later
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)/home')}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.browseButtonText}>Browse Taskers</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="heart" size={28} color="#10b981" />
          <Text style={styles.headerTitle}>My Favorites</Text>
        </View>
        <View style={styles.headerRight}>
          {favorites.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{favorites.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      {favorites.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  taskerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    color: '#fbbf24',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 15,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  serviceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  serviceBadgeText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '500',
  },
  moreServices: {
    color: '#6b7280',
    fontSize: 13,
    alignSelf: 'center',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  viewProfileText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});