import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { categoryAPI, taskerAPI, imageAPI } from '../../services/api';
import { getCategoryName, getSubcategoryName } from '../../constants/Categories';
import { showMessage } from '../../utils/alert';

interface Service {
  category: string;
  subcategory: string;
  pricing_type: 'hourly' | 'fixed';
  hourly_rate: number;
  fixed_price: number;
  bio: string;
  max_travel_distance: number;
}

interface PortfolioImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  description?: string;
}

export default function ManageServicesScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>(user?.tasker_profile?.services || []);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [isAvailable, setIsAvailable] = useState(user?.tasker_profile?.is_available ?? true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [pricingType, setPricingType] = useState<'hourly' | 'fixed'>('hourly');
  const [newRate, setNewRate] = useState('');
  const [newFixedPrice, setNewFixedPrice] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newDistance, setNewDistance] = useState('10');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await categoryAPI.getCategories();
      if (data?.length > 0) {
        setCategories(data);
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleToggleAvailability = async (value: boolean) => {
    try {
      setAvailabilityLoading(true);
      setIsAvailable(value);

      // Use JSON endpoint for proper sync with website
      await taskerAPI.updateProfileJson({
        is_available: value,
      });

      await refreshUser();

      showMessage(
        i18n.locale === 'fr' ? 'Succes' : 'Success',
        value
          ? (i18n.locale === 'fr' ? 'Vous etes maintenant disponible' : 'You are now available for bookings')
          : (i18n.locale === 'fr' ? 'Vous etes maintenant indisponible' : 'You are now unavailable for bookings')
      );
    } catch (error: any) {
      console.error('Error toggling availability:', error);
      setIsAvailable(!value);
      showMessage('Error', error.response?.data?.detail || 'Failed to update availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleSaveService = async (index: number, updatedService: Service) => {
    try {
      setLoading(true);
      const updatedServices = [...services];
      updatedServices[index] = updatedService;

      // Use JSON endpoint for proper sync with website
      await taskerAPI.updateProfileJson({
        services: updatedServices,
      });

      setServices(updatedServices);
      await refreshUser();
      setExpandedIndex(null);

      showMessage(
        i18n.locale === 'fr' ? 'Succes' : 'Success',
        i18n.locale === 'fr' ? 'Service mis a jour!' : 'Service updated!'
      );
    } catch (error: any) {
      console.error('Error saving service:', error);
      showMessage('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveService = async (index: number) => {
    showMessage(
      i18n.locale === 'fr' ? 'Supprimer le service?' : 'Remove service?',
      i18n.locale === 'fr' ? 'Cette action est irreversible.' : 'This action cannot be undone.',
      [
        { text: i18n.locale === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: i18n.locale === 'fr' ? 'Supprimer' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const updatedServices = services.filter((_, i) => i !== index);

              // Use JSON endpoint for proper sync with website
              await taskerAPI.updateProfileJson({
                services: updatedServices,
              });

              setServices(updatedServices);
              await refreshUser();
            } catch (error: any) {
              showMessage('Error', error.response?.data?.detail || 'Failed to remove');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddService = async () => {
    if (!selectedCategory || !selectedSubcategory) {
      showMessage('Error', i18n.locale === 'fr' ? 'Veuillez selectionner une categorie et sous-categorie' : 'Please select a category and subcategory');
      return;
    }

    if (pricingType === 'hourly' && !newRate) {
      showMessage('Error', i18n.locale === 'fr' ? 'Veuillez entrer un tarif horaire' : 'Please enter an hourly rate');
      return;
    }

    if (pricingType === 'fixed' && !newFixedPrice) {
      showMessage('Error', i18n.locale === 'fr' ? 'Veuillez entrer un prix fixe' : 'Please enter a fixed price');
      return;
    }

    try {
      setLoading(true);
      const newService: Service = {
        category: selectedCategory,
        subcategory: selectedSubcategory,
        pricing_type: pricingType,
        hourly_rate: pricingType === 'hourly' ? parseInt(newRate) : 0,
        fixed_price: pricingType === 'fixed' ? parseInt(newFixedPrice) : 0,
        bio: newBio,
        max_travel_distance: parseInt(newDistance) || 10,
      };

      const updatedServices = [...services, newService];

      // Use JSON endpoint for proper sync with website
      await taskerAPI.updateProfileJson({
        services: updatedServices,
      });

      setServices(updatedServices);
      await refreshUser();
      setShowAddModal(false);
      resetNewServiceForm();

      showMessage('Success', i18n.locale === 'fr' ? 'Service ajoute!' : 'Service added!');
    } catch (error: any) {
      showMessage('Error', error.response?.data?.detail || 'Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  const resetNewServiceForm = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setPricingType('hourly');
    setNewRate('');
    setNewFixedPrice('');
    setNewBio('');
    setNewDistance('10');
  };

  const getSelectedCategorySubcategories = () => {
    const category = categories.find(c => c.id === selectedCategory);
    return category?.subcategories || [];
  };

  if (categoriesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18n.locale === 'fr' ? 'Gerer mes services' : 'Manage Services'}
          </Text>
          <View style={styles.addBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Gerer mes services' : 'Manage Services'}
        </Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={Colors.dark.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityInfo}>
            <View style={[styles.availabilityDot, { backgroundColor: isAvailable ? Colors.dark.success : Colors.dark.error }]} />
            <View style={styles.availabilityTextContainer}>
              <Text style={styles.availabilityTitle}>
                {i18n.locale === 'fr' ? 'Disponibilite' : 'Availability'}
              </Text>
              <Text style={styles.availabilityStatus}>
                {isAvailable
                  ? (i18n.locale === 'fr' ? 'Disponible pour les reservations' : 'Available for bookings')
                  : (i18n.locale === 'fr' ? 'Indisponible pour les reservations' : 'Not available for bookings')
                }
              </Text>
            </View>
          </View>
          {availabilityLoading ? (
            <ActivityIndicator size="small" color={Colors.dark.primary} />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
              thumbColor={isAvailable ? Colors.dark.success : Colors.dark.textSecondary}
            />
          )}
        </View>

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
              onSave={(updated: Service) => handleSaveService(index, updated)}
              onRemove={() => handleRemoveService(index)}
              loading={loading}
              categories={categories}
            />
          ))
        )}
      </ScrollView>

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

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Categorie' : 'Category'}</Text>
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

              {selectedCategory && (
                <>
                  <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Sous-categorie' : 'Subcategory'}</Text>
                  <View style={styles.subcategoryGrid}>
                    {getSelectedCategorySubcategories().map((sub: any) => (
                      <TouchableOpacity
                        key={sub.id || sub.en}
                        style={[styles.subcategoryChip, selectedSubcategory === (sub.id || sub.en) && styles.subcategoryChipActive]}
                        onPress={() => setSelectedSubcategory(sub.id || sub.en)}
                      >
                        <Text style={[styles.subcategoryChipText, selectedSubcategory === (sub.id || sub.en) && styles.subcategoryChipTextActive]}>
                          {getSubcategoryName(sub, i18n.locale)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Type de tarification' : 'Pricing Type'}</Text>
              <View style={styles.pricingTypeRow}>
                <TouchableOpacity
                  style={[styles.pricingTypeBtn, pricingType === 'hourly' && styles.pricingTypeBtnActive]}
                  onPress={() => setPricingType('hourly')}
                >
                  <Ionicons name="time-outline" size={20} color={pricingType === 'hourly' ? Colors.dark.background : Colors.dark.text} />
                  <Text style={[styles.pricingTypeBtnText, pricingType === 'hourly' && styles.pricingTypeBtnTextActive]}>
                    {i18n.locale === 'fr' ? 'Horaire' : 'Hourly'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pricingTypeBtn, pricingType === 'fixed' && styles.pricingTypeBtnActive]}
                  onPress={() => setPricingType('fixed')}
                >
                  <Ionicons name="pricetag-outline" size={20} color={pricingType === 'fixed' ? Colors.dark.background : Colors.dark.text} />
                  <Text style={[styles.pricingTypeBtnText, pricingType === 'fixed' && styles.pricingTypeBtnTextActive]}>
                    {i18n.locale === 'fr' ? 'Prix fixe' : 'Fixed Price'}
                  </Text>
                </TouchableOpacity>
              </View>

              {pricingType === 'hourly' ? (
                <>
                  <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Tarif horaire (XOF)' : 'Hourly Rate (XOF)'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newRate}
                    onChangeText={setNewRate}
                    placeholder="5000"
                    placeholderTextColor={Colors.dark.textSecondary}
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Prix fixe (XOF)' : 'Fixed Price (XOF)'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newFixedPrice}
                    onChangeText={setNewFixedPrice}
                    placeholder="25000"
                    placeholderTextColor={Colors.dark.textSecondary}
                    keyboardType="numeric"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>{i18n.locale === 'fr' ? 'Description du service' : 'Service Description'}</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={newBio}
                onChangeText={setNewBio}
                placeholder={i18n.locale === 'fr' ? 'Decrivez votre expertise...' : 'Describe your expertise...'}
                placeholderTextColor={Colors.dark.textSecondary}
                multiline
                numberOfLines={3}
              />

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

function ServiceCard({ service, isExpanded, onToggle, onSave, onRemove, loading, categories }: any) {
  const [pricingType, setPricingType] = useState<'hourly' | 'fixed'>(service.pricing_type || 'hourly');
  const [rate, setRate] = useState(service.hourly_rate?.toString() || '');
  const [fixedPrice, setFixedPrice] = useState(service.fixed_price?.toString() || '');
  const [bio, setBio] = useState(service.bio || '');
  const [distance, setDistance] = useState(service.max_travel_distance?.toString() || '10');
  
  // Portfolio state
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const category = categories.find((c: any) => c.id === service.category);
  const subcategory = category?.subcategories?.find((s: any) => s.id === service.subcategory || s.en === service.subcategory);

  const displayPrice = service.pricing_type === 'fixed'
    ? service.fixed_price?.toLocaleString() + ' XOF'
    : service.hourly_rate?.toLocaleString() + ' XOF/h';

  // Fetch portfolio images when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchPortfolioImages();
    }
  }, [isExpanded]);

  const fetchPortfolioImages = async () => {
    try {
      setPortfolioLoading(true);
      const response = await imageAPI.getWorkPortfolioByService(service.category, service.subcategory);
      setPortfolioImages(response.work_portfolio || []);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setPortfolioImages([]);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          i18n.locale === 'fr' ? 'Permission requise' : 'Permission required',
          i18n.locale === 'fr' ? 'Veuillez autoriser l\'accès à la galerie' : 'Please allow access to your photo library'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', i18n.locale === 'fr' ? 'Erreur lors de la sélection' : 'Failed to pick image');
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);
      await imageAPI.uploadWorkPortfolioImage(
        imageUri,
        service.category,
        service.subcategory,
        ''
      );
      await fetchPortfolioImages();
      Alert.alert(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Image ajoutée!' : 'Image uploaded!'
      );
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.response?.data?.detail || (i18n.locale === 'fr' ? 'Erreur lors du téléchargement' : 'Failed to upload image'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    Alert.alert(
      i18n.locale === 'fr' ? 'Supprimer l\'image?' : 'Delete image?',
      i18n.locale === 'fr' ? 'Cette action est irréversible.' : 'This action cannot be undone.',
      [
        { text: i18n.locale === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: i18n.locale === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await imageAPI.deleteWorkPortfolioImage(imageId);
              await fetchPortfolioImages();
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert('Error', i18n.locale === 'fr' ? 'Erreur lors de la suppression' : 'Failed to delete image');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.serviceCard}>
      <TouchableOpacity style={styles.serviceHeader} onPress={onToggle}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceIcon}>{category?.icon || ''}</Text>
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
          <View style={[styles.pricingBadge, service.pricing_type === 'fixed' && styles.pricingBadgeFixed]}>
            <Text style={styles.pricingBadgeText}>
              {service.pricing_type === 'fixed'
                ? (i18n.locale === 'fr' ? 'Fixe' : 'Fixed')
                : (i18n.locale === 'fr' ? 'Horaire' : 'Hourly')}
            </Text>
          </View>
          <Text style={styles.serviceRate}>{displayPrice}</Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.dark.textSecondary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.serviceSettings}>
          {/* Portfolio Section */}
          <View style={styles.portfolioSection}>
            <View style={styles.portfolioHeader}>
              <Text style={styles.settingLabel}>
                {i18n.locale === 'fr' ? 'Photos de travaux' : 'Work Portfolio'}
              </Text>
              <TouchableOpacity 
                style={styles.addPhotoBtn} 
                onPress={handlePickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={Colors.dark.primary} />
                ) : (
                  <>
                    <Ionicons name="camera" size={16} color={Colors.dark.primary} />
                    <Text style={styles.addPhotoBtnText}>
                      {i18n.locale === 'fr' ? 'Ajouter' : 'Add'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {portfolioLoading ? (
              <ActivityIndicator size="small" color={Colors.dark.primary} style={{ marginVertical: 16 }} />
            ) : portfolioImages.length === 0 ? (
              <View style={styles.noPhotosContainer}>
                <Ionicons name="images-outline" size={32} color={Colors.dark.textSecondary} />
                <Text style={styles.noPhotosText}>
                  {i18n.locale === 'fr' ? 'Aucune photo' : 'No photos yet'}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}>
                {portfolioImages.map((img) => (
                  <View key={img.id} style={styles.portfolioImageContainer}>
                    <Image source={{ uri: img.thumbnail_url || img.url }} style={styles.portfolioImage} />
                    <TouchableOpacity 
                      style={styles.deleteImageBtn}
                      onPress={() => handleDeleteImage(img.id)}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.dark.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{i18n.locale === 'fr' ? 'Type de tarification' : 'Pricing Type'}</Text>
            <View style={styles.pricingTypeRow}>
              <TouchableOpacity
                style={[styles.pricingTypeBtn, styles.pricingTypeBtnSmall, pricingType === 'hourly' && styles.pricingTypeBtnActive]}
                onPress={() => setPricingType('hourly')}
              >
                <Text style={[styles.pricingTypeBtnText, pricingType === 'hourly' && styles.pricingTypeBtnTextActive]}>
                  {i18n.locale === 'fr' ? 'Horaire' : 'Hourly'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricingTypeBtn, styles.pricingTypeBtnSmall, pricingType === 'fixed' && styles.pricingTypeBtnActive]}
                onPress={() => setPricingType('fixed')}
              >
                <Text style={[styles.pricingTypeBtnText, pricingType === 'fixed' && styles.pricingTypeBtnTextActive]}>
                  {i18n.locale === 'fr' ? 'Prix fixe' : 'Fixed'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {pricingType === 'hourly' ? (
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>{i18n.locale === 'fr' ? 'Tarif horaire (XOF)' : 'Hourly Rate (XOF)'}</Text>
              <TextInput
                style={styles.settingInput}
                value={rate}
                onChangeText={setRate}
                keyboardType="numeric"
                placeholder="5000"
                placeholderTextColor={Colors.dark.textSecondary}
              />
            </View>
          ) : (
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>{i18n.locale === 'fr' ? 'Prix fixe (XOF)' : 'Fixed Price (XOF)'}</Text>
              <TextInput
                style={styles.settingInput}
                value={fixedPrice}
                onChangeText={setFixedPrice}
                keyboardType="numeric"
                placeholder="25000"
                placeholderTextColor={Colors.dark.textSecondary}
              />
            </View>
          )}

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{i18n.locale === 'fr' ? 'Description' : 'Description'}</Text>
            <TextInput
              style={[styles.settingInput, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              placeholder={i18n.locale === 'fr' ? 'Decrivez votre service...' : 'Describe your service...'}
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{i18n.locale === 'fr' ? 'Distance max (km)' : 'Max Distance (km)'}</Text>
            <TextInput
              style={styles.settingInput}
              value={distance}
              onChangeText={setDistance}
              keyboardType="numeric"
              placeholder="10"
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
                pricing_type: pricingType,
                hourly_rate: pricingType === 'hourly' ? (parseInt(rate) || 0) : 0,
                fixed_price: pricingType === 'fixed' ? (parseInt(fixedPrice) || 0) : 0,
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  availabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  availabilityTextContainer: {
    flex: 1,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  availabilityStatus: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 8, textAlign: 'center' },
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
  serviceInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  serviceIcon: { fontSize: 28 },
  serviceName: { fontSize: 16, fontWeight: '600', color: Colors.dark.text },
  serviceCategory: { fontSize: 13, color: Colors.dark.textSecondary },
  serviceRight: { alignItems: 'flex-end', gap: 4 },
  serviceRate: { fontSize: 14, fontWeight: '600', color: Colors.dark.primary },
  pricingBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pricingBadgeFixed: {
    backgroundColor: '#3b82f6',
  },
  pricingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  serviceSettings: {
    padding: 16,
    paddingTop: 16,
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
  pricingTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pricingTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    gap: 8,
  },
  pricingTypeBtnSmall: {
    paddingVertical: 10,
  },
  pricingTypeBtnActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  pricingTypeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  pricingTypeBtnTextActive: {
    color: Colors.dark.background,
  },
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
  // Portfolio styles
  portfolioSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  addPhotoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  noPhotosContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
  },
  noPhotosText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 8,
  },
  portfolioScroll: {
    marginHorizontal: -4,
  },
  portfolioImageContainer: {
    position: 'relative',
    marginHorizontal: 4,
  },
  portfolioImage: {
    width: 100,
    height: 75,
    borderRadius: 8,
  },
  deleteImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
  },
});
