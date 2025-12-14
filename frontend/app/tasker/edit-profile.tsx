import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import api from '../../services/api';
import { showMessage } from '../../utils/alert';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [bio, setBio] = useState(user?.tasker_profile?.bio || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showMessage('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      await api.put('/api/users/profile', { full_name: fullName, phone, city });

      if (user?.role === 'tasker') {
        await api.put('/api/taskers/profile', { bio });
      }

      await refreshUser();
      
      showMessage(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Profil mis à jour!' : 'Profile updated!'
      );
      router.back();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || 'Failed to update profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.locale === 'fr' ? 'Modifier le profil' : 'Edit Profile'}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="person" size={48} color={Colors.dark.textSecondary} />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={20} color={Colors.dark.background} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.locale === 'fr' ? 'Nom complet' : 'Full Name'}</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder={i18n.locale === 'fr' ? 'Votre nom' : 'Your name'} placeholderTextColor={Colors.dark.textSecondary} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.locale === 'fr' ? 'Téléphone' : 'Phone'}</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+225 XX XX XX XX" placeholderTextColor={Colors.dark.textSecondary} keyboardType="phone-pad" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.locale === 'fr' ? 'Ville' : 'City'}</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder={i18n.locale === 'fr' ? 'Votre ville' : 'Your city'} placeholderTextColor={Colors.dark.textSecondary} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.locale === 'fr' ? 'Bio / À propos' : 'Bio / About'}</Text>
              <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder={i18n.locale === 'fr' ? 'Parlez-nous de vous...' : 'Tell us about yourself...'} placeholderTextColor={Colors.dark.textSecondary} multiline numberOfLines={4} textAlignVertical="top" />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, loading && styles.saveBtnDisabled]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.dark.background} /> : <Text style={styles.saveBtnText}>{i18n.locale === 'fr' ? 'Enregistrer' : 'Save Changes'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text },
  scrollView: { flex: 1, padding: 24 },
  imageSection: { alignItems: 'center', marginBottom: 32 },
  imageContainer: { position: 'relative' },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  placeholderImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.dark.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.dark.background },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.dark.textSecondary },
  input: { backgroundColor: Colors.dark.card, borderRadius: 12, padding: 16, fontSize: 16, color: Colors.dark.text, borderWidth: 1, borderColor: Colors.dark.border },
  textArea: { minHeight: 120, paddingTop: 16 },
  saveBtn: { backgroundColor: Colors.dark.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: Colors.dark.background },
});
