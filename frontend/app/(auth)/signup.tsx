import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';

interface SignupFormData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  country: string;
}

export default function SignupScreen() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'client' | 'tasker'>('client');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      phone: '',
      country: 'Ivory Coast',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await registerUser({
        ...data,
        role: selectedRole,
        language: i18n.locale,
      });
      // Navigation will be handled by the index.tsx redirect logic
    } catch (error: any) {
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.message || i18n.t('auth.signupError')
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
              <Text style={styles.headerTitle}>{i18n.t('auth.signup')}</Text>
            </View>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>
              {i18n.locale === 'fr' ? 'Créer un compte' : 'Create Account'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {i18n.locale === 'fr'
                ? 'Rejoignez Soutrali aujourd\'hui'
                : 'Join Soutrali today'}
            </Text>
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>{i18n.t('auth.selectRole')}</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === 'client' && styles.roleButtonActive,
                ]}
                onPress={() => setSelectedRole('client')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person"
                  size={24}
                  color={selectedRole === 'client' ? Colors.dark.primary : Colors.dark.textSecondary}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    selectedRole === 'client' && styles.roleButtonTextActive,
                  ]}
                >
                  {i18n.t('auth.client')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === 'tasker' && styles.roleButtonActive,
                ]}
                onPress={() => setSelectedRole('tasker')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="hammer"
                  size={24}
                  color={selectedRole === 'tasker' ? Colors.dark.primary : Colors.dark.textSecondary}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    selectedRole === 'tasker' && styles.roleButtonTextActive,
                  ]}
                >
                  {i18n.t('auth.tasker')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="full_name"
              rules={{ required: i18n.t('auth.nameRequired') }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={i18n.t('auth.fullName')}
                  placeholder="John Doe"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.full_name?.message}
                />
              )}
            />

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
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              rules={{ required: i18n.t('auth.phoneRequired') }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={i18n.t('auth.phone')}
                  placeholder="+225 0123456789"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                />
              )}
            />

            <Controller
              control={control}
              name="country"
              rules={{ required: i18n.t('auth.countryRequired') }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={i18n.t('auth.country')}
                  placeholder="Ivory Coast"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.country?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: i18n.t('auth.passwordRequired'),
                minLength: {
                  value: 6,
                  message:
                    i18n.locale === 'fr'
                      ? 'Le mot de passe doit contenir au moins 6 caractères'
                      : 'Password must be at least 6 characters',
                },
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

            {/* Signup Button */}
            <Button
              title={isLoading ? i18n.t('auth.signingUp') : i18n.t('auth.signupButton')}
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              variant="primary"
              style={styles.signupButton}
            />
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{i18n.t('auth.haveAccount')} </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>{i18n.t('auth.login')}</Text>
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
    marginBottom: 24,
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
  roleContainer: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    gap: 8,
  },
  roleButtonActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: `${Colors.dark.primary}15`,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.textSecondary,
  },
  roleButtonTextActive: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 24,
  },
  signupButton: {
    width: '100%',
    marginTop: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  loginText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
});
