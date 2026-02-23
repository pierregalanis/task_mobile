import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { getCategoryName, Category } from '../../constants/Categories';
import { notificationAPI, categoryAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 24 * 2 - 12) / 2;

// Skeleton Loading Component
const SkeletonBox = ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
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
      style={[
        {
          width,
          height,
          backgroundColor: Colors.dark.border,
          borderRadius: 8,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton Category Card
const SkeletonCategoryCard = () => (
  <View style={styles.categoryCard}>
    <SkeletonBox width={56} height={56} style={{ borderRadius: 28, marginBottom: 12 }} />
    <SkeletonBox width={80} height={14} style={{ marginBottom: 8 }} />
    <SkeletonBox width={50} height={10} style={{}} />
  </View>
);

// Animated Category Card
const AnimatedCategoryCard = ({ 
  category, 
  index, 
  onPress 
}: { 
  category: Category; 
  index: number; 
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.categoryCard}
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.categoryIconContainer}>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
        </View>
        <Text style={styles.categoryTitle} numberOfLines={2}>
          {getCategoryName(category, i18n.locale)}
        </Text>
        <View style={styles.serviceCountBadge}>
          <Text style={styles.categorySubcount}>
            {category.subcategories.length} {i18n.locale === 'fr' ? 'services' : 'services'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const welcomeFade = useRef(new Animated.Value(0)).current;
  const welcomeScale = useRef(new Animated.Value(0.95)).current;
  const notificationScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(welcomeFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(welcomeScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoryAPI.getCategories();
      if (data && data.length > 0) {
        const mappedCategories = data.map((cat: any) => ({
          id: cat.id,
          icon: cat.icon || '📦',
          name_en: cat.name_en,
          name_fr: cat.name_fr,
          subcategories: (cat.subcategories || []).map((sub: any, index: number) => ({
            id: sub.id || `${cat.id}_sub_${index}`,
            name_en: sub.en || sub.name_en || sub.name || '',
            name_fr: sub.fr || sub.name_fr || sub.name || '',
          })),
        }));
        setCategories(mappedCategories);
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notificationAPI.getUnreadCount();
      setUnreadCount(data.unread_count || data.count || 0);
    } catch (error) {
      console.log('Error fetching unread count:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  const handleNotificationPress = () => {
    Animated.sequence([
      Animated.timing(notificationScale, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(notificationScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    router.push('/notifications');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            }
          ]}
        >
          <View>
            <Text style={styles.greeting}>
              {i18n.locale === 'fr' ? 'Bonjour' : 'Hello'},
            </Text>
            <Text style={styles.userName}>{user?.full_name}</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: notificationScale }] }}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={handleNotificationPress}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.dark.text} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Animated Welcome Card with Gradient */}
        <Animated.View
          style={[
            styles.welcomeCardContainer,
            {
              opacity: welcomeFade,
              transform: [{ scale: welcomeScale }],
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.dark.primary, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeIconContainer}>
              <Ionicons name="sparkles" size={28} color={Colors.dark.primary} />
            </View>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>
                {user?.role === 'client'
                  ? i18n.locale === 'fr'
                    ? 'Trouvez le Tâcheron parfait'
                    : 'Find the Perfect Tasker'
                  : i18n.locale === 'fr'
                  ? 'Commencez à accepter des tâches'
                  : 'Start Accepting Tasks'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {user?.role === 'client'
                  ? i18n.locale === 'fr'
                    ? 'Des milliers de professionnels qualifiés sont prêts à vous aider'
                    : 'Thousands of skilled professionals ready to help'
                  : i18n.locale === 'fr'
                  ? 'Gagnez de l\'argent en aidant les gens autour de vous'
                  : 'Earn money by helping people around you'}
              </Text>
            </View>
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
          </LinearGradient>
        </Animated.View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('home.categories')}</Text>
            {!loadingCategories && categories.length > 0 && (
              <Text style={styles.sectionCount}>{categories.length}</Text>
            )}
          </View>
          
          {loadingCategories ? (
            <View style={styles.categoriesGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCategoryCard key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map((category, index) => (
                <AnimatedCategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                  onPress={() => router.push({
                    pathname: '/booking/select-service',
                    params: { categoryId: category.id }
                  })}
                />
              ))}
            </View>
          )}
        </View>

        {/* Featured Section - Coming Soon */}
        {user?.role === 'client' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('home.featured')}</Text>
            <View style={styles.comingSoonCard}>
              <View style={styles.comingSoonIconContainer}>
                <Ionicons name="star-outline" size={32} color={Colors.dark.primary} />
              </View>
              <Text style={styles.comingSoon}>
                {i18n.locale === 'fr' ? 'Bientôt disponible' : 'Coming Soon'}
              </Text>
              <Text style={styles.comingSoonSubtitle}>
                {i18n.locale === 'fr'
                  ? 'Parcourir les tâcherons sera disponible dans la Phase 2'
                  : 'Browse taskers will be available in Phase 2'}
              </Text>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.dark.text,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.dark.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Welcome Card
  welcomeCardContainer: {
    marginHorizontal: 24,
    marginBottom: 28,
    borderRadius: 20,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
  },
  welcomeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  // Section
  section: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  serviceCountBadge: {
    backgroundColor: `${Colors.dark.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categorySubcount: {
    fontSize: 11,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  // Coming Soon
  comingSoonCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: 'dashed',
  },
  comingSoonIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.dark.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  comingSoonSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});