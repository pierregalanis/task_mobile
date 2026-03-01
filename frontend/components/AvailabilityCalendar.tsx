import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { availabilityAPI, CalendarDay, TimeSlot, AvailableSlotsResponse } from '../services/api';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

interface AvailabilityCalendarProps {
  taskerId: string;
  durationHours: number;
  onSelect: (date: string, slot: TimeSlot) => void;
  selectedDate?: string;
  selectedSlot?: TimeSlot;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function AvailabilityCalendar({
  taskerId,
  durationHours,
  onSelect,
  selectedDate,
  selectedSlot,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsInfo, setSlotsInfo] = useState<AvailableSlotsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load calendar for current month
  const loadCalendar = useCallback(async () => {
    if (!taskerId) return;
    
    setLoadingCalendar(true);
    setError(null);
    
    try {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();
      const data = await availabilityAPI.getTaskerCalendar(taskerId, month, year);
      setCalendarDays(data.days || []);
    } catch (err: any) {
      console.error('Error loading calendar:', err);
      setError(i18n.locale === 'fr' ? 'Impossible de charger le calendrier' : 'Failed to load calendar');
    } finally {
      setLoadingCalendar(false);
    }
  }, [taskerId, currentMonth]);

  // Load slots when date is selected
  const loadSlots = useCallback(async (dateStr: string) => {
    if (!taskerId) return;
    
    setLoadingSlots(true);
    setSlots([]);
    setSlotsInfo(null);
    
    try {
      const data = await availabilityAPI.getAvailableSlots(taskerId, dateStr, durationHours);
      setSlotsInfo(data);
      setSlots(data.slots || []);
    } catch (err: any) {
      console.error('Error loading slots:', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [taskerId, durationHours]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    }
  }, [selectedDate, loadSlots]);

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getMonthName = () => {
    return currentMonth.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getDayStatus = (dateStr: string): CalendarDay | undefined => {
    return calendarDays.find(d => d.date === dateStr);
  };

  const handleDateSelect = (dateStr: string) => {
    const dayInfo = getDayStatus(dateStr);
    if (dayInfo?.status === 'available') {
      onSelect(dateStr, selectedSlot!);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.available && selectedDate) {
      onSelect(selectedDate, slot);
    }
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const grid: (number | null)[] = [];
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(day);
    }
    
    return grid;
  };

  const formatDateStr = (day: number): string => {
    const year = currentMonth.getFullYear();
    const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'available':
        return Colors.dark.primary;
      case 'blocked':
        return Colors.dark.error;
      case 'day_off':
      case 'past':
      default:
        return Colors.dark.textSecondary;
    }
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const calendarGrid = generateCalendarGrid();
  const weekDays = i18n.locale === 'fr' ? WEEKDAYS_FR : WEEKDAYS;

  return (
    <View style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() => navigateMonth(-1)}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{getMonthName()}</Text>
        <TouchableOpacity
          onPress={() => navigateMonth(1)}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day, index) => (
          <Text key={index} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      {loadingCalendar ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.dark.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadCalendar} style={styles.retryButton}>
            <Text style={styles.retryText}>
              {i18n.locale === 'fr' ? 'Réessayer' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.calendarGrid}>
          {calendarGrid.map((day, index) => {
            if (day === null) {
              return <View key={index} style={styles.emptyCell} />;
            }
            
            const dateStr = formatDateStr(day);
            const dayInfo = getDayStatus(dateStr);
            const isSelected = selectedDate === dateStr;
            const isAvailable = dayInfo?.status === 'available';
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  !isAvailable && styles.dayCellDisabled,
                  isToday(day) && styles.dayCellToday,
                ]}
                onPress={() => handleDateSelect(dateStr)}
                disabled={!isAvailable}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    !isAvailable && styles.dayTextDisabled,
                    isToday(day) && styles.dayTextToday,
                  ]}
                >
                  {day}
                </Text>
                {/* Status Indicator */}
                {dayInfo && (
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(dayInfo.status) },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.dark.primary }]} />
          <Text style={styles.legendText}>
            {i18n.locale === 'fr' ? 'Disponible' : 'Available'}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.dark.error }]} />
          <Text style={styles.legendText}>
            {i18n.locale === 'fr' ? 'Bloqué' : 'Blocked'}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.dark.textSecondary }]} />
          <Text style={styles.legendText}>
            {i18n.locale === 'fr' ? 'Non disponible' : 'Unavailable'}
          </Text>
        </View>
      </View>

      {/* Time Slots Section */}
      {selectedDate && (
        <View style={styles.slotsSection}>
          <Text style={styles.slotsTitle}>
            {i18n.locale === 'fr' ? 'Créneaux horaires' : 'Time Slots'}
          </Text>
          
          {loadingSlots ? (
            <View style={styles.slotsLoading}>
              <ActivityIndicator size="small" color={Colors.dark.primary} />
              <Text style={styles.slotsLoadingText}>
                {i18n.locale === 'fr' ? 'Chargement...' : 'Loading...'}
              </Text>
            </View>
          ) : slotsInfo && !slotsInfo.is_available ? (
            <View style={styles.unavailableContainer}>
              <Ionicons name="alert-circle" size={24} color={Colors.dark.warning} />
              <Text style={styles.unavailableText}>
                {slotsInfo.message || (i18n.locale === 'fr' ? 'Non disponible ce jour' : 'Not available on this day')}
              </Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.noSlotsContainer}>
              <Text style={styles.noSlotsText}>
                {i18n.locale === 'fr' ? 'Aucun créneau disponible' : 'No time slots available'}
              </Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot, index) => {
                const isSlotSelected = selectedSlot?.start_time === slot.start_time;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.slotButton,
                      !slot.available && styles.slotUnavailable,
                      isSlotSelected && styles.slotSelected,
                    ]}
                    onPress={() => handleSlotSelect(slot)}
                    disabled={!slot.available}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        !slot.available && styles.slotTextUnavailable,
                        isSlotSelected && styles.slotTextSelected,
                      ]}
                    >
                      {slot.start_time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {selectedSlot && selectedSlot.available && (
            <View style={styles.selectedInfo}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.dark.primary} />
              <Text style={styles.selectedText}>
                {i18n.locale === 'fr' ? 'Sélectionné:' : 'Selected:'} {selectedSlot.start_time} - {selectedSlot.end_time}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
  },
  dayCellDisabled: {
    opacity: 0.4,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  dayTextSelected: {
    color: Colors.dark.background,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: Colors.dark.textSecondary,
  },
  dayTextToday: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.dark.error,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.background,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  slotsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  slotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  slotsLoadingText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 10,
  },
  unavailableText: {
    fontSize: 14,
    color: Colors.dark.warning,
    flex: 1,
  },
  noSlotsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minWidth: 70,
    alignItems: 'center',
  },
  slotUnavailable: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
    opacity: 0.5,
  },
  slotSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  slotTextUnavailable: {
    color: Colors.dark.textSecondary,
    textDecorationLine: 'line-through',
  },
  slotTextSelected: {
    color: Colors.dark.background,
    fontWeight: '600',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    gap: 8,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.primary,
  },
});
