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

export default function ResendVerificationScreen() {
  const router = useRouter();
  const { email: prefilled } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(prefilled ?? '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const isFr = i18n.locale === 'fr';

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      showMessage(
        isFr ? 'Erreur' : 'Error',
        isFr ? 'Veuillez entrer un email valide' : 'Please enter a valid email'
      );
      return;
    }
    try {
      setLoading(true);
      await authAPI.resendVerification(email);
      setSent(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      showMessage(
        isFr ? 'Erreur' : 'Error',
        detail || (isFr ? 'Une erreur est survenue' : 'An error occurred')
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>

          {sent ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="mail-open-outline" size={72} color={Colors.dark.primary} />
              </View>
              <Text style={styles.title}>
                {isFr ? 'Email envoyé !' : 'Email Sent!'}
              </Text>
              <Text style={styles.description}>
                {isFr
                  ? `Un lien de vérification a été envoyé à ${email}. Vérifiez votre boîte de réception (et vos spams).`
                  : `A verification link was sent to ${email}. Check your inbox (and spam folder).`}
              </Text>
              <Button
                title={isFr ? 'Retour à la connexion' : 'Back to Login'}
                onPress={() => router.replace('/(auth)/login')}
                style={styles.button}
              />
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {isFr ? 'Renvoyer la vérification' : 'Resend Verification'}
                </Text>
                <Text style={styles.description}>
                  {isFr
                    ? "Entrez votre adresse email et nous vous renverrons le lien d'activation."
                    : "Enter your email and we'll resend the activation link."}
                </Text>
              </View>

              <Input
                label={isFr ? 'Adresse email' : 'Email address'}
                placeholder={isFr ? 'votre@email.com' : 'your@email.com'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.dark.textSecondary} />}
              />

              <Button
                title={isFr ? 'Renvoyer le lien' : 'Resend Link'}
                onPress={handleSend}
                loading={loading}
                style={styles.button}
              />

              <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.loginLinkText}>
                  {isFr ? 'Retour à la connexion' : 'Back to Login'}
                </Text>
              </TouchableOpacity>
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
  button: { marginTop: 24 },
  loginLink: { alignSelf: 'center', marginTop: 20, paddingVertical: 8 },
  loginLinkText: { color: Colors.dark.primary, fontSize: 14, fontWeight: '600' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 16 },
  successIcon: { marginBottom: 8 },
});
