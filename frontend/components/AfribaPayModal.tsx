import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { afribaPayAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

type Rail = 'orange_money' | 'wave';
type Status = 'idle' | 'submitting' | 'awaiting_user' | 'success' | 'failed';

interface Props {
  visible: boolean;
  onClose: () => void;
  task: { id: string; total_cost?: number; estimated_cost?: number; title?: string } | null;
  onPaymentSuccess: () => void;
}

const POLL_INTERVAL_MS = 4000;
const TIMEOUT_MS = 180_000; // 3 minutes

export function AfribaPayModal({ visible, onClose, task, onPaymentSuccess }: Props) {
  const { user } = useAuth();
  const isFr = i18n.locale === 'fr';

  const [rail, setRail] = useState<Rail>('orange_money');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [needsOtp, setNeedsOtp] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [providerLink, setProviderLink] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const amount = task?.total_cost ?? task?.estimated_cost ?? 0;

  // Prefill phone from user profile on open
  useEffect(() => {
    if (visible && user?.phone) {
      const stripped = String(user.phone).replace(/^\+\d{1,3}/, '').replace(/\D/g, '');
      setPhone(stripped);
    }
  }, [visible]);

  // Reset state on close
  useEffect(() => {
    if (!visible) {
      stopPolling();
      setStatus('idle');
      setOrderId(null);
      setError('');
      setOtp('');
      setNeedsOtp(false);
      setProviderLink(null);
    }
  }, [visible]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  // Start polling once we have an orderId and status is awaiting_user
  useEffect(() => {
    if (status !== 'awaiting_user' || !orderId) return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await afribaPayAPI.getStatus(orderId);
        if (data.status === 'success') {
          stopPolling();
          setStatus('success');
          setTimeout(() => { onPaymentSuccess(); onClose(); }, 2000);
        } else if (['failed', 'cancelled', 'expired'].includes(data.status)) {
          stopPolling();
          setStatus('failed');
          setError(isFr
            ? 'Le paiement n\'a pas été complété. Veuillez réessayer.'
            : 'Payment was not completed. Please try again.');
        }
      } catch {
        // Keep polling on transient network errors
      }
    }, POLL_INTERVAL_MS);

    // 3-minute hard timeout
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setStatus('failed');
      setError(isFr ? 'Délai d\'attente dépassé. Réessayez.' : 'Timed out waiting for confirmation.');
    }, TIMEOUT_MS);

    return stopPolling;
  }, [status, orderId]);

  const handleSubmit = async () => {
    setError('');
    const phoneClean = phone.replace(/\D/g, '');

    if (phoneClean.length < 8) {
      setError(isFr ? 'Entrez un numéro valide' : 'Enter a valid phone number');
      return;
    }
    if (!amount || amount < 100) {
      setError(isFr ? 'Le montant minimum est 100 FCFA' : 'Amount must be at least 100 XOF');
      return;
    }
    if (!task) return;

    setStatus('submitting');
    try {
      const data = await afribaPayAPI.payin(
        task.id,
        rail,
        phoneClean,
        amount,
        needsOtp && otp ? otp : undefined,
      );
      setOrderId(data.order_id);
      if (data.status === 'success') {
        setStatus('success');
        setTimeout(() => { onPaymentSuccess(); onClose(); }, 2000);
      } else {
        // Wave (SN+CI) and Orange Money SN return a provider_link the user must open
        if (data.provider_link) {
          setProviderLink(data.provider_link);
          Linking.openURL(data.provider_link).catch(() => {});
        }
        setStatus('awaiting_user');
      }
    } catch (err: any) {
      const detail: string = err.response?.data?.detail || '';
      if (detail.toLowerCase().includes('otp')) {
        setNeedsOtp(true);
        setError(isFr
          ? 'Un code OTP est requis. Générez-en un depuis votre menu mobile money.'
          : 'An OTP is required. Generate one via your mobile-money menu.');
      } else if (detail.toLowerCase().includes('country')) {
        setError(isFr
          ? 'Veuillez définir votre pays dans les paramètres avant de payer.'
          : 'Please set your country in profile settings before paying.');
      } else {
        setError(detail || (isFr ? 'Échec du paiement. Réessayez.' : 'Payment failed. Try again.'));
      }
      setStatus('idle');
    }
  };

  const handleReset = () => {
    stopPolling();
    setStatus('idle');
    setOrderId(null);
    setError('');
    setOtp('');
    setNeedsOtp(false);
    setProviderLink(null);
  };

  const formattedAmount = amount
    ? `${amount.toLocaleString()} FCFA`
    : '—';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {isFr ? 'Payer maintenant' : 'Pay now'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {task?.title || (isFr ? 'Réservation' : 'Booking')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {/* Amount */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>
                {isFr ? 'Montant à payer' : 'Amount due'}
              </Text>
              <Text style={styles.amountValue}>{formattedAmount}</Text>
            </View>

            {/* Success state */}
            {status === 'success' && (
              <View style={styles.stateCard}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.dark.success} />
                <Text style={styles.stateTitle}>
                  {isFr ? 'Paiement confirmé' : 'Payment confirmed'}
                </Text>
                <Text style={styles.stateBody}>
                  {isFr ? 'Votre réservation est maintenant active.' : 'Your booking is now active.'}
                </Text>
              </View>
            )}

            {/* Awaiting confirmation state */}
            {status === 'awaiting_user' && (
              <View style={styles.stateCard}>
                <ActivityIndicator size="large" color={Colors.dark.primary} />
                <Text style={styles.stateTitle}>
                  {isFr ? 'Vérifiez votre téléphone' : 'Check your phone'}
                </Text>
                <Text style={styles.stateBody}>
                  {!!providerLink
                    ? (isFr
                        ? 'Votre navigateur vient de s\'ouvrir. Approuvez le paiement, puis revenez ici.'
                        : 'Your browser just opened. Approve the payment there, then come back here.')
                    : (isFr
                        ? 'Un message USSD va apparaître sur votre téléphone. Confirmez le paiement.'
                        : 'A USSD prompt will appear on your phone. Confirm the payment there.')}
                </Text>
                {!!providerLink && (
                  <TouchableOpacity style={styles.reopenLinkButton} onPress={() => providerLink && Linking.openURL(providerLink).catch(() => {})}>
                    <Ionicons name="open-outline" size={14} color={Colors.dark.primary} />
                    <Text style={styles.reopenLinkText}>
                      {isFr ? 'Rouvrir le lien' : 'Re-open link'}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.waitingHint}>
                  {isFr ? 'En attente de confirmation…' : 'Waiting for confirmation…'}
                </Text>
              </View>
            )}

            {/* Failed state */}
            {status === 'failed' && (
              <View style={styles.stateCard}>
                <Ionicons name="close-circle" size={48} color={Colors.dark.error} />
                <Text style={[styles.stateTitle, { color: Colors.dark.error }]}>
                  {isFr ? 'Paiement échoué' : 'Payment failed'}
                </Text>
                <Text style={styles.stateBody}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleReset}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.retryButtonText}>
                    {isFr ? 'Réessayer' : 'Try again'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Form — shown only in idle / submitting */}
            {(status === 'idle' || status === 'submitting') && (
              <>
                {/* Rail picker */}
                <Text style={styles.sectionLabel}>
                  {isFr ? 'Méthode de paiement' : 'Payment method'}
                </Text>
                <View style={styles.railRow}>
                  {(['orange_money', 'wave'] as Rail[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.railChip, rail === r && styles.railChipActive]}
                      onPress={() => setRail(r)}
                      disabled={status === 'submitting'}
                    >
                      <Text style={[styles.railChipText, rail === r && styles.railChipTextActive]}>
                        {r === 'orange_money' ? 'Orange Money' : 'Wave'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Phone input */}
                <Text style={styles.sectionLabel}>
                  {isFr ? 'Numéro mobile money' : 'Mobile-money phone number'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder={isFr ? 'Chiffres locaux uniquement' : 'Local digits only — no country code'}
                  placeholderTextColor={Colors.dark.textSecondary}
                  maxLength={15}
                  editable={status !== 'submitting'}
                />

                {/* OTP field (only if backend asked for one) */}
                {needsOtp && (
                  <>
                    <Text style={styles.sectionLabel}>
                      {isFr ? 'Code OTP (depuis le menu Orange Money)' : 'OTP code (from Orange Money menu)'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      placeholder="1234"
                      placeholderTextColor={Colors.dark.textSecondary}
                      maxLength={8}
                      editable={status !== 'submitting'}
                    />
                    <Text style={styles.otpHint}>
                      {isFr
                        ? 'Un code OTP est requis. Générez-en un depuis votre menu mobile money.'
                        : 'An OTP is required. Generate one via your mobile-money menu.'}
                    </Text>
                  </>
                )}

                {/* Error */}
                {!!error && status === 'idle' && (
                  <View style={styles.errorBox}>
                    <Ionicons name="warning" size={14} color={Colors.dark.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.payButton, status === 'submitting' && styles.payButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={status === 'submitting'}
                  activeOpacity={0.8}
                >
                  {status === 'submitting'
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="lock-closed" size={16} color="#fff" />}
                  <Text style={styles.payButtonText}>
                    {status === 'submitting'
                      ? (isFr ? 'Initialisation…' : 'Initiating…')
                      : (isFr ? `Payer ${formattedAmount}` : `Pay ${formattedAmount}`)}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.secureHint}>
                  <Ionicons name="lock-closed-outline" size={11} color={Colors.dark.textSecondary} />
                  {isFr ? ' Paiement sécurisé via AfribaPay' : ' Secured by AfribaPay'}
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  body: {
    paddingBottom: 8,
  },
  amountCard: {
    backgroundColor: `${Colors.dark.primary}15`,
    borderWidth: 1,
    borderColor: `${Colors.dark.primary}30`,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark.primary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  railRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  railChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
  },
  railChipActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: `${Colors.dark.primary}18`,
  },
  railChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  railChipTextActive: {
    color: Colors.dark.primary,
  },
  input: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 20,
  },
  otpHint: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: -14,
    marginBottom: 20,
    lineHeight: 18,
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
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.error,
    lineHeight: 18,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secureHint: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },

  // State screens (awaiting / success / failed)
  stateCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
    textAlign: 'center',
  },
  stateBody: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  waitingHint: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 8,
  },
  reopenLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  reopenLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
