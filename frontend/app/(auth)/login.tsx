import React, { useState, useEffect } from 'react';
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
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { verified, method } = useLocalSearchParams<{ verified?: string; method?: string }>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (verified === 'true') {
      const isWhatsapp = method === 'whatsapp';
      showMessage(
        isWhatsapp
          ? (i18n.locale === 'fr' ? 'Numéro vérifié !' : 'Number Verified!')
          : (i18n.locale === 'fr' ? 'Email vérifié !' : 'Email Verified!'),
        i18n.locale === 'fr'
          ? 'Votre compte est activé. Connectez-vous pour continuer.'
          : 'Your account is now active. Please log in to continue.'
      );
    }
  }, [verified, method]);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      await login({ email: data.email, password: data.password });
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Login error:', error);
      const detail: string = error.response?.data?.detail ?? '';
      const isWhatsappUnverified = /whatsapp/i.test(detail);
      const isEmailUnverified = /not verified|email.*verif|verif.*email/i.test(detail);
      if (isWhatsappUnverified) {
        showMessage(
          i18n.locale === 'fr' ? 'Numéro non vérifié' : 'Number Not Verified',
          i18n.locale === 'fr'
            ? 'Un code va être envoyé sur votre WhatsApp.'
            : "A code will be sent to your WhatsApp."
        );
        setTimeout(() => router.push(`/(auth)/verify-phone?identifier=${encodeURIComponent(data.email)}&autoSend=true`), 1500);
      } else if (isEmailUnverified) {
        showMessage(
          i18n.locale === 'fr' ? 'Email non vérifié' : 'Email Not Verified',
          i18n.locale === 'fr'
            ? 'Vérifiez votre boîte de réception ou renvoyez le lien.'
            : 'Check your inbox or resend the verification link.'
        );
        setTimeout(() => router.push(`/resend-verification?email=${encodeURIComponent(data.email)}`), 1500);
      } else {
        showMessage(
          i18n.locale === 'fr' ? 'Erreur de connexion' : 'Login Error',
          detail || (i18n.locale === 'fr' ? 'Email ou mot de passe incorrect' : 'Invalid email or password')
        );
      }
    } finally {
      setLoading(false);
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('auth.login.title')}</Text>
            <Text style={styles.subtitle}>{i18n.t('auth.login.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              rules={{
                required: i18n.locale === 'fr' ? 'Email requis' : 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: i18n.locale === 'fr' ? 'Email invalide' : 'Invalid email address',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={i18n.t('auth.login.email')}
                  placeholder={i18n.t('auth.login.emailPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                  leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.dark.textSecondary} />}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: i18n.locale === 'fr' ? 'Mot de passe requis' : 'Password is required',
                minLength: {
                  value: 6,
                  message: i18n.locale === 'fr' ? 'Minimum 6 caractères' : 'Minimum 6 characters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={i18n.t('auth.login.password')}
                  placeholder={i18n.t('auth.login.passwordPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  error={errors.password?.message}
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.dark.textSecondary} />
                    </TouchableOpacity>
                  }
                />
              )}
            />

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>{i18n.t('auth.login.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          <Button
            title={i18n.t('auth.login.button')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{i18n.t('auth.login.noAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>{i18n.t('auth.login.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  backButton: { width: 44, height: 44, justifyContent: 'center', marginBottom: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.dark.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.dark.textSecondary },
  form: { gap: 16, marginBottom: 24 },
  forgotPassword: { alignSelf: 'flex-end' },
  forgotPasswordText: { color: Colors.dark.primary, fontSize: 14 },
  loginButton: { marginBottom: 24 },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  signupText: { color: Colors.dark.textSecondary, fontSize: 14 },
  signupLink: { color: Colors.dark.primary, fontSize: 14, fontWeight: '600' },
});
