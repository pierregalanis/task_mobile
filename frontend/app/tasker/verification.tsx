import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { verificationAPI, VerificationStatus } from '../../services/api';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';

const ID_TYPES = [
  { value: 'national_id', en: 'National ID Card', fr: "Carte d'Identite Nationale" },
  { value: 'passport', en: 'Passport', fr: 'Passeport' },
  { value: 'drivers_license', en: "Driver's License", fr: 'Permis de Conduire' },
];

export default function VerificationScreen() {
  const router = useRouter();
  const isFrench = i18n.locale === 'fr';
  const colors = Colors.dark;

  // Status
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);

  // Form
  const [idType, setIdType] = useState('national_id');
  const [idDocumentUri, setIdDocumentUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ID type picker
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);

  // Camera modal
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await verificationAPI.getStatus();
      setStatus(data);
    } catch (error: any) {
      console.error('Error loading verification status:', error);
      // If 404 or similar, assume not_submitted
      setStatus({
        status: 'not_submitted',
        is_verified: false,
        submitted_at: null,
        reviewed_at: null,
        rejection_reason: null,
        has_id_document: false,
        has_selfie: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== ID DOCUMENT (Gallery or Camera OK) ==========
  const handlePickIdDocument = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showMessage(
          isFrench ? 'Permission refusee' : 'Permission Denied',
          isFrench ? "Veuillez autoriser l'acces a la galerie" : 'Please allow access to your photo library'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        setIdDocumentUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking ID document:', error);
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? "Impossible de selectionner l'image" : 'Unable to select image'
      );
    }
  };

  // ========== LIVE SELFIE (Camera ONLY - NO GALLERY) ==========
  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        showMessage(
          isFrench ? 'Permission refusee' : 'Camera Permission Required',
          isFrench
            ? "Veuillez autoriser l'acces a la camera dans les parametres"
            : 'Please allow camera access in your device settings'
        );
        return;
      }
    }
    setCapturedPhoto(null);
    setShowCamera(true);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: Platform.OS === 'android',
      });
      if (photo?.uri) {
        setCapturedPhoto(photo.uri);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Echec de la capture' : 'Failed to capture photo'
      );
    } finally {
      setCapturing(false);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
  };

  const handleConfirmPhoto = () => {
    if (capturedPhoto) {
      setSelfieUri(capturedPhoto);
      setShowCamera(false);
      setCapturedPhoto(null);
    }
  };

  // ========== SUBMIT ==========
  const handleSubmit = async () => {
    if (!idDocumentUri || !selfieUri) {
      showMessage(
        isFrench ? 'Documents requis' : 'Documents Required',
        isFrench
          ? "Veuillez fournir le document d'identite et le selfie en direct"
          : 'Please provide both ID document and live selfie'
      );
      return;
    }

    try {
      setSubmitting(true);
      const isResubmit = status?.status === 'rejected';
      
      if (isResubmit) {
        await verificationAPI.resubmit(idDocumentUri, selfieUri, idType);
      } else {
        await verificationAPI.submit(idDocumentUri, selfieUri, idType);
      }

      showMessage(
        isFrench ? 'Soumis!' : 'Submitted!',
        isFrench
          ? 'Verification soumise! Examen dans 24-48 heures.'
          : 'Verification submitted! Review in 24-48 hours.'
      );

      // Reload status
      await loadStatus();
    } catch (error: any) {
      const detail = error.response?.data?.detail || '';
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        detail || (isFrench ? 'Echec de la soumission. Veuillez reessayer.' : 'Submission failed. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ========== RENDER: LOADING ==========
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="verification-back-btn">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isFrench ? "Verification d'Identite" : 'Identity Verification'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ========== RENDER: APPROVED STATUS ==========
  if (status?.status === 'approved' || status?.is_verified) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="verification-back-btn">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isFrench ? "Verification d'Identite" : 'Identity Verification'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centeredContent}>
          <View style={[styles.statusIconCircle, { backgroundColor: '#10b98120' }]}>
            <Ionicons name="shield-checkmark" size={64} color={colors.success} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.success }]}>
            {isFrench ? 'Vous etes Verifie!' : "You're Verified!"}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            {isFrench
              ? 'Votre identite a ete verifiee. Vous avez le badge verifie et pouvez recevoir des reservations.'
              : 'Your identity has been verified. You now have a verified badge and can receive bookings.'}
          </Text>
          {status?.reviewed_at && (
            <Text style={[styles.statusDate, { color: colors.textSecondary }]}>
              {isFrench ? 'Approuve le' : 'Approved on'} {new Date(status.reviewed_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ========== RENDER: PENDING STATUS ==========
  if (status?.status === 'pending') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="verification-back-btn">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isFrench ? "Verification d'Identite" : 'Identity Verification'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centeredContent}>
          <View style={[styles.statusIconCircle, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="hourglass" size={64} color="#3b82f6" />
          </View>
          <Text style={[styles.statusTitle, { color: '#3b82f6' }]}>
            {isFrench ? 'Verification en Cours' : 'Verification In Progress'}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            {isFrench
              ? "L'examen prend 24-48 heures. Votre profil sera visible une fois approuve."
              : 'Review takes 24-48 hours. Your profile will be visible once approved.'}
          </Text>
          {status?.submitted_at && (
            <Text style={[styles.statusDate, { color: colors.textSecondary }]}>
              {isFrench ? 'Soumis le' : 'Submitted on'} {new Date(status.submitted_at).toLocaleDateString()}
            </Text>
          )}
          <View style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.checklistRow}>
              <Ionicons name={status.has_id_document ? 'checkmark-circle' : 'close-circle'} size={20} color={status.has_id_document ? colors.success : colors.error} />
              <Text style={[styles.checklistText, { color: colors.text }]}>
                {isFrench ? "Document d'identite" : 'ID Document'}
              </Text>
            </View>
            <View style={styles.checklistRow}>
              <Ionicons name={status.has_selfie ? 'checkmark-circle' : 'close-circle'} size={20} color={status.has_selfie ? colors.success : colors.error} />
              <Text style={[styles.checklistText, { color: colors.text }]}>
                {isFrench ? 'Selfie en direct' : 'Live Selfie'}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ========== RENDER: FORM (not_submitted or rejected) ==========
  const isRejected = status?.status === 'rejected';
  const selectedIdType = ID_TYPES.find(t => t.value === idType);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="verification-back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isFrench ? "Verification d'Identite" : 'Identity Verification'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Rejection Banner */}
        {isRejected && (
          <View style={[styles.rejectionBanner, { backgroundColor: '#ef444420', borderColor: '#ef444460' }]}>
            <Ionicons name="alert-circle" size={22} color={colors.error} />
            <View style={styles.rejectionTextContainer}>
              <Text style={[styles.rejectionTitle, { color: colors.error }]}>
                {isFrench ? 'Verification Rejetee' : 'Verification Rejected'}
              </Text>
              {status?.rejection_reason && (
                <Text style={[styles.rejectionReason, { color: colors.textSecondary }]}>
                  {isFrench ? 'Raison' : 'Reason'}: {status.rejection_reason}
                </Text>
              )}
              <Text style={[styles.rejectionHint, { color: colors.textSecondary }]}>
                {isFrench ? 'Veuillez resoumettre avec de nouveaux documents.' : 'Please resubmit with new documents.'}
              </Text>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
          <Ionicons name="information-circle" size={22} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            {isFrench
              ? 'La verification aide a etablir la confiance avec les clients et debloque plus de reservations.'
              : 'Verification helps build trust with clients and unlocks more bookings.'}
          </Text>
        </View>

        {/* ID Type Selector */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {isFrench ? 'Type de Document' : 'ID Document Type'}
        </Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowIdTypePicker(true)}
          data-testid="id-type-selector"
        >
          <Ionicons name="document-text" size={20} color={colors.primary} />
          <Text style={[styles.selectorText, { color: colors.text }]}>
            {isFrench ? selectedIdType?.fr : selectedIdType?.en}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* ID Document Upload */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {isFrench ? "Document d'Identite (Recto)" : 'ID Document (Front)'}
        </Text>
        <TouchableOpacity
          style={[
            styles.uploadBox,
            {
              backgroundColor: colors.card,
              borderColor: idDocumentUri ? colors.success : colors.border,
            },
          ]}
          onPress={handlePickIdDocument}
          data-testid="id-document-upload"
        >
          {idDocumentUri ? (
            <Image source={{ uri: idDocumentUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="cloud-upload" size={40} color={colors.textSecondary} />
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                {isFrench ? "Appuyez pour telecharger l'ID" : 'Tap to upload ID'}
              </Text>
              <Text style={[styles.uploadHint, { color: colors.border }]}>
                {isFrench ? 'Camera ou Galerie' : 'Camera or Gallery'}
              </Text>
            </View>
          )}
          {idDocumentUri && (
            <View style={[styles.changeOverlay]}>
              <Ionicons name="swap-horizontal" size={16} color="#fff" />
              <Text style={styles.changeText}>{isFrench ? 'Changer' : 'Change'}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Live Selfie Capture */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {isFrench ? 'Selfie en Direct avec ID' : 'Live Selfie with ID'}
        </Text>
        <TouchableOpacity
          style={[
            styles.uploadBox,
            {
              backgroundColor: colors.card,
              borderColor: selfieUri ? colors.success : colors.border,
            },
          ]}
          onPress={handleOpenCamera}
          data-testid="selfie-capture-btn"
        >
          {selfieUri ? (
            <>
              <Image source={{ uri: selfieUri }} style={styles.previewImage} />
              <View style={styles.liveBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
                <Text style={styles.liveBadgeText}>Live</Text>
              </View>
              <View style={[styles.changeOverlay]}>
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={styles.changeText}>{isFrench ? 'Reprendre' : 'Retake'}</Text>
              </View>
            </>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="camera" size={40} color={colors.textSecondary} />
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                {isFrench ? 'Appuyez pour ouvrir la camera' : 'Tap to open camera'}
              </Text>
              <View style={[styles.liveRequiredBadge, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="videocam" size={14} color="#f59e0b" />
                <Text style={[styles.liveRequiredText, { color: '#f59e0b' }]}>
                  {isFrench ? 'Photo en direct requise' : 'Live photo required'}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b30' }]}>
          <Text style={[styles.tipsTitle, { color: '#f59e0b' }]}>
            {isFrench ? "Conseils pour l'approbation:" : 'Tips for approval:'}
          </Text>
          <View style={styles.tipRow}>
            <Ionicons name="sunny" size={14} color="#f59e0b" />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {isFrench ? 'Assurez un bon eclairage' : 'Ensure good lighting'}
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="eye" size={14} color="#f59e0b" />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {isFrench ? "Le texte de l'ID doit etre lisible" : 'ID text must be readable'}
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="person" size={14} color="#f59e0b" />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {isFrench ? 'Visage clairement visible' : 'Face clearly visible in selfie'}
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="hand-left" size={14} color="#f59e0b" />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {isFrench ? "Tenez l'ID a cote de votre visage" : 'Hold ID next to your face'}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: idDocumentUri && selfieUri && !submitting ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSubmit}
          disabled={!idDocumentUri || !selfieUri || submitting}
          data-testid="verification-submit-btn"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isRejected
                  ? (isFrench ? 'Resoumettre pour Verification' : 'Resubmit for Verification')
                  : (isFrench ? 'Soumettre pour Verification' : 'Submit for Verification')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ========== ID TYPE PICKER MODAL ========== */}
      <Modal visible={showIdTypePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIdTypePicker(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              {isFrench ? 'Type de Document' : 'ID Document Type'}
            </Text>
            {ID_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.pickerItem,
                  {
                    backgroundColor: idType === type.value ? `${colors.primary}20` : 'transparent',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setIdType(type.value);
                  setShowIdTypePicker(false);
                }}
              >
                <Ionicons
                  name={idType === type.value ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={idType === type.value ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.pickerItemText, { color: colors.text }]}>
                  {isFrench ? type.fr : type.en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========== LIVE CAMERA MODAL ========== */}
      <Modal visible={showCamera} animationType="slide" data-testid="camera-modal">
        <View style={styles.cameraContainer}>
          {capturedPhoto ? (
            // Preview captured photo
            <Image source={{ uri: capturedPhoto }} style={styles.cameraPreview} resizeMode="contain" />
          ) : (
            // Live camera
            <CameraView
              ref={cameraRef}
              style={styles.cameraPreview}
              facing="front"
            />
          )}

          {/* Face guide overlay (during capture only) */}
          {!capturedPhoto && (
            <View style={styles.faceGuideContainer} pointerEvents="none">
              <View style={styles.faceGuide} />
              <Text style={styles.faceGuideText}>
                {isFrench ? "Tenez votre ID a cote de votre visage" : 'Hold your ID next to your face'}
              </Text>
            </View>
          )}

          {/* Top bar */}
          <SafeAreaView style={styles.cameraTopBar} edges={['top']}>
            <TouchableOpacity
              onPress={() => {
                setShowCamera(false);
                setCapturedPhoto(null);
              }}
              style={styles.cameraCloseButton}
              data-testid="camera-close-btn"
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>
              {isFrench ? 'Selfie en Direct' : 'Take Live Selfie'}
            </Text>
            <View style={{ width: 44 }} />
          </SafeAreaView>

          {/* Bottom controls */}
          <SafeAreaView style={styles.cameraBottomBar} edges={['bottom']}>
            {capturedPhoto ? (
              <View style={styles.cameraActions}>
                <TouchableOpacity style={styles.cameraActionBtn} onPress={handleRetakePhoto} data-testid="selfie-retake-btn">
                  <View style={[styles.cameraActionCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="refresh" size={28} color="#fff" />
                  </View>
                  <Text style={styles.cameraActionLabel}>{isFrench ? 'Reprendre' : 'Retake'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cameraActionBtn} onPress={handleConfirmPhoto} data-testid="selfie-confirm-btn">
                  <View style={[styles.cameraActionCircle, { backgroundColor: colors.success }]}>
                    <Ionicons name="checkmark" size={28} color="#fff" />
                  </View>
                  <Text style={styles.cameraActionLabel}>{isFrench ? 'Utiliser' : 'Use Photo'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.captureContainer}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleCapturePhoto}
                  disabled={capturing}
                  data-testid="selfie-capture-shutter"
                >
                  <View style={styles.captureButtonInner}>
                    {capturing && <ActivityIndicator size="small" color="#333" />}
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // ===== Status Screens =====
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statusIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  statusDate: {
    fontSize: 13,
    marginTop: 8,
  },
  checklistCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    gap: 12,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checklistText: {
    fontSize: 15,
  },

  // ===== Rejection Banner =====
  rejectionBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  rejectionTextContainer: {
    flex: 1,
  },
  rejectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  rejectionReason: {
    fontSize: 13,
    marginBottom: 4,
  },
  rejectionHint: {
    fontSize: 12,
  },

  // ===== Info Card =====
  infoCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  // ===== Selector =====
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
  },

  // ===== Upload Box =====
  uploadBox: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
  },
  uploadHint: {
    fontSize: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  changeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  liveRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  liveRequiredText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ===== Tips =====
  tipsCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
  },

  // ===== Submit =====
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ===== ID Type Picker Modal =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  pickerModal: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickerItemText: {
    fontSize: 15,
  },

  // ===== Camera Modal =====
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPreview: {
    flex: 1,
  },
  faceGuideContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  faceGuideText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
    overflow: 'hidden',
  },
  cameraTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cameraCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
  },
  cameraActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  cameraActionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  cameraActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraActionLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
});