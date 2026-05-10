import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import LocationPicker from '../../components/LocationPicker';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function SignupScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'client' | 'tasker'>('client');
  const [country, setCountry] = useState<'ivory_coast' | 'senegal'>('ivory_coast');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { control, handleSubmit, formState: { errors }, watch } = useForm<SignupFormData>({
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const countryConfig = {
    ivory_coast: {
      name_fr: "Côte d'Ivoire",
      name_en: "Ivory Coast",
      flag: "CI",
      phonePrefix: "+225",
      defaultCity: "Abidjan",
      latitude: 5.36,
      longitude: -4.00,
    },
    senegal: {
      name_fr: "Sénégal",
      name_en: "Senegal",
      flag: "SN",
      phonePrefix: "+221",
      defaultCity: "Dakar",
      latitude: 14.7167,
      longitude: -17.4677,
    },
  };

  const selectedCountry = countryConfig[country];

  const handleLocationSelect = (loc: LocationData) => {
    setLocation(loc);
  };

  const handleGoToLogin = () => {
    setShowSuccessModal(false);
    router.replace('/(auth)/login');
  };

  const onSubmit = async (data: SignupFormData) => {
    if (!phoneLocal.trim()) {
      showMessage(
        i18n.locale === 'fr' ? 'Téléphone requis' : 'Phone required',
        i18n.locale === 'fr' ? 'Veuillez entrer votre numéro de téléphone' : 'Please enter your phone number'
      );
      return;
    }

    try {
      setLoading(true);

      const lat = location?.latitude || selectedCountry.latitude;
      const lng = location?.longitude || selectedCountry.longitude;

      await register({
        email: data.email,
        password: data.password,
        full_name: data.fullName,
        phone: selectedCountry.phonePrefix + phoneLocal.trim(),
        country: country,
        city: location?.address?.split(',')[0] || selectedCountry.defaultCity,
        latitude: lat,
        longitude: lng,
        language: i18n.locale,
        role: role,
      });
      
      setRegisteredEmail(data.email);
      setShowSuccessModal(true);
      
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

          <View style={styles.countrySection}>
            <Text style={styles.countryLabel}>{i18n.locale === 'fr' ? 'Pays' : 'Country'}</Text>
            <View style={styles.countrySelector}>
              <TouchableOpacity 
                style={[styles.countryButton, country === 'ivory_coast' && styles.countryButtonActive]} 
                onPress={() => setCountry('ivory_coast')}
              >
                <Text style={styles.countryFlag}>CI</Text>
                <Text style={[styles.countryButtonText, country === 'ivory_coast' && styles.countryButtonTextActive]}>
                  {i18n.locale === 'fr' ? "Côte d'Ivoire" : "Ivory Coast"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.countryButton, country === 'senegal' && styles.countryButtonActive]} 
                onPress={() => setCountry('senegal')}
              >
                <Text style={styles.countryFlag}>SN</Text>
                <Text style={[styles.countryButtonText, country === 'senegal' && styles.countryButtonTextActive]}>
                  {i18n.locale === 'fr' ? "Sénégal" : "Senegal"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <LocationPicker
            latitude={location?.latitude || selectedCountry.latitude}
            longitude={location?.longitude || selectedCountry.longitude}
            onLocationSelect={handleLocationSelect}
            country={country}
            label={i18n.locale === 'fr' ? 'Votre emplacement' : 'Your Location'}
            placeholder={i18n.locale === 'fr' ? 'Appuyez pour sélectionner votre emplacement' : 'Tap to select your location'}
          />

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

            <View>
              <Text style={styles.phoneLabel}>
                {i18n.locale === 'fr' ? 'Numéro de téléphone' : 'Phone Number'}
              </Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefixBox}>
                  <Ionicons name="call-outline" size={16} color={Colors.dark.primary} />
                  <Text style={styles.phonePrefixText}>{selectedCountry.phonePrefix}</Text>
                  <Ionicons name="lock-closed" size={12} color={Colors.dark.textSecondary} />
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneLocal}
                  onChangeText={setPhoneLocal}
                  placeholder="XX XX XX XX"
                  placeholderTextColor={Colors.dark.textSecondary}
                  keyboardType="phone-pad"
                  testID="phone-local-input"
                />
              </View>
            </View>

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

      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleGoToLogin}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="mail-outline" size={48} color={Colors.dark.primary} />
            </View>
            
            <Text style={styles.modalTitle}>
              {i18n.locale === 'fr' ? 'Compte créé avec succès !' : 'Account Created Successfully!'}
            </Text>
            
            <Text style={styles.modalMessage}>
              {i18n.locale === 'fr' 
                ? 'Un email de vérification a été envoyé à :'
                : 'A verification email has been sent to:'}
            </Text>
            
            <Text style={styles.emailText}>{registeredEmail}</Text>
            
            <Text style={styles.modalInstructions}>
              {i18n.locale === 'fr'
                ? 'Veuillez vérifier votre boîte de réception et cliquer sur le lien de vérification pour activer votre compte.'
                : 'Please check your inbox and click the verification link to activate your account.'}
            </Text>
            
            <View style={styles.spamNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.dark.textSecondary} />
              <Text style={styles.spamNoteText}>
                {i18n.locale === 'fr'
                  ? "Si vous ne trouvez pas l'email, vérifiez votre dossier spam."
                  : "If you don't see the email, check your spam folder."}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleGoToLogin}>
              <Text style={styles.modalButtonText}>
                {i18n.locale === 'fr' ? 'Aller à la connexion' : 'Go to Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  roleSelector: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  roleButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center' },
  roleButtonActive: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  roleButtonText: { fontSize: 14, fontWeight: '600', color: Colors.dark.textSecondary },
  roleButtonTextActive: { color: Colors.dark.background },
  countrySection: { marginBottom: 24 },
  countryLabel: { fontSize: 14, fontWeight: '600', color: Colors.dark.text, marginBottom: 8 },
  countrySelector: { flexDirection: 'row', gap: 12 },
  countryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.border, gap: 8 },
  countryButtonActive: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  countryFlag: { fontSize: 20 },
  countryButtonText: { fontSize: 13, fontWeight: '600', color: Colors.dark.textSecondary },
  countryButtonTextActive: { color: Colors.dark.background },
  form: { gap: 16, marginBottom: 24 },
  phoneLabel: { fontSize: 14, fontWeight: '600', color: Colors.dark.text, marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    backgroundColor: Colors.dark.card,
    overflow: 'hidden',
  },
  phonePrefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: `${Colors.dark.primary}15`,
    borderRightWidth: 1,
    borderRightColor: Colors.dark.border,
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.dark.text,
  },
  signupButton: { marginBottom: 24 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  loginText: { color: Colors.dark.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.dark.primary, fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInstructions: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  spamNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.textSecondary + '15',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  spamNoteText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  modalButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: '600',
  },
});