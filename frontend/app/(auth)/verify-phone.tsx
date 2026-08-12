import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/Button';
import i18n from '../../utils/i18n';
import { authAPI } from '../../services/api';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { identifier, maskedPhone: maskedPhoneParam, expiresInMinutes: expiresParam, autoSend } =
    useLocalSearchParams<{ identifier?: string; maskedPhone?: string; expiresInMinutes?: string; autoSend?: string }>();
  const isFr = i18n.locale === 'fr';

  const [maskedPhone, setMaskedPhone] = useState<string | null>(maskedPhoneParam ?? null);
  const [expiresInMinutes, setExpiresInMinutes] = useState(expiresParam ? Number(expiresParam) : 15);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(autoSend === 'true');
  const [resendCooldown, setResendCooldown] = useState(0);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoSend === 'true' && identifier) {
      sendCode();
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCode = async () => {
    if (!identifier) return;
    try {
      setSending(true);
      const response = await authAPI.resendPhoneCode(identifier);
      if (response.already_verified) {
        router.replace('/(auth)/login');
        return;
      }
      setMaskedPhone(response.masked_phone ?? null);
      if (response.expires_in_minutes) setExpiresInMinutes(response.expires_in_minutes);
      startCooldown();
    } catch (error: any) {
      if (error.response?.status === 429) {
        startCooldown();
      }
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!identifier) return;
    setCodeError('');
    if (!code || code.length !== 6) {
      setCodeError(isFr ? 'Veuillez entrer le code à 6 chiffres' : 'Please enter the 6-digit code');
      return;
    }
    try {
      setVerifying(true);
      const response = await authAPI.verifyPhoneCode(identifier, code);
      if (response.verified) {
        router.replace('/(auth)/login?verified=true&method=whatsapp');
      } else {
        setCodeError(isFr ? 'Code invalide ou expiré' : 'Invalid or expired code');
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        setCodeError(isFr
          ? 'Trop de tentatives. Renvoyez un nouveau code.'
          : 'Too many attempts. Please resend a new code.');
      } else {
        const detail = error.response?.data?.detail;
        setCodeError(detail || (isFr ? 'Code invalide ou expiré' : 'Invalid or expired code'));
      }
    } finally {
      setVerifying(false);
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
            <Text style={styles.title}>
              {isFr ? 'Vérifiez votre numéro' : 'Verify your number'}
            </Text>
            <Text style={styles.description}>
              {maskedPhone
                ? (isFr ? `Code envoyé au ${maskedPhone}` : `Code sent to ${maskedPhone}`)
                : (isFr
                    ? 'Un code a été envoyé par WhatsApp.'
                    : 'A code has been sent via WhatsApp.')}
            </Text>
            <Text style={styles.expiryHint}>
              {isFr ? `Le code expire dans ${expiresInMinutes} minutes` : `Code expires in ${expiresInMinutes} minutes`}
            </Text>
          </View>

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
              editable={!sending}
              testID="verify-phone-code-input"
            />
          </View>
          {!!codeError && (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={14} color={Colors.dark.error} />
              <Text style={styles.errorText}>{codeError}</Text>
            </View>
          )}

          <Button
            title={isFr ? 'Vérifier' : 'Verify'}
            onPress={handleVerify}
            loading={verifying}
            disabled={code.length !== 6 || sending}
            style={styles.verifyButton}
          />

          <TouchableOpacity
            style={styles.resendButton}
            onPress={sendCode}
            disabled={resendCooldown > 0 || sending}
            testID="verify-phone-resend-btn"
          >
            <Text style={[styles.resendText, (resendCooldown > 0 || sending) && styles.resendTextDisabled]}>
              {resendCooldown > 0
                ? (isFr ? `Renvoyer le code (${resendCooldown}s)` : `Resend code (${resendCooldown}s)`)
                : (isFr ? 'Renvoyer le code' : 'Resend code')}
            </Text>
          </TouchableOpacity>
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
  description: { fontSize: 15, color: Colors.dark.textSecondary, lineHeight: 22 },
  expiryHint: { fontSize: 12, color: Colors.dark.textSecondary, marginTop: 8 },
  codeInputContainer: { alignItems: 'center', marginVertical: 16 },
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
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.dark.error, lineHeight: 18 },
  verifyButton: { marginTop: 8 },
  resendButton: { alignSelf: 'center', paddingVertical: 16 },
  resendText: { color: Colors.dark.primary, fontSize: 14, fontWeight: '600' },
  resendTextDisabled: { color: Colors.dark.textSecondary },
});
