import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';

// Conditionally import MapView only for native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface MapPickerProps {
  initialLocation?: Location;
  onLocationSelect: (location: Location) => void;
  error?: boolean;
  country?: string;
}

export default function MapPicker({
  initialLocation,
  onLocationSelect,
  error = false,
  country = 'CI', // Default to Ivory Coast
}: MapPickerProps) {
  const [markerPosition, setMarkerPosition] = useState<Location | null>(
    initialLocation || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapRef = useRef<any>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    if (initialLocation) {
      setMarkerPosition(initialLocation);
    }
  }, [initialLocation]);

  // Google Places Autocomplete Search
  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearching(true);
      // Using Google Places API
      const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&components=country:${country}&key=${GOOGLE_PLACES_API_KEY}`
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

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchPlaces(text);
    }, 500);
  };

  const selectPlace = async (placeId: string, description: string) => {
    try {
      const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY'; // TODO: Add to env
      
      // Get place details to get coordinates
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.result?.geometry?.location) {
        const location: Location = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          address: description,
        };
        
        setMarkerPosition(location);
        setSearchQuery(description);
        setShowSuggestions(false);
        onLocationSelect(location);
        
        // Animate map to location
        if (mapRef.current && Platform.OS !== 'web') {
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

  const handleMapPress = (event: any) => {
    if (Platform.OS === 'web') return;
    
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const location: Location = {
      latitude,
      longitude,
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };
    
    setMarkerPosition(location);
    onLocationSelect(location);
  };

  const handleMarkerDragEnd = (event: any) => {
    if (Platform.OS === 'web') return;
    
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const location: Location = {
      latitude,
      longitude,
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };
    
    setMarkerPosition(location);
    onLocationSelect(location);
  };

  const defaultRegion = {
    latitude: markerPosition?.latitude || 5.36, // Abidjan
    longitude: markerPosition?.longitude || -4.00,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, error && styles.containerError]}>
        <Text style={styles.webMessage}>
          {i18n.locale === 'fr'
            ? 'La carte interactive est disponible sur mobile uniquement. Veuillez entrer votre adresse manuellement.'
            : 'Interactive map is only available on mobile. Please enter your address manually.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, error && styles.containerError]}>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.dark.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.locale === 'fr' ? 'Rechercher un lieu...' : 'Search for a place...'}
          placeholderTextColor={Colors.dark.textSecondary}
          value={searchQuery}
          onChangeText={handleSearchChange}
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
              <Text style={styles.suggestionText}>{result.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Map */}
      {MapView && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={defaultRegion}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {markerPosition && (
            <Marker
              coordinate={{
                latitude: markerPosition.latitude,
                longitude: markerPosition.longitude,
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
      )}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        {markerPosition ? (
          <>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
              <Text style={styles.successText}>
                {i18n.locale === 'fr' ? 'Emplacement sélectionné' : 'Location selected'}
              </Text>
            </View>
            <Text style={styles.coordinatesText}>
              {markerPosition.latitude.toFixed(6)}, {markerPosition.longitude.toFixed(6)}
            </Text>
          </>
        ) : (
          <View style={styles.instructionBadge}>
            <Ionicons name="information-circle" size={16} color={Colors.dark.primary} />
            <Text style={styles.instructionText}>
              {i18n.locale === 'fr'
                ? 'Recherchez ou appuyez sur la carte pour placer un marqueur'
                : 'Search or tap on the map to place a marker'}
            </Text>
          </View>
        )}
      </View>

      {error && !markerPosition && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={Colors.dark.error} />
          <Text style={styles.errorText}>
            {i18n.locale === 'fr'
              ? 'Veuillez sélectionner un emplacement'
              : 'Please select a location'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  containerError: {
    borderColor: Colors.dark.error,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: Colors.dark.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
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
  map: {
    height: 300,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsContainer: {
    padding: 12,
    backgroundColor: Colors.dark.background,
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  coordinatesText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginLeft: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorText: {
    fontSize: 12,
    color: Colors.dark.error,
  },
  webMessage: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    padding: 24,
  },
});
