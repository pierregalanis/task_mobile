import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { settingsAPI, NotificationPreferences } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { showMessage, showConfirm } from '../utils/alert';
import i18n from '../utils/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const isFrench = i18n.locale === 'fr';

  // Loading states
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notification preferences
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    push_notifications: true,
    task_updates: true,
    messages: true,
    payments: true,
    reviews: true,
    marketing: false,
  });

  // Password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await settingsAPI.getNotificationPreferences();
      setPrefs(data);
    } catch (error) {
      console.log('Could not load preferences, using defaults');
    } finally {
      setLoadingPrefs(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !prefs[key];
    const newPrefs = { ...prefs, [key]: newValue };
    
    // Optimistic update
    setPrefs(newPrefs);
    setSavingPref(key);

    try {
      await settingsAPI.updateNotificationPreferences(newPrefs);
    } catch (error) {
      // Revert on error
      setPrefs(prefs);
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Impossible de sauvegarder la préférence' : 'Failed to save preference'
      );
    } finally {
      setSavingPref(null);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Veuillez remplir tous les champs' : 'Please fill in all fields'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match'
      );
      return;
    }

    if (newPassword.length < 8) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Le mot de passe doit contenir au moins 8 caractères' : 'Password must be at least 8 characters'
      );
      return;
    }

    setChangingPassword(true);

    try {
      await settingsAPI.changePassword(currentPassword, newPassword);
      showMessage(
        isFrench ? 'Succès' : 'Success',
        isFrench ? 'Mot de passe modifié avec succès' : 'Password changed successfully'
      );
      // Reset form
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 
        (isFrench ? 'Impossible de changer le mot de passe' : 'Failed to change password');
      showMessage(isFrench ? 'Erreur' : 'Error', errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    showConfirm(
      isFrench ? 'Supprimer le compte' : 'Delete Account',
      isFrench
        ? 'Êtes-vous sûr ? Cette action est irréversible. Toutes vos données seront supprimées définitivement.'
        : 'Are you sure? This action cannot be undone. All your data will be permanently deleted.',
      async () => {
        setDeletingAccount(true);
        try {
          await settingsAPI.deleteAccount();
          await logout();
          router.replace('/');
        } catch (error) {
          showMessage(
            isFrench ? 'Erreur' : 'Error',
            isFrench ? 'Impossible de supprimer le compte' : 'Failed to delete account'
          );
          setDeletingAccount(false);
        }
      },
      undefined,
      isFrench ? 'Supprimer' : 'Delete',
      isFrench ? 'Annuler' : 'Cancel'
    );
  };

  const notificationItems: { key: keyof NotificationPreferences; label: string; labelFr: string }[] = [
    { key: 'push_notifications', label: 'Push Notifications', labelFr: 'Notifications Push' },
    { key: 'task_updates', label: 'Task Updates', labelFr: 'Mises à jour des tâches' },
    { key: 'messages', label: 'New Messages', labelFr: 'Nouveaux messages' },
    { key: 'payments', label: 'Payment Updates', labelFr: 'Mises à jour des paiements' },
    { key: 'reviews', label: 'New Reviews', labelFr: 'Nouveaux avis' },
    { key: 'marketing', label: 'Marketing & Promotions', labelFr: 'Marketing & Promotions' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFrench ? 'Paramètres' : 'Settings'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={20} color={Colors.dark.primary} />
            <Text style={styles.sectionTitle}>
              {isFrench ? 'Notifications' : 'Notifications'}
            </Text>
          </View>

          {loadingPrefs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.dark.primary} />
            </View>
          ) : (
            <View style={styles.sectionContent}>
              {notificationItems.map((item, index) => (
                <View
                  key={item.key}
                  style={[
                    styles.settingRow,
                    index === notificationItems.length - 1 && styles.lastRow,
                  ]}
                >
                  <Text style={styles.settingLabel}>
                    {isFrench ? item.labelFr : item.label}
                  </Text>
                  <View style={styles.switchContainer}>
                    {savingPref === item.key && (
                      <ActivityIndicator
                        size="small"
                        color={Colors.dark.primary}
                        style={styles.savingIndicator}
                      />
                    )}
                    <Switch
                      value={prefs[item.key]}
                      onValueChange={() => handleToggle(item.key)}
                      trackColor={{ false: '#3a3a3a', true: Colors.dark.primary }}
                      thumbColor={prefs[item.key] ? '#ffffff' : '#f4f3f4'}
                      disabled={savingPref === item.key}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.dark.primary} />
            <Text style={styles.sectionTitle}>
              {isFrench ? 'Sécurité' : 'Security'}
            </Text>
          </View>

          <View style={styles.sectionContent}>
            {!showPasswordForm ? (
              <TouchableOpacity
                style={[styles.settingRow, styles.lastRow]}
                onPress={() => setShowPasswordForm(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingRowLeft}>
                  <Ionicons name="key" size={20} color={Colors.dark.textSecondary} />
                  <Text style={styles.settingLabel}>
                    {isFrench ? 'Changer le mot de passe' : 'Change Password'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                {/* Current Password */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={isFrench ? 'Mot de passe actuel' : 'Current Password'}
                    placeholderTextColor={Colors.dark.textSecondary}
                    secureTextEntry={!showCurrentPassword}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={Colors.dark.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* New Password */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={isFrench ? 'Nouveau mot de passe' : 'New Password'}
                    placeholderTextColor={Colors.dark.textSecondary}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={Colors.dark.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={isFrench ? 'Confirmer le mot de passe' : 'Confirm New Password'}
                    placeholderTextColor={Colors.dark.textSecondary}
                    secureTextEntry={!showNewPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.passwordHint}>
                  {isFrench
                    ? 'Le mot de passe doit contenir au moins 8 caractères'
                    : 'Password must be at least 8 characters'}
                </Text>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={changingPassword}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>
                      {isFrench ? 'Annuler' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, changingPassword && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                    activeOpacity={0.7}
                  >
                    {changingPassword ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {isFrench ? 'Mettre à jour' : 'Update'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={[styles.section, styles.dangerSection]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={20} color={Colors.dark.error} />
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>
              {isFrench ? 'Zone de danger' : 'Danger Zone'}
            </Text>
          </View>

          <View style={styles.sectionContent}>
            <Text style={styles.dangerWarning}>
              {isFrench
                ? 'Une fois votre compte supprimé, il n\'y a pas de retour possible. Soyez certain.'
                : 'Once you delete your account, there is no going back. Please be certain.'}
            </Text>
            <TouchableOpacity
              style={[styles.deleteButton, deletingAccount && styles.buttonDisabled]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
              activeOpacity={0.7}
            >
              {deletingAccount ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#ffffff" />
                  <Text style={styles.deleteButtonText}>
                    {isFrench ? 'Supprimer mon compte' : 'Delete My Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  sectionContent: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  loadingContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.dark.text,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingIndicator: {
    marginRight: 8,
  },
  passwordForm: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: Colors.dark.text,
  },
  eyeButton: {
    padding: 14,
  },
  passwordHint: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dangerSection: {
    marginTop: 8,
  },
  dangerTitle: {
    color: Colors.dark.error,
  },
  dangerWarning: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    padding: 16,
    paddingBottom: 12,
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.dark.error,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});