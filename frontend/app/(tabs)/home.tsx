import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';

export default function HomeScreen() {
  const { user } = useAuth();

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
          <View style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={24} color={Colors.dark.text} />
          </View>
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
            <CategoryCard
              icon="hammer"
              title={i18n.locale === 'fr' ? 'Réparation' : 'Handyman'}
              color="#3b82f6"
            />
            <CategoryCard
              icon="brush"
              title={i18n.locale === 'fr' ? 'Peinture' : 'Painting'}
              color="#f59e0b"
            />
            <CategoryCard
              icon="flash"
              title={i18n.locale === 'fr' ? 'Électricien' : 'Electrician'}
              color="#f59e0b"
            />
            <CategoryCard
              icon="water"
              title={i18n.locale === 'fr' ? 'Plomberie' : 'Plumbing'}
              color="#06b6d4"
            />
            <CategoryCard
              icon="home"
              title={i18n.locale === 'fr' ? 'Nettoyage' : 'Cleaning'}
              color="#10b981"
            />
            <CategoryCard
              icon="car"
              title={i18n.locale === 'fr' ? 'Déménagement' : 'Moving'}
              color="#8b5cf6"
            />
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

function CategoryCard({ icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <View style={styles.categoryCard}>
      <View style={[styles.categoryIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.categoryTitle}>{title}</Text>
    </View>
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
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
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
