import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ScrollView,
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
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log('react-native-maps not available');
  }
}

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (location: { latitude: number; longitude: number; address?: string; city?: string }) => void;
  country: 'ivory_coast' | 'senegal';
  label?: string;
  placeholder?: string;
}

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Country centers and configurations
const COUNTRY_CONFIG = {
  ivory_coast: {
    latitude: 5.36,
    longitude: -4.00,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
    name: "Abidjan, Côte d'Ivoire",
    countryCode: 'ci',
    defaultCity: 'Abidjan',
  },
  senegal: {
    latitude: 14.7167,
    longitude: -17.4677,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
    name: "Dakar, Sénégal",
    countryCode: 'sn',
    defaultCity: 'Dakar',
  },
};

// Production API Base URL
const API_BASE_URL = 'https://soutrali.net';

// Google Maps API Key (for reverse geocoding)
const GOOGLE_MAPS_API_KEY = 'AIzaSyDnipL64xT_Cv_60MGUv1AmRFMk0D6oGA8';

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
    latitude: latitude || COUNTRY_CONFIG[country].latitude,
    longitude: longitude || COUNTRY_CONFIG[country].longitude,
  });
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const mapRef = useRef<any>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce timer
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isFrench = i18n.locale === 'fr';
  const countryConfig = COUNTRY_CONFIG[country];

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Get initial region based on country
  const getInitialRegion = (): Region => {
    return {
      latitude: latitude || countryConfig.latitude,
      longitude: longitude || countryConfig.longitude,
      latitudeDelta: countryConfig.latitudeDelta,
      longitudeDelta: countryConfig.longitudeDelta,
    };
  };

  // Reverse geocode using Google Maps API
  const getAddressFromCoords = async (lat: number, lng: number): Promise<{ address: string; city: string }> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const addressComponents = result.address_components || [];

        // Extract city from address components
        let extractedCity = '';
        for (const component of addressComponents) {
          if (component.types.includes('locality')) {
            extractedCity = component.long_name;
            break;
          } else if (component.types.includes('administrative_area_level_2') && !extractedCity) {
            extractedCity = component.long_name;
          } else if (component.types.includes('administrative_area_level_1') && !extractedCity) {
            extractedCity = component.long_name;
          }
        }

        return {
          address: result.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          city: extractedCity || countryConfig.defaultCity,
        };
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
    return {
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      city: countryConfig.defaultCity,
    };
  };

  // Search places using production backend proxy
  const searchPlaces = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearching(true);

      // Try production backend first
      const response = await fetch(
        `${API_BASE_URL}/api/places/autocomplete?input=${encodeURIComponent(query)}&components=country:${countryConfig.countryCode}`
      );
      const data = await response.json();

      if (data.predictions) {
        setSearchResults(data.predictions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Search places error:', error);
      // Fallback: try direct Google API if backend proxy fails
      try {
        const fallbackResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:${countryConfig.countryCode}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.predictions) {
          setSearchResults(fallbackData.predictions);
          setShowSuggestions(true);
        }
      } catch (fallbackError) {
        console.error('Fallback search error:', fallbackError);
      }
    } finally {
      setSearching(false);
    }
  }, [countryConfig.countryCode]);

  // Debounced search handler
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounce (300ms delay)
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 300);
  };

  // Select a place from search results
  const selectPlace = async (placeId: string, description: string) => {
    try {
      setLoading(true);
      setShowSuggestions(false);

      // Try production backend first
      let locationData = null;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/places/details?place_id=${placeId}`
        );
        const data = await response.json();
        if (data.result?.geometry?.location) {
          locationData = data.result.geometry.location;
        }
      } catch (error) {
        console.log('Backend proxy failed, trying direct API');
      }

      // Fallback to direct Google API
      if (!locationData) {
        const fallbackResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
        );
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.result?.geometry?.location) {
          locationData = fallbackData.result.geometry.location;
        }
      }

      if (locationData) {
        const newLocation = {
          latitude: locationData.lat,
          longitude: locationData.lng,
        };

        setSelectedLocation(newLocation);
        setAddress(description);
        setSearchQuery(description);

        // Extract city from description
        const parts = description.split(',');
        const cityFromDescription = parts.length > 1 ? parts[1].trim() : countryConfig.defaultCity;
        setCity(cityFromDescription);

        // Animate map to location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            ...newLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 500);
        }
      }
    } catch (error) {
      console.error('Get place details error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      setGettingCurrentLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert(isFrench
          ? 'Permission de localisation refusée. Veuillez l\'activer dans les paramètres.'
          : 'Location permission denied. Please enable it in settings.');
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
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }

      // Get address and city
      const geocodeResult = await getAddressFromCoords(newLocation.latitude, newLocation.longitude);
      setAddress(geocodeResult.address);
      setCity(geocodeResult.city);
      setSearchQuery(geocodeResult.address);

    } catch (error) {
      console.error('Get current location error:', error);
      alert(isFrench
        ? 'Impossible d\'obtenir votre position. Vérifiez que le GPS est activé.'
        : 'Unable to get your location. Please check if GPS is enabled.');
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
    const geocodeResult = await getAddressFromCoords(coordinate.latitude, coordinate.longitude);
    setAddress(geocodeResult.address);
    setCity(geocodeResult.city);
    setSearchQuery(geocodeResult.address);
    setLoading(false);
  };

  // Confirm location selection
  const confirmLocation = () => {
    onLocationSelect({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: address || searchQuery,
      city: city || countryConfig.defaultCity,
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

          {/* Search Section */}
          <View style={styles.searchSection}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.dark.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={isFrench
                  ? 'Rechercher: pharmacie, école, marché...'
                  : 'Search: pharmacy, school, market...'}
                placeholderTextColor={Colors.dark.textSecondary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                returnKeyType="search"
              />
              {searching && <ActivityIndicator size="small" color={Colors.dark.primary} />}
              {searchQuery.length > 0 && !searching && (
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSuggestions(false);
                }}>
                  <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results */}
            {showSuggestions && searchResults.length > 0 && (
              <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled">
                {searchResults.slice(0, 5).map((result) => (
                  <TouchableOpacity
                    key={result.place_id}
                    style={styles.suggestionItem}
                    onPress={() => selectPlace(result.place_id, result.description)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location-outline" size={18} color={Colors.dark.primary} />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {result.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Current Location Button */}
            <TouchableOpacity
              style={styles.currentLocationBtn}
              onPress={getCurrentLocation}
              disabled={gettingCurrentLocation}
              activeOpacity={0.7}
            >
              {gettingCurrentLocation ? (
                <ActivityIndicator size="small" color={Colors.dark.primary} />
              ) : (
                <>
                  <Ionicons name="navigate" size={20} color={Colors.dark.primary} />
                  <Text style={styles.currentLocationText}>
                    {isFrench ? 'Utiliser ma position GPS' : 'Use my GPS location'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Ionicons name="information-circle" size={16} color={Colors.dark.primary} />
            <Text style={styles.instructionsText}>
              {isFrench
                ? 'Recherchez un lieu connu OU appuyez sur la carte pour placer le marqueur'
                : 'Search for a known place OR tap on the map to place the marker'}
            </Text>
          </View>

          {/* Map or Web Fallback */}
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              // Web fallback - show a simple location input
              <View style={styles.webMapFallback}>
                <Ionicons name="map" size={48} color={Colors.dark.textSecondary} />
                <Text style={styles.webMapText}>
                  {isFrench
                    ? 'Carte disponible sur l\'application mobile'
                    : 'Map available on mobile app'}
                </Text>
                <Text style={styles.webMapSubtext}>
                  {isFrench
                    ? 'Utilisez la recherche ci-dessus pour trouver votre emplacement'
                    : 'Use the search above to find your location'}
                </Text>
                <View style={styles.coordInputs}>
                  <View style={styles.coordInput}>
                    <Text style={styles.coordLabel}>Latitude</Text>
                    <TextInput
                      style={styles.coordTextInput}
                      value={selectedLocation.latitude.toString()}
                      onChangeText={(text) => {
                        const lat = parseFloat(text) || selectedLocation.latitude;
                        setSelectedLocation(prev => ({ ...prev, latitude: lat }));
                      }}
                      keyboardType="numeric"
                      placeholder="5.36"
                      placeholderTextColor={Colors.dark.textSecondary}
                    />
                  </View>
                  <View style={styles.coordInput}>
                    <Text style={styles.coordLabel}>Longitude</Text>
                    <TextInput
                      style={styles.coordTextInput}
                      value={selectedLocation.longitude.toString()}
                      onChangeText={(text) => {
                        const lng = parseFloat(text) || selectedLocation.longitude;
                        setSelectedLocation(prev => ({ ...prev, longitude: lng }));
                      }}
                      keyboardType="numeric"
                      placeholder="-4.00"
                      placeholderTextColor={Colors.dark.textSecondary}
                    />
                  </View>
                </View>
              </View>
            ) : MapView ? (
              // Native map
              <>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  initialRegion={getInitialRegion()}
                  onPress={handleMapPress}
                  showsUserLocation
                  showsMyLocationButton={false}
                >
                  {Marker && (
                    <Marker
                      coordinate={selectedLocation}
                      draggable
                      onDragEnd={(e: any) => handleMapPress(e)}
                    >
                      <View style={styles.markerContainer}>
                        <Ionicons name="location" size={40} color={Colors.dark.primary} />
                      </View>
                    </Marker>
                  )}
                </MapView>

                {/* Floating Current Location Button on Map */}
                <TouchableOpacity
                  style={styles.mapCurrentLocationButton}
                  onPress={getCurrentLocation}
                  disabled={gettingCurrentLocation}
                >
                  {gettingCurrentLocation ? (
                    <ActivityIndicator size="small" color={Colors.dark.primary} />
                  ) : (
                    <Ionicons name="navigate" size={24} color={Colors.dark.primary} />
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.webMapFallback}>
                <Ionicons name="map" size={48} color={Colors.dark.textSecondary} />
                <Text style={styles.webMapText}>
                  {isFrench ? 'Carte non disponible' : 'Map not available'}
                </Text>
              </View>
            )}

            {/* Loading overlay */}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.dark.primary} />
                <Text style={styles.loadingText}>
                  {isFrench ? 'Chargement de l\'adresse...' : 'Loading address...'}
                </Text>
              </View>
            )}
          </View>

          {/* Selected Address */}
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={20} color={Colors.dark.primary} />
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>
                {isFrench ? 'Emplacement sélectionné' : 'Selected Location'}
              </Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {address || `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
              </Text>
              {city && (
                <Text style={styles.cityText}>
                  {isFrench ? 'Ville:' : 'City:'} {city}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  searchSection: {
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
    paddingVertical: 14,
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.text,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  currentLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCurrentLocationButton: {
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.dark.text,
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
  cityText: {
    fontSize: 12,
    color: Colors.dark.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  // Web fallback styles
  webMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
    padding: 24,
  },
  webMapText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  webMapSubtext: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  coordInputs: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    maxWidth: 300,
  },
  coordInput: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  coordTextInput: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.dark.text,
  },
});