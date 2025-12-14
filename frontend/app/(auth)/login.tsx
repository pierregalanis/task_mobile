import React, { useState } from 'react';
import { showMessage } from '../../utils/alert';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { showMessage } from '../../utils/alert';
import { useRouter } from 'expo-router';
import { showMessage } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showMessage } from '../../utils/alert';
import { useForm, Controller } from 'react-hook-form';
import { showMessage } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { showMessage } from '../../utils/alert';
import { Input } from '../../components/Input';
import { showMessage } from '../../utils/alert';
import { Button } from '../../components/Button';
import { showMessage } from '../../utils/alert';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      // Explicitly navigate to home after successful login
      console.log('Login completed, navigating to home...');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.message || i18n.t('auth.loginError')
      );
    } finally {
      setIsLoading(false);
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{i18n.t('auth.login')}</Text>
            </View>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>
              {i18n.locale === 'fr' ? 'Bon retour!' : 'Welcome Back!'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {i18n.locale === 'fr'
                ? 'Connectez-vous pour continuer'
                : 'Sign in to continue'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="email"
              rules={{
                required: i18n.t('auth.emailRequired'),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: i18n.t('auth.invalidEmail'),
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={i18n.t('auth.email')}
                  placeholder="example@email.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: i18n.t('auth.passwordRequired'),
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={i18n.t('auth.password')}
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secure
                />
              )}
            />

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
              <Text style={styles.forgotPasswordText}>
                {i18n.t('auth.forgotPassword')}
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Button
              title={isLoading ? i18n.t('auth.loggingIn') : i18n.t('auth.loginButton')}
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              variant="primary"
              style={styles.loginButton}
            />
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{i18n.t('auth.noAccount')} </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/signup')}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>{i18n.t('auth.signup')}</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  welcomeContainer: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  formContainer: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  loginButton: {
    width: '100%',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  signupText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
});
