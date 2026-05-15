import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { authAPI } from '../services/api';
import { showMessage } from '../utils/alert';
import i18n from '../utils/i18n';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const isFr = i18n.locale === 'fr';

  const handleReset = async () => {
    if (!token) {
      showMessage(
        isFr ? 'Lien invalide' : 'Invalid Link',
        isFr ? 'Le lien de réinitialisation est invalide ou expiré.' : 'The reset link is invalid or expired.'
      );
      return;
    }
    if (newPassword.length < 6) {
      showMessage(
        isFr ? 'Erreur' : 'Error',
        isFr ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage(
        isFr ? 'Erreur' : 'Error',
        isFr ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match'
      );
      return;
    }
    try {
      setLoading(true);
      await authAPI.resetPasswordWithToken(token, newPassword);
      setDone(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      showMessage(
        isFr ? 'Erreur' : 'Error',
        detail || (isFr ? 'Lien expiré ou invalide. Recommencez.' : 'Link expired or invalid. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!done && (
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          )}

          {done ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.dark.primary} />
              <Text style={styles.title}>
                {isFr ? 'Mot de passe réinitialisé !' : 'Password Reset!'}
              </Text>
              <Text style={styles.description}>
                {isFr
                  ? 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
                  : 'You can now log in with your new password.'}
              </Text>
              <Button
                title={isFr ? 'Se connecter' : 'Log In'}
                onPress={() => router.replace('/(auth)/login')}
                style={styles.button}
              />
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {isFr ? 'Nouveau mot de passe' : 'New Password'}
                </Text>
                <Text style={styles.description}>
                  {isFr
                    ? 'Choisissez un nouveau mot de passe pour votre compte.'
                    : 'Choose a new password for your account.'}
                </Text>
              </View>

              {!token && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                  <Text style={styles.warningText}>
                    {isFr
                      ? 'Aucun jeton trouvé. Utilisez le lien envoyé par email.'
                      : 'No token found. Use the link sent to your email.'}
                  </Text>
                </View>
              )}

              <View style={styles.form}>
                <Input
                  label={isFr ? 'Nouveau mot de passe' : 'New Password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.dark.textSecondary}
                      />
                    </TouchableOpacity>
                  }
                />
                <Input
                  label={isFr ? 'Confirmer le mot de passe' : 'Confirm Password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} />}
                />
              </View>

              <Button
                title={isFr ? 'Réinitialiser le mot de passe' : 'Reset Password'}
                onPress={handleReset}
                loading={loading}
                disabled={!token}
                style={styles.button}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  backButton: { width: 44, height: 44, justifyContent: 'center', marginBottom: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.dark.text, marginBottom: 10 },
  description: { fontSize: 15, color: Colors.dark.textSecondary, lineHeight: 22 },
  form: { gap: 16, marginBottom: 8 },
  button: { marginTop: 24 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#78350f25',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  warningText: { color: '#fbbf24', fontSize: 13, flex: 1 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 16 },
});
