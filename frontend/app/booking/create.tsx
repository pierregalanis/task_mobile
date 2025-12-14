import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  ActivityIndicator,
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
import * as Location from 'expo-location';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDnipL64xT_Cv_60MGUv1AmRFMk0D6oGA8';

// Reverse geocode using Google Maps API (replaces deprecated expo-location geocoding)
const reverseGeocode = async (latitude: number, longitude: number): Promise<{ address: string; city: string } | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const addressComponents = result.address_components || [];
      
      // Extract city from address components
      let city = '';
      for (const component of addressComponents) {
        if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
          city = component.long_name;
          break;
        }
      }
      
      return {
        address: result.formatted_address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        city: city || '',
      };
    }
    return null;
  } catch (error) {
    console.log('Reverse geocoding error:', error);
    return null;
  }
};

// Conditionally import MapView only for native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log('react-native-maps not available');
  }
}

// Duration options for dropdown
const DURATION_OPTIONS = [
  { value: 0.5, label: '30 min' },
  { value: 1, label: '1 heure' },
  { value: 1.5, label: '1h 30min' },
  { value: 2, label: '2 heures' },
  { value: 2.5, label: '2h 30min' },
  { value: 3, label: '3 heures' },
  { value: 3.5, label: '3h 30min' },
  { value: 4, label: '4 heures' },
  { value: 5, label: '5 heures' },
  { value: 6, label: '6 heures' },
  { value: 7, label: '7 heures' },
  { value: 8, label: '8 heures' },
];

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function CreateBookingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const mapRef = useRef<any>(null);
  
  console.log('Booking form params:', params);

  // Get service name from params for auto-fill
  const serviceName = params.serviceName as string || '';
  
  // Form state - Auto-fill title with service name
  const [title, setTitle] = useState(serviceName);
  const [description, setDescription] = useState(''); // Leave empty for user input
  const [taskDate, setTaskDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(2);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(user?.city || 'Abidjan');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Location state
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  
  // Distance validation
  const [distanceValid, setDistanceValid] = useState<boolean | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  
  // Confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  // Params
  const pricingType = (params.pricingType as string) || 'hourly';
  const hourlyRate = params.hourlyRate ? parseFloat(params.hourlyRate as string) : 0;
  const fixedPrice = params.fixedPrice ? parseFloat(params.fixedPrice as string) : 0;
  const maxTravelDistance = params.maxTravelDistance ? parseFloat(params.maxTravelDistance as string) : 50;
  const taskerLatitude = params.taskerLatitude ? parseFloat(params.taskerLatitude as string) : null;
  const taskerLongitude = params.taskerLongitude ? parseFloat(params.taskerLongitude as string) : null;

  // Calculate total price
  const calculateTotal = () => {
    if (pricingType === 'hourly') {
      return hourlyRate * duration;
    }
    return fixedPrice;
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Validate distance when location changes
  useEffect(() => {
    if (selectedLocation && taskerLatitude && taskerLongitude) {
      const distance = calculateDistance(
        taskerLatitude,
        taskerLongitude,
        selectedLocation.latitude,
        selectedLocation.longitude
      );
      setCalculatedDistance(distance);
      setDistanceValid(distance <= maxTravelDistance);
    }
  }, [selectedLocation, taskerLatitude, taskerLongitude, maxTravelDistance]);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setGettingCurrentLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          i18n.locale === 'fr' ? 'Permission refusée' : 'Permission denied',
          i18n.locale === 'fr' 
            ? 'Veuillez autoriser l\'accès à la localisation' 
            : 'Please allow location access'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newLocation: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Reverse geocode to get address
      try {
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (addressResult) {
          const addressParts = [
            addressResult.street,
            addressResult.city,
            addressResult.region,
          ].filter(Boolean);
          newLocation.address = addressParts.join(', ');
          setAddress(newLocation.address);
          if (addressResult.city) {
            setCity(addressResult.city);
          }
        }
      } catch (e) {
        console.log('Reverse geocoding failed:', e);
      }

      setSelectedLocation(newLocation);
      setLocationError(false);

      // Animate map to location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' 
          ? 'Impossible d\'obtenir votre position' 
          : 'Could not get your location'
      );
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  // Search places using backend proxy (avoids CORS issues)
  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearching(true);
      const baseUrl = 'https://gethands.preview.emergentagent.com';
      
      const response = await fetch(
        `${baseUrl}/api/places/autocomplete?input=${encodeURIComponent(query)}&components=country:ci`
      );
      
      const data = await response.json();
      
      if (data.predictions) {
        setSearchResults(data.predictions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setSearching(false);
    }
  };

  // Select a place from search results
  const selectPlace = async (placeId: string, description: string) => {
    try {
      const baseUrl = 'https://gethands.preview.emergentagent.com';
      
      const response = await fetch(
        `${baseUrl}/api/places/details?place_id=${placeId}`
      );
      
      const data = await response.json();
      
      if (data.result?.geometry?.location) {
        const location: LocationData = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          address: description,
        };
        
        setSelectedLocation(location);
        setAddress(description);
        setSearchQuery(description);
        setShowSuggestions(false);
        setLocationError(false);
        
        // Animate map to location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  // Handle map press
  const handleMapPress = async (event: any) => {
    if (Platform.OS === 'web') return;
    
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const location: LocationData = {
      latitude,
      longitude,
    };

    // Try to reverse geocode
    try {
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (addressResult) {
        const addressParts = [
          addressResult.street,
          addressResult.city,
          addressResult.region,
        ].filter(Boolean);
        location.address = addressParts.join(', ');
        setAddress(location.address);
        if (addressResult.city) {
          setCity(addressResult.city);
        }
      }
    } catch (e) {
      location.address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
    
    setSelectedLocation(location);
    setLocationError(false);
  };

  // Handle marker drag
  const handleMarkerDragEnd = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const location: LocationData = {
      latitude,
      longitude,
    };

    // Try to reverse geocode
    try {
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (addressResult) {
        const addressParts = [
          addressResult.street,
          addressResult.city,
          addressResult.region,
        ].filter(Boolean);
        location.address = addressParts.join(', ');
        setAddress(location.address);
        if (addressResult.city) {
          setCity(addressResult.city);
        }
      }
    } catch (e) {
      location.address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
    
    setSelectedLocation(location);
    setLocationError(false);
  };

  // Date change handler
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const newDate = new Date(taskDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setTaskDate(newDate);
    }
    if (Platform.OS === 'ios') {
      // iOS continues to show picker
    }
  };

  // Time change handler
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const newDate = new Date(taskDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setTaskDate(newDate);
    }
  };

  // Submit booking
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

    // Check if location is pinned (for native only)
    if (Platform.OS !== 'web' && !selectedLocation) {
      setLocationError(true);
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' 
          ? 'Veuillez sélectionner un emplacement sur la carte' 
          : 'Please select a location on the map'
      );
      return;
    }

    // Check distance validation
    if (distanceValid === false) {
      Alert.alert(
        i18n.locale === 'fr' ? 'Distance trop éloignée' : 'Too far away',
        i18n.locale === 'fr' 
          ? `Le tâcheron ne peut pas se déplacer au-delà de ${maxTravelDistance} km. Votre emplacement est à ${calculatedDistance?.toFixed(1)} km.` 
          : `The tasker cannot travel beyond ${maxTravelDistance} km. Your location is ${calculatedDistance?.toFixed(1)} km away.`
      );
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        title: title.trim(),
        description: description.trim(),
        category: params.categoryId as string,
        subcategory: (params.subcategoryId as string) || null,
        tasker_id: params.taskerId as string,
        scheduled_date: taskDate.toISOString(),
        duration_hours: pricingType === 'hourly' ? duration : 1,
        address: address.trim(),
        city: city.trim(),
        latitude: selectedLocation?.latitude || user?.latitude || 5.36,
        longitude: selectedLocation?.longitude || user?.longitude || -4.0,
        special_instructions: specialInstructions.trim() || null,
        pricing_type: pricingType,
        hourly_rate: pricingType === 'hourly' ? hourlyRate : null,
        fixed_price: pricingType === 'fixed' ? fixedPrice : null,
        estimated_total: calculateTotal(),
      };

      console.log('Booking data being sent:', JSON.stringify(bookingData, null, 2));
      const response = await taskAPI.createTask(bookingData);
      setCreatedTaskId(response.id);
      setShowConfirmation(true);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr'
          ? 'Impossible de créer la réservation'
          : 'Failed to create booking')
      );
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  };

  // Default map region (Abidjan)
  const defaultRegion = {
    latitude: selectedLocation?.latitude || 5.36,
    longitude: selectedLocation?.longitude || -4.00,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
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
                <Text style={styles.serviceName}>{serviceName || 'Service'}</Text>
                <View style={styles.priceBadgeContainer}>
                  <View style={[styles.priceBadge, pricingType === 'fixed' && styles.priceBadgeFixed]}>
                    <Text style={styles.priceBadgeText}>
                      {pricingType === 'hourly'
                        ? i18n.locale === 'fr' ? 'Horaire' : 'Hourly'
                        : i18n.locale === 'fr' ? 'Fixe' : 'Fixed'}
                    </Text>
                  </View>
                  <Text style={styles.servicePrice}>
                    {pricingType === 'hourly' ? `${hourlyRate.toLocaleString()} XOF/h` : `${fixedPrice.toLocaleString()} XOF`}
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
                placeholder={i18n.locale === 'fr' ? 'Ex: Nettoyage maison' : 'e.g. House cleaning'}
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
                placeholder={i18n.locale === 'fr' ? 'Décrivez la tâche en détail...' : 'Describe the task in detail...'}
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
                  <Text style={styles.dateButtonText}>{formatDate(taskDate)}</Text>
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
                  <Text style={styles.dateButtonText}>{formatTime(taskDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Picker Modal for iOS */}
            {Platform.OS === 'ios' && showDatePicker && (
              <Modal
                visible={showDatePicker}
                transparent
                animationType="slide"
              >
                <View style={styles.pickerModal}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.pickerDone}>
                          {i18n.locale === 'fr' ? 'Terminé' : 'Done'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={taskDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      minimumDate={getMinDate()}
                      textColor={Colors.dark.text}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {/* Date Picker for Android */}
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={taskDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={getMinDate()}
              />
            )}

            {/* Time Picker Modal for iOS */}
            {Platform.OS === 'ios' && showTimePicker && (
              <Modal
                visible={showTimePicker}
                transparent
                animationType="slide"
              >
                <View style={styles.pickerModal}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.pickerDone}>
                          {i18n.locale === 'fr' ? 'Terminé' : 'Done'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={taskDate}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      textColor={Colors.dark.text}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {/* Time Picker for Android */}
            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker
                value={taskDate}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}

            {/* Web fallback for date/time */}
            {Platform.OS === 'web' && (showDatePicker || showTimePicker) && (
              <View style={styles.webPickerNotice}>
                <Text style={styles.webPickerText}>
                  {i18n.locale === 'fr' 
                    ? 'Sélecteur de date/heure disponible sur mobile uniquement' 
                    : 'Date/time picker available on mobile only'}
                </Text>
              </View>
            )}

            {/* Duration Dropdown - Only for hourly pricing */}
            {pricingType === 'hourly' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {i18n.locale === 'fr' ? 'Durée' : 'Duration'} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDurationPicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="hourglass" size={20} color={Colors.dark.primary} />
                  <Text style={styles.dateButtonText}>
                    {DURATION_OPTIONS.find(d => d.value === duration)?.label || `${duration} heures`}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.dark.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Duration Picker Modal */}
            <Modal
              visible={showDurationPicker}
              transparent
              animationType="slide"
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDurationPicker(false)}
              >
                <View style={styles.durationPickerContainer}>
                  <View style={styles.durationPickerHeader}>
                    <Text style={styles.durationPickerTitle}>
                      {i18n.locale === 'fr' ? 'Sélectionner la durée' : 'Select Duration'}
                    </Text>
                  </View>
                  <ScrollView style={styles.durationList}>
                    {DURATION_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.durationOption,
                          duration === option.value && styles.durationOptionSelected
                        ]}
                        onPress={() => {
                          setDuration(option.value);
                          setShowDurationPicker(false);
                        }}
                      >
                        <Text style={[
                          styles.durationOptionText,
                          duration === option.value && styles.durationOptionTextSelected
                        ]}>
                          {option.label}
                        </Text>
                        {duration === option.value && (
                          <Ionicons name="checkmark" size={20} color={Colors.dark.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {i18n.locale === 'fr' ? 'Emplacement' : 'Location'}
            </Text>

            {/* Address Search */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.locale === 'fr' ? 'Adresse' : 'Address'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.dark.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={i18n.locale === 'fr' ? 'Rechercher un lieu...' : 'Search for a place...'}
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={searchQuery || address}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setAddress(text);
                    searchPlaces(text);
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                />
                {searching && <ActivityIndicator size="small" color={Colors.dark.primary} />}
              </View>

              {/* Search Suggestions */}
              {showSuggestions && searchResults.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {searchResults.slice(0, 5).map((result) => (
                    <TouchableOpacity
                      key={result.place_id}
                      style={styles.suggestionItem}
                      onPress={() => selectPlace(result.place_id, result.description)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={16} color={Colors.dark.primary} />
                      <Text style={styles.suggestionText} numberOfLines={2}>{result.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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

            {/* Current Location Button */}
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={getCurrentLocation}
              disabled={gettingCurrentLocation}
              activeOpacity={0.7}
            >
              {gettingCurrentLocation ? (
                <ActivityIndicator size="small" color={Colors.dark.primary} />
              ) : (
                <Ionicons name="locate" size={20} color={Colors.dark.primary} />
              )}
              <Text style={styles.currentLocationText}>
                {i18n.locale === 'fr' ? 'Utiliser ma position actuelle' : 'Use my current location'}
              </Text>
            </TouchableOpacity>

            {/* Map */}
            {Platform.OS !== 'web' && MapView ? (
              <View style={[styles.mapContainer, locationError && styles.mapContainerError]}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={defaultRegion}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  onPress={handleMapPress}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                >
                  {selectedLocation && Marker && (
                    <Marker
                      coordinate={{
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                      }}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    >
                      <View style={styles.customMarker}>
                        <Ionicons name="location" size={40} color={Colors.dark.primary} />
                      </View>
                    </Marker>
                  )}
                </MapView>

                {/* Map Instructions */}
                <View style={styles.mapInstructions}>
                  {selectedLocation ? (
                    <View style={styles.locationSelectedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
                      <Text style={styles.locationSelectedText}>
                        {i18n.locale === 'fr' ? 'Emplacement sélectionné' : 'Location selected'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.tapInstructionBadge}>
                      <Ionicons name="hand-left" size={16} color={Colors.dark.primary} />
                      <Text style={styles.tapInstructionText}>
                        {i18n.locale === 'fr' 
                          ? 'Appuyez sur la carte pour placer un marqueur' 
                          : 'Tap on the map to place a marker'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Distance Validation */}
                {distanceValid !== null && (
                  <View style={[
                    styles.distanceValidation,
                    distanceValid ? styles.distanceValid : styles.distanceInvalid
                  ]}>
                    <Ionicons 
                      name={distanceValid ? "checkmark-circle" : "warning"} 
                      size={16} 
                      color={distanceValid ? Colors.dark.success : Colors.dark.error} 
                    />
                    <Text style={[
                      styles.distanceText,
                      { color: distanceValid ? Colors.dark.success : Colors.dark.error }
                    ]}>
                      {distanceValid 
                        ? (i18n.locale === 'fr' 
                            ? `Le tâcheron peut se déplacer (${calculatedDistance?.toFixed(1)} km)` 
                            : `Tasker can reach (${calculatedDistance?.toFixed(1)} km)`)
                        : (i18n.locale === 'fr' 
                            ? `Trop loin (${calculatedDistance?.toFixed(1)} km > ${maxTravelDistance} km max)` 
                            : `Too far (${calculatedDistance?.toFixed(1)} km > ${maxTravelDistance} km max)`)}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.webMapFallback}>
                <Ionicons name="map" size={48} color={Colors.dark.textSecondary} />
                <Text style={styles.webMapText}>
                  {i18n.locale === 'fr'
                    ? 'Carte interactive disponible sur mobile uniquement'
                    : 'Interactive map available on mobile only'}
                </Text>
                <Text style={styles.webMapSubtext}>
                  {i18n.locale === 'fr'
                    ? 'Veuillez entrer votre adresse manuellement ci-dessus'
                    : 'Please enter your address manually above'}
                </Text>
              </View>
            )}

            {locationError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.dark.error} />
                <Text style={styles.errorText}>
                  {i18n.locale === 'fr'
                    ? 'Veuillez sélectionner un emplacement sur la carte'
                    : 'Please select a location on the map'}
                </Text>
              </View>
            )}

            {/* Special Instructions */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.locale === 'fr' ? 'Instructions spéciales' : 'Special Instructions'}{' '}
                <Text style={styles.optional}>({i18n.locale === 'fr' ? 'Optionnel' : 'Optional'})</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={i18n.locale === 'fr' ? 'Informations supplémentaires...' : 'Any additional information...'}
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
                  {hourlyRate.toLocaleString()} XOF/h × {duration} {i18n.locale === 'fr' ? 'heures' : 'hours'}
                </Text>
                <Text style={styles.summaryValue}>{calculateTotal().toLocaleString()} XOF</Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>
                {i18n.locale === 'fr' ? 'Total' : 'Total'}
              </Text>
              <Text style={styles.summaryTotalValue}>{calculateTotal().toLocaleString()} XOF</Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={
              loading
                ? i18n.locale === 'fr' ? 'Création...' : 'Creating...'
                : i18n.locale === 'fr' ? 'Confirmer la réservation' : 'Confirm Booking'
            }
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationContainer}>
            <View style={styles.confirmationIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.dark.success} />
            </View>
            <Text style={styles.confirmationTitle}>
              {i18n.locale === 'fr' ? 'Réservation confirmée!' : 'Booking Confirmed!'}
            </Text>
            <Text style={styles.confirmationMessage}>
              {i18n.locale === 'fr'
                ? 'Votre réservation a été créée avec succès. Le tâcheron recevra une notification.'
                : 'Your booking has been created successfully. The tasker will receive a notification.'}
            </Text>
            <View style={styles.confirmationDetails}>
              <View style={styles.confirmationDetailRow}>
                <Ionicons name="calendar" size={20} color={Colors.dark.primary} />
                <Text style={styles.confirmationDetailText}>{formatDate(taskDate)}</Text>
              </View>
              <View style={styles.confirmationDetailRow}>
                <Ionicons name="time" size={20} color={Colors.dark.primary} />
                <Text style={styles.confirmationDetailText}>{formatTime(taskDate)}</Text>
              </View>
              <View style={styles.confirmationDetailRow}>
                <Ionicons name="cash" size={20} color={Colors.dark.primary} />
                <Text style={styles.confirmationDetailText}>{calculateTotal().toLocaleString()} XOF</Text>
              </View>
            </View>
            <View style={styles.confirmationButtons}>
              <Button
                title={i18n.locale === 'fr' ? 'Voir mes réservations' : 'View My Bookings'}
                onPress={() => {
                  setShowConfirmation(false);
                  router.replace('/(tabs)/bookings');
                }}
                variant="primary"
              />
              <TouchableOpacity
                style={styles.backToDashboardButton}
                onPress={() => {
                  setShowConfirmation(false);
                  router.replace('/(tabs)/home');
                }}
              >
                <Text style={styles.backToDashboardText}>
                  {i18n.locale === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
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
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  webPickerNotice: {
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  webPickerText: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  durationPickerContainer: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  durationPickerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  durationPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    textAlign: 'center',
  },
  durationList: {
    maxHeight: 300,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  durationOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  durationOptionText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  durationOptionTextSelected: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
    paddingVertical: 16,
  },
  suggestionsContainer: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.text,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  currentLocationText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  mapContainerError: {
    borderColor: Colors.dark.error,
  },
  map: {
    height: 250,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapInstructions: {
    padding: 12,
    backgroundColor: Colors.dark.card,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  locationSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  tapInstructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tapInstructionText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  distanceValidation: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  distanceValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  distanceInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  distanceText: {
    fontSize: 12,
    flex: 1,
  },
  webMapFallback: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  webMapText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  webMapSubtext: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: Colors.dark.error,
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
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmationContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmationIconContainer: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmationDetails: {
    width: '100%',
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confirmationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  confirmationDetailText: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  confirmationButtons: {
    width: '100%',
    gap: 12,
  },
  backToDashboardButton: {
    padding: 16,
    alignItems: 'center',
  },
  backToDashboardText: {
    fontSize: 16,
    color: Colors.dark.primary,
    fontWeight: '500',
  },
});
