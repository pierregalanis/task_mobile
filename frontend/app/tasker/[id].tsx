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
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { taskerAPI, reviewAPI, favoriteAPI, imageAPI, PortfolioImage } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { getCategoryById, getCategoryName, getSubcategoryById, getSubcategoryName, Category } from '../../constants/Categories';
import { categoryAPI } from '../../services/api';
import { formatHourlyRate, formatPrice } from '../../utils/pricingUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TaskerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const [tasker, setTasker] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Per-service portfolio images state
  const [servicePortfolios, setServicePortfolios] = useState<Record<string, PortfolioImage[]>>({});
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  
  // Image viewer modal
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [taskerData, categoriesData, reviewsData, favoriteStatus] = await Promise.all([
        taskerAPI.getTasker(id as string),
        categoryAPI.getCategories().catch(() => []),
        reviewAPI.getTaskerReviews(id as string).catch(() => []),
        favoriteAPI.checkIsFavorite(id as string).catch(() => ({ is_favorite: false }))
      ]);
      setTasker(taskerData);
      setCategories(categoriesData || []);
      setReviews(reviewsData || []);
      setIsFavorite(favoriteStatus.is_favorite);
      
      // Fetch portfolio images for each service
      if (taskerData?.tasker_profile?.services) {
        fetchServicePortfolios(taskerData.tasker_profile.services);
      }
    } catch (error) {
      console.error('Error fetching tasker:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServicePortfolios = async (services: any[]) => {
    try {
      setLoadingPortfolios(true);
      const portfolioPromises = services.map(async (service: any) => {
        try {
          const images = await imageAPI.getWorkPortfolioByService(service.category, service.subcategory);
          return { 
            key: `${service.category}-${service.subcategory}`, 
            images: images || [] 
          };
        } catch (error) {
          console.log(`No portfolio for ${service.category}-${service.subcategory}`);
          return { key: `${service.category}-${service.subcategory}`, images: [] };
        }
      });
      
      const results = await Promise.all(portfolioPromises);
      const portfolioMap: Record<string, PortfolioImage[]> = {};
      results.forEach(result => {
        portfolioMap[result.key] = result.images;
      });
      setServicePortfolios(portfolioMap);
    } catch (error) {
      console.error('Error fetching service portfolios:', error);
    } finally {
      setLoadingPortfolios(false);
    }
  };

  const openImageViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setShowImageViewer(true);
  };

  const handleFavorite = async () => {
    if (favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoriteAPI.removeFavorite(id as string);
        setIsFavorite(false);
        Alert.alert(
          i18n.locale === 'fr' ? 'Retiré' : 'Removed',
          i18n.locale === 'fr' ? 'Retiré des favoris' : 'Removed from favorites'
        );
      } else {
        await favoriteAPI.addFavorite(id as string);
        setIsFavorite(true);
        Alert.alert(
          i18n.locale === 'fr' ? 'Ajouté' : 'Added',
          i18n.locale === 'fr' ? 'Ajouté aux favoris' : 'Added to favorites'
        );
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr' ? 'Échec de la mise à jour des favoris' : 'Failed to update favorites')
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setShowServiceModal(false);
    
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
        
        {/* Favorite This Tasker Button */}
        <TouchableOpacity 
          onPress={handleFavorite} 
          style={[
            styles.favoriteButton,
            isFavorite && styles.favoriteButtonActive
          ]} 
          activeOpacity={0.7}
          disabled={favoriteLoading}
        >
          {favoriteLoading ? (
            <ActivityIndicator size="small" color={isFavorite ? '#fff' : '#10b981'} />
          ) : (
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? '#fff' : '#10b981'}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {tasker.profile_image || tasker.profile_photo ? (
          <Image source={{ uri: tasker.profile_image || tasker.profile_photo }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <Text style={styles.profileInitials}>{tasker.full_name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.profileName}>{tasker.full_name}</Text>
            {(tasker.is_identity_verified || tasker.verification?.status === 'approved') && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#fff" />
                <Text style={styles.verifiedBadgeText}>
                  {i18n.locale === 'fr' ? 'Verifié' : 'Verified'}
                </Text>
              </View>
            )}
          </View>
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

       {/* Services Section with Per-Service Portfolio */}
        {tasker.tasker_profile?.services && tasker.tasker_profile.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.locale === 'fr' ? 'Services' : 'Services'}</Text>
            {isClient && (
              <Text style={styles.servicesSubtitle}>
                {i18n.locale === 'fr'
                  ? 'Appuyez sur un service pour le réserver directement.'
                  : 'Tap a service to book it directly.'}
              </Text>
            )}
            {tasker.tasker_profile.services.map((service: any, index: number) => {
              const category = getCategoryById(categories, service.category);
              const subcategory = service.subcategory ? getSubcategoryById(category, service.subcategory) : null;
              const categoryName = category ? getCategoryName(category, i18n.locale) : service.category;
              const subcategoryName = subcategory ? getSubcategoryName(subcategory, i18n.locale) : service.subcategory;
              const portfolioKey = `${service.category}-${service.subcategory}`;
              const portfolioImages = servicePortfolios[portfolioKey] || [];

              // Only clickable when:
              //   - viewer is a client (taskers can't book)
              //   - service.category is a real UUID (legacy services without UUID stay non-clickable)
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              const isClickable = isClient && uuidRegex.test(String(service.category || ''));

              const cardContent = (
                <>
                  <View style={styles.serviceHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{categoryName}</Text>
                      {subcategoryName && (
                        <Text style={styles.serviceSubcategory}>{subcategoryName}</Text>
                      )}
                    </View>
                    {isClickable && (
                      <View style={styles.bookPill}>
                        <Ionicons name="calendar" size={11} color={Colors.dark.background} />
                        <Text style={styles.bookPillText}>
                          {i18n.locale === 'fr' ? 'Réserver' : 'Book'}
                        </Text>
                      </View>
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
                        <Text style={styles.priceAmount}>
                          {formatHourlyRate(service.hourly_rate, i18n.locale)}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={[styles.priceBadge, styles.priceBadgeFixed]}>
                          <Text style={styles.priceBadgeText}>
                            {i18n.locale === 'fr' ? 'Fixe' : 'Fixed'}
                          </Text>
                        </View>
                        <Text style={styles.priceAmount}>
                          {formatPrice(service.fixed_price, i18n.locale)}
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Per-Service Portfolio Images */}
                  {portfolioImages.length > 0 && (
                    <View style={styles.servicePortfolio}>
                      <Text style={styles.servicePortfolioLabel}>
                        <Ionicons name="images-outline" size={14} color={Colors.dark.textSecondary} />
                        {' '}{i18n.locale === 'fr' ? 'Travaux réalisés' : 'Work samples'}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.servicePortfolioScroll}
                      >
                        {portfolioImages.map((img, imgIndex) => (
                          <TouchableOpacity
                            key={img.id}
                            onPress={() => openImageViewer(
                              portfolioImages.map(p => p.image_url),
                              imgIndex
                            )}
                            activeOpacity={0.8}
                          >
                            <Image
                              source={{ uri: img.image_url }}
                              style={styles.servicePortfolioImage}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              );

              if (isClickable) {
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.serviceCard, styles.serviceCardClickable]}
                    onPress={() => handleServiceSelect(service)}
                    activeOpacity={0.7}
                    testID={`service-card-${index}`}
                  >
                    {cardContent}
                  </TouchableOpacity>
                );
              }

              return (
                <View
                  key={index}
                  style={[styles.serviceCard, !isClient && styles.serviceCardLegacy]}
                >
                  {cardContent}
                </View>
              );
            })}
          </View>
        )}

        {/* Legacy Portfolio Section - Show only if no per-service images exist */}
        {tasker.tasker_profile?.portfolio_images &&
          tasker.tasker_profile.portfolio_images.length > 0 &&
          Object.keys(servicePortfolios).every(key => servicePortfolios[key].length === 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {i18n.locale === 'fr' ? 'Portfolio' : 'Portfolio'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}>
                {tasker.tasker_profile.portfolio_images.map((image: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => openImageViewer(tasker.tasker_profile.portfolio_images, index)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: image }} style={styles.portfolioImage} />
                  </TouchableOpacity>
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
        {!user ? (
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: Colors.dark.primary }]}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.bookButtonText}>
              {i18n.locale === 'fr' ? 'Connectez-vous pour réserver' : 'Login to Book'}
            </Text>
            <Ionicons name="log-in-outline" size={20} color={Colors.dark.background} />
          </TouchableOpacity>
        ) : isClient ? (
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
        ) : (
          <View style={[styles.bookButton, { backgroundColor: '#3a3a3a' }]}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.dark.textSecondary} />
            <Text style={[styles.bookButtonText, { color: Colors.dark.textSecondary }]}>
              {i18n.locale === 'fr' ? 'Les pros ne peuvent pas réserver' : 'Taskers cannot book services'}
            </Text>
          </View>
        )}
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
                        ? formatHourlyRate(service.hourly_rate, i18n.locale)
                        : formatPrice(service.fixed_price, i18n.locale)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity 
            style={styles.imageViewerClose} 
            onPress={() => setShowImageViewer(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: viewerIndex * SCREEN_WIDTH, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewerIndex(newIndex);
            }}
          >
            {viewerImages.map((imageUrl, idx) => (
              <View key={idx} style={styles.imageViewerContainer}>
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
          
          <Text style={styles.imageViewerCounter}>
            {viewerIndex + 1} / {viewerImages.length}
          </Text>
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
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  favoriteButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
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
    verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
  servicesSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  serviceCardClickable: {
    borderColor: Colors.dark.primary,
  },
  serviceCardLegacy: {
    opacity: 0.7,
  },
  bookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bookPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.background,
    letterSpacing: 0.3,
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
  // Per-Service Portfolio Styles
  servicePortfolio: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  servicePortfolioLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  servicePortfolioScroll: {
    marginHorizontal: -4,
  },
  servicePortfolioImage: {
    width: 100,
    height: 75,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  // Legacy Portfolio Styles
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
  // Image Viewer Modal Styles
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerContainer: {
    width: SCREEN_WIDTH,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageViewerCounter: {
    position: 'absolute',
    bottom: 60,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});