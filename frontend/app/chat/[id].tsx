import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { chatAPI, taskAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { showMessage } from '../../utils/alert';

// Quick Reply Templates
const TASKER_QUICK_REPLIES = {
  en: [
    { icon: '👋', text: "I'll be there! See you soon." },
    { icon: '📍', text: "Can you share the exact address?" },
    { icon: '📋', text: "Any specific instructions?" },
    { icon: '🚗', text: "On my way! ETA ~15 min." },
    { icon: '🚦', text: "Stuck in traffic, will be there soon." },
    { icon: '📍', text: "I am here!" },
    { icon: '✅', text: "Task completed! Thank you." },
    { icon: '💰', text: "Please confirm payment when ready." },
  ],
  fr: [
    { icon: '👋', text: "J'arrive bientôt ! À tout de suite." },
    { icon: '📍', text: "Pouvez-vous partager l'adresse exacte ?" },
    { icon: '📋', text: "Des instructions particulières ?" },
    { icon: '🚗', text: "En route ! J'arrive dans ~15 min." },
    { icon: '🚦', text: "Coincé dans le trafic, j'arrive bientôt." },
    { icon: '📍', text: "Je suis arrivé !" },
    { icon: '✅', text: "Tâche terminée ! Merci." },
    { icon: '💰', text: "Confirmez le paiement quand vous êtes prêt." },
  ],
};

const CLIENT_QUICK_REPLIES = {
  en: [
    { icon: '👍', text: "Great! Looking forward to it." },
    { icon: '📍', text: "Here's the address:" },
    { icon: '⏰', text: "What's your ETA?" },
    { icon: '🚗', text: "Are you on your way?" },
    { icon: '⏳', text: "I'll be a bit late." },
    { icon: '👀', text: "I see you! Coming now." },
    { icon: '⭐', text: "Great job! Thank you." },
    { icon: '💳', text: "Payment sent!" },
  ],
  fr: [
    { icon: '👍', text: "Super ! J'ai hâte." },
    { icon: '📍', text: "Voici l'adresse :" },
    { icon: '⏰', text: "Vous arrivez dans combien de temps ?" },
    { icon: '🚗', text: "Vous êtes en route ?" },
    { icon: '⏳', text: "Je serai un peu en retard." },
    { icon: '👀', text: "Je vous vois ! J'arrive." },
    { icon: '⭐', text: "Excellent travail ! Merci." },
    { icon: '💳', text: "Paiement envoyé !" },
  ],
};

// Quick Reply Chip Component
const QuickReplyChip = ({ 
  icon, 
  text, 
  onPress 
}: { 
  icon: string; 
  text: string; 
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.quickReplyChip}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text style={styles.quickReplyIcon}>{icon}</Text>
        <Text style={styles.quickReplyText} numberOfLines={1}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Quick Replies Section Component
const QuickRepliesSection = ({ 
  replies, 
  onSelectReply,
  isExpanded,
  onToggleExpand,
  isFrench,
}: { 
  replies: { icon: string; text: string }[];
  onSelectReply: (text: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFrench: boolean;
}) => {
  const heightAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const containerHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });

  return (
    <View style={styles.quickRepliesContainer}>
      {/* Toggle Button */}
      <TouchableOpacity 
        style={styles.quickRepliesToggle} 
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="flash" 
          size={16} 
          color={isExpanded ? Colors.dark.primary : Colors.dark.textSecondary} 
        />
        <Text style={[
          styles.quickRepliesToggleText,
          isExpanded && styles.quickRepliesToggleTextActive
        ]}>
          {isFrench ? 'Réponses rapides' : 'Quick Replies'}
        </Text>
        <Ionicons 
          name={isExpanded ? "chevron-down" : "chevron-up"} 
          size={16} 
          color={isExpanded ? Colors.dark.primary : Colors.dark.textSecondary} 
        />
      </TouchableOpacity>

      {/* Quick Reply Chips */}
      <Animated.View style={[styles.quickRepliesScroll, { height: containerHeight, opacity: heightAnim }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRepliesContent}
        >
          {replies.map((reply, index) => (
            <QuickReplyChip
              key={index}
              icon={reply.icon}
              text={reply.text}
              onPress={() => onSelectReply(reply.text)}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const { id: taskId } = useLocalSearchParams();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const isClient = user?.role === 'client';
  const isTasker = user?.role === 'tasker';
  const isFrench = i18n.locale === 'fr';

  // Get appropriate quick replies based on role and language
  const quickReplies = isTasker 
    ? (isFrench ? TASKER_QUICK_REPLIES.fr : TASKER_QUICK_REPLIES.en)
    : (isFrench ? CLIENT_QUICK_REPLIES.fr : CLIENT_QUICK_REPLIES.en);

  useEffect(() => {
    fetchTaskInfo();
    fetchMessages();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [taskId]);

  const fetchTaskInfo = async () => {
    try {
      // First try to get task directly by ID for complete data
      try {
        const directTask = await taskAPI.getTask(taskId as string);
        if (directTask) {
          console.log('Task fetched directly:', JSON.stringify(directTask, null, 2));
          setTask(directTask);
          return;
        }
      } catch (directError) {
        console.log('Direct task fetch failed, falling back to task list:', directError);
      }
      
      // Fallback to task list
      const tasks = isClient 
        ? await taskAPI.getClientTasks()
        : await taskAPI.getTaskerTasks();
      const currentTask = tasks?.find((t: any) => t.id === taskId);
      console.log('Task from list:', JSON.stringify(currentTask, null, 2));
      setTask(currentTask);
    } catch (error) {
      console.error('Error fetching task info:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const data = await chatAPI.getMessages(taskId as string);
      // Handle both array and object response
      const messageList = Array.isArray(data) ? data : (data?.messages || []);
      setMessages(messageList);
      setError(false);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      // Don't set error state if just no messages yet
      if (error.response?.status !== 404) {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || newMessage.trim();
    if (!textToSend || !task) return;

    // Get the receiver ID based on user role
    let receiverId: string | undefined;
    
    if (isClient) {
      receiverId = task.tasker_id || task.assigned_tasker_id || task.tasker?.id || task.assigned_to;
      console.log('Client sending message - Resolved tasker ID:', receiverId);
    } else {
      receiverId = task.client_id || task.user_id || task.client?.id || task.created_by;
      console.log('Tasker sending message - Resolved client ID:', receiverId);
    }

    if (!receiverId) {
      console.error('Unable to determine receiver ID from task:', task);
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Impossible d\'envoyer le message - destinataire introuvable' : 'Unable to send message - recipient not found'
      );
      return;
    }

    try {
      setSending(true);
      await chatAPI.sendMessage(taskId as string, receiverId, textToSend);
      setNewMessage('');
      setShowQuickReplies(false);
      await fetchMessages();
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        error.response?.data?.detail || (isFrench ? 'Échec de l\'envoi' : 'Failed to send')
      );
    } finally {
      setSending(false);
    }
  };

  const handleQuickReplySelect = (text: string) => {
    // Insert into input field (user can edit before sending)
    setNewMessage(text);
    setShowQuickReplies(false);
  };

  // Get message content - handle different field names
  const getMessageContent = (message: any) => {
    return message.content || message.message || message.text || '';
  };

  // Get message timestamp
  const getMessageTime = (message: any) => {
    const timestamp = message.created_at || message.timestamp || message.sent_at;
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };

  // Check if message is from current user
  const isOwnMessage = (message: any) => {
    return message.sender_id === user?.id || message.from_id === user?.id;
  };

  const otherPersonName = isClient 
    ? (task?.tasker_name || 'Tasker') 
    : (task?.client_name || 'Client');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (error && !task) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{isFrench ? 'Chat' : 'Chat'}</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.dark.error} />
          <Text style={styles.errorText}>
            {isFrench ? 'Impossible de charger la conversation' : 'Unable to load conversation'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchMessages(); fetchTaskInfo(); }}>
            <Text style={styles.retryButtonText}>{isFrench ? 'Réessayer' : 'Retry'}</Text>
          </TouchableOpacity>
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{otherPersonName}</Text>
          {task?.title && <Text style={styles.headerSubtitle}>{task.title}</Text>}
        </View>
        {/* Task Info Button */}
        <TouchableOpacity 
          onPress={() => router.push(`/task/${taskId}`)} 
          style={styles.infoButton}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {/* Task Status Banner (if not in_progress) */}
      {task && !['in_progress', 'en_route'].includes(task.status) && (
        <View style={[
          styles.statusBanner, 
          { backgroundColor: task.status === 'completed' ? Colors.dark.success : '#f59e0b' }
        ]}>
          <Ionicons 
            name={task.status === 'completed' ? 'checkmark-circle' : 'information-circle'} 
            size={16} 
            color={Colors.dark.background} 
          />
          <Text style={styles.statusBannerText}>
            {task.status === 'completed' 
              ? (isFrench ? 'Tâche terminée' : 'Task completed')
              : task.status === 'assigned' || task.status === 'pending'
                ? (isFrench ? 'En attente d\'acceptation' : 'Awaiting acceptance')
                : (isFrench ? 'Tâche acceptée' : 'Task accepted')
            }
          </Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyText}>
                {isFrench 
                  ? 'Aucun message encore. Commencez la conversation!' 
                  : 'No messages yet. Start the conversation!'}
              </Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const own = isOwnMessage(message);
              const content = getMessageContent(message);
              const time = getMessageTime(message);
              
              return (
                <View
                  key={message.id || index}
                  style={[
                    styles.messageBubble,
                    own ? styles.ownMessage : styles.otherMessage,
                  ]}
                >
                  {!own && message.sender_name && (
                    <Text style={styles.senderName}>{message.sender_name}</Text>
                  )}
                  <Text style={[
                    styles.messageText,
                    own ? styles.ownMessageText : styles.otherMessageText,
                  ]}>
                    {content}
                  </Text>
                  {time && (
                    <Text style={[
                      styles.messageTime,
                      own ? styles.ownMessageTime : styles.otherMessageTime,
                    ]}>
                      {time}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Quick Replies Section */}
        <QuickRepliesSection
          replies={quickReplies}
          onSelectReply={handleQuickReplySelect}
          isExpanded={showQuickReplies}
          onToggleExpand={() => setShowQuickReplies(!showQuickReplies)}
          isFrench={isFrench}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={isFrench ? 'Tapez un message...' : 'Type a message...'}
            placeholderTextColor={Colors.dark.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.dark.background} />
            ) : (
              <Ionicons name="send" size={20} color={Colors.dark.background} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.dark.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.card,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: Colors.dark.background,
  },
  otherMessageText: {
    color: Colors.dark.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: Colors.dark.textSecondary,
  },
  
  // Quick Replies Styles
  quickRepliesContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  quickRepliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  quickRepliesToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  quickRepliesToggleTextActive: {
    color: Colors.dark.primary,
  },
  quickRepliesScroll: {
    overflow: 'hidden',
  },
  quickRepliesContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginRight: 8,
    gap: 6,
    maxWidth: 200,
  },
  quickReplyIcon: {
    fontSize: 14,
  },
  quickReplyText: {
    fontSize: 13,
    color: Colors.dark.text,
    flexShrink: 1,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.dark.text,
    maxHeight: 100,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dark.border,
  },
});
