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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';

interface SignupFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function SignupScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'client' | 'tasker'>('client');

  const { control, handleSubmit, formState: { errors }, watch } = useForm<SignupFormData>({
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    try {
      setLoading(true);
      await register({
        email: data.email,
        password: data.password,
        full_name: data.fullName,
        phone: data.phone,
        country: 'CI',
        role: role,
      });
      showMessage(
        i18n.locale === 'fr' ? 'Compte créé' : 'Account Created',
        i18n.locale === 'fr' ? 'Vous pouvez maintenant vous connecter' : 'You can now log in'
      );
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('Signup error:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible de créer le compte' : 'Failed to create account')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('auth.signup.title')}</Text>
            <Text style={styles.subtitle}>{i18n.t('auth.signup.subtitle')}</Text>
          </View>

          <View style={styles.roleSelector}>
            <TouchableOpacity style={[styles.roleButton, role === 'client' && styles.roleButtonActive]} onPress={() => setRole('client')}>
              <Text style={[styles.roleButtonText, role === 'client' && styles.roleButtonTextActive]}>
                {i18n.locale === 'fr' ? 'Client' : 'Client'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleButton, role === 'tasker' && styles.roleButtonActive]} onPress={() => setRole('tasker')}>
              <Text style={[styles.roleButtonText, role === 'tasker' && styles.roleButtonTextActive]}>
                {i18n.locale === 'fr' ? 'Prestataire' : 'Tasker'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Controller control={control} name="fullName"
              rules={{ required: i18n.locale === 'fr' ? 'Nom complet requis' : 'Full name is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label={i18n.t('auth.signup.fullName')} placeholder={i18n.locale === 'fr' ? 'Votre nom complet' : 'Your full name'} value={value} onChangeText={onChange} onBlur={onBlur} error={errors.fullName?.message} leftIcon={<Ionicons name="person-outline" size={20} color={Colors.dark.textSecondary} />} />
              )}
            />

            <Controller control={control} name="email"
              rules={{ required: i18n.locale === 'fr' ? 'Email requis' : 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: i18n.locale === 'fr' ? 'Email invalide' : 'Invalid email' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label={i18n.t('auth.login.email')} placeholder={i18n.t('auth.login.emailPlaceholder')} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.dark.textSecondary} />} />
              )}
            />

            <Controller control={control} name="phone"
              rules={{ required: i18n.locale === 'fr' ? 'Téléphone requis' : 'Phone is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label={i18n.t('auth.signup.phone')} placeholder="+225 XX XX XX XX" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} leftIcon={<Ionicons name="call-outline" size={20} color={Colors.dark.textSecondary} />} />
              )}
            />

            <Controller control={control} name="password"
              rules={{ required: i18n.locale === 'fr' ? 'Mot de passe requis' : 'Password is required', minLength: { value: 6, message: i18n.locale === 'fr' ? 'Minimum 6 caractères' : 'Minimum 6 characters' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label={i18n.t('auth.login.password')} placeholder={i18n.t('auth.login.passwordPlaceholder')} value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry={!showPassword} error={errors.password?.message} leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} />} rightIcon={<TouchableOpacity onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.dark.textSecondary} /></TouchableOpacity>} />
              )}
            />

            <Controller control={control} name="confirmPassword"
              rules={{ required: i18n.locale === 'fr' ? 'Confirmation requise' : 'Please confirm password', validate: value => value === password || (i18n.locale === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match') }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label={i18n.t('auth.signup.confirmPassword')} placeholder={i18n.locale === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'} value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry={!showPassword} error={errors.confirmPassword?.message} leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} />} />
              )}
            />
          </View>

          <Button title={i18n.t('auth.signup.button')} onPress={handleSubmit(onSubmit)} loading={loading} style={styles.signupButton} />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{i18n.t('auth.signup.haveAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>{i18n.t('auth.signup.login')}</Text>
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
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.dark.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.dark.textSecondary },
  roleSelector: { flexDirection: 'row', marginBottom: 24, gap: 12 },
  roleButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center' },
  roleButtonActive: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  roleButtonText: { fontSize: 14, fontWeight: '600', color: Colors.dark.textSecondary },
  roleButtonTextActive: { color: Colors.dark.background },
  form: { gap: 16, marginBottom: 24 },
  signupButton: { marginBottom: 24 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  loginText: { color: Colors.dark.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.dark.primary, fontSize: 14, fontWeight: '600' },
});
