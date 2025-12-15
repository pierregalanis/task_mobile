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
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Catégorie non trouvée</Text>
      </SafeAreaView>
    );
  }

  const getCategoryName = (cat: any) => {
    return i18n.locale === 'fr' ? cat.name_fr : cat.name_en;
  };

  const getSubcategoryName = (sub: any) => {
    return i18n.locale === 'fr' ? sub.fr : sub.en;
  };

  const handleServiceSelect = (subcategoryIndex: number, subcategoryName: string) => {
    router.push({
      pathname: '/booking/select-tasker',
      params: {
        categoryId: category.id,
        subcategoryId: subcategoryIndex.toString(),
        serviceName: subcategoryName,
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
            {category.subcategories.length} {i18n.locale === 'fr' ? 'services disponibles' : 'services available'}
          </Text>
        </View>
      </View>

      {/* Services List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {category.subcategories.map((subcategory: any, index: number) => (
          <TouchableOpacity
            key={index}
            style={styles.serviceCard}
            onPress={() => handleServiceSelect(index, getSubcategoryName(subcategory))}
            activeOpacity={0.7}
          >
            <View style={styles.serviceIcon}>
              <Text style={styles.serviceIconText}>🔧</Text>
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>
                {getSubcategoryName(subcategory)}
              </Text>
              <Text style={styles.serviceDescription}>
                {i18n.locale === 'fr' ? 'Appuyez pour voir les tâcherons disponibles' : 'Tap to see available taskers'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
  errorText: {
    fontSize: 16,
    color: Colors.dark.error,
    textAlign: 'center',
    marginTop: 32,
  },
});
