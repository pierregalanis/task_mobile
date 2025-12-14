import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { taskAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log('react-native-maps not available');
  }
}

export default function TrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const mapRef = useRef<any>(null);

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taskerLocation, setTaskerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [clientLocation, setClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    fetchTask();
    getCurrentLocation();
    const interval = setInterval(pollTaskerLocation, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchTask = async () => {
    try {
      const data = await taskAPI.getTask(id as string);
      setTask(data);
      if (data.tasker_latitude && data.tasker_longitude) {
        setTaskerLocation({ latitude: data.tasker_latitude, longitude: data.tasker_longitude });
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      showMessage('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setClientLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const pollTaskerLocation = async () => {
    if (!id) return;
    try {
      const data = await taskAPI.getTaskLocation(id as string);
      if (data.latitude && data.longitude) {
        setTaskerLocation({ latitude: data.latitude, longitude: data.longitude });
      }
    } catch (error) {
      console.log('Error polling location:', error);
    }
  };

  const startTracking = async () => {
    if (user?.role !== 'tasker') return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showMessage('Permission needed', 'Location permission is required');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      await taskAPI.startJourney(id as string, location.coords.latitude, location.coords.longitude);
      setIsTracking(true);
      showMessage('Started', 'Client can now track your location');
    } catch (error) {
      console.error('Error starting tracking:', error);
      showMessage('Error', 'Failed to start tracking');
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;
  }

  const defaultRegion = {
    latitude: clientLocation?.latitude || taskerLocation?.latitude || 5.36,
    longitude: clientLocation?.longitude || taskerLocation?.longitude || -4.0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.locale === 'fr' ? 'Suivi en direct' : 'Live Tracking'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' && MapView ? (
          <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={defaultRegion} showsUserLocation showsMyLocationButton>
            {taskerLocation && <Marker coordinate={taskerLocation} title="Tasker" pinColor={Colors.dark.primary} />}
            {clientLocation && <Marker coordinate={clientLocation} title="You" pinColor="#3b82f6" />}
            {taskerLocation && clientLocation && <Polyline coordinates={[taskerLocation, clientLocation]} strokeColor={Colors.dark.primary} strokeWidth={3} />}
          </MapView>
        ) : (
          <View style={styles.webMapPlaceholder}>
            <Ionicons name="map" size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.webMapText}>{i18n.locale === 'fr' ? 'Carte non disponible sur le web' : 'Map not available on web'}</Text>
            {taskerLocation && <Text style={styles.locationText}>Tasker: {taskerLocation.latitude.toFixed(4)}, {taskerLocation.longitude.toFixed(4)}</Text>}
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.taskTitle}>{task?.title}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: task?.status === 'in_progress' ? '#8b5cf6' : Colors.dark.primary }]}>
            <Text style={styles.statusText}>{task?.status === 'in_progress' ? (i18n.locale === 'fr' ? 'En route' : 'On the way') : task?.status}</Text>
          </View>
        </View>
        {user?.role === 'tasker' && !isTracking && (
          <TouchableOpacity style={styles.startBtn} onPress={startTracking}>
            <Ionicons name="navigate" size={20} color={Colors.dark.background} />
            <Text style={styles.startBtnText}>{i18n.locale === 'fr' ? 'Démarrer le suivi' : 'Start Tracking'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  webMapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.card },
  webMapText: { fontSize: 16, color: Colors.dark.textSecondary, marginTop: 16 },
  locationText: { fontSize: 14, color: Colors.dark.primary, marginTop: 8 },
  infoCard: { padding: 20, backgroundColor: Colors.dark.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  taskTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text, marginBottom: 12 },
  statusRow: { flexDirection: 'row', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 14, fontWeight: '600', color: Colors.dark.background },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.primary, paddingVertical: 14, borderRadius: 12, gap: 8 },
  startBtnText: { fontSize: 16, fontWeight: '600', color: Colors.dark.background },
});
