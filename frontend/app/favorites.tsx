import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { favoriteAPI, Favorite } from '../services/api';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

// Skeleton for loading state
const SkeletonBox = ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
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

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[{ width, height, backgroundColor: Colors.dark.border, borderRadius: 8, opacity }, style]}
    />
  );
};

const SkeletonCard = () => (
  <View style={styles.favoriteCard}>
    <SkeletonBox width={64} height={64} style={{ borderRadius: 32 }} />
    <View style={{ flex: 1, marginLeft: 14 }}>
      <SkeletonBox width={140} height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width={80} height={14} style={{ marginBottom: 6 }} />
      <SkeletonBox width="70%" height={12} style={{}} />
    </View>
  </View>
);

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isEn = i18n.locale === 'en';

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const data = await favoriteAPI.getFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = (favorite: Favorite) => {
    Alert.alert(
      isEn ? 'Remove Favorite' : 'Retirer des favoris',
      isEn
        ? `Remove ${favorite.tasker_name} from your favorites?`
        : `Retirer ${favorite.tasker_name} de vos favoris ?`,
      [
        { text: isEn ? 'Cancel' : 'Annuler', style: 'cancel' },
        {
          text: isEn ? 'Remove' : 'Retirer',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            setFavorites(prev => prev.filter(f => f.id !== favorite.id));
            try {
              await favoriteAPI.removeFavorite(favorite.tasker_id);
            } catch (error) {
              console.error('Error removing favorite:', error);
              // Revert on error
              setFavorites(prev => [...prev, favorite]);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.backButton}>
            <SkeletonBox width={24} height={24} style={{ borderRadius: 12 }} />
          </View>
          <SkeletonBox width={120} height={24} style={{}} />
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEn ? 'My Favorites' : 'Mes Favoris'}
          </Text>
          {favorites.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{favorites.length}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.dark.primary} />
        }
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="heart-outline" size={48} color={Colors.dark.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {isEn ? 'No favorites yet' : 'Aucun favori'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isEn
                ? 'Tap the heart on a tasker profile to save them here'
                : 'Appuyez sur le coeur sur un profil pour le sauvegarder ici'}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/taskers')}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={18} color={Colors.dark.primary} />
              <Text style={styles.emptyButtonText}>
                {isEn ? 'Find Taskers' : 'Trouver un Tasker'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          favorites.map((favorite, index) => (
            <Animated.View key={favorite.id}>
              <TouchableOpacity
                style={styles.favoriteCard}
                onPress={() => router.push(`/tasker/${favorite.tasker_id}`)}
                activeOpacity={0.7}
              >
                {/* Tasker Image */}
                <View style={styles.imageContainer}>
                  {favorite.tasker_profile_image ? (
                    <Image
                      source={{ uri: favorite.tasker_profile_image }}
                      style={styles.taskerImage}
                    />
                  ) : (
                    <View style={[styles.taskerImage, styles.taskerImagePlaceholder]}>
                      <Text style={styles.taskerInitials}>
                        {favorite.tasker_name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Tasker Info */}
                <View style={styles.taskerInfo}>
                  <Text style={styles.taskerName} numberOfLines={1}>
                    {favorite.tasker_name}
                  </Text>

                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={styles.ratingText}>
                      {(favorite.tasker_rating || 0).toFixed(1)}
                    </Text>
                  </View>

                  {favorite.tasker_services && favorite.tasker_services.length > 0 && (
                    <Text style={styles.servicesText} numberOfLines={1}>
                      {favorite.tasker_services.slice(0, 2).join(', ')}
                      {favorite.tasker_services.length > 2 && ` +${favorite.tasker_services.length - 2}`}
                    </Text>
                  )}

                  <Text style={styles.addedDate}>
                    {isEn ? 'Saved ' : 'Ajouté le '}{formatDate(favorite.added_at)}
                  </Text>
                </View>

                {/* Unfavorite Button */}
                <TouchableOpacity
                  style={styles.unfavoriteButton}
                  onPress={() => handleRemoveFavorite(favorite)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name=\"heart\" size={22} color=\"#ef4444\" />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  countBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  imageContainer: {
    marginRight: 14,
  },
  taskerImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  taskerImagePlaceholder: {
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskerInitials: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.dark.background,
  },
  taskerInfo: {
    flex: 1,
  },
  taskerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  servicesText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  addedDate: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  unfavoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${'#ef4444'}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
