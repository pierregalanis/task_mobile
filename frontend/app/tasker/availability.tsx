import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { availabilityAPI, WeeklySchedule, BlockedDate } from '../../services/api';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type DayKey = typeof DAYS[number];

const DAY_LABELS: Record<string, { en: string; fr: string }> = {
  monday: { en: 'Monday', fr: 'Lundi' },
  tuesday: { en: 'Tuesday', fr: 'Mardi' },
  wednesday: { en: 'Wednesday', fr: 'Mercredi' },
  thursday: { en: 'Thursday', fr: 'Jeudi' },
  friday: { en: 'Friday', fr: 'Vendredi' },
  saturday: { en: 'Saturday', fr: 'Samedi' },
  sunday: { en: 'Sunday', fr: 'Dimanche' },
};

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { enabled: true, start_time: '09:00', end_time: '17:00' },
  tuesday: { enabled: true, start_time: '09:00', end_time: '17:00' },
  wednesday: { enabled: true, start_time: '09:00', end_time: '17:00' },
  thursday: { enabled: true, start_time: '09:00', end_time: '17:00' },
  friday: { enabled: true, start_time: '09:00', end_time: '17:00' },
  saturday: { enabled: false, start_time: '09:00', end_time: '17:00' },
  sunday: { enabled: false, start_time: '09:00', end_time: '17:00' },
};

export default function AvailabilityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [timezone, setTimezone] = useState('Africa/Abidjan');
  const [minBookingNotice, setMinBookingNotice] = useState(2);
  const [hasChanges, setHasChanges] = useState(false);

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState<{
    visible: boolean;
    day: DayKey | null;
    field: 'start_time' | 'end_time' | null;
  }>({ visible: false, day: null, field: null });

  // Block date modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState(new Date());
  const [blockReason, setBlockReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [blockingDate, setBlockingDate] = useState(false);

  // Load schedule on mount
  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await availabilityAPI.getMySchedule();
      if (data.weekly_schedule) {
        setSchedule(data.weekly_schedule);
      }
      if (data.blocked_dates) {
        setBlockedDates(data.blocked_dates);
      }
      if (data.timezone) {
        setTimezone(data.timezone);
      }
      if (data.min_booking_notice_hours !== undefined) {
        setMinBookingNotice(data.min_booking_notice_hours);
      }
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error loading schedule:', error);
      // If 404, this is a new user - use defaults
      if (error.response?.status !== 404) {
        showMessage(
          i18n.locale === 'fr' ? 'Erreur' : 'Error',
          i18n.locale === 'fr' ? 'Impossible de charger les disponibilités' : 'Failed to load availability settings'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  }, []);

  const toggleDay = (day: DayKey) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
    setHasChanges(true);
  };

  const openTimePicker = (day: DayKey, field: 'start_time' | 'end_time') => {
    setShowTimePicker({ visible: true, day, field });
  };

  const parseTimeToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker({ visible: false, day: null, field: null });
    }
    
    if (selectedTime && showTimePicker.day && showTimePicker.field) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      setSchedule(prev => ({
        ...prev,
        [showTimePicker.day!]: { ...prev[showTimePicker.day!], [showTimePicker.field!]: timeStr }
      }));
      setHasChanges(true);
    }
  };

  const closeTimePicker = () => {
    setShowTimePicker({ visible: false, day: null, field: null });
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await availabilityAPI.updateMySchedule({
        weekly_schedule: schedule,
        blocked_dates: blockedDates,
        timezone: timezone,
        min_booking_notice_hours: minBookingNotice
      });
      setHasChanges(false);
      showMessage(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Disponibilités mises à jour!' : 'Availability updated!'
      );
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible de sauvegarder' : 'Failed to save')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBlockDate = async () => {
    const dateStr = blockDate.toISOString().split('T')[0];
    
    // Check if already blocked
    if (blockedDates.some(b => b.date === dateStr)) {
      showMessage(
        i18n.locale === 'fr' ? 'Attention' : 'Warning',
        i18n.locale === 'fr' ? 'Cette date est déjà bloquée' : 'This date is already blocked'
      );
      return;
    }
    
    setBlockingDate(true);
    try {
      await availabilityAPI.blockDate(dateStr, blockReason);
      setBlockedDates(prev => [...prev, { date: dateStr, reason: blockReason }]);
      setShowBlockModal(false);
      setBlockDate(new Date());
      setBlockReason('');
      showMessage(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? `${dateStr} bloqué` : `${dateStr} blocked`
      );
    } catch (error: any) {
      console.error('Error blocking date:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible de bloquer' : 'Failed to block date')
      );
    } finally {
      setBlockingDate(false);
    }
  };

  const handleUnblockDate = async (date: string) => {
    try {
      await availabilityAPI.unblockDate(date);
      setBlockedDates(prev => prev.filter(d => d.date !== date));
      showMessage(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? `${date} débloqué` : `${date} unblocked`
      );
    } catch (error: any) {
      console.error('Error unblocking date:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible de débloquer' : 'Failed to unblock date')
      );
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18n.locale === 'fr' ? 'Disponibilités' : 'Availability'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>
            {i18n.locale === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Disponibilités' : 'Availability'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
        }
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.dark.primary} />
          <Text style={styles.infoText}>
            {i18n.locale === 'fr' 
              ? 'Définissez vos heures de travail et bloquez les dates où vous n\'êtes pas disponible.'
              : 'Set your working hours and block dates when you\'re unavailable.'}
          </Text>
        </View>

        {/* Weekly Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {i18n.locale === 'fr' ? 'Horaires hebdomadaires' : 'Weekly Schedule'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {i18n.locale === 'fr' ? 'Définissez vos jours et heures de travail' : 'Set your working days and hours'}
          </Text>

          {DAYS.map(day => (
            <View key={day} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>
                  {i18n.locale === 'fr' ? DAY_LABELS[day].fr : DAY_LABELS[day].en}
                </Text>
                <Switch
                  value={schedule[day]?.enabled}
                  onValueChange={() => toggleDay(day)}
                  trackColor={{ false: '#3a3a3a', true: '#064e3b' }}
                  thumbColor={schedule[day]?.enabled ? Colors.dark.primary : '#6b6b6b'}
                />
              </View>

              {schedule[day]?.enabled && (
                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker(day, 'start_time')}
                  >
                    <Ionicons name="time-outline" size={16} color={Colors.dark.primary} />
                    <Text style={styles.timeText}>{schedule[day].start_time}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeSeparator}>
                    {i18n.locale === 'fr' ? 'à' : 'to'}
                  </Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker(day, 'end_time')}
                  >
                    <Ionicons name="time-outline" size={16} color={Colors.dark.primary} />
                    <Text style={styles.timeText}>{schedule[day].end_time}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!schedule[day]?.enabled && (
                <Text style={styles.dayOffText}>
                  {i18n.locale === 'fr' ? 'Jour de repos' : 'Day off'}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Blocked Dates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {i18n.locale === 'fr' ? 'Dates bloquées' : 'Blocked Dates'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {i18n.locale === 'fr' ? 'Jours où vous n\'êtes pas disponible' : 'Days when you\'re not available'}
          </Text>

          {blockedDates.length > 0 ? (
            blockedDates
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((blocked, index) => (
                <View key={index} style={styles.blockedDateRow}>
                  <View style={styles.blockedDateInfo}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.dark.error} />
                    <View style={styles.blockedDateText}>
                      <Text style={styles.blockedDate}>{formatDateDisplay(blocked.date)}</Text>
                      {blocked.reason && (
                        <Text style={styles.blockedReason}>{blocked.reason}</Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={() => handleUnblockDate(blocked.date)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.dark.error} />
                  </TouchableOpacity>
                </View>
              ))
          ) : (
            <View style={styles.emptyBlockedDates}>
              <Ionicons name="calendar-clear-outline" size={32} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyBlockedText}>
                {i18n.locale === 'fr' ? 'Aucune date bloquée' : 'No blocked dates'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addBlockButton}
            onPress={() => setShowBlockModal(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.dark.primary} />
            <Text style={styles.addBlockText}>
              {i18n.locale === 'fr' ? 'Bloquer une date' : 'Block a Date'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {i18n.locale === 'fr' ? 'Actions rapides' : 'Quick Actions'}
          </Text>
          
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                setSchedule(prev => {
                  const updated = { ...prev };
                  DAYS.forEach(day => {
                    if (['saturday', 'sunday'].includes(day)) {
                      updated[day] = { ...updated[day], enabled: false };
                    } else {
                      updated[day] = { ...updated[day], enabled: true };
                    }
                  });
                  return updated;
                });
                setHasChanges(true);
              }}
            >
              <Ionicons name="briefcase-outline" size={20} color={Colors.dark.text} />
              <Text style={styles.quickActionText}>
                {i18n.locale === 'fr' ? 'Semaine seulement' : 'Weekdays Only'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                setSchedule(prev => {
                  const updated = { ...prev };
                  DAYS.forEach(day => {
                    updated[day] = { ...updated[day], enabled: true };
                  });
                  return updated;
                });
                setHasChanges(true);
              }}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.dark.text} />
              <Text style={styles.quickActionText}>
                {i18n.locale === 'fr' ? 'Toute la semaine' : 'All Week'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom padding for save button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveSchedule}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.dark.background} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.dark.background} />
                <Text style={styles.saveButtonText}>
                  {i18n.locale === 'fr' ? 'Enregistrer les modifications' : 'Save Changes'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Time Picker Modal (iOS) */}
      {Platform.OS === 'ios' && showTimePicker.visible && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.pickerModal}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  {i18n.locale === 'fr' ? 'Sélectionner l\'heure' : 'Select Time'}
                </Text>
                <TouchableOpacity onPress={closeTimePicker}>
                  <Text style={styles.pickerDone}>
                    {i18n.locale === 'fr' ? 'Terminé' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={showTimePicker.day ? parseTimeToDate(schedule[showTimePicker.day][showTimePicker.field!]) : new Date()}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor={Colors.dark.text}
                is24Hour={true}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker (Android) */}
      {Platform.OS === 'android' && showTimePicker.visible && (
        <DateTimePicker
          value={showTimePicker.day ? parseTimeToDate(schedule[showTimePicker.day][showTimePicker.field!]) : new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          is24Hour={true}
        />
      )}

      {/* Block Date Modal */}
      <Modal visible={showBlockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.blockModal}>
            <View style={styles.blockModalHeader}>
              <Text style={styles.blockModalTitle}>
                {i18n.locale === 'fr' ? 'Bloquer une date' : 'Block a Date'}
              </Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.blockModalContent}>
              <Text style={styles.blockModalLabel}>
                {i18n.locale === 'fr' ? 'Date' : 'Date'}
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={Colors.dark.primary} />
                <Text style={styles.datePickerText}>
                  {blockDate.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              <Text style={styles.blockModalLabel}>
                {i18n.locale === 'fr' ? 'Raison (optionnel)' : 'Reason (optional)'}
              </Text>
              <TextInput
                style={styles.reasonInput}
                placeholder={i18n.locale === 'fr' ? 'Ex: Événement familial' : 'e.g. Family event'}
                placeholderTextColor={Colors.dark.textSecondary}
                value={blockReason}
                onChangeText={setBlockReason}
              />
            </View>

            <View style={styles.blockModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBlockModal(false)}
              >
                <Text style={styles.cancelButtonText}>
                  {i18n.locale === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, blockingDate && styles.confirmButtonDisabled]}
                onPress={handleBlockDate}
                disabled={blockingDate}
              >
                {blockingDate ? (
                  <ActivityIndicator color={Colors.dark.background} size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {i18n.locale === 'fr' ? 'Bloquer' : 'Block'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Date Picker for blocking */}
            {showDatePicker && Platform.OS === 'ios' && (
              <View style={styles.inlinePickerContainer}>
                <DateTimePicker
                  value={blockDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setBlockDate(date);
                  }}
                  minimumDate={new Date()}
                  textColor={Colors.dark.text}
                />
                <TouchableOpacity
                  style={styles.inlinePickerDone}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.pickerDone}>
                    {i18n.locale === 'fr' ? 'Terminé' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Android Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={blockDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setBlockDate(date);
          }}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  dayRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  timeSeparator: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginHorizontal: 4,
  },
  dayOffText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontStyle: 'italic',
  },
  blockedDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  blockedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  blockedDateText: {
    flex: 1,
  },
  blockedDate: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  blockedReason: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  unblockButton: {
    padding: 8,
  },
  emptyBlockedDates: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyBlockedText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  addBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 12,
    borderStyle: 'dashed',
    gap: 8,
  },
  addBlockText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.dark.primary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.border,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blockModal: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  blockModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  blockModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  blockModalContent: {
    padding: 16,
  },
  blockModalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark.text,
  },
  reasonInput: {
    backgroundColor: Colors.dark.background,
    padding: 16,
    borderRadius: 12,
    fontSize: 15,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  blockModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.dark.error,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  inlinePickerContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 8,
  },
  inlinePickerDone: {
    alignItems: 'center',
    padding: 12,
  },
});
