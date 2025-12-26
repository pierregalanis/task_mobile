import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';
import { aiAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  // Generate session ID on component mount
  const [sessionId, setSessionId] = useState<string>(`mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the floating button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Initial greeting when opening chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: 'greeting',
        text: i18n.locale === 'fr'
          ? `Bonjour${user?.full_name ? ' ' + user.full_name.split(' ')[0] : ''} ! 👋\n\nJe suis Soutou, votre assistant Soutrali. Comment puis-je vous aider aujourd'hui?\n\n• Trouver un tâcheron\n• Questions sur les prix\n• Aide à la réservation\n• Conseils pour votre service`
          : `Hello${user?.full_name ? ' ' + user.full_name.split(' ')[0] : ''} ! 👋\n\nI'm Soutou, your Soutrali assistant. How can I help you today?\n\n• Find a tasker\n• Pricing questions\n• Booking help\n• Service advice`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [isOpen, user]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Use the aiAPI chat function which handles session_id generation
      const response = await aiAPI.chat(
        userMessage.text,
        sessionId,
        messages.filter(m => m.id !== 'greeting' && !m.id.startsWith('greeting')).map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text,
        }))
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response || response.message || 'I apologize, I could not process your request.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      if (response.session_id) {
        setSessionId(response.session_id);
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: i18n.locale === 'fr'
          ? 'Désolé, je rencontre des difficultés. Veuillez réessayer.'
          : 'Sorry, I encountered an issue. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    // Generate new session ID when clearing chat
    setSessionId(`mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    // Re-add greeting
    const greeting: Message = {
      id: 'greeting-new',
      text: i18n.locale === 'fr'
        ? 'Conversation réinitialisée. Comment puis-je vous aider?'
        : 'Chat cleared. How can I help you?',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  };

  // Quick action buttons
  const quickActions = [
    { 
      label: i18n.locale === 'fr' ? '🧹 Trouver un nettoyeur' : '🧹 Find a cleaner',
      query: i18n.locale === 'fr' ? 'Je cherche un service de nettoyage' : 'I need a cleaning service'
    },
    { 
      label: i18n.locale === 'fr' ? '💰 Prix moyen?' : '💰 Average price?',
      query: i18n.locale === 'fr' ? 'Quels sont les prix moyens des services?' : 'What are the average service prices?'
    },
    { 
      label: i18n.locale === 'fr' ? '📝 Comment réserver?' : '📝 How to book?',
      query: i18n.locale === 'fr' ? 'Comment réserver un service?' : 'How do I book a service?'
    },
  ];

  // Handle quick action - directly send the query
  const handleQuickAction = async (query: string) => {
    if (loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: query,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    Keyboard.dismiss();

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Use the aiAPI chat function which handles session_id generation
      const response = await aiAPI.chat(
        query,
        sessionId,
        messages.filter(m => m.id !== 'greeting' && !m.id.startsWith('greeting')).map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text,
        }))
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response || response.message || 'I apologize, I could not process your request.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      if (response.session_id) {
        setSessionId(response.session_id);
      }

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: i18n.locale === 'fr'
          ? 'Désolé, je rencontre des difficultés. Veuillez réessayer.'
          : 'Sorry, I encountered an issue. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <Animated.View style={[styles.floatingButton, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={styles.floatingButtonInner}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color={Colors.dark.background} />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarEmoji}>🤖</Text>
                </View>
                <View>
                  <Text style={styles.headerTitle}>Soutou</Text>
                  <Text style={styles.headerSubtitle}>
                    {i18n.locale === 'fr' ? 'Assistant Soutrali' : 'Soutrali Assistant'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
                  <Ionicons name="refresh" size={20} color={Colors.dark.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.headerButton}>
                  <Ionicons name="close" size={24} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.isUser ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  {!msg.isUser && (
                    <Text style={styles.aiLabel}>Soutou</Text>
                  )}
                  <Text style={[
                    styles.messageText,
                    msg.isUser ? styles.userText : styles.aiText
                  ]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
              
              {loading && (
                <View style={[styles.messageBubble, styles.aiBubble]}>
                  <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={Colors.dark.primary} />
                    <Text style={styles.typingText}>
                      {i18n.locale === 'fr' ? 'Soutou réfléchit...' : 'Soutou is thinking...'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick Actions */}
            {messages.length <= 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickActionsContainer}
                contentContainerStyle={styles.quickActionsContent}
              >
                {quickActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickAction}
                    onPress={() => handleQuickAction(action.query)}
                  >
                    <Text style={styles.quickActionText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={i18n.locale === 'fr' ? 'Posez votre question...' : 'Ask your question...'}
                placeholderTextColor={Colors.dark.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!message.trim() || loading) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!message.trim() || loading}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={message.trim() && !loading ? Colors.dark.background : Colors.dark.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 1000,
  },
  floatingButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    maxHeight: 700,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.dark.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.card,
    borderBottomLeftRadius: 4,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: Colors.dark.background,
  },
  aiText: {
    color: Colors.dark.text,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontStyle: 'italic',
  },
  quickActionsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  quickActionsContent: {
    padding: 12,
    gap: 8,
  },
  quickAction: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  quickActionText: {
    fontSize: 13,
    color: Colors.dark.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.dark.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dark.card,
  },
});
