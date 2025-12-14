import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import api, { categoryAPI } from '../../services/api';
import { CATEGORIES, getCategoryName, getSubcategoryName } from '../../constants/Categories';

interface Service {
  category: string;
  subcategory: string;
  hourly_rate: number;
  bio: string;
  max_travel_distance: number;
}

export default function ManageServicesScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>(user?.tasker_profile?.services || []);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categories, setCategories] = useState<any[]>(CATEGORIES);
  
  // New service form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [newRate, setNewRate] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newDistance, setNewDistance] = useState('10');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoryAPI.getCategories();
      if (data?.length > 0) {
        setCategories(data);
      }
    } catch (error) {
      console.log('Using default categories');
    }
  };

  const handleSaveService = async (index: number, updatedService: Service) => {
    try {
      setLoading(true);
      const updatedServices = [...services];
      updatedServices[index] = updatedService;
      
      // Use tasker-specific profile endpoint
      await api.put('/api/taskers/profile', {
        services: updatedServices,
      });

      setServices(updatedServices);
      await refreshUser();
      setExpandedIndex(null);
      
      Alert.alert(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Service mis à jour!' : 'Service updated!'
      );
    } catch (error: any) {
      console.error('Error saving service:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveService = async (index: number) => {
    Alert.alert(
      i18n.locale === 'fr' ? 'Supprimer le service?' : 'Remove service?',
      i18n.locale === 'fr' ? 'Cette action est irréversible.' : 'This action cannot be undone.',
      [
        { text: i18n.locale === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: i18n.locale === 'fr' ? 'Supprimer' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const updatedServices = services.filter((_, i) => i !== index);
              
              await api.put('/api/users/profile', {
                tasker_profile: {
                  ...user?.tasker_profile,
                  services: updatedServices,
                },
              });

              setServices(updatedServices);
              await refreshUser();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to remove');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddService = async () => {
    if (!selectedCategory || !selectedSubcategory || !newRate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const newService: Service = {
        category: selectedCategory,
        subcategory: selectedSubcategory,
        hourly_rate: parseInt(newRate),
        bio: newBio,
        max_travel_distance: parseInt(newDistance) || 10,
      };

      const updatedServices = [...services, newService];
      
      await api.put('/api/users/profile', {
        tasker_profile: {
          ...user?.tasker_profile,
          services: updatedServices,
        },
      });

      setServices(updatedServices);
      await refreshUser();
      setShowAddModal(false);
      resetNewServiceForm();
      
      Alert.alert('Success', 'Service added!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  const resetNewServiceForm = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setNewRate('');
    setNewBio('');
    setNewDistance('10');
  };

  const getSelectedCategorySubcategories = () => {
    const category = categories.find(c => c.id === selectedCategory);
    return category?.subcategories || [];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Gérer mes services' : 'Manage Services'}
        </Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={Colors.dark.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyTitle}>
              {i18n.locale === 'fr' ? 'Aucun service' : 'No services yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {i18n.locale === 'fr' ? 'Ajoutez vos services pour commencer' : 'Add your services to get started'}
            </Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={20} color={Colors.dark.background} />
              <Text style={styles.addFirstBtnText}>
                {i18n.locale === 'fr' ? 'Ajouter un service' : 'Add Service'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          services.map((service, index) => (
            <ServiceCard
              key={index}
              service={service}
              isExpanded={expandedIndex === index}
              onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
              onSave={(updated) => handleSaveService(index, updated)}
              onRemove={() => handleRemoveService(index)}
              loading={loading}
              categories={categories}
            />
          ))
        )}
      </ScrollView>

      {/* Add Service Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {i18n.locale === 'fr' ? 'Ajouter un service' : 'Add Service'}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetNewServiceForm(); }}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Category Selection */}
              <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Catégorie' : 'Category'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                    onPress={() => { setSelectedCategory(cat.id); setSelectedSubcategory(''); }}
                  >
                    <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                      {getCategoryName(cat, i18n.locale)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Subcategory Selection */}
              {selectedCategory && (
                <>
                  <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Sous-catégorie' : 'Subcategory'}</Text>
                  <View style={styles.subcategoryGrid}>
                    {getSelectedCategorySubcategories().map((sub: any) => (
                      <TouchableOpacity
                        key={sub.id || sub.name_en}
                        style={[styles.subcategoryChip, selectedSubcategory === (sub.id || sub.name_en) && styles.subcategoryChipActive]}
                        onPress={() => setSelectedSubcategory(sub.id || sub.name_en)}
                      >
                        <Text style={[styles.subcategoryChipText, selectedSubcategory === (sub.id || sub.name_en) && styles.subcategoryChipTextActive]}>
                          {getSubcategoryName(sub, i18n.locale)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Rate */}
              <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Tarif horaire (XOF)' : 'Hourly Rate (XOF)'}</Text>
              <TextInput
                style={styles.modalInput}
                value={newRate}
                onChangeText={setNewRate}
                placeholder="5000"
                placeholderTextColor={Colors.dark.textSecondary}
                keyboardType="numeric"
              />

              {/* Bio */}
              <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Description du service' : 'Service Description'}</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={newBio}
                onChangeText={setNewBio}
                placeholder={i18n.locale === 'fr' ? 'Décrivez votre expertise...' : 'Describe your expertise...'}
                placeholderTextColor={Colors.dark.textSecondary}
                multiline
                numberOfLines={3}
              />

              {/* Max Distance */}
              <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Distance max (km)' : 'Max Distance (km)'}</Text>
              <TextInput
                style={styles.modalInput}
                value={newDistance}
                onChangeText={setNewDistance}
                placeholder="10"
                placeholderTextColor={Colors.dark.textSecondary}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, loading && { opacity: 0.7 }]}
                onPress={handleAddService}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.dark.background} />
                ) : (
                  <Text style={styles.modalSaveBtnText}>
                    {i18n.locale === 'fr' ? 'Ajouter' : 'Add Service'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Service Card Component
function ServiceCard({ service, isExpanded, onToggle, onSave, onRemove, loading, categories }: any) {
  const [rate, setRate] = useState(service.hourly_rate?.toString() || '');
  const [bio, setBio] = useState(service.bio || '');
  const [distance, setDistance] = useState(service.max_travel_distance?.toString() || '10');

  const category = categories.find((c: any) => c.id === service.category);
  const subcategory = category?.subcategories?.find((s: any) => s.id === service.subcategory || s.name_en === service.subcategory);

  return (
    <View style={styles.serviceCard}>
      <TouchableOpacity style={styles.serviceHeader} onPress={onToggle}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceIcon}>{category?.icon || '📦'}</Text>
          <View>
            <Text style={styles.serviceName}>
              {subcategory ? getSubcategoryName(subcategory, i18n.locale) : service.subcategory}
            </Text>
            <Text style={styles.serviceCategory}>
              {category ? getCategoryName(category, i18n.locale) : service.category}
            </Text>
          </View>
        </View>
        <View style={styles.serviceRight}>
          <Text style={styles.serviceRate}>{service.hourly_rate?.toLocaleString()} XOF/h</Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.dark.textSecondary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.serviceSettings}>
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{i18n.locale === 'fr' ? '💰 Tarif horaire:' : '💰 Hourly Rate:'}</Text>
            <TextInput
              style={styles.settingInput}
              value={rate}
              onChangeText={setRate}
              keyboardType="numeric"
              placeholder="XOF/hr"
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{i18n.locale === 'fr' ? '📝 Description:' : '📝 Description:'}</Text>
            <TextInput
              style={[styles.settingInput, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              placeholder={i18n.locale === 'fr' ? 'Décrivez votre service...' : 'Describe your service...'}
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{i18n.locale === 'fr' ? '📍 Distance max:' : '📍 Max Distance:'}</Text>
            <TextInput
              style={styles.settingInput}
              value={distance}
              onChangeText={setDistance}
              keyboardType="numeric"
              placeholder="km"
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          <View style={styles.serviceActions}>
            <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
              <Text style={styles.removeBtnText}>{i18n.locale === 'fr' ? 'Supprimer' : 'Remove'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveServiceBtn, loading && { opacity: 0.7 }]}
              onPress={() => onSave({
                ...service,
                hourly_rate: parseInt(rate) || 0,
                bio,
                max_travel_distance: parseInt(distance) || 10,
              })}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.dark.background} />
              ) : (
                <Text style={styles.saveServiceBtnText}>{i18n.locale === 'fr' ? 'Sauvegarder' : 'Save'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 8 },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  addFirstBtnText: { fontSize: 16, fontWeight: '600', color: Colors.dark.background },
  serviceCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  serviceInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { fontSize: 28 },
  serviceName: { fontSize: 16, fontWeight: '600', color: Colors.dark.text },
  serviceCategory: { fontSize: 13, color: Colors.dark.textSecondary },
  serviceRight: { alignItems: 'flex-end', gap: 4 },
  serviceRate: { fontSize: 14, fontWeight: '600', color: Colors.dark.primary },
  serviceSettings: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  settingGroup: { marginBottom: 16 },
  settingLabel: { fontSize: 14, color: Colors.dark.textSecondary, marginBottom: 8 },
  settingInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  serviceActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  removeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: Colors.dark.error,
  },
  removeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.dark.error },
  saveServiceBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
  },
  saveServiceBtnText: { fontSize: 14, fontWeight: '600', color: Colors.dark.background },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: Colors.dark.textSecondary, marginBottom: 8, marginTop: 16 },
  categoryScroll: { marginBottom: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  categoryChipActive: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  categoryChipIcon: { fontSize: 16 },
  categoryChipText: { fontSize: 14, color: Colors.dark.text },
  categoryChipTextActive: { color: Colors.dark.background },
  subcategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subcategoryChip: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  subcategoryChipActive: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  subcategoryChipText: { fontSize: 13, color: Colors.dark.text },
  subcategoryChipTextActive: { color: Colors.dark.background },
  modalInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalSaveBtn: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  modalSaveBtnText: { fontSize: 16, fontWeight: '600', color: Colors.dark.background },
});
