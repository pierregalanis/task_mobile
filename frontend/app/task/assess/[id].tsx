import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { taskAPI, assessmentAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../../constants/Colors';
import i18n from '../../../utils/i18n';
import { showMessage } from '../../../utils/alert';
import { formatPrice } from '../../../utils/pricingUtils';
import { Button } from '../../../components/Button';

type AssessMode = 'certify' | 'adjust' | 'decline' | null;

export default function AssessWorkScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [mode, setMode] = useState<AssessMode>(null);
  const [proposedPrice, setProposedPrice] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const isTasker = user?.role === 'tasker';
  const isFr = i18n.locale === 'fr';

  // ============ LOAD TASK ============
  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const data = await taskAPI.getTask(id as string);
      setTask(data);
    } catch (error: any) {
      console.error('Failed to load task:', error);
      showMessage(
        isFr ? 'Erreur' : 'Error',
        isFr ? 'Impossible de charger la tâche' : 'Could not load task',
        () => router.back()
      );
    } finally {
      setLoading(false);
    }
  };

  // ============ DERIVED ============
  // Canonical price source — always total_cost first
  const originalPrice =
    task?.total_cost ??
    task?.estimated_total ??
    task?.agreed_price ??
    task?.budget ??
    0;

  // ============ PHOTOS ============
  const handleAddPhoto = async () => {
    if (photos.length >= 5) {
      showMessage(
        isFr ? 'Limite atteinte' : 'Limit reached',
        isFr ? 'Maximum 5 photos.' : 'Maximum 5 photos.'
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showMessage(
        isFr ? 'Permission refusée' : 'Permission denied',
        isFr
          ? "Activez l'accès à la caméra dans les paramètres."
          : 'Enable camera access in settings.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  // ============ SUBMIT ============
  const handleSubmit = async () => {
    if (!mode) return;

    // ---- Validation ----
    if (mode === 'adjust') {
      const price = parseInt(proposedPrice, 10);
      if (!price || isNaN(price)) {
        showMessage(
          isFr ? 'Prix invalide' : 'Invalid price',
          isFr ? 'Entrez un prix valide.' : 'Enter a valid price.'
        );
        return;
      }
      if (price <= originalPrice) {
        showMessage(
          isFr ? 'Prix invalide' : 'Invalid price',
          isFr
            ? `Le nouveau prix total doit être supérieur à ${formatPrice(originalPrice, i18n.locale)}.`
            : `New total price must be higher than ${formatPrice(originalPrice, i18n.locale)}.`
        );
        return;
      }
      if (!reason.trim()) {
        showMessage(
          isFr ? 'Raison requise' : 'Reason required',
          isFr
            ? 'Expliquez pourquoi vous demandez un ajustement.'
            : 'Explain why you are requesting an adjustment.'
        );
        return;
      }
    }

    if (mode === 'decline' && !reason.trim()) {
      showMessage(
        isFr ? 'Raison requise' : 'Reason required',
        isFr
          ? 'Indiquez pourquoi vous ne pouvez pas faire ce travail.'
          : 'Tell the client why you cannot do this job.'
      );
      return;
    }

    try {
      setActionLoading(true);

      // Upload photos first (only for adjust)
      if (mode === 'adjust' && photos.length > 0) {
        await assessmentAPI.uploadAssessmentPhotos(id as string, photos);
      }

      // Submit assessment
      if (mode === 'certify') {
        await assessmentAPI.submitAssessment(id as string, {
          action: 'certify',
          assessment_notes: notes.trim() || undefined,
        });
        showMessage(
          isFr ? 'Travail certifié' : 'Work certified',
          isFr
            ? 'Vous pouvez maintenant démarrer le minuteur.'
            : 'You can now start the timer.',
          () => router.replace(`/task/${id}`)
        );
      } else if (mode === 'adjust') {
        await assessmentAPI.submitAssessment(id as string, {
          action: 'request_adjustment',
          proposed_price: parseInt(proposedPrice, 10),
          adjustment_reason: reason.trim(),
          assessment_notes: notes.trim() || undefined,
        });
        showMessage(
          isFr ? 'Demande envoyée' : 'Request sent',
          isFr
            ? 'En attente de la réponse du client (24h).'
            : 'Waiting for client response (24h).',
          () => router.replace(`/task/${id}`)
        );
      } else if (mode === 'decline') {
        await assessmentAPI.submitAssessment(id as string, {
          action: 'decline',
          decline_reason: reason.trim(),
        });
        showMessage(
          isFr ? 'Tâche refusée' : 'Job declined',
          isFr ? 'Le client a été notifié.' : 'The client has been notified.',
          () => router.replace(`/task/${id}`)
        );
      }
    } catch (error: any) {
      console.error('Assessment submit failed:', error);
      showMessage(
        isFr ? 'Erreur' : 'Error',
        error?.response?.data?.detail ||
          (isFr ? "Échec de l'envoi." : 'Submission failed.')
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ============ GUARDS ============
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {isFr ? 'Tâche introuvable' : 'Task not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isTasker) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {isFr ? 'Réservé aux prestataires.' : 'Tasker only.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============ RENDER ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="assess-back-btn"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFr ? 'Évaluer le travail' : 'Assess Work'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <Text style={styles.intro}>
            {isFr
              ? 'Vous êtes arrivé chez le client. Confirmez que le travail correspond à la description.'
              : 'You have arrived at the client. Confirm whether the job matches the description.'}
          </Text>

          {/* Task summary card */}
          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            {task.description ? (
              <Text style={styles.taskDesc}>{task.description}</Text>
            ) : null}

            {/* Price breakdown — branches on price_type */}
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>
                {task?.price_type === 'flat'
                  ? isFr
                    ? 'Prix fixe'
                    : 'Fixed price'
                  : isFr
                  ? 'Tarif horaire'
                  : 'Hourly rate'}
              </Text>
              {task?.price_type === 'flat' ? (
                <Text style={styles.priceValue}>
                  {formatPrice(originalPrice, i18n.locale)}
                </Text>
              ) : (
                <>
                  <Text style={styles.priceSub}>
                    {formatPrice(task?.hourly_rate ?? 0, i18n.locale)} ×{' '}
                    {task?.duration_hours ?? 0}
                    {isFr ? ' h' : 'h'}
                  </Text>
                  <Text style={styles.priceValue}>
                    {isFr ? 'Total : ' : 'Total: '}
                    {formatPrice(originalPrice, i18n.locale)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Action selection */}
          <Text style={styles.sectionTitle}>
            {isFr ? 'Choisir une action' : 'Choose an action'}
          </Text>

          {/* Certify */}
          <ActionCard
            icon="checkmark-circle"
            iconColor={Colors.dark.success}
            title={isFr ? 'Certifier le travail' : 'Certify the work'}
            subtitle={
              isFr
                ? 'Le travail correspond. Démarrer le minuteur.'
                : 'Work matches description. Start the timer.'
            }
            selected={mode === 'certify'}
            onPress={() => setMode('certify')}
            testID="assess-mode-certify"
          />

          {/* Adjust */}
          <ActionCard
            icon="cash-outline"
            iconColor="#f59e0b"
            title={isFr ? 'Demander un ajustement' : 'Request price adjustment'}
            subtitle={
              isFr
                ? 'Le travail est plus important que prévu.'
                : 'Scope is bigger than expected.'
            }
            selected={mode === 'adjust'}
            onPress={() => setMode('adjust')}
            testID="assess-mode-adjust"
          />

          {/* Decline */}
          <ActionCard
            icon="close-circle"
            iconColor={Colors.dark.error}
            title={isFr ? 'Refuser la tâche' : 'Decline the job'}
            subtitle={
              isFr
                ? 'Vous ne pouvez pas effectuer ce travail.'
                : 'You cannot complete this work.'
            }
            selected={mode === 'decline'}
            onPress={() => setMode('decline')}
            testID="assess-mode-decline"
          />

          {/* Adjust form */}
          {mode === 'adjust' && (
            <View style={styles.formBlock}>
              <Text style={styles.label}>
                {isFr ? 'Nouveau prix TOTAL (CFA)' : 'New TOTAL price (CFA)'} *
              </Text>
              <Text style={styles.helper}>
                {isFr
                  ? 'Montant total final, pas un tarif horaire.'
                  : 'Final total amount, not an hourly rate.'}
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={proposedPrice}
                onChangeText={setProposedPrice}
                placeholder={
                  isFr
                    ? `Doit être supérieur à ${formatPrice(originalPrice, i18n.locale)}`
                    : `Must be higher than ${formatPrice(originalPrice, i18n.locale)}`
                }
                placeholderTextColor={Colors.dark.textSecondary}
                testID="assess-price-input"
              />

              <Text style={styles.label}>
                {isFr ? "Raison de l'ajustement" : 'Reason for adjustment'} *
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                multiline
                value={reason}
                onChangeText={setReason}
                placeholder={
                  isFr
                    ? "Ex: 3 pièces au lieu d'une seule."
                    : 'e.g. 3 rooms instead of just one.'
                }
                placeholderTextColor={Colors.dark.textSecondary}
                testID="assess-reason-input"
              />

              {/* Photos */}
              <Text style={styles.label}>
                {isFr ? 'Photos (max 5)' : 'Photos (max 5)'}
              </Text>
              <Text style={styles.helper}>
                {isFr
                  ? 'Recommandé pour appuyer votre demande.'
                  : 'Recommended to support your request.'}
              </Text>

              <View style={styles.photoGrid}>
                {photos.map((uri) => (
                  <View key={uri} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => handleRemovePhoto(uri)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 5 && (
                  <TouchableOpacity
                    style={styles.photoAdd}
                    onPress={handleAddPhoto}
                    testID="assess-add-photo"
                  >
                    <Ionicons
                      name="camera"
                      size={28}
                      color={Colors.dark.textSecondary}
                    />
                    <Text style={styles.photoAddText}>
                      {isFr ? 'Ajouter' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Decline form */}
          {mode === 'decline' && (
            <View style={styles.formBlock}>
              <Text style={styles.label}>
                {isFr ? 'Raison du refus' : 'Reason for declining'} *
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                multiline
                value={reason}
                onChangeText={setReason}
                placeholder={
                  isFr
                    ? 'Soyez respectueux — le client verra ce message.'
                    : 'Be respectful — the client will see this.'
                }
                placeholderTextColor={Colors.dark.textSecondary}
                testID="assess-decline-reason"
              />
            </View>
          )}

          {/* Optional notes */}
          {mode && (
            <View style={styles.formBlock}>
              <Text style={styles.label}>
                {isFr ? 'Notes (optionnel)' : 'Notes (optional)'}
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor={Colors.dark.textSecondary}
                testID="assess-notes-input"
              />
            </View>
          )}

          {/* Submit */}
          <View style={{ marginTop: 24 }}>
            <Button
              title={
                actionLoading
                  ? ''
                  : mode === 'certify'
                  ? isFr
                    ? 'Certifier et démarrer'
                    : 'Certify & Start'
                  : mode === 'adjust'
                  ? isFr
                    ? 'Envoyer la demande'
                    : 'Send Request'
                  : mode === 'decline'
                  ? isFr
                    ? 'Refuser la tâche'
                    : 'Decline Job'
                  : isFr
                  ? 'Sélectionnez une action'
                  : 'Select an action'
              }
              onPress={handleSubmit}
              disabled={!mode || actionLoading}
              testID="assess-submit-btn"
            />
            {actionLoading && (
              <View style={styles.loaderOverlay} pointerEvents="none">
                <ActivityIndicator color={Colors.dark.background} />
              </View>
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ ACTION CARD ============
function ActionCard({
  icon,
  iconColor,
  title,
  subtitle,
  selected,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        selected && { borderColor: iconColor, borderWidth: 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
    >
      <Ionicons name={icon} size={28} color={iconColor} />
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      {selected && <Ionicons name="checkmark" size={22} color={iconColor} />}
    </TouchableOpacity>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: {
    padding: 16,
  },
  intro: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  taskCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 24,
  },
  taskTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  taskDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  priceBlock: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  priceLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  priceSub: {
    color: Colors.dark.text,
    fontSize: 14,
    marginBottom: 4,
  },
  priceValue: {
    color: Colors.dark.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 12,
  },
  actionTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  actionTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  formBlock: {
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  helper: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginBottom: 10,
    marginTop: -4,
  },
  input: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 15,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  photoWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});