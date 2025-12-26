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

type ResetMethod = 'email' | 'whatsapp';
type Step = 'method' | 'input' | 'code' | 'newPassword' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<ResetMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const isFrench = i18n.locale === 'fr';

  const handleMethodSelect = (selectedMethod: ResetMethod) => {
    setMethod(selectedMethod);
    setStep('input');
  };

  const handleRequestReset = async () => {
    try {
      setLoading(true);
      
      if (method === 'email') {
        if (!email || !email.includes('@')) {
          showMessage(
            isFrench ? 'Erreur' : 'Error',
            isFrench ? 'Veuillez entrer un email valide' : 'Please enter a valid email'
          );
          return;
        }
        await authAPI.requestPasswordResetEmail(email);
        showMessage(
          isFrench ? 'Email envoyé' : 'Email Sent',
          isFrench 
            ? 'Vérifiez votre boîte de réception pour le lien de réinitialisation' 
            : 'Check your inbox for the reset link'
        );
        setStep('success');
      } else {
        if (!phone || phone.length < 8) {
          showMessage(
            isFrench ? 'Erreur' : 'Error',
            isFrench ? 'Veuillez entrer un numéro valide' : 'Please enter a valid phone number'
          );
          return;
        }
        await authAPI.requestPasswordResetWhatsApp(phone);
        showMessage(
          isFrench ? 'Code envoyé' : 'Code Sent',
          isFrench 
            ? 'Vérifiez votre WhatsApp pour le code de réinitialisation' 
            : 'Check your WhatsApp for the reset code'
        );
        setStep('code');
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
    try {
      setLoading(true);
      
      if (!code || code.length < 4) {
        showMessage(
          isFrench ? 'Erreur' : 'Error',
          isFrench ? 'Veuillez entrer le code complet' : 'Please enter the complete code'
        );
        return;
      }

      const response = await authAPI.verifyResetCode(phone, code);
      if (response.token) {
        setResetToken(response.token);
      }
      setStep('newPassword');
    } catch (error: any) {
      console.error('Code verification error:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message;
      showMessage(
        isFrench ? 'Code invalide' : 'Invalid Code',
        errorMessage || (isFrench ? 'Le code est incorrect ou expiré' : 'The code is incorrect or expired')
      );
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

      if (method === 'whatsapp') {
        await authAPI.resetPasswordWithCode(phone, code, newPassword);
      } else {
        // For email method, the token would come from the deep link
        await authAPI.resetPasswordWithToken(resetToken, newPassword);
      }

      showMessage(
        isFrench ? 'Succès' : 'Success',
        isFrench ? 'Votre mot de passe a été réinitialisé' : 'Your password has been reset'
      );
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

  const renderMethodSelection = () => (
    <View style={styles.methodContainer}>
      <Text style={styles.methodTitle}>
        {isFrench ? 'Comment souhaitez-vous réinitialiser votre mot de passe ?' : 'How would you like to reset your password?'}
      </Text>

      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => handleMethodSelect('email')}
        activeOpacity={0.8}
      >
        <View style={styles.methodIcon}>
          <Ionicons name="mail-outline" size={32} color={Colors.dark.primary} />
        </View>
        <View style={styles.methodContent}>
          <Text style={styles.methodName}>
            {isFrench ? 'Par Email' : 'By Email'}
          </Text>
          <Text style={styles.methodDescription}>
            {isFrench 
              ? 'Recevez un lien de réinitialisation par email' 
              : 'Receive a reset link by email'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => handleMethodSelect('whatsapp')}
        activeOpacity={0.8}
      >
        <View style={[styles.methodIcon, { backgroundColor: '#25D366' + '20' }]}>
          <Ionicons name="logo-whatsapp" size={32} color="#25D366" />
        </View>
        <View style={styles.methodContent}>
          <Text style={styles.methodName}>
            {isFrench ? 'Par WhatsApp' : 'By WhatsApp'}
          </Text>
          <Text style={styles.methodDescription}>
            {isFrench 
              ? 'Recevez un code de vérification par WhatsApp' 
              : 'Receive a verification code via WhatsApp'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderInputStep = () => (
    <View style={styles.inputContainer}>
      {method === 'email' ? (
        <>
          <Text style={styles.inputTitle}>
            {isFrench ? 'Entrez votre adresse email' : 'Enter your email address'}
          </Text>
          <Text style={styles.inputDescription}>
            {isFrench 
              ? 'Nous vous enverrons un lien pour réinitialiser votre mot de passe.' 
              : 'We will send you a link to reset your password.'}
          </Text>
          <Input
            label={isFrench ? 'Email' : 'Email'}
            placeholder={isFrench ? 'votre@email.com' : 'your@email.com'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.dark.textSecondary} />}
          />
        </>
      ) : (
        <>
          <Text style={styles.inputTitle}>
            {isFrench ? 'Entrez votre numéro WhatsApp' : 'Enter your WhatsApp number'}
          </Text>
          <Text style={styles.inputDescription}>
            {isFrench 
              ? 'Nous vous enverrons un code de vérification par WhatsApp.' 
              : 'We will send you a verification code via WhatsApp.'}
          </Text>
          <Input
            label={isFrench ? 'Numéro WhatsApp' : 'WhatsApp Number'}
            placeholder="+221 77 XXX XX XX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="logo-whatsapp" size={20} color="#25D366" />}
          />
        </>
      )}
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
        {isFrench 
          ? `Un code a été envoyé au ${phone}` 
          : `A code has been sent to ${phone}`}
      </Text>
      
      <View style={styles.codeInputContainer}>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={Colors.dark.textSecondary}
        />
      </View>

      <Button
        title={isFrench ? 'Vérifier' : 'Verify'}
        onPress={handleVerifyCode}
        loading={loading}
        style={styles.continueButton}
      />

      <TouchableOpacity style={styles.resendButton} onPress={handleRequestReset}>
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
        label={isFrench ? 'Confirmer le mot de passe' : 'Confirm Password'}
        placeholder="••••••••"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} />}
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
        {method === 'email' && step !== 'newPassword'
          ? (isFrench ? 'Email envoyé !' : 'Email Sent!')
          : (isFrench ? 'Mot de passe réinitialisé !' : 'Password Reset!')}
      </Text>
      <Text style={styles.successDescription}>
        {method === 'email' && step !== 'newPassword'
          ? (isFrench 
              ? 'Vérifiez votre boîte de réception et cliquez sur le lien de réinitialisation.' 
              : 'Check your inbox and click the reset link.')
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
      case 'method':
        return renderMethodSelection();
      case 'input':
        return renderInputStep();
      case 'code':
        return renderCodeStep();
      case 'newPassword':
        return renderNewPasswordStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderMethodSelection();
    }
  };

  const handleBack = () => {
    if (step === 'method') {
      router.back();
    } else if (step === 'input') {
      setStep('method');
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
            {step === 'method' && (
              <Text style={styles.subtitle}>
                {isFrench 
                  ? 'Ne vous inquiétez pas, nous vous aiderons à récupérer votre compte.' 
                  : "Don't worry, we'll help you recover your account."}
              </Text>
            )}
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
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  methodContainer: {
    gap: 16,
  },
  methodTitle: {
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.dark.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodContent: {
    flex: 1,
  },
  methodName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
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
