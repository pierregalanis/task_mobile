import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { categoryAPI } from '../../services/api';

// Subcategory icons mapping - maps subcategory names (English) to emojis
const SUBCATEGORY_ICONS: { [key: string]: string } = {
  // Cleaning
  'Home Cleaning': '🏠',
  'Office Cleaning': '🏢',
  'Deep Cleaning': '✨',
  'Window Cleaning': '🪟',
  'Carpet Cleaning': '🧹',
  'Post-Construction Cleaning': '🏗️',
  'Move-In/Move-Out Cleaning': '📦',
  
  // Beauty & Wellness
  'Haircut': '💇',
  'Barber': '💈',
  'Makeup': '💄',
  'Manicure': '💅',
  'Pedicure': '🦶',
  'Massage': '💆',
  'Facial': '🧖',
  'Hair Styling': '💇‍♀️',
  'Spa Services': '🧴',
  'Waxing': '🌸',
  
  // Food & Cooking
  'Personal Chef': '👨‍🍳',
  'Catering': '🍽️',
  'Meal Prep': '🥗',
  'Baking': '🍰',
  'BBQ': '🍖',
  'Event Cooking': '🎉',
  'Traditional Cooking': '🍲',
  
  // Childcare
  'Babysitting': '👶',
  'Nanny': '🍼',
  'Tutoring': '📚',
  'After School Care': '🎒',
  'Special Needs Care': '💝',
  
  // Education & Tutoring
  'Education': '🎓',
  'Academic Tutoring': '📖',
  'Language Lessons': '🗣️',
  'Music Lessons': '🎵',
  'Art Lessons': '🎨',
  'Test Prep': '📝',
  'Homework Help': '✏️',
  
  // Home Repair
  'Plumbing': '🔧',
  'Electrical': '⚡',
  'Carpentry': '🪚',
  'Painting': '🎨',
  'Flooring': '🪵',
  'Roofing': '🏠',
  'General Repairs': '🛠️',
  
  // Moving & Delivery
  'Local Moving': '🚚',
  'Long Distance Moving': '🚛',
  'Furniture Delivery': '🛋️',
  'Package Delivery': '📦',
  'Furniture Assembly': '🔩',
  
  // Gardening & Landscaping
  'Lawn Care': '🌿',
  'Garden Maintenance': '🌻',
  'Tree Trimming': '🌳',
  'Landscaping': '🏡',
  'Plant Care': '🪴',
  
  // Automotive
  'Car Wash': '🚗',
  'Car Detailing': '✨',
  'Oil Change': '🛢️',
  'Tire Service': '🔘',
  'Auto Repair': '🔧',
  'Mechanic': '👨‍🔧',
  
  // Pet Care
  'Dog Walking': '🐕',
  'Pet Sitting': '🐾',
  'Pet Grooming': '🐩',
  'Pet Training': '🦮',
  
  // Events
  'Party Planning': '🎉',
  'DJ Services': '🎧',
  'Photography': '📷',
  'Videography': '🎬',
  'Decoration': '🎈',
  'Catering Services': '🍴',
  
  // Tech Support
  'Computer Repair': '💻',
  'Phone Repair': '📱',
  'Network Setup': '🌐',
  'Smart Home Setup': '🏠',
  'Software Help': '💿',
  
  // Fitness
  'Personal Training': '💪',
  'Yoga': '🧘',
  'Pilates': '🤸',
  'Nutrition Coaching': '🥑',
  'Dance Lessons': '💃',
  
  // Elderly Care
  'Companion Care': '👴',
  'Medical Assistance': '🏥',
  'Meal Preparation': '🍽️',
  'Transportation': '🚗',
  
  // Errands
  'Grocery Shopping': '🛒',
  'Prescription Pickup': '💊',
  'Dry Cleaning': '👔',
  'General Errands': '📋',
  
  // Sewing & Alterations
  'Clothing Alterations': '👗',
  'Custom Sewing': '🧵',
  'Embroidery': '🪡',
  'Repairs': '✂️',
};

// Get icon for subcategory - tries multiple name formats
const getSubcategoryIcon = (subcategory: any, categoryIcon: string): string => {
  // Try English name first
  const enName = subcategory.en || subcategory.name_en || subcategory.name || '';
  if (SUBCATEGORY_ICONS[enName]) {
    return SUBCATEGORY_ICONS[enName];
  }
  
  // Try partial match
  const lowerEnName = enName.toLowerCase();
  for (const [key, icon] of Object.entries(SUBCATEGORY_ICONS)) {
    if (lowerEnName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerEnName)) {
      return icon;
    }
  }
  
  // Fall back to category icon if no match found
  return categoryIcon || '📋';
};

export default function SelectServiceScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams();
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const categories = await categoryAPI.getCategories();
        const found = categories.find((cat: any) => cat.id === categoryId);
        setCategory(found);
      } catch (error) {
        console.error('Error fetching category:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategory();
  }, [categoryId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {i18n.locale === 'fr' ? 'Service' : 'Service'}
            </Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.dark.error} />
          <Text style={styles.errorText}>
            {i18n.locale === 'fr' ? 'Catégorie non trouvée' : 'Category not found'}
          </Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
            <Text style={styles.goBackButtonText}>
              {i18n.locale === 'fr' ? 'Retour' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getCategoryName = (cat: any) => {
    return i18n.locale === 'fr' ? (cat.name_fr || cat.name) : (cat.name_en || cat.name);
  };

  const getSubcategoryName = (sub: any) => {
    return i18n.locale === 'fr' ? (sub.fr || sub.name_fr || sub.name) : (sub.en || sub.name_en || sub.name);
  };

  // Get the English subcategory name (for API filtering - must match tasker's service data)
  const getSubcategoryNameEn = (sub: any) => {
    return sub.en || sub.name_en || sub.name || '';
  };

  // Get the subcategory ID - use actual ID if available, otherwise use English name
  const getSubcategoryId = (sub: any) => {
    return sub.id || sub.en || sub.name_en || sub.name;
  };

  const handleServiceSelect = (subcategory: any) => {
    const subcategoryId = getSubcategoryId(subcategory);
    const subcategoryDisplayName = getSubcategoryName(subcategory);
    
    // Get English names for API filtering (must match what taskers store in their services)
    const categoryNameEn = category.name_en || category.name;
    const subcategoryNameEn = getSubcategoryNameEn(subcategory);
    
    router.push({
      pathname: '/booking/select-tasker',
      params: {
        categoryId: category.id,
        subcategoryId: subcategoryId,
        serviceName: subcategoryDisplayName,
        // Pass English names for API filtering
        categoryName: categoryNameEn,
        subcategoryName: subcategoryNameEn,
      },
    });
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
            {getCategoryName(category)}
          </Text>
          <Text style={styles.headerSubtitle}>
            {category.subcategories?.length || 0} {i18n.locale === 'fr' ? 'services disponibles' : 'services available'}
          </Text>
        </View>
      </View>

      {/* Services List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {category.subcategories?.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyText}>
              {i18n.locale === 'fr' ? 'Aucun service disponible' : 'No services available'}
            </Text>
          </View>
        ) : (
          category.subcategories?.map((subcategory: any, index: number) => (
            <TouchableOpacity
              key={subcategory.id || index}
              style={styles.serviceCard}
              onPress={() => handleServiceSelect(subcategory)}
              activeOpacity={0.7}
            >
              <View style={styles.serviceIcon}>
                <Text style={styles.serviceIconText}>{getSubcategoryIcon(subcategory, category.icon)}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>
                  {getSubcategoryName(subcategory)}
                </Text>
                <Text style={styles.serviceDescription}>
                  {i18n.locale === 'fr' ? 'Appuyez pour voir les pros disponibles' : 'Tap to see available taskers'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  serviceIconText: {
    fontSize: 24,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
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
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 16,
  },
});
