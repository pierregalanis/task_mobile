import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

interface Props {
  user?: {
    is_identity_verified?: boolean;
    verification?: { status?: string };
    role?: string;
  } | null;
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ user, size = 'md' }: Props) {
  if (!user) return null;

  const verified =
    user.is_identity_verified === true || user.verification?.status === 'approved';
  if (!verified) return null;

  const isFr = i18n.locale === 'fr';
  const isSm = size === 'sm';

  const label =
    user.role === 'client'
      ? (isFr ? 'Client vérifié' : 'Verified Client')
      : (isFr ? 'Vérifié' : 'Verified');

  return (
    <View style={[styles.badge, isSm && styles.badgeSm]} testID="verified-badge">
      <Ionicons name="shield-checkmark" size={isSm ? 11 : 13} color={Colors.dark.primary} />
      <Text style={[styles.text, isSm && styles.textSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: `${Colors.dark.primary}25`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { color: Colors.dark.primary, fontSize: 11, fontWeight: '700' },
  textSm: { fontSize: 10 },
});
