import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Dimensions,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

// Conditionally import MapView only for native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (location: { latitude: number; longitude: number; address?: string }) => void;
  country: 'ivory_coast' | 'senegal';
  label?: string;
  placeholder?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Country centers
const COUNTRY_CENTERS = {
  ivory_coast: {
    latitude: 5.36,
    longitude: -4.00,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
    name: "Abidjan, Côte d'Ivoire",
  },
  senegal: {
    latitude: 14.7167,
    longitude: -17.4677,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
    name: "Dakar, Sénégal",
  },
};

export default function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  country,
  label,
  placeholder,
}: LocationPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: latitude || COUNTRY_CENTERS[country].latitude,
    longitude: longitude || COUNTRY_CENTERS[country].longitude,
  });
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const mapRef = useRef<MapView>(null);

  const isFrench = i18n.locale === 'fr';

  // Get initial region based on country
  const getInitialRegion = (): Region => {
    const center = COUNTRY_CENTERS[country];
    return {
      latitude: latitude || center.latitude,
      longitude: longitude || center.longitude,
      latitudeDelta: center.latitudeDelta,
      longitudeDelta: center.longitudeDelta,
    };
  };

  // Reverse geocode to get address
  const getAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (result && result.length > 0) {
        const addr = result[0];
        const parts = [addr.street, addr.city, addr.region, addr.country].filter(Boolean);
        return parts.join(', ');
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
    return '';
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      setGettingCurrentLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert(isFrench 
          ? 'Permission de localisation refusée' 
          : 'Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedLocation(newLocation);
      
      // Animate map to new location
      mapRef.current?.animateToRegion({
        ...newLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);

      // Get address
      const addr = await getAddressFromCoords(newLocation.latitude, newLocation.longitude);
      setAddress(addr);

    } catch (error) {
      console.error('Get current location error:', error);
      alert(isFrench 
        ? 'Impossible d\'obtenir votre position' 
        : 'Unable to get your location');
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  // Handle map press
  const handleMapPress = async (event: any) => {
    const { coordinate } = event.nativeEvent;
    setSelectedLocation(coordinate);
    
    // Get address for new location
    setLoading(true);
    const addr = await getAddressFromCoords(coordinate.latitude, coordinate.longitude);
    setAddress(addr);
    setLoading(false);
  };

  // Confirm location selection
  const confirmLocation = () => {
    onLocationSelect({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: address,
    });
    setModalVisible(false);
  };

  // Format display text
  const getDisplayText = () => {
    if (address) return address;
    if (latitude && longitude) {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
    return placeholder || (isFrench ? 'Sélectionner votre emplacement' : 'Select your location');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={styles.inputButton} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={20} color={Colors.dark.textSecondary} />
        <Text 
          style={[
            styles.inputText, 
            (!address && !latitude) && styles.placeholderText
          ]}
          numberOfLines={1}
        >
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.dark.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isFrench ? 'Choisir un emplacement' : 'Choose Location'}
            </Text>
            <TouchableOpacity onPress={confirmLocation} style={styles.confirmButton}>
              <Text style={styles.confirmText}>
                {isFrench ? 'Confirmer' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Ionicons name="information-circle" size={16} color={Colors.dark.primary} />
            <Text style={styles.instructionsText}>
              {isFrench 
                ? 'Appuyez sur la carte pour placer le marqueur à votre emplacement' 
                : 'Tap on the map to place the marker at your location'}
            </Text>
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={getInitialRegion()}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
            >
              <Marker
                coordinate={selectedLocation}
                draggable
                onDragEnd={(e) => handleMapPress(e)}
              >
                <View style={styles.markerContainer}>
                  <Ionicons name="location" size={40} color={Colors.dark.primary} />
                </View>
              </Marker>
            </MapView>

            {/* Current Location Button */}
            <TouchableOpacity 
              style={styles.currentLocationButton}
              onPress={getCurrentLocation}
              disabled={gettingCurrentLocation}
            >
              {gettingCurrentLocation ? (
                <ActivityIndicator size="small" color={Colors.dark.primary} />
              ) : (
                <Ionicons name="navigate" size={24} color={Colors.dark.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Selected Address */}
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={20} color={Colors.dark.primary} />
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>
                {isFrench ? 'Emplacement sélectionné' : 'Selected Location'}
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color={Colors.dark.primary} />
              ) : (
                <Text style={styles.addressText} numberOfLines={2}>
                  {address || `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
  },
  placeholderText: {
    color: Colors.dark.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  confirmButton: {
    padding: 8,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.dark.primary + '15',
    gap: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.text,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: Colors.dark.card,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
  },
});
