import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { taskAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';

// Maps are only available on native platforms
const isWeb = Platform.OS === 'web';
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;
let isMapAvailable = false;

// Only load maps on native
if (!isWeb) {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
    isMapAvailable = true;
  } catch (e) {
    console.log('Maps not available');
  }
}

// Status types for tracking
type TrackingStatus = 'assigned' | 'pending' | 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed';

export default function TrackingScreen() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { user } = useAuth();
  const mapRef = useRef<any>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taskerLocation, setTaskerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [clientLocation, setClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('pending');
  const [isTracking, setIsTracking] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const isTasker = user?.role === 'tasker';
  const isClient = user?.role === 'client';
  const isFrench = i18n.locale === 'fr';

  // Fetch task on mount
  useEffect(() => {
    fetchTask();
    if (isClient) {
      getCurrentLocation();
    }
  }, [id]);

  // Set up polling for client to get tasker location
  useEffect(() => {
    if (isClient && id && (trackingStatus === 'en_route' || trackingStatus === 'in_progress')) {
      const interval = setInterval(pollTaskerLocation, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [id, isClient, trackingStatus]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - refresh data
        fetchTask();
        if (isClient) pollTaskerLocation();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // Cleanup location subscription on unmount
  useEffect(() => {
    return () => {
      stopContinuousTracking();
    };
  }, []);

  const fetchTask = async () => {
    try {
      // Fetch task from the list since getTask might need different handling
      const tasks = isClient 
        ? await taskAPI.getClientTasks()
        : await taskAPI.getTaskerTasks();
      
      const foundTask = tasks?.find((t: any) => t.id === id);
      
      if (foundTask) {
        setTask(foundTask);
        
        // Set tracking status based on task status
        setTrackingStatus(foundTask.status as TrackingStatus);
        
        // If tasker location is in task data
        if (foundTask.tasker_latitude && foundTask.tasker_longitude) {
          setTaskerLocation({ 
            latitude: foundTask.tasker_latitude, 
            longitude: foundTask.tasker_longitude 
          });
        }
        
        // If client location is in task data
        if (foundTask.latitude && foundTask.longitude) {
          setClientLocation({
            latitude: foundTask.latitude,
            longitude: foundTask.longitude
          });
        }
        
        // Check if tracking is active
        setIsTracking(['en_route', 'in_progress'].includes(foundTask.status));
      }
      
    } catch (error) {
      console.error('Error fetching task:', error);
      showMessage(
        isFrench ? 'Erreur' : 'Error', 
        isFrench ? 'Impossible de charger les détails' : 'Failed to load task details'
      );
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setClientLocation({ 
        latitude: location.coords.latitude, 
        longitude: location.coords.longitude 
      });
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const pollTaskerLocation = async () => {
    if (!id) return;
    try {
      const data = await taskAPI.getTaskerLocation(id as string);
      if (data?.tracking_available && data?.location) {
        const newLocation = { latitude: data.location.latitude, longitude: data.location.longitude };
        setTaskerLocation(newLocation);

        // Calculate distance and ETA if we have both locations
        if (clientLocation) {
          const dist = calculateDistance(
            newLocation.latitude,
            newLocation.longitude,
            clientLocation.latitude,
            clientLocation.longitude
          );
          setDistance(dist);
          setEta(calculateETA(dist));
        }

        // Update map to fit markers
        fitMapToMarkers(newLocation, clientLocation);
      }
      
      // Also refresh task status
      const tasks = await taskAPI.getClientTasks();
      const taskData = tasks?.find((t: any) => t.id === id);
      if (taskData) {
        setTrackingStatus(taskData.status as TrackingStatus);
        setTask(taskData);
      }
      
    } catch (error) {
      console.log('Error polling location:', error);
    }
  };

  // Calculate distance between two points (Haversine formula)
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

  // Calculate ETA based on distance (assuming ~30 km/h average speed in city)
  const calculateETA = (distanceKm: number) => {
    const avgSpeedKmH = 30;
    const timeHours = distanceKm / avgSpeedKmH;
    const timeMinutes = Math.round(timeHours * 60);
    
    if (timeMinutes < 1) return isFrench ? '< 1 min' : '< 1 min';
    if (timeMinutes < 60) return `${timeMinutes} min`;
    const hours = Math.floor(timeMinutes / 60);
    const mins = timeMinutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Fit map to show both markers
  const fitMapToMarkers = (taskerLoc: any, clientLoc: any) => {
    if (!mapRef.current || !taskerLoc || !clientLoc) return;
    
    mapRef.current.fitToCoordinates([taskerLoc, clientLoc], {
      edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
      animated: true,
    });
  };

  // === TASKER ACTIONS ===

  // Start Tracking - Tasker begins heading to client
  const handleStartTracking = async () => {
    try {
      setActionLoading('start');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showMessage(
          isFrench ? 'Permission requise' : 'Permission needed',
          isFrench ? 'L\'accès à la localisation est nécessaire' : 'Location access is required'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Start tracking on the server
      await taskAPI.startTracking(id as string);
      
      // Send initial location
      await taskAPI.updateLocation(
        id as string, 
        location.coords.latitude, 
        location.coords.longitude
      );
      
      setTaskerLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setIsTracking(true);
      setTrackingStatus('en_route');
      
      // Start continuous location updates
      startContinuousTracking();
      
      showMessage(
        isFrench ? 'En route!' : 'On the way!',
        isFrench ? 'Le client peut maintenant suivre votre position' : 'The client can now track your location'
      );
      
      fetchTask();
    } catch (error: any) {
      console.error('Error starting tracking:', error);
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        error.response?.data?.detail || (isFrench ? 'Impossible de démarrer' : 'Failed to start')
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Start continuous location tracking for tasker
  const startContinuousTracking = async () => {
    try {
      // Remove existing subscription
      stopContinuousTracking();

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 20, // Or when moved 20 meters
        },
        async (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setTaskerLocation(newLocation);
          
          // Send location update to server
          try {
            await taskAPI.updateLocation(
              id as string,
              location.coords.latitude,
              location.coords.longitude
            );
          } catch (e) {
            console.log('Error updating location:', e);
          }
        }
      );
    } catch (error) {
      console.error('Error starting continuous tracking:', error);
    }
  };

  // Stop tracking
  const stopContinuousTracking = async () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    
    // Notify server to stop tracking
    if (id && isTracking) {
      try {
        await taskAPI.stopTracking(id as string);
      } catch (e) {
        console.log('Error stopping tracking on server:', e);
      }
    }
  };

  // Mark Arrival - Tasker has arrived at location
  const handleMarkArrival = async () => {
    try {
      setActionLoading('arrival');
      
      await taskAPI.markArrival(id as string);
      setTrackingStatus('arrived');
      
      showMessage(
        isFrench ? 'Arrivé!' : 'Arrived!',
        isFrench ? 'Le client a été notifié de votre arrivée' : 'The client has been notified of your arrival'
      );
      
      fetchTask();
    } catch (error: any) {
      console.error('Error marking arrival:', error);
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        error.response?.data?.detail || (isFrench ? 'Impossible de marquer l\'arrivée' : 'Failed to mark arrival')
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Start Work - Tasker begins the actual task
  const handleStartWork = async () => {
    try {
      setActionLoading('work');
      
      // Stop GPS tracking
      stopContinuousTracking();
      
      // Start the work timer
      await taskAPI.startTimer(id as string);
      setTrackingStatus('in_progress');
      
      showMessage(
        isFrench ? 'Travail commencé!' : 'Work started!',
        isFrench ? 'Le chronomètre est en marche' : 'Timer is running'
      );
      
      // Navigate to task details
      router.replace(`/task/${id}`);
    } catch (error: any) {
      console.error('Error starting work:', error);
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        error.response?.data?.detail || (isFrench ? 'Impossible de démarrer le travail' : 'Failed to start work')
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Open Maps for directions
  const openMapsForDirections = () => {
    const destLat = task?.latitude || clientLocation?.latitude;
    const destLng = task?.longitude || clientLocation?.longitude;
    
    if (!destLat || !destLng) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Adresse non disponible' : 'Address not available'
      );
      return;
    }

    const destination = `${destLat},${destLng}`;
    const label = encodeURIComponent(task?.address || 'Destination');
    
    // Open in Google Maps or Apple Maps based on platform
    const url = Platform.select({
      ios: `maps://app?daddr=${destination}&dirflg=d`,
      android: `google.navigation:q=${destination}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    });

    Linking.canOpenURL(url as string).then((supported) => {
      if (supported) {
        Linking.openURL(url as string);
      } else {
        // Fallback to Google Maps web
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
      }
    });
  };

  // Call client/tasker
  const callPerson = () => {
    const phone = isTasker ? task?.client_phone : task?.tasker_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      showMessage(
        isFrench ? 'Non disponible' : 'Not available',
        isFrench ? 'Numéro de téléphone non disponible' : 'Phone number not available'
      );
    }
  };

  // Get status display info
  const getStatusInfo = () => {
    switch (trackingStatus) {
      case 'assigned':
      case 'pending':
        return {
          color: '#f59e0b',
          icon: 'hourglass',
          text: isFrench ? 'En attente' : 'Pending',
          description: isFrench 
            ? 'La tâche n\'a pas encore été acceptée' 
            : 'Task has not been accepted yet',
        };
      case 'accepted':
        return {
          color: '#3b82f6',
          icon: 'checkmark-circle',
          text: isFrench ? 'Acceptée - Prêt à partir' : 'Accepted - Ready to go',
          description: isFrench 
            ? 'Appuyez sur "En route" pour notifier le client' 
            : 'Tap "On the way" to notify the client',
        };
      case 'en_route':
        return {
          color: '#8b5cf6',
          icon: 'car',
          text: isFrench ? 'En route' : 'On the way',
          description: isFrench 
            ? 'Le client peut suivre votre position' 
            : 'Client can track your location',
        };
      case 'arrived':
        return {
          color: Colors.dark.primary,
          icon: 'location',
          text: isFrench ? 'Arrivé' : 'Arrived',
          description: isFrench 
            ? 'Vous êtes arrivé à destination' 
            : 'You have arrived at the location',
        };
      case 'in_progress':
        return {
          color: '#f59e0b',
          icon: 'construct',
          text: isFrench ? 'Travail en cours' : 'Work in progress',
          description: isFrench 
            ? 'La tâche est en cours' 
            : 'Task is being performed',
        };
      case 'completed':
        return {
          color: Colors.dark.success,
          icon: 'checkmark-done',
          text: isFrench ? 'Terminée' : 'Completed',
          description: isFrench 
            ? 'La tâche est terminée' 
            : 'Task is complete',
        };
      default:
        return {
          color: Colors.dark.textSecondary,
          icon: 'time',
          text: isFrench ? 'En attente' : 'Pending',
          description: '',
        };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isFrench ? 'Suivi' : 'Tracking'}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.dark.error} />
          <Text style={styles.errorText}>
            {isFrench ? 'Tâche non trouvée' : 'Task not found'}
          </Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
            <Text style={styles.goBackBtnText}>{isFrench ? 'Retour' : 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const defaultRegion = {
    latitude: taskerLocation?.latitude || clientLocation?.latitude || task?.latitude || 5.36,
    longitude: taskerLocation?.longitude || clientLocation?.longitude || task?.longitude || -4.0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFrench ? 'Suivi en direct' : 'Live Tracking'}
        </Text>
        <TouchableOpacity 
          onPress={() => router.push(`/chat/${id}`)} 
          style={styles.chatBtn}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusInfo.color }]}>
        <Ionicons name={statusInfo.icon as any} size={20} color={Colors.dark.background} />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusText}>{statusInfo.text}</Text>
          {statusInfo.description && (
            <Text style={styles.statusDescription}>{statusInfo.description}</Text>
          )}
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' && MapView && isMapAvailable ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={defaultRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {/* Tasker Marker */}
            {taskerLocation && Marker && (
              <Marker
                coordinate={taskerLocation}
                title={isFrench ? 'pro' : 'Tasker'}
              >
                <View style={styles.taskerMarker}>
                  <Ionicons name="car" size={24} color={Colors.dark.background} />
                </View>
              </Marker>
            )}

            {/* Client/Destination Marker */}
            {clientLocation && Marker && (
              <Marker
                coordinate={clientLocation}
                title={isFrench ? 'Destination' : 'Destination'}
              >
                <View style={styles.destinationMarker}>
                  <Ionicons name="location" size={28} color={Colors.dark.background} />
                </View>
              </Marker>
            )}

            {/* Route Line */}
            {taskerLocation && clientLocation && Polyline && (
              <Polyline
                coordinates={[taskerLocation, clientLocation]}
                strokeColor={Colors.dark.primary}
                strokeWidth={4}
                lineDashPattern={[10, 5]}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.webMapPlaceholder}>
            <Ionicons name="map" size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.webMapText}>
              {isFrench ? 'Carte disponible sur l\'app mobile' : 'Map available on mobile app'}
            </Text>
            {taskerLocation && (
              <View style={styles.locationInfo}>
                <Ionicons name="navigate" size={20} color={Colors.dark.primary} />
                <Text style={styles.locationText}>
                  {isFrench ? 'Position du pro:' : 'Tasker location:'} {taskerLocation.latitude.toFixed(4)}, {taskerLocation.longitude.toFixed(4)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ETA Overlay - Only show for client when tasker is en route */}
        {isClient && trackingStatus === 'en_route' && (eta || distance) && (
          <View style={styles.etaOverlay}>
            <Ionicons name="time" size={20} color={Colors.dark.primary} />
            <View>
              {eta && <Text style={styles.etaText}>{eta}</Text>}
              {distance && (
                <Text style={styles.distanceText}>
                  {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Live indicator for tracking */}
        {isTracking && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{task?.title}</Text>
          <View style={styles.taskMeta}>
            <Ionicons name="location" size={16} color={Colors.dark.textSecondary} />
            <Text style={styles.taskAddress} numberOfLines={2}>{task?.address || 'N/A'}</Text>
          </View>
          {task?.client_name && isTasker && (
            <View style={styles.taskMeta}>
              <Ionicons name="person" size={16} color={Colors.dark.textSecondary} />
              <Text style={styles.taskMetaText}>{task.client_name}</Text>
            </View>
          )}
          {task?.tasker_name && isClient && (
            <View style={styles.taskMeta}>
              <Ionicons name="person" size={16} color={Colors.dark.textSecondary} />
              <Text style={styles.taskMetaText}>{task.tasker_name}</Text>
            </View>
          )}
        </View>

        {/* Tasker Actions */}
        {isTasker && (
          <View style={styles.actionsContainer}>
            {/* Quick Actions Row */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickAction} onPress={openMapsForDirections}>
                <Ionicons name="navigate" size={24} color={Colors.dark.primary} />
                <Text style={styles.quickActionText}>
                  {isFrench ? 'Directions' : 'Directions'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={callPerson}>
                <Ionicons name="call" size={24} color={Colors.dark.primary} />
                <Text style={styles.quickActionText}>
                  {isFrench ? 'Appeler' : 'Call'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction} 
                onPress={() => router.push(`/chat/${id}`)}
              >
                <Ionicons name="chatbubble" size={24} color={Colors.dark.primary} />
                <Text style={styles.quickActionText}>
                  {isFrench ? 'Message' : 'Message'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Main Action Buttons */}
            {trackingStatus === 'accepted' && (
              <TouchableOpacity
                style={[styles.mainActionBtn, { backgroundColor: '#8b5cf6' }]}
                onPress={handleStartTracking}
                disabled={actionLoading === 'start'}
              >
                {actionLoading === 'start' ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <>
                    <Ionicons name="car" size={24} color={Colors.dark.background} />
                    <Text style={styles.mainActionText}>
                      {isFrench ? 'En route' : 'On the way'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {trackingStatus === 'en_route' && (
              <TouchableOpacity
                style={[styles.mainActionBtn, { backgroundColor: Colors.dark.primary }]}
                onPress={handleMarkArrival}
                disabled={actionLoading === 'arrival'}
              >
                {actionLoading === 'arrival' ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <>
                    <Ionicons name="flag" size={24} color={Colors.dark.background} />
                    <Text style={styles.mainActionText}>
                      {isFrench ? 'Je suis arrivé' : 'I have arrived'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {trackingStatus === 'arrived' && (
              <TouchableOpacity
                style={[styles.mainActionBtn, { backgroundColor: '#f59e0b' }]}
                onPress={handleStartWork}
                disabled={actionLoading === 'work'}
              >
                {actionLoading === 'work' ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <>
                    <Ionicons name="play" size={24} color={Colors.dark.background} />
                    <Text style={styles.mainActionText}>
                      {isFrench ? 'Commencer le travail' : 'Start Work'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Client View - Show tracking status */}
        {isClient && (
          <View style={styles.clientStatusContainer}>
            {trackingStatus === 'en_route' && (
              <View style={styles.trackingIndicator}>
                <View style={styles.pulsingDot} />
                <Text style={styles.trackingText}>
                  {isFrench ? 'Le pro est en route...' : 'Tasker is on the way...'}
                </Text>
              </View>
            )}
            {trackingStatus === 'arrived' && (
              <View style={[styles.arrivalBanner, { backgroundColor: Colors.dark.primary }]}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.dark.background} />
                <Text style={styles.arrivalText}>
                  {isFrench ? 'Le pro est arrivé!' : 'Tasker has arrived!'}
                </Text>
              </View>
            )}
            {trackingStatus === 'in_progress' && (
              <View style={[styles.arrivalBanner, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="construct" size={24} color={Colors.dark.background} />
                <Text style={styles.arrivalText}>
                  {isFrench ? 'Travail en cours' : 'Work in progress'}
                </Text>
              </View>
            )}
            
            {/* Client quick actions */}
            <View style={styles.clientActions}>
              <TouchableOpacity 
                style={styles.clientActionBtn}
                onPress={() => router.push(`/chat/${id}`)}
              >
                <Ionicons name="chatbubble" size={20} color={Colors.dark.primary} />
                <Text style={styles.clientActionText}>
                  {isFrench ? 'Message' : 'Message'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.clientActionBtn}
                onPress={callPerson}
              >
                <Ionicons name="call" size={20} color={Colors.dark.primary} />
                <Text style={styles.clientActionText}>
                  {isFrench ? 'Appeler' : 'Call'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.dark.background 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: Colors.dark.background 
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  goBackBtn: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goBackBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.dark.border 
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: Colors.dark.text 
  },
  chatBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  statusDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  mapContainer: { 
    flex: 1,
    position: 'relative',
  },
  map: { 
    flex: 1 
  },
  webMapPlaceholder: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: Colors.dark.card,
    padding: 24,
  },
  webMapText: { 
    fontSize: 16, 
    color: Colors.dark.textSecondary, 
    marginTop: 16,
    textAlign: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  locationText: { 
    fontSize: 14, 
    color: Colors.dark.primary,
  },
  taskerMarker: {
    backgroundColor: '#8b5cf6',
    borderRadius: 20,
    padding: 8,
    borderWidth: 3,
    borderColor: Colors.dark.background,
  },
  destinationMarker: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 20,
    padding: 6,
    borderWidth: 3,
    borderColor: Colors.dark.background,
  },
  etaOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  etaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  liveIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  infoCard: { 
    padding: 20, 
    backgroundColor: Colors.dark.card, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
  },
  taskInfo: {
    marginBottom: 16,
  },
  taskTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: Colors.dark.text, 
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  taskAddress: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  taskMetaText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  actionsContainer: {
    gap: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  quickAction: {
    alignItems: 'center',
    padding: 12,
  },
  quickActionText: {
    fontSize: 12,
    color: Colors.dark.text,
    marginTop: 4,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  mainActionText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  clientStatusContainer: {
    gap: 12,
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8b5cf6',
  },
  trackingText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  arrivalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  arrivalText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clientActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  clientActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
});
