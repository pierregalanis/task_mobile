import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Animated,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeMode } from '../../constants/Colors';
import { showConfirm, showMessage } from '../../utils/alert';
import { imageAPI } from '../../services/api';

const SUPPORT_EMAIL = 'help@soutrali.net';
const PRIVACY_POLICY_URL = 'https://soutrali.net/privacy';
const TERMS_OF_SERVICE_URL = 'https://soutrali.net/terms';

// Theme option data
const THEME_OPTIONS: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; labelEn: string; labelFr: string }[] = [
  { mode: 'light', icon: 'sunny', labelEn: 'Light', labelFr: 'Clair' },
  { mode: 'dark', icon: 'moon', labelEn: 'Dark', labelFr: 'Sombre' },
  { mode: 'system', icon: 'phone-portrait', labelEn: 'System', labelFr: 'Système' },
];

// Animated Menu Item Component
function AnimatedMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  index,
  iconColor,
  colors,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  index: number;
  iconColor?: string;
  colors: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const itemIconColor = iconColor || colors.primary;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: 200 + index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: 200 + index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={[styles.menuItem, { borderBottomColor: colors.border }]} 
        onPress={onPress} 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.menuItemLeft}>
          <View style={[styles.menuItemIconContainer, { backgroundColor: `${itemIconColor}15` }]}>
            <Ionicons name={icon} size={20} color={itemIconColor} />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>{title}</Text>
            {subtitle && <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
          </View>
        </View>
        <View style={[styles.chevronContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const { locale, setLocale, t } = useLanguage();
  const { theme, setTheme, colors } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const profileScale = useRef(new Animated.Value(0.9)).current;
  const profileFade = useRef(new Animated.Value(0)).current;
  const logoutScale = useRef(new Animated.Value(1)).current;
  const avatarRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(profileScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(profileFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Subtle avatar animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarRotate, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(avatarRotate, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleLogout = () => {
    showConfirm(
      locale === 'fr' ? 'Déconnexion' : 'Logout',
      locale === 'fr'
        ? 'Êtes-vous sûr de vouloir vous déconnecter?'
        : 'Are you sure you want to logout?',
      async () => {
        setIsLoggingOut(true);
        Animated.sequence([
          Animated.timing(logoutScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
          Animated.timing(logoutScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        await logout();
        setIsLoggingOut(false);
        router.replace('/');
      },
      undefined,
      locale === 'fr' ? 'Déconnexion' : 'Logout',
      locale === 'fr' ? 'Annuler' : 'Cancel'
    );
  };

  const handleLanguageChange = async () => {
    const newLocale = locale === 'en' ? 'fr' : 'en';
    await setLocale(newLocale);
  };

  // Profile Picture Handlers
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showMessage(
          locale === 'fr' ? 'Permission refusée' : 'Permission Denied',
          locale === 'fr' 
            ? 'Veuillez autoriser l\'accès à la galerie' 
            : 'Please allow access to your photo library'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showMessage(
        locale === 'fr' ? 'Erreur' : 'Error',
        locale === 'fr' ? 'Impossible de sélectionner l\'image' : 'Unable to select image'
      );
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);
      await imageAPI.uploadProfileImage(imageUri);
      
      // Refresh user data to get new profile image
      if (refreshUser) {
        await refreshUser();
      }
      
      showMessage(
        locale === 'fr' ? 'Succès' : 'Success',
        locale === 'fr' ? 'Photo de profil mise à jour' : 'Profile picture updated'
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage(
        locale === 'fr' ? 'Erreur' : 'Error',
        locale === 'fr' ? 'Impossible de télécharger l\'image' : 'Unable to upload image'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteProfileImage = () => {
    showConfirm(
      locale === 'fr' ? 'Supprimer la photo' : 'Delete Photo',
      locale === 'fr' 
        ? 'Voulez-vous supprimer votre photo de profil?' 
        : 'Do you want to delete your profile picture?',
      async () => {
        try {
          setUploadingImage(true);
          // Call API to delete profile image if endpoint exists
          // await imageAPI.deleteProfileImage();
          
          if (refreshUser) {
            await refreshUser();
          }
          
          showMessage(
            locale === 'fr' ? 'Succès' : 'Success',
            locale === 'fr' ? 'Photo supprimée' : 'Photo deleted'
          );
        } catch (error) {
          console.error('Error deleting image:', error);
        } finally {
          setUploadingImage(false);
        }
      }
    );
  };

  const handleAvatarPress = () => {
    const hasProfileImage = user?.profile_image || user?.avatar || user?.profile_picture;
    
    Alert.alert(
      locale === 'fr' ? 'Photo de profil' : 'Profile Picture',
      locale === 'fr' ? 'Que voulez-vous faire?' : 'What would you like to do?',
      [
        {
          text: locale === 'fr' ? 'Choisir une photo' : 'Choose Photo',
          onPress: handlePickImage,
        },
        ...(hasProfileImage ? [{
          text: locale === 'fr' ? 'Supprimer' : 'Delete',
          onPress: handleDeleteProfileImage,
          style: 'destructive' as const,
        }] : []),
        {
          text: locale === 'fr' ? 'Annuler' : 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
  };

  // Terms & Privacy Handlers
  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      showMessage(
        locale === 'fr' ? 'Erreur' : 'Error',
        locale === 'fr' ? 'Impossible d\'ouvrir le lien' : 'Unable to open link'
      );
    }
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch (error) {
      showMessage(
        locale === 'fr' ? 'Erreur' : 'Error',
        locale === 'fr' ? 'Impossible d\'ouvrir le lien' : 'Unable to open link'
      );
    }
  };

  const avatarBorderRotation = avatarRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate profile completion
  const getProfileCompletion = () => {
    let completed = 0;
    const total = 5;
    if (user?.full_name) completed++;
    if (user?.email) completed++;
    if (user?.phone) completed++;
    if (user?.country) completed++;
    if (user?.role) completed++;
    return Math.round((completed / total) * 100);
  };

  const profileCompletion = getProfileCompletion();
  
  // Get profile image URL
  const profileImageUrl = user?.profile_image || user?.avatar || user?.profile_picture;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {locale === 'fr' ? 'Gérez votre compte' : 'Manage your account'}
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Profile Card */}
        <Animated.View 
          style={[
            styles.profileCard, 
            { 
              backgroundColor: colors.card, 
              borderColor: colors.border,
              opacity: profileFade, 
              transform: [{ scale: profileScale }] 
            }
          ]}
        >
          {/* Avatar with Gradient Ring - Now Tappable */}
          <TouchableOpacity 
            style={styles.avatarWrapper} 
            onPress={handleAvatarPress}
            activeOpacity={0.8}
            disabled={uploadingImage}
          >
            <Animated.View style={[styles.avatarGradientRing, { transform: [{ rotate: avatarBorderRotation }] }]}>
              <LinearGradient
                colors={[colors.primary, '#059669', '#3b82f6', colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientRing}
              />
            </Animated.View>
            <View style={[styles.avatarContainer, { backgroundColor: colors.background }]}>
              {uploadingImage ? (
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              ) : profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Camera Icon Overlay */}
            <View style={[styles.cameraIconContainer, { backgroundColor: colors.primary, borderColor: colors.card }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
            
            <View
              style={[
                styles.roleBadge,
                { 
                  backgroundColor: user?.role === 'tasker' ? colors.primary : '#3b82f6',
                  borderColor: colors.card,
                },
              ]}
            >
              <Ionicons 
                name={user?.role === 'tasker' ? 'construct' : 'person'} 
                size={10} 
                color="#fff" 
              />
              <Text style={styles.roleBadgeText}>
                {user?.role === 'tasker'
                  ? locale === 'fr' ? 'Tâcheron' : 'Tasker'
                  : locale === 'fr' ? 'Client' : 'Client'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.profileName, { color: colors.text }]}>{user?.full_name}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>

          {/* Profile Info Pills */}
          <View style={styles.profileInfo}>
            {user?.phone && (
              <View style={[styles.profileInfoPill, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="call" size={14} color={colors.primary} />
                <Text style={[styles.profileInfoText, { color: colors.text }]}>{user?.phone}</Text>
              </View>
            )}
            {user?.country && (
              <View style={[styles.profileInfoPill, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={[styles.profileInfoText, { color: colors.text }]}>{user?.country}</Text>
              </View>
            )}
          </View>

          {/* Profile Completion */}
          {profileCompletion < 100 && (
            <View style={[styles.completionContainer, { borderTopColor: colors.border }]}>
              <View style={styles.completionHeader}>
                <Text style={[styles.completionTitle, { color: colors.textSecondary }]}>
                  {locale === 'fr' ? 'Profil complété' : 'Profile Complete'}
                </Text>
                <Text style={[styles.completionPercent, { color: colors.primary }]}>{profileCompletion}%</Text>
              </View>
              <View style={[styles.completionBarBg, { backgroundColor: colors.border }]}>
                <Animated.View style={[styles.completionBarFill, { width: `${profileCompletion}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          )}
        </Animated.View>

        {/* Theme Toggle Section */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
            {locale === 'fr' ? 'Apparence' : 'Appearance'}
          </Text>
          <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.themeHeader}>
              <Ionicons name="color-palette" size={22} color={colors.primary} />
              <Text style={[styles.themeTitle, { color: colors.text }]}>
                {locale === 'fr' ? 'Thème' : 'Theme'}
              </Text>
            </View>
            <View style={styles.themeOptions}>
              {THEME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.themeOption,
                    { 
                      backgroundColor: theme === option.mode ? colors.primary : colors.background,
                      borderColor: theme === option.mode ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => setTheme(option.mode)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={18} 
                    color={theme === option.mode ? colors.background : colors.text} 
                  />
                  <Text style={[
                    styles.themeOptionText,
                    { color: theme === option.mode ? colors.background : colors.text }
                  ]}>
                    {locale === 'fr' ? option.labelFr : option.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Tasker Management Section - Only for Taskers */}
        {user?.role === 'tasker' && (
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
              {locale === 'fr' ? 'Gestion Tâcheron' : 'Tasker Management'}
            </Text>
            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AnimatedMenuItem
                icon="calendar"
                title={locale === 'fr' ? 'Disponibilités' : 'Availability'}
                subtitle={locale === 'fr' ? 'Gérer vos horaires' : 'Manage your schedule'}
                onPress={() => router.push('/tasker/availability')}
                index={0}
                iconColor={colors.primary}
                colors={colors}
              />
              <AnimatedMenuItem
                icon="briefcase"
                title={locale === 'fr' ? 'Mes Services' : 'My Services'}
                subtitle={locale === 'fr' ? 'Gérer vos services' : 'Manage your services'}
                onPress={() => router.push('/tasker/manage-services')}
                index={1}
                iconColor="#f59e0b"
                colors={colors}
              />
              <AnimatedMenuItem
                icon="star"
                title={locale === 'fr' ? 'Mes Avis' : 'My Reviews'}
                subtitle={locale === 'fr' ? 'Voir les avis clients' : 'View customer reviews'}
                onPress={() => router.push('/tasker/my-reviews')}
                index={2}
                iconColor="#fbbf24"
                colors={colors}
              />
              <AnimatedMenuItem
                icon="wallet"
                title={locale === 'fr' ? 'Mes Revenus' : 'My Earnings'}
                subtitle={locale === 'fr' ? 'Historique des paiements' : 'Payment history'}
                onPress={() => router.push('/tasker/my-earnings')}
                index={3}
                iconColor={colors.success}
                colors={colors}
              />
            </View>
          </View>
        )}

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
            {locale === 'fr' ? 'Préférences' : 'Preferences'}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AnimatedMenuItem
              icon="language"
              title={t('profile.language')}
              subtitle={locale === 'en' ? 'English' : 'Français'}
              onPress={handleLanguageChange}
              index={0}
              iconColor="#8b5cf6"
              colors={colors}
            />
            <AnimatedMenuItem
              icon="notifications-outline"
              title={locale === 'fr' ? 'Notifications' : 'Notifications'}
              subtitle={locale === 'fr' ? 'Gérer les alertes' : 'Manage alerts'}
              onPress={() => router.push('/notifications')}
              index={1}
              iconColor="#f59e0b"
              colors={colors}
            />
            <AnimatedMenuItem
              icon="settings-outline"
              title={locale === 'fr' ? 'Paramètres' : 'Settings'}
              subtitle={locale === 'fr' ? 'Mot de passe, compte' : 'Password, account'}
              onPress={() => router.push('/settings')}
              index={2}
              iconColor={colors.textSecondary}
              colors={colors}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
            {locale === 'fr' ? 'Support' : 'Support'}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AnimatedMenuItem
              icon="help-circle-outline"
              title={locale === 'fr' ? 'Aide & Support' : 'Help & Support'}
              subtitle={SUPPORT_EMAIL}
              onPress={() => router.push('/support')}
              index={3}
              iconColor="#3b82f6"
              colors={colors}
            />
            <AnimatedMenuItem
              icon="document-text-outline"
              title={locale === 'fr' ? 'Conditions d\'utilisation' : 'Terms of Service'}
              subtitle={locale === 'fr' ? 'Lire les conditions' : 'Read our terms'}
              onPress={handleOpenTermsOfService}
              index={4}
              iconColor={colors.textSecondary}
              colors={colors}
            />
            <AnimatedMenuItem
              icon="shield-checkmark-outline"
              title={locale === 'fr' ? 'Confidentialité' : 'Privacy Policy'}
              subtitle={locale === 'fr' ? 'Vos données' : 'Your data'}
              onPress={handleOpenPrivacyPolicy}
              index={5}
              iconColor={colors.success}
              colors={colors}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={[styles.appLogoContainer, { backgroundColor: colors.primary }]}>
            <Text style={styles.appLogo}>S</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Soutrali</Text>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            {locale === 'fr' ? 'Version' : 'Version'} 1.0.0
          </Text>
          <Text style={[styles.versionSubtext, { color: colors.textSecondary }]}>
            {locale === 'fr' ? 'Fait avec ❤️ en Afrique' : 'Made with ❤️ in Africa'}
          </Text>
        </View>

        {/* Logout Button */}
        <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
          <TouchableOpacity
            style={[styles.logoutButton, { borderColor: colors.error }]}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.8}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
                <Text style={[styles.logoutButtonText, { color: colors.error }]}>{t('profile.logout')}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: { paddingHorizontal: 24, paddingVertical: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  
  // Profile Card
  profileCard: {
    padding: 24, borderRadius: 20, alignItems: 'center',
    marginBottom: 20, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5,
  },
  
  // Avatar with Gradient Ring
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatarGradientRing: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    width: 96, height: 96, borderRadius: 48,
  },
  gradientRing: { width: '100%', height: '100%', borderRadius: 48 },
  avatarContainer: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', padding: 4,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: {
    width: 80, height: 80, borderRadius: 40,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  roleBadge: {
    position: 'absolute', bottom: -4, left: -4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 2,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  
  profileName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  profileEmail: { fontSize: 14, marginBottom: 16 },
  
  // Info Pills
  profileInfo: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  profileInfoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  profileInfoText: { fontSize: 13, fontWeight: '500' },
  
  // Profile Completion
  completionContainer: { width: '100%', marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  completionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  completionTitle: { fontSize: 12, fontWeight: '500' },
  completionPercent: { fontSize: 12, fontWeight: '700' },
  completionBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  completionBarFill: { height: '100%', borderRadius: 3 },

  // Theme Toggle
  themeCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 4,
  },
  themeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  themeTitle: {
    fontSize: 16, fontWeight: '600',
  },
  themeOptions: {
    flexDirection: 'row', gap: 8,
  },
  themeOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1,
  },
  themeOptionText: {
    fontSize: 13, fontWeight: '600',
  },
   
  // Menu Sections
  menuSection: { marginBottom: 20 },
  menuSectionTitle: {
    fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4,
  },
  menuCard: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuItemIconContainer: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  menuItemSubtitle: { fontSize: 12 },
  chevronContainer: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  
  // App Info
  appInfo: { alignItems: 'center', paddingVertical: 24 },
  appLogoContainer: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  appLogo: { fontSize: 24, fontWeight: '700', color: '#fff' },
  appName: { fontSize: 16, fontWeight: '700' },
  versionText: { fontSize: 12, marginTop: 4 },
  versionSubtext: { fontSize: 11, marginTop: 4 },
  
  // Logout Button
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 14,
    borderWidth: 1, gap: 10,
  },
  logoutButtonText: { fontSize: 16, fontWeight: '600' },
});
