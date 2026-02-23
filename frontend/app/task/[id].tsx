import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { taskAPI, reviewAPI, categoryAPI, disputeAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { getCategoryById, getCategoryName, getSubcategoryById, getSubcategoryName, Category } from '../../constants/Categories';
import { Button } from '../../components/Button';
import { showMessage } from '../../utils/alert';

// Dispute reasons
const DISPUTE_REASONS = [
  { id: 'quality', en: 'Poor Quality Service', fr: 'Service de mauvaise qualité' },
  { id: 'incomplete', en: 'Task Not Completed', fr: 'Tâche non terminée' },
  { id: 'overcharge', en: 'Overcharged', fr: 'Surfacturation' },
  { id: 'no_show', en: 'Tasker Did Not Show Up', fr: 'Le tâcheron ne s\'est pas présenté' },
  { id: 'damage', en: 'Property Damage', fr: 'Dommages matériels' },
  { id: 'other', en: 'Other', fr: 'Autre' },
];

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [task, setTask] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Dispute Modal State
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const isClient = user?.role === 'client';
  const isTasker = user?.role === 'tasker';

  useEffect(() => {
    fetchTaskDetails();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Timer effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const [categoriesData, taskData] = await Promise.all([
        categoryAPI.getCategories().catch(() => []),
        taskAPI.getTask(id as string).catch(() => null),
      ]);
      
      setCategories(categoriesData || []);
      
      if (taskData) {
        setTask(taskData);
        // Check timer status
        if (taskData.timer_started && !taskData.timer_stopped) {
          setTimerRunning(true);
          if (taskData.timer_started_at) {
            const startTime = new Date(taskData.timer_started_at).getTime();
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setTimerSeconds(elapsed > 0 ? elapsed : 0);
          }
        }
      } else {
        // Fallback to list endpoint if direct fetch fails
        const tasks = isClient 
          ? await taskAPI.getClientTasks()
          : await taskAPI.getTaskerTasks();
        const foundTask = tasks?.find((t: any) => t.id === id);
        if (foundTask) {
          setTask(foundTask);
          if (foundTask.timer_started && !foundTask.timer_stopped) {
            setTimerRunning(true);
            if (foundTask.timer_started_at) {
              const startTime = new Date(foundTask.timer_started_at).getTime();
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              setTimerSeconds(elapsed > 0 ? elapsed : 0);
            }
          }
        }
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

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string, isPaid?: boolean) => {
    if (status === 'completed' && isPaid) return Colors.dark.success;
    switch (status) {
      case 'assigned': return '#f59e0b';
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'en_route': return '#8b5cf6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return '#f59e0b';
      case 'cancelled': return Colors.dark.error;
      default: return Colors.dark.textSecondary;
    }
  };

  const getStatusText = (status: string, isPaid?: boolean) => {
    if (i18n.locale === 'fr') {
      if (status === 'completed' && isPaid) return 'Payé';
      if (status === 'completed' && !isPaid) return 'En attente paiement';
      switch (status) {
        case 'assigned': return 'En attente';
        case 'pending': return 'En attente';
        case 'accepted': return 'Acceptée';
        case 'en_route': return 'En route';
        case 'in_progress': return 'En cours';
        case 'completed': return 'Terminée';
        case 'cancelled': return 'Annulée';
        default: return status;
      }
    }
    if (status === 'completed' && isPaid) return 'Paid';
    if (status === 'completed' && !isPaid) return 'Awaiting Payment';
    switch (status) {
      case 'assigned': return 'Pending Approval';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  // ==================== TASKER ACTIONS ====================

  const handleAcceptTask = async () => {
    try {
      setActionLoading(true);
      await taskAPI.acceptTask(task.id);
      showMessage(
        i18n.locale === 'fr' ? 'Succès' : 'Success',
        i18n.locale === 'fr' ? 'Tâche acceptée!' : 'Task accepted!'
      );
      fetchTaskDetails();
    } catch (error) {
      console.error('Error accepting task:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible d\'accepter' : 'Failed to accept'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTask = async () => {
    try {
      setActionLoading(true);
      await taskAPI.rejectTask(task.id);
      showMessage(
        i18n.locale === 'fr' ? 'Tâche refusée' : 'Task Declined',
        i18n.locale === 'fr' ? 'Vous avez refusé cette tâche' : 'You have declined this task',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error rejecting task:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible de refuser' : 'Failed to decline'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEnRoute = () => {
    router.push(`/tracking/${task.id}?mode=tasker`);
  };

  const handleStartTimer = async () => {
    try {
      setActionLoading(true);
      await taskAPI.startTimer(task.id);
      setTimerRunning(true);
      setTimerSeconds(0);
      showMessage(
        i18n.locale === 'fr' ? 'Chrono démarré' : 'Timer Started',
        i18n.locale === 'fr' ? 'Le temps de travail est maintenant comptabilisé' : 'Work time is now being tracked'
      );
      fetchTaskDetails();
    } catch (error) {
      console.error('Error starting timer:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible de démarrer le chrono' : 'Failed to start timer'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopTimer = async () => {
    try {
      setActionLoading(true);
      await taskAPI.stopTimer(task.id);
      setTimerRunning(false);
      showMessage(
        i18n.locale === 'fr' ? 'Chrono arrêté' : 'Timer Stopped',
        i18n.locale === 'fr' ? 'Le temps de travail a été enregistré' : 'Work time has been recorded'
      );
      fetchTaskDetails();
    } catch (error) {
      console.error('Error stopping timer:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible d\'arrêter le chrono' : 'Failed to stop timer'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    try {
      setActionLoading(true);
      await taskAPI.completeTask(task.id);
      showMessage(
        i18n.locale === 'fr' ? 'Tâche terminée!' : 'Task Completed!',
        i18n.locale === 'fr' ? 'En attente de paiement' : 'Awaiting payment'
      );
      fetchTaskDetails();
    } catch (error) {
      console.error('Error completing task:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible de terminer' : 'Failed to complete'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaidCash = async () => {
    try {
      setActionLoading(true);
      await taskAPI.markPaidCash(task.id);
      showMessage(
        i18n.locale === 'fr' ? 'Paiement confirmé!' : 'Payment Confirmed!',
        i18n.locale === 'fr' ? 'Le paiement en espèces a été enregistré' : 'Cash payment has been recorded'
      );
      fetchTaskDetails();
    } catch (error) {
      console.error('Error marking as paid:', error);
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Impossible de confirmer le paiement' : 'Failed to confirm payment'
      );
    } finally {
      setActionLoading(false);
    }
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
      await taskAPI.cancelTask(task.id, cancelReason);
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
        tasker_id: task.tasker_id || task.assigned_tasker_id,
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

  const handleSubmitDispute = async () => {
    if (!disputeReason) {
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez sélectionner une raison' : 'Please select a reason'
      );
      return;
    }
    if (!disputeDescription.trim()) {
      showMessage(
        i18n.locale === 'fr' ? 'Erreur' : 'Error',
        i18n.locale === 'fr' ? 'Veuillez décrire le problème' : 'Please describe the issue'
      );
      return;
    }

    try {
      setSubmittingDispute(true);
      await disputeAPI.createDispute(task.id, disputeReason, disputeDescription);
      setShowDisputeModal(false);
      setDisputeReason('');
      setDisputeDescription('');
      showMessage(
        i18n.locale === 'fr' ? 'Litige soumis' : 'Dispute Submitted',
        i18n.locale === 'fr' ? 'Notre équipe examinera votre demande sous peu.' : 'Our team will review your request shortly.'
      );
    } catch (error: any) {
      console.error('Error submitting dispute:', error);
      const errorMsg = error.response?.data?.detail || 
        (i18n.locale === 'fr' ? 'Impossible de soumettre le litige' : 'Failed to submit dispute');
      showMessage(i18n.locale === 'fr' ? 'Erreur' : 'Error', errorMsg);
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleRebook = () => {
    router.push({
      pathname: '/booking/create',
      params: {
        taskerId: task.tasker_id || task.assigned_tasker_id,
        categoryId: task.category || task.category_id,
        subcategoryId: task.subcategory || '',
        serviceName: task.title,
        pricingType: task.pricing_type || 'hourly',
        hourlyRate: task.hourly_rate || 0,
        fixedPrice: task.fixed_price || 0,
      },
    });
  };

  const handleViewTaskerProfile = () => {
    const taskerId = task.tasker_id || task.assigned_tasker_id;
    if (taskerId) {
      router.push(`/tasker/${taskerId}`);
    }
  };

  const handleTrackTasker = () => {
    router.push(`/tracking/${task.id}?mode=client`);
  };

  const handleChat = () => {
    router.push(`/chat/${task.id}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
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

  const categoryId = task.category_id || task.category;
  const category = getCategoryById(categories, categoryId);
  const subcategory = task.subcategory ? getSubcategoryById(category, task.subcategory) : null;
  const categoryName = category ? getCategoryName(category, i18n.locale) : categoryId || 'Service';
  const subcategoryName = subcategory ? getSubcategoryName(subcategory, i18n.locale) : null;

  const taskDate = task.task_date || task.scheduled_date;
  const totalCost = task.total_cost || task.estimated_total || 0;
  const isPaid = task.is_paid === true;
  const status = task.status;

  // Tasker details from enriched API response
  const taskerId = task.tasker_id || task.assigned_tasker_id;
  const taskerName = task.tasker_name || 'Tasker';
  const taskerProfileImage = task.tasker_profile_image;
  const taskerRating = task.tasker_rating;
  const taskerTotalReviews = task.tasker_total_reviews;

  // Status checks
  const isPending = status === 'assigned' || status === 'pending';
  const isAccepted = status === 'accepted';
  const isEnRoute = status === 'en_route';
  const isInProgress = status === 'in_progress';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  const isActive = isAccepted || isEnRoute || isInProgress;

  // Button visibility based on role and status
  const showAcceptReject = isTasker && isPending;
  const showWaitingMessage = isClient && isPending;
  const showEnRouteButton = isTasker && isAccepted;
  const showStartTimerButton = isTasker && (isEnRoute || isInProgress) && !timerRunning;
  const showStopTimerButton = isTasker && isInProgress && timerRunning;
  const showCompleteButton = isTasker && isInProgress;
  const showTrackTasker = isClient && (isEnRoute || isInProgress);
  const showChat = isActive || isCompleted;
  const showPaymentSection = isTasker && isCompleted && !isPaid;
  const showPaidBadge = isCompleted && isPaid;
  const showReview = isClient && isCompleted && !task.review_submitted;
  const showCancel = isPending || isAccepted;
  // Show dispute for completed tasks or active tasks (in case tasker didn't show)
  const showDispute = isClient && (isCompleted || isActive) && !task.has_dispute;

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
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(status, isPaid) }]}>
          <Ionicons 
            name={
              isCompleted && isPaid ? 'checkmark-circle' : 
              isCompleted ? 'wallet' :
              isCancelled ? 'close-circle' : 
              isInProgress ? 'play-circle' :
              isEnRoute ? 'navigate' :
              'hourglass'
            } 
            size={24} 
            color={Colors.dark.background} 
          />
          <Text style={styles.statusBannerText}>{getStatusText(status, isPaid)}</Text>
        </View>

        {/* Waiting Message for Client */}
        {showWaitingMessage && (
          <View style={styles.waitingCard}>
            <Ionicons name="hourglass-outline" size={24} color="#f59e0b" />
            <View style={styles.waitingContent}>
              <Text style={styles.waitingTitle}>
                {i18n.locale === 'fr' ? 'En attente de confirmation' : 'Waiting for Confirmation'}
              </Text>
              <Text style={styles.waitingText}>
                {i18n.locale === 'fr' 
                  ? 'Le tâcheron n\'a pas encore accepté cette tâche' 
                  : 'The tasker has not yet accepted this task'}
              </Text>
            </View>
          </View>
        )}

        {/* Timer Display */}
        {isTasker && isInProgress && (
          <View style={styles.timerCard}>
            <Ionicons name="timer-outline" size={28} color={timerRunning ? Colors.dark.primary : Colors.dark.textSecondary} />
            <View style={styles.timerContent}>
              <Text style={styles.timerLabel}>
                {i18n.locale === 'fr' ? 'Temps de travail' : 'Work Time'}
              </Text>
              <Text style={[styles.timerValue, timerRunning && styles.timerRunning]}>
                {formatTimer(timerSeconds)}
              </Text>
            </View>
            {timerRunning ? (
              <TouchableOpacity 
                style={styles.timerStopButton} 
                onPress={handleStopTimer}
                disabled={actionLoading}
              >
                <Ionicons name="pause" size={20} color={Colors.dark.background} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.timerStartButton} 
                onPress={handleStartTimer}
                disabled={actionLoading}
              >
                <Ionicons name="play" size={20} color={Colors.dark.background} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Client Timer View */}
        {isClient && isInProgress && task.timer_started && (
          <View style={styles.timerCard}>
            <Ionicons name="timer-outline" size={28} color={Colors.dark.primary} />
            <View style={styles.timerContent}>
              <Text style={styles.timerLabel}>
                {i18n.locale === 'fr' ? 'Travail en cours' : 'Work in Progress'}
              </Text>
              <Text style={styles.timerValue}>{formatTimer(timerSeconds)}</Text>
            </View>
            <View style={styles.timerLiveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        )}

        {/* Accept/Reject Buttons for Tasker */}
        {showAcceptReject && (
          <View style={styles.acceptRejectCard}>
            <Text style={styles.acceptRejectTitle}>
              {i18n.locale === 'fr' ? 'Nouvelle demande de service' : 'New Service Request'}
            </Text>
            <Text style={styles.acceptRejectSubtitle}>
              {i18n.locale === 'fr' ? 'Voulez-vous accepter cette tâche?' : 'Do you want to accept this task?'}
            </Text>
            <View style={styles.acceptRejectButtons}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleRejectTask}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.dark.error} />
                ) : (
                  <>
                    <Ionicons name="close" size={20} color={Colors.dark.error} />
                    <Text style={styles.declineButtonText}>
                      {i18n.locale === 'fr' ? 'Refuser' : 'Decline'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptTaskButton}
                onPress={handleAcceptTask}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={Colors.dark.background} />
                    <Text style={styles.acceptTaskButtonText}>
                      {i18n.locale === 'fr' ? 'Accepter' : 'Accept'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

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
                <Text style={styles.detailValue}>{formatDate(taskDate)}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="time" size={20} color={Colors.dark.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {i18n.locale === 'fr' ? 'Heure' : 'Time'}
                </Text>
                <Text style={styles.detailValue}>{formatTime(taskDate)}</Text>
              </View>
            </View>

            {task.duration_hours && (
              <View style={styles.detailItem}>
                <Ionicons name="hourglass" size={20} color={Colors.dark.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    {i18n.locale === 'fr' ? 'Durée estimée' : 'Estimated Duration'}
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
                <Text style={styles.detailValue}>{task.address || 'N/A'}, {task.city || ''}</Text>
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
            <Text style={styles.priceValue}>{totalCost.toLocaleString()} XOF</Text>
          </View>
        </View>

        {/* Assigned Tasker Card (for Client) */}
        {isClient && taskerId && (
          <TouchableOpacity 
            style={styles.personCard} 
            onPress={handleViewTaskerProfile}
            activeOpacity={0.7}
          >
            {taskerProfileImage ? (
              <Image 
                source={{ uri: taskerProfileImage }} 
                style={styles.personAvatarImage}
              />
            ) : (
              <View style={styles.personAvatar}>
                <Ionicons name="person" size={32} color={Colors.dark.textSecondary} />
              </View>
            )}
            <View style={styles.personInfo}>
              <Text style={styles.personLabel}>
                {i18n.locale === 'fr' ? 'Tâcheron assigné' : 'Assigned Tasker'}
              </Text>
              <Text style={styles.personName}>{taskerName}</Text>
              {taskerRating && taskerRating > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.ratingText}>
                    {taskerRating.toFixed(1)}
                    {taskerTotalReviews ? ` (${taskerTotalReviews})` : ''}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Client Card (for Tasker) */}
        {isTasker && (
          <View style={styles.personCard}>
            {task.client_profile_image ? (
              <Image 
                source={{ uri: task.client_profile_image }} 
                style={styles.personAvatarImage}
              />
            ) : (
              <View style={styles.personAvatar}>
                <Ionicons name="person" size={32} color={Colors.dark.textSecondary} />
              </View>
            )}
            <View style={styles.personInfo}>
              <Text style={styles.personLabel}>
                {i18n.locale === 'fr' ? 'Client' : 'Client'}
              </Text>
              <Text style={styles.personName}>
                {task.client_name || 'Client'}
              </Text>
              {task.client_phone && (
                <Text style={styles.personPhone}>{task.client_phone}</Text>
              )}
            </View>
          </View>
        )}

        {/* Payment Section for Tasker (completed but unpaid) */}
        {showPaymentSection && (
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Ionicons name="wallet-outline" size={24} color="#f59e0b" />
              <Text style={styles.paymentTitle}>
                {i18n.locale === 'fr' ? 'En attente de paiement' : 'Awaiting Payment'}
              </Text>
            </View>
            <Text style={styles.paymentAmount}>{totalCost.toLocaleString()} XOF</Text>
            <View style={styles.paymentButtons}>
              <TouchableOpacity
                style={styles.chatPaymentButton}
                onPress={handleChat}
              >
                <Ionicons name="chatbubble" size={18} color={Colors.dark.primary} />
                <Text style={styles.chatPaymentButtonText}>
                  {i18n.locale === 'fr' ? 'Discuter paiement' : 'Chat about Payment'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCashButton}
                onPress={handleMarkPaidCash}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <>
                    <Ionicons name="cash" size={18} color={Colors.dark.background} />
                    <Text style={styles.confirmCashButtonText}>
                      {i18n.locale === 'fr' ? 'Confirmer espèces' : 'Confirm Cash'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Paid Badge */}
        {showPaidBadge && (
          <View style={styles.paidCard}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.dark.success} />
            <View style={styles.paidContent}>
              <Text style={styles.paidTitle}>
                {i18n.locale === 'fr' ? 'Paiement reçu' : 'Payment Received'}
              </Text>
              <Text style={styles.paidAmount}>{totalCost.toLocaleString()} XOF</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>
            {i18n.locale === 'fr' ? 'Actions' : 'Actions'}
          </Text>

          {/* En Route Button for Tasker */}
          {showEnRouteButton && (
            <TouchableOpacity style={[styles.actionButton, styles.primaryActionButton]} onPress={handleStartEnRoute} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="navigate" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {i18n.locale === 'fr' ? 'En route' : 'On My Way'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Commencer le trajet et partager votre position' : 'Start trip and share your location'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Complete Button for Tasker */}
          {showCompleteButton && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.successActionButton]} 
              onPress={handleCompleteTask} 
              activeOpacity={0.7}
              disabled={actionLoading}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: Colors.dark.success }]}>
                <Ionicons name="checkmark-done" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {i18n.locale === 'fr' ? 'Marquer comme terminée' : 'Mark as Completed'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Le travail est terminé' : 'The work is finished'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Track Tasker (Client) */}
          {showTrackTasker && (
            <TouchableOpacity style={styles.actionButton} onPress={handleTrackTasker} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="location" size={20} color={Colors.dark.background} />
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
                  {isClient 
                    ? (i18n.locale === 'fr' ? 'Envoyer un message au tâcheron' : 'Message the tasker')
                    : (i18n.locale === 'fr' ? 'Envoyer un message au client' : 'Message the client')
                  }
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

          {/* Rebook Service (Client only, completed) */}
          {isClient && isCompleted && (
            <TouchableOpacity style={styles.actionButton} onPress={handleRebook} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: Colors.dark.primary }]}>
                <Ionicons name="repeat" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {i18n.locale === 'fr' ? 'Réserver à nouveau' : 'Book Again'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Réserver le même service' : 'Book the same service again'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          )}

          {/* View Tasker Profile (Client only) */}
          {isClient && taskerId && (
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

          {/* Raise Dispute (Client only, completed or active) */}
          {showDispute && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.disputeActionButton]} 
              onPress={() => setShowDisputeModal(true)} 
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#ef4444' }]}>
                <Ionicons name="alert-circle" size={20} color={Colors.dark.background} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: '#ef4444' }]}>
                  {i18n.locale === 'fr' ? 'Signaler un problème' : 'Raise a Dispute'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {i18n.locale === 'fr' ? 'Signaler un problème avec cette tâche' : 'Report an issue with this task'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}

          {/* Cancel Task */}
          {showCancel && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelActionButton]} 
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
                style={[styles.confirmCancelModalButton, cancelling && styles.disabledButton]} 
                onPress={handleCancelTask}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <Text style={styles.confirmCancelModalButtonText}>
                    {i18n.locale === 'fr' ? 'Oui, annuler' : 'Yes, Cancel'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dispute Modal */}
      <Modal visible={showDisputeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {i18n.locale === 'fr' ? 'Signaler un problème' : 'Raise a Dispute'}
              </Text>
              <TouchableOpacity onPress={() => setShowDisputeModal(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.disputeInfo}>
              {i18n.locale === 'fr' 
                ? 'Notre équipe examinera votre demande et vous contactera sous 24-48 heures.'
                : 'Our team will review your request and contact you within 24-48 hours.'}
            </Text>

            {/* Reason Selection */}
            <View style={styles.reasonSection}>
              <Text style={styles.commentLabel}>
                {i18n.locale === 'fr' ? 'Raison du litige' : 'Dispute Reason'} *
              </Text>
              <ScrollView 
                horizontal={false} 
                style={styles.reasonList}
                nestedScrollEnabled
              >
                {DISPUTE_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonOption,
                      disputeReason === (i18n.locale === 'fr' ? reason.fr : reason.en) && styles.reasonSelected,
                    ]}
                    onPress={() => setDisputeReason(i18n.locale === 'fr' ? reason.fr : reason.en)}
                  >
                    <Text style={[
                      styles.reasonText,
                      disputeReason === (i18n.locale === 'fr' ? reason.fr : reason.en) && styles.reasonTextSelected,
                    ]}>
                      {i18n.locale === 'fr' ? reason.fr : reason.en}
                    </Text>
                    {disputeReason === (i18n.locale === 'fr' ? reason.fr : reason.en) && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.dark.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>
                {i18n.locale === 'fr' ? 'Décrivez le problème' : 'Describe the Issue'} *
              </Text>
              <TextInput
                style={styles.commentInput}
                placeholder={i18n.locale === 'fr' ? 'Expliquez le problème en détail...' : 'Explain the issue in detail...'}
                placeholderTextColor={Colors.dark.textSecondary}
                value={disputeDescription}
                onChangeText={setDisputeDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.cancelButtons}>
              <TouchableOpacity 
                style={styles.cancelModalButton} 
                onPress={() => setShowDisputeModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>
                  {i18n.locale === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.disputeSubmitButton, submittingDispute && styles.disabledButton]} 
                onPress={handleSubmitDispute}
                disabled={submittingDispute}
              >
                {submittingDispute ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <Text style={styles.confirmCancelModalButtonText}>
                    {i18n.locale === 'fr' ? 'Soumettre' : 'Submit'}
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
  waitingCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  waitingContent: {
    flex: 1,
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 4,
  },
  waitingText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  timerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  timerContent: {
    flex: 1,
    marginLeft: 12,
  },
  timerLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  timerRunning: {
    color: Colors.dark.primary,
  },
  timerStartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerStopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.error,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.error,
  },
  acceptRejectCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
  },
  acceptRejectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  acceptRejectSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  acceptRejectButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.error,
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark.error,
  },
  acceptTaskButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptTaskButtonText: {
    fontSize: 15,
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
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  personAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  personAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  personInfo: {
    flex: 1,
  },
  personLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  personPhone: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  paymentCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  paymentAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  paymentButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  chatPaymentButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  chatPaymentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  confirmCashButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.success,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmCashButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  paidCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  paidContent: {
    flex: 1,
  },
  paidTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  paidAmount: {
    fontSize: 20,
    fontWeight: 'bold',
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
  primaryActionButton: {
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },
  successActionButton: {
    borderColor: Colors.dark.success,
    borderWidth: 2,
  },
  cancelActionButton: {
    borderColor: Colors.dark.error,
  },
  disputeActionButton: {
    borderColor: '#ef4444',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  confirmCancelModalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.dark.error,
    alignItems: 'center',
  },
  confirmCancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Dispute Modal Styles
  disputeInfo: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  reasonSection: {
    marginBottom: 16,
  },
  reasonList: {
    maxHeight: 200,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.background,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  reasonSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: `${Colors.dark.primary}15`,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.dark.text,
    flex: 1,
  },
  reasonTextSelected: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  disputeSubmitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
});
