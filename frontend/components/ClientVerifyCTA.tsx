import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

type Status = 'pending' | 'approved' | 'rejected' | 'not_submitted' | null | undefined;

interface Props {
  status: Status;
  isVerified: boolean;
  rejectionReason?: string | null;
}

export function ClientVerifyCTA({ status, isVerified, rejectionReason }: Props) {
  if (isVerified || status === 'approved') return null;

  const isFr = i18n.locale === 'fr';
  const goVerify = () => router.push('/verification');

  if (status === 'rejected') {
    return (
      <Pressable onPress={goVerify} style={[styles.card, styles.cardError]} testID="client-verify-rejected">
        <View style={styles.row}>
          <Ionicons name="close-circle" size={22} color={Colors.dark.error} />
          <Text style={styles.titleErr}>
            {isFr ? 'Vérification rejetée' : 'Verification rejected'}
          </Text>
        </View>
        {rejectionReason ? (
          <Text style={styles.reason}>{rejectionReason}</Text>
        ) : null}
        <Text style={styles.body}>
          {isFr
            ? "Vous n'apparaissez pas comme client vérifié. Soumettez à nouveau pour continuer."
            : "You're not showing as a verified client. Resubmit to continue."}
        </Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isFr ? 'Soumettre à nouveau' : 'Resubmit verification'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
      </Pressable>
    );
  }

  if (status === 'pending') {
    return (
      <View style={[styles.card, styles.cardPending]} testID="client-verify-pending">
        <View style={styles.row}>
          <Ionicons name="time-outline" size={22} color="#f59e0b" />
          <Text style={styles.titleAmber}>
            {isFr ? "Vérification en cours d'examen" : 'Verification under review'}
          </Text>
        </View>
        <Text style={styles.body}>
          {isFr
            ? "Nous examinons vos documents — généralement dans les 24-48 heures. Votre profil sera visible une fois approuvé."
            : "We're reviewing your documents — usually within 24-48 hours. You'll be verified once approved."}
        </Text>
      </View>
    );
  }

  // not_submitted or null — friendly invitation (not urgent warning)
  return (
    <Pressable onPress={goVerify} style={[styles.card, styles.cardCta]} testID="client-verify-cta">
      <View style={styles.row}>
        <Ionicons name="star" size={22} color="#f59e0b" />
        <Text style={styles.titleAmber}>
          {isFr ? 'Soyez vérifié — gagnez la confiance des Pros' : 'Get Verified — Build Trust with Pros'}
        </Text>
      </View>
      <Text style={styles.body}>
        {isFr
          ? "Les clients vérifiés sont prioritaires auprès des Pros et débloquent des réservations à valeur plus élevée. Cela ne prend qu'une minute."
          : "Verified clients get priority service from Pros and access to higher-value bookings. It only takes a minute."}
      </Text>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>
          {isFr ? 'Vérifier mon identité' : 'Verify Identity'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginHorizontal: 20, marginBottom: 16, borderWidth: 1 },
  cardCta: { backgroundColor: '#78350f25', borderColor: '#f59e0b' },
  cardError: { backgroundColor: '#7f1d1d30', borderColor: Colors.dark.error },
  cardPending: { backgroundColor: '#78350f20', borderColor: '#f59e0b' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  titleErr: { color: '#fca5a5', fontSize: 15, fontWeight: '700', flex: 1 },
  titleAmber: { color: '#fbbf24', fontSize: 15, fontWeight: '700', flex: 1 },
  body: { color: Colors.dark.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  reason: { color: Colors.dark.error, fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
