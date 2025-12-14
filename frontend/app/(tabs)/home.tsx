import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { CATEGORIES, getCategoryName } from '../../constants/Categories';
import { notificationAPI } from '../../services/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [])
  );

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationAPI.getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.log('Error fetching unread count:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {i18n.locale === 'fr' ? 'Bonjour' : 'Hello'},
            </Text>
            <Text style={styles.userName}>{user?.full_name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.iconCircle} 
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
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
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIconContainer}>
            <Ionicons name="sparkles" size={32} color={Colors.dark.primary} />
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
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('home.categories')}</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity 
                key={category.id} 
                style={styles.categoryCard} 
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/booking/select-service',
                  params: { categoryId: category.id }
                })}
              >
                <View style={styles.categoryIconContainer}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                </View>
                <Text style={styles.categoryTitle}>
                  {getCategoryName(category, i18n.locale)}
                </Text>
                <Text style={styles.categorySubcount}>
                  {category.subcategories.length} {i18n.locale === 'fr' ? 'services' : 'services'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Taskers */}
        {user?.role === 'client' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('home.featured')}</Text>
            <Text style={styles.comingSoon}>
              {i18n.locale === 'fr' ? 'Bientôt disponible' : 'Coming Soon'}
            </Text>
            <Text style={styles.comingSoonSubtitle}>
              {i18n.locale === 'fr'
                ? 'Parcourir les tâcherons sera disponible dans la Phase 2'
                : 'Browse taskers will be available in Phase 2'}
            </Text>
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.dark.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  welcomeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.dark.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.dark.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  categorySubcount: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  comingSoonSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
