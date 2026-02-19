import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { taskerAPI, reviewAPI, favoriteAPI } from '../../services/api';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { getCategoryById, getCategoryName, getSubcategoryById, getSubcategoryName, Category } from '../../constants/Categories';
import { categoryAPI } from '../../services/api';

export default function TaskerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [tasker, setTasker] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [taskerData, categoriesData, reviewsData] = await Promise.all([
        taskerAPI.getTasker(id as string),
        categoryAPI.getCategories().catch(() => []),
        reviewAPI.getTaskerReviews(id as string).catch(() => [])
      ]);
      setTasker(taskerData);
      setCategories(categoriesData || []);
      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error fetching tasker:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskerProfile = async () => {
    try {
      setLoading(true);
      const data = await taskerAPI.getTasker(id as string);
      setTasker(data);
    } catch (error) {
      console.error('Error fetching tasker:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await reviewAPI.getTaskerReviews(id as string);
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleFavorite = async () => {
    try {
      await favoriteAPI.toggleFavorite(id as string);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setShowServiceModal(false);
    
    // Get service display name
    const category = getCategoryById(categories, service.category);
    const subcategory = getSubcategoryById(category, service.subcategory);
    const displayName = subcategory 
      ? getSubcategoryName(subcategory, i18n.locale)
      : (category ? getCategoryName(category, i18n.locale) : service.category);
    
    router.push({
      pathname: '/booking/create',
      params: {
        taskerId: id,
        serviceId: service.id,
        serviceName: displayName,
        categoryId: service.category,
        subcategoryId: service.subcategory || '',
        pricingType: service.pricing_type,
        hourlyRate: service.hourly_rate || 0,
        fixedPrice: service.fixed_price || 0,
        maxTravelDistance: service.max_travel_distance || 50,
        taskerLatitude: tasker?.latitude || '',
        taskerLongitude: tasker?.longitude || '',
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (!tasker) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.dark.error} />
          <Text style={styles.errorText}>
            {i18n.locale === 'fr' ? 'Tasker non trouvé' : 'Tasker not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFavorite} style={styles.favoriteButton} activeOpacity={0.7}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite ? Colors.dark.error : Colors.dark.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {tasker.profile_photo ? (
            <Image source={{ uri: tasker.profile_photo }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <Text style={styles.profileInitials}>{tasker.full_name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{tasker.full_name}</Text>
          <Text style={styles.profileLocation}>
            <Ionicons name="location" size={14} /> {tasker.city || tasker.country}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <Text style={styles.statValue}>{tasker.rating || '5.0'}</Text>
              <Text style={styles.statLabel}>
                ({tasker.reviews_count || 0} {i18n.locale === 'fr' ? 'avis' : 'reviews'})
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.dark.primary} />
              <Text style={styles.statValue}>{tasker.completed_tasks || 0}</Text>
              <Text style={styles.statLabel}>{i18n.locale === 'fr' ? 'tâches' : 'tasks'}</Text>
            </View>
          </View>
        </View>

        {/* Bio Section */}
        {tasker.tasker_profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.locale === 'fr' ? 'À propos' : 'About'}</Text>
            <Text style={styles.bioText}>{tasker.tasker_profile.bio}</Text>
          </View>
        )}

        {/* Services Section */}
        {tasker.tasker_profile?.services && tasker.tasker_profile.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.locale === 'fr' ? 'Services' : 'Services'}</Text>
            {tasker.tasker_profile.services.map((service: any, index: number) => {
              const category = getCategoryById(categories, service.category);
              const subcategory = service.subcategory ? getSubcategoryById(category, service.subcategory) : null;
              const categoryName = category ? getCategoryName(category, i18n.locale) : service.category;
              const subcategoryName = subcategory ? getSubcategoryName(subcategory, i18n.locale) : service.subcategory;
              
              return (
                <View key={index} style={styles.serviceCard}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceName}>{categoryName}</Text>
                    {subcategoryName && (
                      <Text style={styles.serviceSubcategory}>{subcategoryName}</Text>
                    )}
                  </View>
                  {service.bio && <Text style={styles.serviceBio}>{service.bio}</Text>}
                  <View style={styles.servicePricing}>
                    {service.pricing_type === 'hourly' ? (
                      <>
                        <View style={styles.priceBadge}>
                          <Text style={styles.priceBadgeText}>
                            {i18n.locale === 'fr' ? 'Horaire' : 'Hourly'}
                          </Text>
                        </View>
                        <Text style={styles.priceAmount}>{service.hourly_rate} XOF/h</Text>
                      </>
                    ) : (
                      <>
                        <View style={[styles.priceBadge, styles.priceBadgeFixed]}>
                          <Text style={styles.priceBadgeText}>
                            {i18n.locale === 'fr' ? 'Fixe' : 'Fixed'}
                          </Text>
                        </View>
                        <Text style={styles.priceAmount}>{service.fixed_price} XOF</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Portfolio Section */}
        {tasker.tasker_profile?.portfolio_images &&
          tasker.tasker_profile.portfolio_images.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {i18n.locale === 'fr' ? 'Portfolio' : 'Portfolio'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}>
                {tasker.tasker_profile.portfolio_images.map((image: string, index: number) => (
                  <Image key={index} source={{ uri: image }} style={styles.portfolioImage} />
                ))}
              </ScrollView>
            </View>
          )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {i18n.locale === 'fr' ? 'Avis' : 'Reviews'} ({reviews.length})
            </Text>
            {reviews.slice(0, 5).map((review: any, index: number) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{review.client_name || 'Client'}</Text>
                    <View style={styles.reviewRating}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < review.rating ? 'star' : 'star-outline'}
                          size={14}
                          color="#f59e0b"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                {review.service_name && (
                  <Text style={styles.reviewService}>
                    {i18n.locale === 'fr' ? 'Service: ' : 'Service: '}
                    {review.service_name}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bookButtonContainer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => setShowServiceModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.bookButtonText}>
            {i18n.locale === 'fr' ? 'Réserver maintenant' : 'Book Now'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
        </TouchableOpacity>
      </View>

      {/* Service Selection Modal */}
      <Modal
        visible={showServiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {i18n.locale === 'fr' ? 'Choisir un service' : 'Choose a Service'}
              </Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {tasker.tasker_profile?.services?.map((service: any, index: number) => {
                const category = getCategoryById(categories, service.category);
                const categoryName = category ? getCategoryName(category, i18n.locale) : service.category;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.modalServiceCard}
                    onPress={() => handleServiceSelect(service)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalServiceName}>{categoryName}</Text>
                    <Text style={styles.modalServicePrice}>
                      {service.pricing_type === 'hourly'
                        ? `${service.hourly_rate} XOF/h`
                        : `${service.fixed_price} XOF`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: Colors.dark.text,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  profileLocation: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.dark.border,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  bioText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
  serviceCard: {
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  serviceHeader: {
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  serviceSubcategory: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  serviceBio: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  servicePricing: {
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
  priceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  portfolioScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  portfolioImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 12,
  },
  reviewCard: {
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  reviewComment: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewService: {
    fontSize: 12,
    color: Colors.dark.primary,
  },
  bookButtonContainer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  modalServiceCard: {
    backgroundColor: Colors.dark.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalServiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  modalServicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
});
