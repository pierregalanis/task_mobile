import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { storage } from '../../utils/storage';
import { showConfirm } from '../../utils/alert';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    showConfirm(
      i18n.locale === 'fr' ? 'Déconnexion' : 'Logout',
      i18n.locale === 'fr'
        ? 'Êtes-vous sûr de vouloir vous déconnecter?'
        : 'Are you sure you want to logout?',
      async () => {
        setIsLoggingOut(true);
        await logout();
        setIsLoggingOut(false);
        router.replace('/');
      },
      undefined,
      i18n.locale === 'fr' ? 'Déconnexion' : 'Logout',
      i18n.locale === 'fr' ? 'Annuler' : 'Cancel'
    );
  };

  const handleLanguageChange = async () => {
    const newLocale = i18n.locale === 'en' ? 'fr' : 'en';
    i18n.locale = newLocale;
    await storage.saveLanguage(newLocale);
    // Force a re-render by using router
    router.replace('/profile');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('profile.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: user?.role === 'tasker' ? Colors.dark.primary : '#3b82f6' },
              ]}
            >
              <Text style={styles.roleBadgeText}>
                {user?.role === 'tasker'
                  ? i18n.locale === 'fr'
                    ? 'Tâcheron'
                    : 'Tasker'
                  : i18n.locale === 'fr'
                  ? 'Client'
                  : 'Client'}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.profileInfo}>
            <View style={styles.profileInfoItem}>
              <Ionicons name="call" size={16} color={Colors.dark.textSecondary} />
              <Text style={styles.profileInfoText}>{user?.phone}</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <Ionicons name="location" size={16} color={Colors.dark.textSecondary} />
              <Text style={styles.profileInfoText}>{user?.country}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="language"
            title={i18n.t('profile.language')}
            subtitle={i18n.locale === 'en' ? 'English' : 'Français'}
            onPress={handleLanguageChange}
          />
          <MenuItem
            icon="settings"
            title={i18n.t('profile.settings')}
            subtitle={i18n.locale === 'fr' ? 'Bientôt disponible' : 'Coming soon'}
            onPress={() => {}}
          />
          <MenuItem
            icon="help-circle"
            title={i18n.locale === 'fr' ? 'Aide & Support' : 'Help & Support'}
            subtitle={SUPPORT_EMAIL}
            onPress={() => router.push('/support')}
          />
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            {i18n.locale === 'fr' ? 'Version' : 'Version'} 1.0.0 (Phase 1)
          </Text>
          <Text style={styles.versionSubtext}>Soutrali Mobile</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color={Colors.dark.error} />
          <Text style={styles.logoutButtonText}>{i18n.t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuItemIconContainer}>
          <Ionicons name={icon} size={22} color={Colors.dark.text} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
    </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: Colors.dark.card,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: -8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    gap: 24,
  },
  profileInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileInfoText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  menuSection: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  versionSubtext: {
    fontSize: 10,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.error,
    gap: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.error,
  },
});
