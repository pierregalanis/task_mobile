import React, { useState, useEffect } from 'react';
import { showMessage, showConfirm } from '../../utils/alert';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { showMessage, showConfirm } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showMessage, showConfirm } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { showMessage, showConfirm } from '../../utils/alert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { showMessage, showConfirm } from '../../utils/alert';
import { taskAPI, reviewAPI } from '../../services/api';
import { showMessage, showConfirm } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { showMessage, showConfirm } from '../../utils/alert';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { showMessage, showConfirm } from '../../utils/alert';
import { getCategoryById, getCategoryName, getSubcategoryById, getSubcategoryName } from '../../constants/Categories';
import { showMessage, showConfirm } from '../../utils/alert';
import { Button } from '../../components/Button';

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      // Get all tasks and find the one we need
      const tasks = user?.role === 'client' 
        ? await taskAPI.getClientTasks()
        : await taskAPI.getTaskerTasks();
      const foundTask = tasks.find((t: any) => t.id === id);
      if (foundTask) {
        setTask(foundTask);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible de charger les détails' : 'Failed to load details'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'en_route': return '#8b5cf6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return Colors.dark.success;
      case 'cancelled': return Colors.dark.error;
      default: return Colors.dark.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    if (i18n.locale === 'fr') {
      switch (status) {
        case 'pending': return 'En attente';
        case 'accepted': return 'Acceptée';
        case 'en_route': return 'En route';
        case 'in_progress': return 'En cours';
        case 'completed': return 'Terminée';
        case 'cancelled': return 'Annulée';
        default: return status;
      }
    }
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const handleCancelTask = async () => {
    if (!cancelReason.trim()) {
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez indiquer une raison' : 'Please provide a reason'
      );
      return;
    }

    try {
      setCancelling(true);
      await taskAPI.updateTaskStatus(task.id, 'cancelled', cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
      showMessage(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Tâche annulée' : 'Task cancelled',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error cancelling task:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible d\'annuler la tâche' : 'Failed to cancel task'
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez ajouter un commentaire' : 'Please add a comment'
      );
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewAPI.createReview({
        task_id: task.id,
        tasker_id: task.tasker_id,
        rating,
        comment: reviewComment,
      });
      setShowReviewModal(false);
      setReviewComment('');
      setRating(5);
      showMessage(
        i18n.locale === 'fr' ? 'Merci!' : 'Thank you!',
        i18n.locale === 'fr' ? 'Votre avis a été soumis' : 'Your review has been submitted'
      );
      fetchTaskDetails();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || (i18n.locale === 'fr' ? 'Impossible de soumettre l\'avis' : 'Failed to submit review')
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRebook = () => {
    router.push({
      pathname: '/booking/create',
      params: {
        taskerId: task.tasker_id,
        categoryId: task.category,
        subcategoryId: task.subcategory || '',
        serviceName: task.title,
        pricingType: task.pricing_type || 'hourly',
        hourlyRate: task.hourly_rate || 0,
        fixedPrice: task.fixed_price || 0,
      },
    });
  };

  const handleViewTaskerProfile = () => {
    if (task.tasker_id) {
      router.push(`/tasker/${task.tasker_id}`);
    }
  };

  const handleTrackTasker = () => {
    router.push(`/tracking/${task.id}?mode=client`);
  };

  const handleChat = () => {
    router.push(`/chat/${task.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18n.locale === 'fr' ? 'Détails de la tâche' : 'Task Details'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.dark.error} />
          <Text style={styles.errorText}>
            {i18n.locale === 'fr' ? 'Tâche non trouvée' : 'Task not found'}
          </Text>
          <Button
            title={i18n.locale === 'fr' ? 'Retour' : 'Go Back'}
            onPress={() => router.back()}
            variant="outline"
          />
        </View>
      </SafeAreaView>
    );
  }

  const category = getCategoryById(task.category);
  const subcategory = task.subcategory ? getSubcategoryById(task.category, task.subcategory) : null;
  const categoryName = category ? getCategoryName(category, i18n.locale) : task.category;
  const subcategoryName = subcategory ? getSubcategoryName(subcategory, i18n.locale) : null;

  // Button visibility logic
  const showCancel = ['pending', 'accepted'].includes(task.status);
  const showTrackTasker = ['accepted', 'en_route', 'in_progress'].includes(task.status);
  const showChat = ['accepted', 'en_route', 'in_progress', 'completed'].includes(task.status);
  const showReview = task.status === 'completed' && user?.role === 'client';
  const showRebook = true;
  const showViewTaskerProfile = !!task.tasker_id;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {i18n.locale === 'fr' ? 'Détails de la tâche' : 'Task Details'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(task.status) }]}>
          <Ionicons 
            name={task.status === 'completed' ? 'checkmark-circle' : task.status === 'cancelled' ? 'close-circle' : 'hourglass'} 
            size={24} 
            color={Colors.dark.background} 
          />
          <Text style={styles.statusBannerText}>{getStatusText(task.status)}</Text>
        </View>

        {/* Task Info Card */}
        <View style={styles.card}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {subcategoryName || categoryName}
            </Text>
          </View>

          {task.description && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {i18n.locale === 'fr' ? 'Description' : 'Description'}
              </Text>
              <Text style={styles.descriptionText}>{task.description}</Text>
            </View>
          )}

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={20} color={Colors.dark.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {i18n.locale === 'fr' ? 'Date' : 'Date'}
                </Text>
                <Text style={styles.detailValue}>{formatDate(task.scheduled_date)}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="time" size={20} color={Colors.dark.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {i18n.locale === 'fr' ? 'Heure' : 'Time'}
                </Text>
                <Text style={styles.detailValue}>{formatTime(task.scheduled_date)}</Text>
              </View>
            </View>

            {task.duration_hours && (
              <View style={styles.detailItem}>
                <Ionicons name="hourglass" size={20} color={Colors.dark.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    {i18n.locale === 'fr' ? 'Durée' : 'Duration'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {task.duration_hours} {i18n.locale === 'fr' ? 'heures' : 'hours'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.detailItem}>
              <Ionicons name="location" size={20} color={Colors.dark.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {i18n.locale === 'fr' ? 'Adresse' : 'Address'}
                </Text>
                <Text style={styles.detailValue}>{task.address}, {task.city}</Text>
              </View>
            </View>
          </View>

          {task.special_instructions && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {i18n.locale === 'fr' ? 'Instructions spéciales' : 'Special Instructions'}
              </Text>
              <Text style={styles.instructionsText}>{task.special_instructions}</Text>
            </View>
          )}

          {/* Price Summary */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>
              {i18n.locale === 'fr' ? 'Total' : 'Total'}
            </Text>
            <Text style={styles.priceValue}>{task.estimated_total?.toLocaleString()} XOF</Text>
          </View>
        </View>

        {/* Tasker Card */}
        {task.tasker_id && (
          <TouchableOpacity 
            style={styles.taskerCard} 
            onPress={handleViewTaskerProfile}
            activeOpacity={0.7}
          >
            <View style={styles.taskerAvatar}>
              <Ionicons name="person" size={32} color={Colors.dark.textSecondary} />
            </View>
            <View style={styles.taskerInfo}>
              <Text style={styles.taskerLabel}>
                {i18n.locale === 'fr' ? 'Tâcheron assigné' : 'Assigned Tasker'}
              </Text>
              <Text style={styles.taskerName}>{task.tasker_name || 'Tasker'}</Text>
              {task.tasker_rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.ratingText}>{task.tasker_rating}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>
            {i18n.locale === 'fr' ? 'Actions' : 'Actions'}
          </Text>

          {/* Track Tasker */}
          {showTrackTasker && (
            <TouchableOpacity style={styles.actionButton} onPress={handleTrackTasker} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="navigate" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {i18n.locale === 'fr' ? 'Suivre le tâcheron' : 'Track Tasker'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Voir la position en temps réel' : 'See real-time location'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Chat */}
          {showChat && (
            <TouchableOpacity style={styles.actionButton} onPress={handleChat} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="chatbubble" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {i18n.locale === 'fr' ? 'Discuter' : 'Chat'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Envoyer un message au tâcheron' : 'Message the tasker'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Leave Review */}
          {showReview && (
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowReviewModal(true)} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="star" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {i18n.locale === 'fr' ? 'Laisser un avis' : 'Leave a Review'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Partagez votre expérience' : 'Share your experience'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Rebook Service */}
          {showRebook && (
            <TouchableOpacity style={styles.actionButton} onPress={handleRebook} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: Colors.dark.primary }]}>
                <Ionicons name="repeat" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {i18n.locale === 'fr' ? 'Réserver à nouveau' : 'Rebook This Service'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Réserver le même service' : 'Book the same service again'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}

          {/* View Tasker Profile */}
          {showViewTaskerProfile && (
            <TouchableOpacity style={styles.actionButton} onPress={handleViewTaskerProfile} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#6366f1' }]}>
                <Ionicons name="person" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {i18n.locale === 'fr' ? 'Voir le profil' : 'View Tasker Profile'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Voir les détails du tâcheron' : 'See tasker details'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Cancel Task */}
          {showCancel && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]} 
              onPress={() => setShowCancelModal(true)} 
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: Colors.dark.error }]}>
                <Ionicons name="close" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: Colors.dark.error }]}>
                  {i18n.locale === 'fr' ? 'Annuler la tâche' : 'Cancel Task'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Annuler cette réservation' : 'Cancel this booking'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.error} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {i18n.locale === 'fr' ? 'Laisser un avis' : 'Leave a Review'}
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            {/* Star Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>
                {i18n.locale === 'fr' ? 'Votre note' : 'Your Rating'}
              </Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={40}
                      color={star <= rating ? '#f59e0b' : Colors.dark.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comment */}
            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>
                {i18n.locale === 'fr' ? 'Votre commentaire' : 'Your Comment'}
              </Text>
              <TextInput
                style={styles.commentInput}
                placeholder={i18n.locale === 'fr' ? 'Partagez votre expérience...' : 'Share your experience...'}
                placeholderTextColor={Colors.dark.textSecondary}
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Button
              title={submittingReview 
                ? (i18n.locale === 'fr' ? 'Envoi...' : 'Submitting...') 
                : (i18n.locale === 'fr' ? 'Soumettre l\'avis' : 'Submit Review')
              }
              onPress={handleSubmitReview}
              loading={submittingReview}
              variant="primary"
            />
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {i18n.locale === 'fr' ? 'Annuler la tâche' : 'Cancel Task'}
              </Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelWarning}>
              {i18n.locale === 'fr' 
                ? 'Êtes-vous sûr de vouloir annuler cette tâche? Cette action est irréversible.'
                : 'Are you sure you want to cancel this task? This action cannot be undone.'}
            </Text>

            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>
                {i18n.locale === 'fr' ? 'Raison de l\'annulation' : 'Cancellation Reason'} *
              </Text>
              <TextInput
                style={styles.commentInput}
                placeholder={i18n.locale === 'fr' ? 'Indiquez la raison...' : 'Provide a reason...'}
                placeholderTextColor={Colors.dark.textSecondary}
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.cancelButtons}>
              <TouchableOpacity 
                style={styles.cancelModalButton} 
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>
                  {i18n.locale === 'fr' ? 'Non, garder' : 'No, Keep It'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmCancelButton, cancelling && styles.disabledButton]} 
                onPress={handleCancelTask}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <Text style={styles.confirmCancelButtonText}>
                    {i18n.locale === 'fr' ? 'Oui, annuler' : 'Yes, Cancel'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  placeholder: {
    width: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: Colors.dark.text,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 22,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  taskerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  taskerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  taskerInfo: {
    flex: 1,
  },
  taskerLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  taskerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: Colors.dark.error,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
    minHeight: 100,
  },
  cancelWarning: {
    fontSize: 14,
    color: Colors.dark.error,
    marginBottom: 16,
    lineHeight: 20,
  },
  cancelButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  confirmCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.dark.error,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
