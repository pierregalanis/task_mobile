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
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { storage } from '../../utils/storage';
import { showConfirm, showMessage } from '../../utils/alert';
import { imageAPI } from '../../services/api';

const SUPPORT_EMAIL = 'help@soutrali.net';
const PRIVACY_POLICY_URL = 'https://soutrali.net/privacy';
const TERMS_OF_SERVICE_URL = 'https://soutrali.net/terms';

// Animated Menu Item Component
function AnimatedMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  index,
  iconColor = Colors.dark.primary,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  index: number;
  iconColor?: string;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
        style={styles.menuItem} 
        onPress={onPress} 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.menuItemLeft}>
          <View style={[styles.menuItemIconContainer, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>{title}</Text>
            {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={18} color={Colors.dark.textSecondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
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
      i18n.locale === 'fr' ? 'Déconnexion' : 'Logout',
      i18n.locale === 'fr'
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
      i18n.locale === 'fr' ? 'Déconnexion' : 'Logout',
      i18n.locale === 'fr' ? 'Annuler' : 'Cancel'
    );
  };

  const handleLanguageChange = async () => {
    const newLocale = i18n.locale === 'en' ? 'fr' : 'en';
    i18n.locale = newLocale;
    await storage.saveLanguage(newLocale);
    router.replace('/profile');
  };

  // Profile Picture Handlers
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showMessage(
          i18n.locale === 'fr' ? 'Permission refusée' : 'Permission Denied',
          i18n.locale === 'fr' 
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
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible de sélectionner l\'image' : 'Unable to select image'
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
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Photo de profil mise à jour' : 'Profile picture updated'
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible de télécharger l\'image' : 'Unable to upload image'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteProfileImage = () => {
    showConfirm(
      i18n.locale === 'fr' ? 'Supprimer la photo' : 'Delete Photo',
      i18n.locale === 'fr' 
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
            i18n.locale === 'fr' ? 'Succès' : 'Success',
            i18n.locale === 'fr' ? 'Photo supprimée' : 'Photo deleted'
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
      i18n.locale === 'fr' ? 'Photo de profil' : 'Profile Picture',
      i18n.locale === 'fr' ? 'Que voulez-vous faire?' : 'What would you like to do?',
      [
        {
          text: i18n.locale === 'fr' ? 'Choisir une photo' : 'Choose Photo',
          onPress: handlePickImage,
        },
        ...(hasProfileImage ? [{
          text: i18n.locale === 'fr' ? 'Supprimer' : 'Delete',
          onPress: handleDeleteProfileImage,
          style: 'destructive' as const,
        }] : []),
        {
          text: i18n.locale === 'fr' ? 'Annuler' : 'Cancel',
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
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible d\'ouvrir le lien' : 'Unable to open link'
      );
    }
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch (error) {
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible d\'ouvrir le lien' : 'Unable to open link'
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={styles.headerTitle}>{i18n.t('profile.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {i18n.locale === 'fr' ? 'Gérez votre compte' : 'Manage your account'}
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
            { opacity: profileFade, transform: [{ scale: profileScale }] }
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
                colors={[Colors.dark.primary, '#059669', '#3b82f6', Colors.dark.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientRing}
              />
            </Animated.View>
            <View style={styles.avatarContainer}>
              {uploadingImage ? (
                <View style={styles.avatar}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              ) : profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Camera Icon Overlay */}
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
            
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: user?.role === 'tasker' ? Colors.dark.primary : '#3b82f6' },
              ]}
            >
              <Ionicons 
                name={user?.role === 'tasker' ? 'construct' : 'person'} 
                size={10} 
                color="#fff" 
              />
              <Text style={styles.roleBadgeText}>
                {user?.role === 'tasker'
                  ? i18n.locale === 'fr' ? 'Tâcheron' : 'Tasker'
                  : i18n.locale === 'fr' ? 'Client' : 'Client'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>

          {/* Profile Info Pills */}
          <View style={styles.profileInfo}>
            {user?.phone && (
              <View style={styles.profileInfoPill}>
                <Ionicons name="call" size={14} color={Colors.dark.primary} />
                <Text style={styles.profileInfoText}>{user?.phone}</Text>
              </View>
            )}
            {user?.country && (
              <View style={styles.profileInfoPill}>
                <Ionicons name="location" size={14} color={Colors.dark.primary} />
                <Text style={styles.profileInfoText}>{user?.country}</Text>
              </View>
            )}
          </View>

          {/* Profile Completion */}
          {profileCompletion < 100 && (
            <View style={styles.completionContainer}>
              <View style={styles.completionHeader}>
                <Text style={styles.completionTitle}>
                  {i18n.locale === 'fr' ? 'Profil complété' : 'Profile Complete'}
                </Text>
                <Text style={styles.completionPercent}>{profileCompletion}%</Text>
              </View>
              <View style={styles.completionBarBg}>
                <Animated.View style={[styles.completionBarFill, { width: `${profileCompletion}%` }]} />
              </View>
            </View>
          )}
        </Animated.View>

    

          {/* Tasker Management Section - Only for Taskers */}
        {user?.role === 'tasker' && (
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>
              {i18n.locale === 'fr' ? 'Gestion Tâcheron' : 'Tasker Management'}
            </Text>
            <View style={styles.menuCard}>
              <AnimatedMenuItem
                icon="calendar"
                title={i18n.locale === 'fr' ? 'Disponibilités' : 'Availability'}
                subtitle={i18n.locale === 'fr' ? 'Gérer vos horaires' : 'Manage your schedule'}
                onPress={() => router.push('/tasker/availability')}
                index={0}
                iconColor={Colors.dark.primary}
              />
              <AnimatedMenuItem
                icon="briefcase"
                title={i18n.locale === 'fr' ? 'Mes Services' : 'My Services'}
                subtitle={i18n.locale === 'fr' ? 'Gérer vos services' : 'Manage your services'}
                onPress={() => router.push('/tasker/manage-services')}
                index={1}
                iconColor="#f59e0b"
              />
              <AnimatedMenuItem
                icon="star"
                title={i18n.locale === 'fr' ? 'Mes Avis' : 'My Reviews'}
                subtitle={i18n.locale === 'fr' ? 'Voir les avis clients' : 'View customer reviews'}
                onPress={() => router.push('/tasker/my-reviews')}
                index={2}
                iconColor="#fbbf24"
              />
              <AnimatedMenuItem
                icon="wallet"
                title={i18n.locale === 'fr' ? 'Mes Revenus' : 'My Earnings'}
                subtitle={i18n.locale === 'fr' ? 'Historique des paiements' : 'Payment history'}
                onPress={() => router.push('/tasker/my-earnings')}
                index={3}
                iconColor={Colors.dark.success}
              />
            </View>
          </View>
        )}


        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>
            {i18n.locale === 'fr' ? 'Préférences' : 'Preferences'}
          </Text>
          <View style={styles.menuCard}>
            <AnimatedMenuItem
              icon="language"
              title={i18n.t('profile.language')}
              subtitle={i18n.locale === 'en' ? 'English' : 'Français'}
              onPress={handleLanguageChange}
              index={0}
              iconColor="#8b5cf6"
            />
            <AnimatedMenuItem
              icon="notifications-outline"
              title={i18n.locale === 'fr' ? 'Notifications' : 'Notifications'}
              subtitle={i18n.locale === 'fr' ? 'Gérer les alertes' : 'Manage alerts'}
              onPress={() => router.push('/notifications')}
              index={1}
              iconColor="#f59e0b"
            />
            <AnimatedMenuItem
              icon="settings-outline"
              title={i18n.locale === 'fr' ? 'Paramètres' : 'Settings'}
              subtitle={i18n.locale === 'fr' ? 'Mot de passe, compte' : 'Password, account'}
              onPress={() => router.push('/settings')}
              index={2}
              iconColor={Colors.dark.textSecondary}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>
            {i18n.locale === 'fr' ? 'Support' : 'Support'}
          </Text>
          <View style={styles.menuCard}>
            <AnimatedMenuItem
              icon="help-circle-outline"
              title={i18n.locale === 'fr' ? 'Aide & Support' : 'Help & Support'}
              subtitle={SUPPORT_EMAIL}
              onPress={() => router.push('/support')}
              index={3}
              iconColor="#3b82f6"
            />
            <AnimatedMenuItem
              icon="document-text-outline"
              title={i18n.locale === 'fr' ? 'Conditions d\'utilisation' : 'Terms of Service'}
              subtitle={i18n.locale === 'fr' ? 'Lire les conditions' : 'Read our terms'}
              onPress={handleOpenTermsOfService}
              index={4}
              iconColor={Colors.dark.textSecondary}
            />
            <AnimatedMenuItem
              icon="shield-checkmark-outline"
              title={i18n.locale === 'fr' ? 'Confidentialité' : 'Privacy Policy'}
              subtitle={i18n.locale === 'fr' ? 'Vos données' : 'Your data'}
              onPress={handleOpenPrivacyPolicy}
              index={5}
              iconColor={Colors.dark.success}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={styles.appLogoContainer}>
            <Text style={styles.appLogo}>S</Text>
          </View>
          <Text style={styles.appName}>Soutrali</Text>
          <Text style={styles.versionText}>
            {i18n.locale === 'fr' ? 'Version' : 'Version'} 1.0.0
          </Text>
          <Text style={styles.versionSubtext}>
            {i18n.locale === 'fr' ? 'Fait avec ❤️ au Sénégal' : 'Made with ❤️ in Senegal'}
          </Text>
        </View>

        {/* Logout Button */}
        <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.8}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={Colors.dark.error} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={22} color={Colors.dark.error} />
                <Text style={styles.logoutButtonText}>{i18n.t('profile.logout')}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  
  // Header
  header: { paddingHorizontal: 24, paddingVertical: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.dark.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 4 },
  
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  
  // Profile Card
  profileCard: {
    backgroundColor: Colors.dark.card, padding: 24, borderRadius: 20, alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: Colors.dark.border,
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
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.dark.background,
    alignItems: 'center', justifyContent: 'center', padding: 4,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.dark.primary,
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
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.card,
  },
  roleBadge: {
    position: 'absolute', bottom: -4, left: -4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.dark.card,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  
  profileName: { fontSize: 22, fontWeight: '700', color: Colors.dark.text, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: Colors.dark.textSecondary, marginBottom: 16 },
  
  // Info Pills
  profileInfo: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  profileInfoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${Colors.dark.primary}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  profileInfoText: { fontSize: 13, color: Colors.dark.text, fontWeight: '500' },
  
  // Profile Completion
  completionContainer: { width: '100%', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  completionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  completionTitle: { fontSize: 12, color: Colors.dark.textSecondary, fontWeight: '500' },
  completionPercent: { fontSize: 12, color: Colors.dark.primary, fontWeight: '700' },
  completionBarBg: { height: 6, backgroundColor: Colors.dark.border, borderRadius: 3, overflow: 'hidden' },
  completionBarFill: { height: '100%', backgroundColor: Colors.dark.primary, borderRadius: 3 },
   
  // Menu Sections
  menuSection: { marginBottom: 20 },
  menuSectionTitle: {
    fontSize: 13, fontWeight: '600', color: Colors.dark.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.dark.card, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuItemIconContainer: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: '600', color: Colors.dark.text, marginBottom: 2 },
  menuItemSubtitle: { fontSize: 12, color: Colors.dark.textSecondary },
  chevronContainer: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.dark.background,
    alignItems: 'center', justifyContent: 'center',
  },
  
  // App Info
  appInfo: { alignItems: 'center', paddingVertical: 24 },
  appLogoContainer: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.dark.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  appLogo: { fontSize: 24, fontWeight: '700', color: '#fff' },
  appName: { fontSize: 16, fontWeight: '700', color: Colors.dark.text },
  versionText: { fontSize: 12, color: Colors.dark.textSecondary, marginTop: 4 },
  versionSubtext: { fontSize: 11, color: Colors.dark.textSecondary, marginTop: 4 },
  
  // Logout Button
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.dark.error, gap: 10,
  },
  logoutButtonText: { fontSize: 16, fontWeight: '600', color: Colors.dark.error },
});