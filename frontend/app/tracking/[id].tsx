import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { taskAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';

// MapView requires custom dev build - not available in Expo Go
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

// Maps only work in custom dev builds, not Expo Go
const MAPS_AVAILABLE = false; // Set to true when using custom dev build

export default function TrackingScreen() {
  const router = useRouter();
  const { id: taskId, mode } = useLocalSearchParams();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  const [startingJourney, setStartingJourney] = useState(false);

  const isTasker = mode === 'tasker';

  useEffect(() => {
    initializeTracking();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Poll for updates when client is tracking
  useEffect(() => {
    if (!isTasker && trackingData?.en_route) {
      const interval = setInterval(fetchTrackingData, 5000);
      return () => clearInterval(interval);
    }
  }, [isTasker, trackingData]);

  const initializeTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          i18n.locale === 'fr' ? 'Permission requise' : 'Permission Required',
          i18n.locale === 'fr' 
            ? 'L\'accès à la localisation est requis pour cette fonctionnalité'
            : 'Location access is required for this feature'
        );
        router.back();
        return;
      }

      if (isTasker) {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }

      await fetchTrackingData();
      setLoading(false);
    } catch (error) {
      console.error('Error initializing tracking:', error);
      setLoading(false);
    }
  };

  const fetchTrackingData = async () => {
    try {
      const data = await taskAPI.getTaskLocation(taskId as string);
      setTrackingData(data);
      
      if (data.en_route && mapRef.current) {
        // Fit map to show both locations
        const markers = [];
        if (data.tasker_location) {
          markers.push(data.tasker_location);
        }
        if (data.client_location) {
          markers.push(data.client_location);
        }
        
        if (markers.length === 2) {
          mapRef.current.fitToCoordinates(markers, {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    }
  };

  const handleStartJourney = async () => {
    try {
      setStartingJourney(true);
      const location = await Location.getCurrentPositionAsync({});
      
      await taskAPI.startJourney(
        taskId as string,
        location.coords.latitude,
        location.coords.longitude
      );

      // Start location tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (newLocation) => {
          const newCoords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          setCurrentLocation(newCoords);
          
          // Update backend
          try {
            await taskAPI.updateLocation(
              taskId as string,
              newLocation.coords.latitude,
              newLocation.coords.longitude
            );
          } catch (error) {
            console.error('Error updating location:', error);
          }
        }
      );

      setLocationSubscription(subscription);
      await fetchTrackingData();
      setStartingJourney(false);
    } catch (error) {
      console.error('Error starting journey:', error);
      setStartingJourney(false);
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' 
          ? 'Impossible de démarrer le trajet'
          : 'Failed to start journey'
      );
    }
  };

  const handleArrival = async () => {
    try {
      await taskAPI.markArrival(taskId as string);
      
      if (locationSubscription) {
        locationSubscription.remove();
      }

      Alert.alert(
        i18n.locale === 'fr' ? 'Arrivée confirmée' : 'Arrival Confirmed',
        i18n.locale === 'fr' 
          ? 'Vous pouvez maintenant commencer le travail'
          : 'You can now start the work',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error marking arrival:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  const initialRegion = trackingData?.client_location 
    ? {
        latitude: trackingData.client_location.latitude,
        longitude: trackingData.client_location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 5.36,
        longitude: -4.00,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {isTasker 
              ? (i18n.locale === 'fr' ? 'Navigation' : 'Navigation')
              : (i18n.locale === 'fr' ? 'Suivi du trajet' : 'Track Route')}
          </Text>
          {trackingData?.en_route && (
            <Text style={styles.headerSubtitle}>
              {trackingData.distance_km ? `${trackingData.distance_km} km` : ''} 
              {trackingData.eta_minutes ? ` • ${trackingData.eta_minutes} min` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Map or Web Fallback */}
      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Ionicons name="map" size={64} color={Colors.dark.textSecondary} />
          <Text style={styles.webFallbackTitle}>
            {i18n.locale === 'fr' ? 'Carte GPS' : 'GPS Map'}
          </Text>
          <Text style={styles.webFallbackText}>
            {i18n.locale === 'fr' 
              ? 'Le suivi GPS en temps réel est disponible uniquement sur mobile. Scannez le code QR avec Expo Go pour tester cette fonctionnalité.'
              : 'Real-time GPS tracking is only available on mobile. Scan the QR code with Expo Go to test this feature.'}
          </Text>
          {trackingData?.en_route && (
            <View style={styles.webTrackingInfo}>
              <Text style={styles.webTrackingLabel}>
                {i18n.locale === 'fr' ? 'Distance' : 'Distance'}: {trackingData.distance_km ? `${trackingData.distance_km} km` : '--'}
              </Text>
              <Text style={styles.webTrackingLabel}>
                {i18n.locale === 'fr' ? 'Temps estimé' : 'ETA'}: {trackingData.eta_minutes ? `${trackingData.eta_minutes} min` : '--'}
              </Text>
            </View>
          )}
        </View>
      ) : MapView ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Client Location Marker */}
          {trackingData?.client_location && (
            <Marker
              coordinate={trackingData.client_location}
              title={i18n.locale === 'fr' ? 'Destination' : 'Destination'}
              description={i18n.locale === 'fr' ? 'Emplacement du client' : 'Client location'}
              pinColor={Colors.dark.primary}
            >
              <View style={styles.clientMarker}>
                <Ionicons name="location" size={32} color={Colors.dark.primary} />
              </View>
            </Marker>
          )}

          {/* Tasker Location Marker */}
          {trackingData?.en_route && trackingData?.tasker_location && (
            <Marker
              coordinate={trackingData.tasker_location}
              title={i18n.locale === 'fr' ? 'Tâcheron' : 'Tasker'}
              description={i18n.locale === 'fr' ? 'Emplacement actuel' : 'Current location'}
            >
              <View style={styles.taskerMarker}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Route Line */}
          {trackingData?.en_route && trackingData?.tasker_location && trackingData?.client_location && (
            <Polyline
              coordinates={[trackingData.tasker_location, trackingData.client_location]}
              strokeColor={Colors.dark.primary}
              strokeWidth={4}
              lineDashPattern={[10, 5]}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.webFallback}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.webFallbackText}>
            {i18n.locale === 'fr' ? 'Chargement de la carte...' : 'Loading map...'}
          </Text>
        </View>
      )}

      {/* Info Card */}
      {trackingData?.en_route && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="navigate" size={20} color={Colors.dark.primary} />
            <Text style={styles.infoLabel}>
              {i18n.locale === 'fr' ? 'Distance' : 'Distance'}:
            </Text>
            <Text style={styles.infoValue}>
              {trackingData.distance_km ? `${trackingData.distance_km} km` : '--'}
            </Text>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color={Colors.dark.primary} />
            <Text style={styles.infoLabel}>
              {i18n.locale === 'fr' ? 'Temps estimé' : 'ETA'}:
            </Text>
            <Text style={styles.infoValue}>
              {trackingData.eta_minutes ? `${trackingData.eta_minutes} min` : '--'}
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {isTasker && !trackingData?.en_route && (
        <TouchableOpacity
          style={[styles.actionButton, startingJourney && styles.actionButtonDisabled]}
          onPress={handleStartJourney}
          disabled={startingJourney}
          activeOpacity={0.7}
        >
          {startingJourney ? (
            <ActivityIndicator size="small" color={Colors.dark.background} />
          ) : (
            <>
              <Ionicons name="navigate" size={20} color={Colors.dark.background} />
              <Text style={styles.actionButtonText}>
                {i18n.locale === 'fr' ? 'Commencer le trajet' : 'Start Journey'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {isTasker && trackingData?.en_route && (
        <TouchableOpacity
          style={[styles.actionButton, styles.arrivalButton]}
          onPress={handleArrival}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-circle" size={20} color={Colors.dark.background} />
          <Text style={styles.actionButtonText}>
            {i18n.locale === 'fr' ? 'Je suis arrivé' : 'I\'ve Arrived'}
          </Text>
        </TouchableOpacity>
      )}

      {!isTasker && !trackingData?.en_route && (
        <View style={styles.waitingCard}>
          <Ionicons name="time-outline" size={48} color={Colors.dark.textSecondary} />
          <Text style={styles.waitingText}>
            {i18n.locale === 'fr' 
              ? 'En attente que le tâcheron démarre le trajet...'
              : 'Waiting for tasker to start journey...'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.dark.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  clientMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskerMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  infoCard: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  actionButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: Colors.dark.primary,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonDisabled: {
    backgroundColor: Colors.dark.border,
  },
  arrivalButton: {
    backgroundColor: Colors.dark.success,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  waitingCard: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  waitingText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: 32,
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  webFallbackText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  webTrackingInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
  },
  webTrackingLabel: {
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
});
