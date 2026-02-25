import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { reviewAPI } from '../services/api';
import i18n from '../utils/i18n';

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    taskId: string;
    taskTitle: string;
    taskerName: string;
    taskerImage?: string;
  }>();

  const { taskId, taskTitle, taskerName, taskerImage } = params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez sélectionner une note' : 'Please select a rating'
      );
      return;
    }

    setSubmitting(true);
    try {
      await reviewAPI.createReview({
        task_id: taskId,
        rating,
        comment: comment.trim() || undefined,
      });

      Alert.alert(
        i18n.locale === 'fr' ? 'Merci !' : 'Thank you!',
        i18n.locale === 'fr' 
          ? 'Votre avis a été soumis avec succès.' 
          : 'Your review has been submitted.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || 
          (i18n.locale === 'fr' ? 'Échec de la soumission' : 'Failed to submit review')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = () => {
    const texts = {
      en: ['Tap to rate', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
      fr: ['Appuyez pour noter', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent'],
    };
    const locale = i18n.locale === 'fr' ? 'fr' : 'en';
    return texts[locale][rating] || texts[locale][0];
  };

  const getRatingEmoji = () => {
    const emojis = ['', '😞', '😐', '🙂', '😊', '🤩'];
    return emojis[rating] || '';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={Colors.dark.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {i18n.locale === 'fr' ? 'Laisser un avis' : 'Leave a Review'}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Tasker Info Card */}
          <View style={styles.taskerCard}>
            <View style={styles.avatarContainer}>
              {taskerImage ? (
                <Image source={{ uri: taskerImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={Colors.dark.textSecondary} />
                </View>
              )}
            </View>
            <Text style={styles.taskerName}>{taskerName}</Text>
            <Text style={styles.taskTitle} numberOfLines={2}>{taskTitle}</Text>
          </View>

          {/* Star Rating Section */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>
              {i18n.locale === 'fr' ? 'Évaluez votre expérience' : 'Rate your experience'}
            </Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={44}
                    color={star <= rating ? '#FBBF24' : Colors.dark.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.ratingTextContainer}>
              {rating > 0 && <Text style={styles.ratingEmoji}>{getRatingEmoji()}</Text>}
              <Text style={[
                styles.ratingText,
                rating > 0 && styles.ratingTextActive
              ]}>
                {getRatingText()}
              </Text>
            </View>
          </View>

          {/* Comment Section */}
          <View style={styles.commentSection}>
            <Text style={styles.sectionLabel}>
              {i18n.locale === 'fr' ? 'Votre commentaire' : 'Your feedback'}{' '}
              <Text style={styles.optional}>
                ({i18n.locale === 'fr' ? 'optionnel' : 'optional'})
              </Text>
            </Text>
            <TextInput
              style={styles.commentInput}
              placeholder={
                i18n.locale === 'fr' 
                  ? 'Partagez les détails de votre expérience...'
                  : 'Share details about your experience...'
              }
              placeholderTextColor={Colors.dark.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={18} color="#60A5FA" />
            <Text style={styles.infoText}>
              {i18n.locale === 'fr'
                ? 'Les avis ne peuvent pas être modifiés après soumission'
                : 'Reviews cannot be edited after submission'}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || submitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="star" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>
                  {i18n.locale === 'fr' ? 'Soumettre l\'avis' : 'Submit Review'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>
              {i18n.locale === 'fr' ? 'Peut-être plus tard' : 'Maybe Later'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: Colors.dark.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  // Tasker Card
  taskerCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.dark.primary,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskerName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  taskTitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Rating Section
  ratingSection: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 20,
  },
  optional: {
    fontWeight: '400',
    color: Colors.dark.textSecondary,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 6,
  },
  ratingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  ratingTextActive: {
    color: '#FBBF24',
    fontWeight: '600',
  },
  // Comment Section
  commentSection: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  commentInput: {
    backgroundColor: Colors.dark.background,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: Colors.dark.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 8,
  },
  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#60A5FA',
    flex: 1,
    lineHeight: 18,
  },
  // Buttons
  submitButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.dark.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
