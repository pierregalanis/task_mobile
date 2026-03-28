import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
  Vibration,
  ScrollView,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { sosAPI, SOSResponse } from '../services/api';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

interface SOSButtonProps {
  taskId?: string;
  style?: any;
}

const HOLD_DURATION = 2000;
const TICK_INTERVAL = 50;
const BUTTON_SIZE = 60;
const RING_SIZE = 72;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DEFAULT_EMERGENCY_NUMBERS: Record<string, string> = {
  police: '110',
  police_emergency: '117',
  fire: '180',
  ambulance: '185',
};

export const SOSButton: React.FC<SOSButtonProps> = ({ taskId, style }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [sosResponse, setSosResponse] = useState<SOSResponse | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false);

  const triggerSOS = useCallback(async () => {
    setIsTriggering(true);
    Vibration.vibrate([0, 200, 100, 200, 100, 200]);

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        }
      } catch (locError) {
        console.warn('Could not get location for SOS:', locError);
      }

      const response = await sosAPI.triggerAlert({
        task_id: taskId,
        latitude,
        longitude,
        message: 'Emergency SOS triggered',
      });

      setSosResponse(response);
    } catch (error) {
      console.error('SOS API error:', error);
      setSosResponse(null);
    } finally {
      setIsTriggering(false);
      setIsHolding(false);
      setHoldProgress(0);
      setShowModal(true);
    }
  }, [taskId]);

  const startHold = useCallback(() => {
    hasTriggeredRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);
    Vibration.vibrate(50);

    holdTimerRef.current = setInterval(() => {
      setHoldProgress(prev => {
        const next = prev + (TICK_INTERVAL / HOLD_DURATION);
        if (next >= 1 && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          clearInterval(holdTimerRef.current!);
          triggerSOS();
          return 1;
        }
        return Math.min(next, 1);
      });
    }, TICK_INTERVAL);
  }, [triggerSOS]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  const callNumber = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const getEmergencyNumbers = () => {
    return sosResponse?.emergency_numbers || DEFAULT_EMERGENCY_NUMBERS;
  };

  const getEmergencyLabel = (key: string): string => {
    const isFr = i18n.locale === 'fr';
    const labels: Record<string, string> = {
      police: 'Police',
      police_emergency: isFr ? 'Police Urgence' : 'Police Emergency',
      fire: isFr ? 'Pompiers' : 'Fire Department',
      ambulance: isFr ? 'Ambulance' : 'Ambulance',
    };
    return labels[key] || key;
  };

  const getEmergencyIcon = (key: string): string => {
    const icons: Record<string, string> = {
      police: 'shield',
      police_emergency: 'shield',
      fire: 'flame',
      ambulance: 'medkit',
    };
    return icons[key] || 'call';
  };

  const strokeDashoffset = CIRCUMFERENCE * (1 - holdProgress);

  return (
    <>
      <TouchableWithoutFeedback onPressIn={startHold} onPressOut={cancelHold}>
        <View style={[styles.container, style]}>
          <View style={styles.progressRingWrapper}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke="rgba(239, 68, 68, 0.3)"
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke="#ef4444"
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </Svg>
          </View>

          <View style={[styles.button, isHolding && styles.buttonHolding]}>
            <Text style={styles.buttonText}>SOS</Text>
          </View>

          {!isHolding && (
            <Text style={styles.holdHint}>
              {i18n.locale === 'fr' ? 'Maintenir' : 'Hold'}
            </Text>
          )}
          {isHolding && (
            <Text style={styles.holdHint}>
              {Math.ceil((1 - holdProgress) * (HOLD_DURATION / 1000))}s
            </Text>
          )}
        </View>
      </TouchableWithoutFeedback>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.alertIconCircle}>
                <Ionicons name="warning" size={32} color="#fff" />
              </View>
              <Text style={styles.modalTitle}>
                {i18n.locale === 'fr' ? 'Alerte SOS Envoyee' : 'SOS Alert Sent'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {sosResponse
                  ? (i18n.locale === 'fr'
                    ? "Vos contacts d'urgence ont ete notifies."
                    : 'Your emergency contacts have been notified.')
                  : (i18n.locale === 'fr'
                    ? 'Impossible de contacter le serveur. Appelez les urgences directement.'
                    : 'Could not reach server. Call emergency services directly.')}
              </Text>
            </View>

            {sosResponse?.emergency_contacts && sosResponse.emergency_contacts.length > 0 && (
              <View style={styles.notifiedSection}>
                <Text style={styles.notifiedTitle}>
                  {i18n.locale === 'fr' ? 'Contacts notifies' : 'Notified Contacts'}
                </Text>
                {sosResponse.emergency_contacts.map((contact, idx) => (
                  <View key={idx} style={styles.notifiedContact}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.dark.success} />
                    <Text style={styles.notifiedName}>{contact.name}</Text>
                    <TouchableOpacity onPress={() => callNumber(contact.phone)} style={styles.callSmallBtn}>
                      <Ionicons name="call" size={16} color={Colors.dark.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <ScrollView style={styles.emergencySection} showsVerticalScrollIndicator={false}>
              <Text style={styles.emergencyTitle}>
                {i18n.locale === 'fr' ? 'Appeler les Urgences' : 'Call Emergency Services'}
              </Text>
              {Object.entries(getEmergencyNumbers()).map(([key, number]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.emergencyBtn}
                  onPress={() => callNumber(number)}
                  activeOpacity={0.7}
                >
                  <View style={styles.emergencyBtnLeft}>
                    <View style={styles.emergencyIconCircle}>
                      <Ionicons name={getEmergencyIcon(key) as any} size={18} color="#dc2626" />
                    </View>
                    <View>
                      <Text style={styles.emergencyBtnLabel}>{getEmergencyLabel(key)}</Text>
                      <Text style={styles.emergencyBtnNumber}>{number}</Text>
                    </View>
                  </View>
                  <Ionicons name="call-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeBtnText}>
                {i18n.locale === 'fr' ? 'Fermer' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING_SIZE,
    height: RING_SIZE + 18,
  },
  progressRingWrapper: {
    position: 'absolute',
    top: 0,
    transform: [{ rotate: '-90deg' }],
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonHolding: {
    backgroundColor: '#991b1b',
    transform: [{ scale: 0.95 }],
  },
  buttonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
  holdHint: {
    marginTop: 2,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  alertIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  notifiedSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  notifiedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.success,
    marginBottom: 12,
  },
  notifiedContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  notifiedName: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  callSmallBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },

  emergencySection: {
    marginBottom: 20,
    maxHeight: 280,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 12,
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  emergencyBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  emergencyBtnNumber: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },

  closeBtn: {
    backgroundColor: Colors.dark.border,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
});
