import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';
import { SearchFilters as SearchFiltersType } from '../services/api';

const SORT_OPTIONS = [
  { value: 'rating', labelEn: 'Highest Rated', labelFr: 'Mieux notés' },
  { value: 'price-low', labelEn: 'Price: Low to High', labelFr: 'Prix: Croissant' },
  { value: 'price-high', labelEn: 'Price: High to Low', labelFr: 'Prix: Décroissant' },
  { value: 'reviews', labelEn: 'Most Reviews', labelFr: "Plus d'avis" },
] as const;

const RATING_OPTIONS = [
  { value: 0, labelEn: 'Any', labelFr: 'Tous' },
  { value: 3, label: '3.0+' },
  { value: 3.5, label: '3.5+' },
  { value: 4, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
];

interface SearchFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SearchFiltersType) => void;
  initialFilters?: SearchFiltersType;
}

export default function SearchFilters({
  visible,
  onClose,
  onApply,
  initialFilters = {},
}: SearchFiltersProps) {
  const isEn = i18n.locale === 'en';
  
  const [filters, setFilters] = useState<SearchFiltersType>({
    searchQuery: '',
    minRating: 0,
    minPrice: undefined,
    maxPrice: undefined,
    sortBy: 'rating',
    availableOnDate: undefined,
    ...initialFilters,
  });

  const [minPriceText, setMinPriceText] = useState(initialFilters.minPrice?.toString() || '');
  const [maxPriceText, setMaxPriceText] = useState(initialFilters.maxPrice?.toString() || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleApply = () => {
    const cleanFilters: SearchFiltersType = {};

    if (filters.searchQuery) cleanFilters.searchQuery = filters.searchQuery;
    if (filters.minRating && filters.minRating > 0) cleanFilters.minRating = filters.minRating;
    if (minPriceText) cleanFilters.minPrice = parseFloat(minPriceText);
    if (maxPriceText) cleanFilters.maxPrice = parseFloat(maxPriceText);
    if (filters.sortBy) cleanFilters.sortBy = filters.sortBy;
    if (filters.availableOnDate) cleanFilters.availableOnDate = filters.availableOnDate;

    onApply(cleanFilters);
    onClose();
  };

  const handleClear = () => {
    setFilters({
      searchQuery: '',
      minRating: 0,
      minPrice: undefined,
      maxPrice: undefined,
      sortBy: 'rating',
      availableOnDate: undefined,
    });
    setMinPriceText('');
    setMaxPriceText('');
  };

  const hasActiveFilters =
    filters.searchQuery ||
    (filters.minRating && filters.minRating > 0) ||
    minPriceText ||
    maxPriceText ||
    filters.availableOnDate ||
    filters.sortBy !== 'rating';

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFilters((prev) => ({ ...prev, availableOnDate: dateStr }));
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{isEn ? 'Filters' : 'Filtres'}</Text>
          <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
            <Text style={styles.clearText}>{isEn ? 'Clear' : 'Effacer'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search Query */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="search" size={16} color={Colors.dark.primary} />{' '}
              {isEn ? 'Search' : 'Recherche'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={isEn ? 'Search by name or skill...' : 'Rechercher par nom ou compétence...'}
              placeholderTextColor={Colors.dark.textSecondary}
              value={filters.searchQuery}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, searchQuery: text }))}
            />
          </View>

          {/* Sort By */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="swap-vertical" size={16} color={Colors.dark.primary} />{' '}
              {isEn ? 'Sort By' : 'Trier par'}
            </Text>
            <View style={styles.optionsRow}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    filters.sortBy === option.value && styles.optionButtonActive,
                  ]}
                  onPress={() => setFilters((prev) => ({ ...prev, sortBy: option.value }))}
                >
                  <Text
                    style={[
                      styles.optionText,
                      filters.sortBy === option.value && styles.optionTextActive,
                    ]}
                  >
                    {isEn ? option.labelEn : option.labelFr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Minimum Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="star" size={16} color="#fbbf24" />{' '}
              {isEn ? 'Minimum Rating' : 'Note minimale'}
            </Text>
            <View style={styles.optionsRow}>
              {RATING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.ratingButton,
                    filters.minRating === option.value && styles.ratingButtonActive,
                  ]}
                  onPress={() => setFilters((prev) => ({ ...prev, minRating: option.value }))}
                >
                  <Text
                    style={[
                      styles.ratingText,
                      filters.minRating === option.value && styles.ratingTextActive,
                    ]}
                  >
                    {option.label || (isEn ? option.labelEn : option.labelFr)}
                  </Text>
                  {option.value > 0 && <Ionicons name="star" size={12} color="#fbbf24" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="cash" size={16} color={Colors.dark.primary} />{' '}
              {isEn ? 'Price Range (XOF/hr)' : 'Tarif (XOF/hr)'}
            </Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                placeholderTextColor={Colors.dark.textSecondary}
                keyboardType="numeric"
                value={minPriceText}
                onChangeText={setMinPriceText}
              />
              <Text style={styles.priceSeparator}>-</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                placeholderTextColor={Colors.dark.textSecondary}
                keyboardType="numeric"
                value={maxPriceText}
                onChangeText={setMaxPriceText}
              />
            </View>
          </View>

          {/* Available On Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="calendar" size={16} color={Colors.dark.primary} />{' '}
              {isEn ? 'Available On Date' : 'Disponible le'}
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[
                  styles.dateText,
                  !filters.availableOnDate && styles.datePlaceholder,
                ]}
              >
                {filters.availableOnDate
                  ? formatDisplayDate(filters.availableOnDate)
                  : isEn
                  ? 'Select date...'
                  : 'Sélectionner une date...'}
              </Text>
              {filters.availableOnDate ? (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => setFilters((prev) => ({ ...prev, availableOnDate: undefined }))}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="calendar-outline" size={20} color={Colors.dark.textSecondary} />
              )}
            </TouchableOpacity>
            {filters.availableOnDate && (
              <Text style={styles.dateHint}>
                {isEn
                  ? 'Only showing taskers available on this date'
                  : 'Affichage uniquement des taskers disponibles à cette date'}
              </Text>
            )}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={filters.availableOnDate ? new Date(filters.availableOnDate) : new Date()}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={handleDateChange}
              themeVariant="dark"
            />
          )}
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>
              {isEn ? 'Apply Filters' : 'Appliquer les filtres'}
              {hasActiveFilters && ' •'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  clearText: {
    color: Colors.dark.primary,
    fontSize: 16,
    textAlign: 'right',
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.dark.text,
  },

  // Text Input
  textInput: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.dark.text,
  },

  // Options (Sort)
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  optionButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  optionText: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  optionTextActive: {
    color: Colors.dark.background,
    fontWeight: '600',
  },

  // Rating
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ratingButtonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: '#fbbf24',
  },
  ratingText: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  ratingTextActive: {
    color: '#fbbf24',
    fontWeight: '600',
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.dark.text,
  },
  priceSeparator: {
    marginHorizontal: 12,
    color: Colors.dark.textSecondary,
    fontSize: 18,
  },

  // Date
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 14,
  },
  dateText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  datePlaceholder: {
    color: Colors.dark.textSecondary,
  },
  clearDateButton: {
    padding: 2,
  },
  dateHint: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.dark.primary,
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  applyButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: Colors.dark.background,
    fontSize: 18,
    fontWeight: '600',
  },
});