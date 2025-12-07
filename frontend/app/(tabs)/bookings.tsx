import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';

export default function BookingsScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('bookings.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Empty State */}
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="calendar-outline" size={64} color={Colors.dark.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>{i18n.t('bookings.noBookings')}</Text>
          <Text style={styles.emptySubtitle}>
            {user?.role === 'client'
              ? i18n.locale === 'fr'
                ? 'Vous n\'avez pas encore réservé de tâcherons.\nCommencez à explorer!'
                : "You haven't booked any taskers yet.\nStart exploring!"
              : i18n.locale === 'fr'
              ? 'Vous n\'avez pas encore de réservations.\nElles apparaîtront ici une fois acceptées.'
              : "You don't have any bookings yet.\nThey will appear here once accepted."}
          </Text>
        </View>

        {/* Coming Soon Message */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="time-outline" size={32} color={Colors.dark.primary} />
          <Text style={styles.comingSoonTitle}>
            {i18n.locale === 'fr' ? 'Phase 3 à venir' : 'Coming in Phase 3'}
          </Text>
          <Text style={styles.comingSoonText}>
            {i18n.locale === 'fr'
              ? 'La fonctionnalité de réservation complète avec Google Maps sera disponible dans la Phase 3'
              : 'Full booking functionality with Google Maps will be available in Phase 3'}
          </Text>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonCard: {
    backgroundColor: Colors.dark.card,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
