import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';
import { authAPI } from '../../services/api';

type ResetMethod = 'whatsapp' | 'email';
type Step = 'input' | 'code' | 'newPassword' | 'success';
type SuccessType = 'email_sent' | 'password_reset';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('input');
  const [method, setMethod] = useState<ResetMethod>('whatsapp');
  const [identifier, setIdentifier] = useState('');
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [expiresInMinutes, setExpiresInMinutes] = useState(15);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [successType, setSuccessType] = useState<SuccessType>('password_reset');

  const isFrench = i18n.locale === 'fr';

  const handleRequestReset = async () => {
    if (!identifier.trim()) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Veuillez entrer votre email ou numéro de téléphone' : 'Please enter your email or phone number'
      );
      return;
    }
    try {
      setLoading(true);
      const response = await authAPI.requestPasswordReset(method, identifier.trim());
      setExpiresInMinutes(response.expires_in_minutes ?? (method === 'whatsapp' ? 15 : 60));
      if (method === 'whatsapp') {
        setMaskedPhone(response.masked_phone ?? null);
        setCode('');
        setCodeError('');
        setStep('code');
      } else {
        setMaskedEmail(response.masked_email ?? null);
        setSuccessType('email_sent');
        setStep('success');
      }
    } catch (error: any) {
      console.error('Reset request error:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message;
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        errorMessage || (isFrench ? 'Une erreur est survenue' : 'An error occurred')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setCodeError('');
    if (!code || code.length !== 6) {
      setCodeError(isFrench ? 'Veuillez entrer le code à 6 chiffres' : 'Please enter the 6-digit code');
      return;
    }
    try {
      setLoading(true);
      const response = await authAPI.verifyWhatsAppCode(identifier.trim(), code);
      if (response.valid && response.token) {
        setResetToken(response.token);
        setStep('newPassword');
      } else {
        setCodeError(isFrench ? 'Code invalide ou expiré' : 'Invalid or expired code');
      }
    } catch (error: any) {
      console.error('Code verification error:', error);
      const detail = error.response?.data?.detail || error.response?.data?.message;
      setCodeError(detail || (isFrench ? 'Code invalide ou expiré' : 'Invalid or expired code'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);

      if (!newPassword || newPassword.length < 6) {
        showMessage(
          isFrench ? 'Erreur' : 'Error',
          isFrench ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters'
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

      await authAPI.resetPasswordWithToken(resetToken, newPassword);

      setSuccessType('password_reset');
      setStep('success');
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message;
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        errorMessage || (isFrench ? 'Une erreur est survenue' : 'An error occurred')
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInputStep = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputTitle}>
        {isFrench ? 'Mot de passe oublié ?' : 'Forgot your password?'}
      </Text>
      <Text style={styles.inputDescription}>
        {isFrench
          ? 'Entrez l\'email ou le numéro de téléphone associé à votre compte.'
          : 'Enter the email or phone number linked to your account.'}
      </Text>

      <View style={styles.methodToggleRow}>
        <TouchableOpacity
          style={[styles.methodToggle, method === 'whatsapp' && styles.methodToggleActive]}
          onPress={() => setMethod('whatsapp')}
          activeOpacity={0.8}
          testID="reset-method-whatsapp"
        >
          <Ionicons name="logo-whatsapp" size={18} color={method === 'whatsapp' ? '#fff' : '#25D366'} />
          <Text style={[styles.methodToggleText, method === 'whatsapp' && styles.methodToggleTextActive]}>
            WhatsApp
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.methodToggle, method === 'email' && styles.methodToggleActive]}
          onPress={() => setMethod('email')}
          activeOpacity={0.8}
          testID="reset-method-email"
        >
          <Ionicons name="mail-outline" size={18} color={method === 'email' ? '#fff' : Colors.dark.primary} />
          <Text style={[styles.methodToggleText, method === 'email' && styles.methodToggleTextActive]}>
            Email
          </Text>
        </TouchableOpacity>
      </View>

      <Input
        label={isFrench ? 'Email ou téléphone' : 'Email or phone'}
        placeholder={isFrench ? 'email@exemple.com ou 07 08 09 10 11' : 'email@example.com or 07 08 09 10 11'}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        testID="reset-identifier-input"
      />

      <Text style={styles.methodHint}>
        {method === 'whatsapp'
          ? (isFrench
              ? 'Nous enverrons un code de vérification par WhatsApp au numéro associé à ce compte.'
              : 'We\'ll send a verification code via WhatsApp to the number on this account.')
          : (isFrench
              ? 'Nous enverrons des instructions de réinitialisation par email à l\'adresse associée à ce compte.'
              : 'We\'ll send reset instructions by email to the address on this account.')}
      </Text>

      <Button
        title={isFrench ? 'Continuer' : 'Continue'}
        onPress={handleRequestReset}
        loading={loading}
        style={styles.continueButton}
      />
    </View>
  );

  const renderCodeStep = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputTitle}>
        {isFrench ? 'Entrez le code de vérification' : 'Enter verification code'}
      </Text>
      <Text style={styles.inputDescription}>
        {maskedPhone
          ? (isFrench ? `Code envoyé au ${maskedPhone}` : `Code sent to ${maskedPhone}`)
          : (isFrench
              ? 'Si ce compte est enregistré, un code a été envoyé à son numéro WhatsApp.'
              : 'If this account exists, a code has been sent to its WhatsApp number.')}
      </Text>
      <Text style={styles.expiryHint}>
        {isFrench ? `Le code expire dans ${expiresInMinutes} minutes` : `Code expires in ${expiresInMinutes} minutes`}
      </Text>

      <View style={styles.codeInputContainer}>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => { setCode(t.replace(/\D/g, '')); setCodeError(''); }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
          testID="reset-code-input"
        />
      </View>
      {!!codeError && (
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={14} color={Colors.dark.error} />
          <Text style={styles.errorText}>{codeError}</Text>
        </View>
      )}

      <Button
        title={isFrench ? 'Vérifier' : 'Verify'}
        onPress={handleVerifyCode}
        loading={loading}
        style={styles.continueButton}
      />

      <TouchableOpacity style={styles.resendButton} onPress={handleRequestReset} testID="reset-resend-btn">
        <Text style={styles.resendText}>
          {isFrench ? 'Renvoyer le code' : 'Resend code'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderNewPasswordStep = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputTitle}>
        {isFrench ? 'Créez un nouveau mot de passe' : 'Create a new password'}
      </Text>
      <Text style={styles.inputDescription}>
        {isFrench
          ? 'Votre nouveau mot de passe doit contenir au moins 6 caractères.'
          : 'Your new password must be at least 6 characters.'}
      </Text>

      <Input
        label={isFrench ? 'Nouveau mot de passe' : 'New Password'}
        placeholder="••••••••"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry={!showPassword}
        rightIcon={
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.dark.textSecondary}
            />
          </TouchableOpacity>
        }
        testID="reset-new-password-input"
      />

      <Input
        label={isFrench ? 'Confirmer le mot de passe' : 'Confirm Password'}
        placeholder="••••••••"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
        testID="reset-confirm-password-input"
      />

      <Button
        title={isFrench ? 'Réinitialiser le mot de passe' : 'Reset Password'}
        onPress={handleResetPassword}
        loading={loading}
        style={styles.continueButton}
      />
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color={Colors.dark.primary} />
      </View>
      <Text style={styles.successTitle}>
        {successType === 'email_sent'
          ? (isFrench ? 'Instructions envoyées !' : 'Instructions Sent!')
          : (isFrench ? 'Mot de passe réinitialisé !' : 'Password Reset!')}
      </Text>
      <Text style={styles.successDescription}>
        {successType === 'email_sent'
          ? (maskedEmail
              ? (isFrench ? `Instructions envoyées à ${maskedEmail}` : `Instructions sent to ${maskedEmail}`)
              : (isFrench
                  ? 'Si ce compte est enregistré, des instructions ont été envoyées à son email.'
                  : 'If this account exists, instructions have been sent to its email.'))
          : (isFrench
              ? 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
              : 'You can now login with your new password.')}
      </Text>
      <Button
        title={isFrench ? 'Retour à la connexion' : 'Back to Login'}
        onPress={() => router.push('/(auth)/login')}
        style={styles.backToLoginButton}
      />
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 'input':
        return renderInputStep();
      case 'code':
        return renderCodeStep();
      case 'newPassword':
        return renderNewPasswordStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderInputStep();
    }
  };

  const handleBack = () => {
    if (step === 'input') {
      router.back();
    } else if (step === 'code') {
      setStep('input');
    } else if (step === 'newPassword') {
      setStep('code');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step !== 'success' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>
              {isFrench ? 'Mot de passe oublié' : 'Forgot Password'}
            </Text>
          </View>

          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  inputContainer: {
    gap: 16,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  methodToggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  methodToggleActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary,
  },
  methodToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  methodToggleTextActive: {
    color: '#fff',
  },
  methodHint: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: -8,
    lineHeight: 18,
  },
  expiryHint: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: -4,
  },
  continueButton: {
    marginTop: 8,
  },
  codeInputContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.text,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: `${Colors.dark.error}15`,
    borderWidth: 1,
    borderColor: `${Colors.dark.error}30`,
    borderRadius: 10,
    padding: 12,
    marginTop: -8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.error,
    lineHeight: 18,
  },
  resendButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  resendText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  backToLoginButton: {
    width: '100%',
  },
});
