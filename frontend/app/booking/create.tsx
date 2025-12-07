import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { taskAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { Button } from '../../components/Button';

export default function CreateBookingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskDate, setTaskDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState('2');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(user?.city || 'Abidjan');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const pricingType = params.pricingType as string;
  const hourlyRate = params.hourlyRate ? parseFloat(params.hourlyRate as string) : 0;
  const fixedPrice = params.fixedPrice ? parseFloat(params.fixedPrice as string) : 0;

  const calculateTotal = () => {
    if (pricingType === 'hourly') {
      return hourlyRate * parseFloat(duration || '0');
    }
    return fixedPrice;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(taskDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setTaskDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(taskDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setTaskDate(newDate);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez entrer un titre' : 'Please enter a title'
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez entrer une description' : 'Please enter a description'
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez entrer une adresse' : 'Please enter an address'
      );
      return;
    }

    if (pricingType === 'hourly' && (!duration || parseFloat(duration) <= 0)) {
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez entrer une durée valide' : 'Please enter a valid duration'
      );
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        title: title.trim(),
        description: description.trim(),
        task_date: taskDate.toISOString(),
        duration_hours: pricingType === 'hourly' ? parseFloat(duration) : 1,
        address: address.trim(),
        city: city.trim(),
        latitude: user?.latitude || 5.36,
        longitude: user?.longitude || -4.0,
        category_id: params.serviceId as string,
        tasker_id: params.taskerId as string,
        pricing_type: pricingType,
        hourly_rate: pricingType === 'hourly' ? hourlyRate : null,
        fixed_price: pricingType === 'fixed' ? fixedPrice : null,
        special_instructions: specialInstructions.trim() || null,
      };

      await taskAPI.createTask(bookingData);

      Alert.alert(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Réservation créée avec succès!' : 'Booking created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/bookings'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || i18n.locale === 'fr'
          ? 'Échec de création de la réservation'
          : 'Failed to create booking'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18n.locale === 'fr' ? 'Nouvelle réservation' : 'New Booking'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Service Info Card */}
          <View style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <Ionicons name="briefcase" size={24} color={Colors.dark.primary} />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{params.serviceName}</Text>
                <View style={styles.priceBadgeContainer}>
                  <View style={[styles.priceBadge, pricingType === 'fixed' && styles.priceBadgeFixed]}>
                    <Text style={styles.priceBadgeText}>
                      {pricingType === 'hourly'
                        ? i18n.locale === 'fr'
                          ? 'Horaire'
                          : 'Hourly'
                        : i18n.locale === 'fr'
                        ? 'Fixe'
                        : 'Fixed'}
                    </Text>
                  </View>
                  <Text style={styles.servicePrice}>
                    {pricingType === 'hourly' ? `${hourlyRate} XOF/h` : `${fixedPrice} XOF`}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {i18n.locale === 'fr' ? 'Détails de la tâche' : 'Task Details'}
            </Text>

            {/* Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.locale === 'fr' ? 'Titre' : 'Title'} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  i18n.locale === 'fr' ? 'Ex: Nettoyage maison' : 'e.g. House cleaning'
                }
                placeholderTextColor={Colors.dark.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.locale === 'fr' ? 'Description' : 'Description'} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  i18n.locale === 'fr'
                    ? 'Décrivez la tâche en détail...'
                    : 'Describe the task in detail...'
                }
                placeholderTextColor={Colors.dark.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Date & Time */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.inputLabel}>
                  {i18n.locale === 'fr' ? 'Date' : 'Date'} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar" size={20} color={Colors.dark.primary} />
                  <Text style={styles.dateButtonText}>{taskDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.inputLabel}>
                  {i18n.locale === 'fr' ? 'Heure' : 'Time'} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time" size={20} color={Colors.dark.primary} />
                  <Text style={styles.dateButtonText}>
                    {taskDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={taskDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={taskDate}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}

            {/* Duration (only for hourly) */}
            {pricingType === 'hourly' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {i18n.locale === 'fr' ? 'Durée (heures)' : 'Duration (hours)'}{' '}
                  <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* Address */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.locale === 'fr' ? 'Adresse' : 'Address'} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  i18n.locale === 'fr' ? 'Entrez votre adresse' : 'Enter your address'
                }
                placeholderTextColor={Colors.dark.textSecondary}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* City */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.locale === 'fr' ? 'Ville' : 'City'} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Abidjan"
                placeholderTextColor={Colors.dark.textSecondary}
                value={city}
                onChangeText={setCity}
              />
            </View>

            {/* Special Instructions */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.locale === 'fr' ? 'Instructions spéciales' : 'Special Instructions'}{' '}
                <Text style={styles.optional}>({i18n.locale === 'fr' ? 'Optionnel' : 'Optional'})</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  i18n.locale === 'fr'
                    ? 'Informations supplémentaires...'
                    : 'Any additional information...'
                }
                placeholderTextColor={Colors.dark.textSecondary}
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Price Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {i18n.locale === 'fr' ? 'Résumé du prix' : 'Price Summary'}
            </Text>
            {pricingType === 'hourly' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {hourlyRate} XOF/h × {duration || 0} {i18n.locale === 'fr' ? 'heures' : 'hours'}
                </Text>
                <Text style={styles.summaryValue}>{calculateTotal()} XOF</Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>
                {i18n.locale === 'fr' ? 'Total' : 'Total'}
              </Text>
              <Text style={styles.summaryTotalValue}>{calculateTotal()} XOF</Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={
              loading
                ? i18n.locale === 'fr'
                  ? 'Création...'
                  : 'Creating...'
                : i18n.locale === 'fr'
                ? 'Confirmer la réservation'
                : 'Confirm Booking'
            }
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  serviceCard: {
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  priceBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceBadgeFixed: {
    backgroundColor: '#3b82f6',
  },
  priceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.dark.error,
  },
  optional: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  input: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  summaryCard: {
    backgroundColor: Colors.dark.card,
    padding: 20,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  buttonContainer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
});
