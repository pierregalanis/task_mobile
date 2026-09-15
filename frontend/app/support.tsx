import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';
import { showMessage } from '../utils/alert';
import { useAuth } from '../contexts/AuthContext';

const SUPPORT_EMAIL = 'help@soutrali.net';
const SUPPORT_WHATSAPP = '+13136990734';
const PRIVACY_POLICY_URL = 'https://soutrali.net/privacy';
const TERMS_OF_SERVICE_URL = 'https://soutrali.net/terms';

export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isFrench = i18n.locale === 'fr';
  const [howToTab, setHowToTab] = useState<'client' | 'pro'>(user?.role === 'tasker' ? 'pro' : 'client');

  const clientSteps = [
    {
      title: isFrench ? 'Choisissez votre service' : 'Choose your service',
      text: isFrench
        ? 'Ouvrez l\'application, sélectionnez une catégorie (ménage, plomberie, électricité...) et un Pro disponible près de chez vous.'
        : 'Open the app, pick a category (cleaning, plumbing, electrical...) and a Pro available near you.',
    },
    {
      title: isFrench ? 'Réservez en quelques clics' : 'Book in a few taps',
      text: isFrench
        ? 'Indiquez la date, l\'heure et l\'adresse. Le Pro reçoit votre demande immédiatement.'
        : 'Enter the date, time, and address. The Pro receives your request right away.',
    },
    {
      title: isFrench ? 'Suivez son arrivée en direct' : 'Track their arrival live',
      text: isFrench
        ? 'Une fois votre demande acceptée, suivez le trajet du Pro sur la carte jusqu\'à son arrivée chez vous.'
        : 'Once your request is accepted, follow the Pro\'s route on the map until they arrive.',
    },
    {
      title: isFrench ? 'Le Pro vérifie le travail avant de commencer' : 'The Pro checks the job before starting',
      text: isFrench
        ? 'À son arrivée, le Pro confirme que tout correspond à votre demande. S\'il propose un nouveau prix, vous devez l\'accepter avant que le travail ne débute.'
        : 'On arrival, the Pro confirms everything matches your request. If they propose a new price, you must approve it before work begins.',
    },
    {
      title: isFrench ? 'Payez directement dans l\'app' : 'Pay directly in the app',
      text: isFrench
        ? 'Une fois le travail terminé, payez en toute sécurité par Orange Money ou Wave — plus besoin d\'espèces. Si vous oubliez, un rappel vous sera envoyé.'
        : 'Once the job is done, pay securely via Orange Money or Wave — no cash needed. If you forget, you\'ll get a reminder.',
    },
    {
      title: isFrench ? 'Donnez votre avis' : 'Leave a review',
      text: isFrench
        ? 'Vous avez 14 jours après la fin du service pour laisser une note et un commentaire sur le Pro.'
        : 'You have 14 days after the job to rate and review the Pro.',
    },
  ];

  const proSteps = [
    {
      title: isFrench ? 'Recevez une demande' : 'Get a request',
      text: isFrench
        ? 'Une notification vous prévient dès qu\'un client réserve l\'un de vos services.'
        : 'A notification alerts you as soon as a client books one of your services.',
    },
    {
      title: isFrench ? 'Acceptez ou refusez' : 'Accept or decline',
      text: isFrench
        ? 'Vous décidez librement si vous pouvez prendre la tâche.'
        : 'You decide whether you can take the job.',
    },
    {
      title: isFrench ? 'Signalez votre départ' : 'Signal you\'re on your way',
      text: isFrench
        ? 'Appuyez sur « En route » pour que le client puisse suivre votre trajet en temps réel.'
        : 'Tap "En route" so the client can track your arrival in real time.',
    },
    {
      title: isFrench ? 'Confirmez le travail sur place' : 'Confirm the job on site',
      text: isFrench
        ? 'À votre arrivée, vérifiez que la tâche correspond bien à la demande. Si ce n\'est pas le cas, proposez un nouveau prix au client avant de commencer.'
        : 'On arrival, check that the job matches the request. If not, propose a new price to the client before starting.',
    },
    {
      title: isFrench ? 'Terminez la tâche' : 'Complete the task',
      text: isFrench
        ? 'Une fois le travail fini, marquez la tâche comme terminée dans l\'application.'
        : 'Once the work is done, mark the task as completed in the app.',
    },
    {
      title: isFrench ? 'Recevez votre paiement automatiquement' : 'Get paid automatically',
      text: isFrench
        ? 'Le client paie dans l\'app. Votre part vous est reversée automatiquement par Orange Money ou Wave — vous n\'avez jamais à gérer d\'espèces.'
        : 'The client pays in the app. Your share is sent automatically via Orange Money or Wave — you never handle cash.',
    },
  ];

  const activeSteps = howToTab === 'client' ? clientSteps : proSteps;

  const handleEmailSupport = async () => {
    const subject = isFrench ? 'Support Soutrali Mobile' : 'Soutrali Mobile Support';
    const body = isFrench 
      ? 'Bonjour,\n\nJe vous contacte concernant...\n\n' 
      : 'Hello,\n\nI am contacting you regarding...\n\n';
    
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showMessage(
          isFrench ? 'Erreur' : 'Error',
          isFrench 
            ? `Impossible d'ouvrir l'email. Contactez-nous à: ${SUPPORT_EMAIL}` 
            : `Unable to open email. Contact us at: ${SUPPORT_EMAIL}`
        );
      }
    } catch (error) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench 
          ? `Erreur lors de l'ouverture de l'email. Contactez-nous à: ${SUPPORT_EMAIL}` 
          : `Error opening email. Contact us at: ${SUPPORT_EMAIL}`
      );
    }
  };

  const handleWhatsAppSupport = async () => {
    const message = isFrench
      ? 'Bonjour Soutrali, j\'ai besoin d\'aide'
      : 'Hello Soutrali, I need help';

    const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP.replace('+', '')}?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // WhatsApp isn't installed — fall back to email
        await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
      }
    } catch (error) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench
          ? `Impossible d'ouvrir WhatsApp. Contactez-nous à: ${SUPPORT_EMAIL}`
          : `Unable to open WhatsApp. Contact us at: ${SUPPORT_EMAIL}`
      );
    }
  };

  const handlePhoneCall = async () => {
    const phoneUrl = `tel:${SUPPORT_WHATSAPP}`;
    
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        showMessage(
          isFrench ? 'Erreur' : 'Error',
          isFrench 
            ? `Impossible de passer l'appel. Appelez: ${SUPPORT_WHATSAPP}` 
            : `Unable to make call. Call: ${SUPPORT_WHATSAPP}`
        );
      }
    } catch (error) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Erreur lors de l\'appel' : 'Error making call'
      );
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Impossible d\'ouvrir le lien' : 'Unable to open link'
      );
    }
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch (error) {
      showMessage(
        isFrench ? 'Erreur' : 'Error',
        isFrench ? 'Impossible d\'ouvrir le lien' : 'Unable to open link'
      );
    }
  };

  const faqItems = [
    {
      question: isFrench ? 'Comment réserver un service ?' : 'How do I book a service?',
      answer: isFrench 
        ? 'Sélectionnez une catégorie depuis l\'accueil, choisissez un service et un prestataire, puis remplissez le formulaire de réservation.'
        : 'Select a category from the home screen, choose a service and tasker, then fill out the booking form.',
    },
    {
      question: isFrench ? 'Comment annuler une réservation ?' : 'How do I cancel a booking?',
      answer: isFrench 
        ? 'Allez dans "Mes Réservations", sélectionnez la réservation et appuyez sur "Annuler".'
        : 'Go to "My Bookings", select the booking, and tap "Cancel".',
    },
    {
      question: isFrench ? 'Comment contacter un prestataire ?' : 'How do I contact a tasker?',
      answer: isFrench 
        ? 'Une fois votre réservation acceptée, vous pouvez utiliser la messagerie intégrée pour contacter le prestataire.'
        : 'Once your booking is accepted, you can use the in-app messaging to contact the tasker.',
    },
    {
      question: isFrench ? 'Comment effectuer un paiement ?' : 'How do I make a payment?',
      answer: isFrench
        ? 'Les paiements se font via Orange Money ou Wave directement dans l\'application, sans quitter la plateforme.'
        : 'Payments are made via Orange Money or Wave directly within the app — no browser redirect needed.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFrench ? 'Aide & Support' : 'Help & Support'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Options */}
        <Text style={styles.sectionTitle}>
          {isFrench ? 'Nous contacter' : 'Contact Us'}
        </Text>

        <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
          <View style={[styles.contactIcon, { backgroundColor: '#3b82f6' + '20' }]}>
            <Ionicons name="mail" size={28} color="#3b82f6" />
          </View>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Email</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactCard} onPress={handleWhatsAppSupport}>
          <View style={[styles.contactIcon, { backgroundColor: '#25D366' + '20' }]}>
            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
          </View>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>WhatsApp</Text>
            <Text style={styles.contactValue}>{SUPPORT_WHATSAPP}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactCard} onPress={handlePhoneCall}>
          <View style={[styles.contactIcon, { backgroundColor: Colors.dark.primary + '20' }]}>
            <Ionicons name="call" size={28} color={Colors.dark.primary} />
          </View>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>
              {isFrench ? 'Téléphone' : 'Phone'}
            </Text>
            <Text style={styles.contactValue}>{SUPPORT_WHATSAPP}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.dark.textSecondary} />
        </TouchableOpacity>

        {/* How It Works Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
          {isFrench ? 'Comment ça marche' : 'How It Works'}
        </Text>

        <View style={styles.howToTabs}>
          <TouchableOpacity
            style={[styles.howToTab, howToTab === 'client' && styles.howToTabActiveClient]}
            onPress={() => setHowToTab('client')}
            testID="howto-tab-client"
          >
            <Text style={[styles.howToTabText, howToTab === 'client' && styles.howToTabTextActive]}>
              {isFrench ? 'Client' : 'Client'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.howToTab, howToTab === 'pro' && styles.howToTabActivePro]}
            onPress={() => setHowToTab('pro')}
            testID="howto-tab-pro"
          >
            <Text style={[styles.howToTabText, howToTab === 'pro' && styles.howToTabTextActive]}>
              {isFrench ? 'Pro' : 'Pro'}
            </Text>
          </TouchableOpacity>
        </View>

        {activeSteps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={[styles.stepNum, howToTab === 'pro' && styles.stepNumPro]}>
              <Text style={styles.stepNumText}>{index + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.paymentCallout}>
          <View style={[styles.contactIcon, { backgroundColor: Colors.dark.primary + '20', marginRight: 12 }]}>
            <Ionicons name="card-outline" size={24} color={Colors.dark.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.calloutTitle}>
              {isFrench ? 'Paiement 100% dans l\'application' : '100% In-App Payment'}
            </Text>
            <Text style={styles.calloutText}>
              {isFrench
                ? 'Orange Money et Wave uniquement — aucun paiement en espèces n\'est accepté.'
                : 'Orange Money and Wave only — no cash payments accepted.'}
            </Text>
          </View>
        </View>

        {/* FAQ Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
          {isFrench ? 'Questions fréquentes' : 'Frequently Asked Questions'}
        </Text>

        {faqItems.map((item, index) => (
          <View key={index} style={styles.faqCard}>
            <View style={styles.faqQuestion}>
              <Ionicons name="help-circle" size={20} color={Colors.dark.primary} />
              <Text style={styles.faqQuestionText}>{item.question}</Text>
            </View>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </View>
        ))}

        {/* Legal Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
          {isFrench ? 'Informations légales' : 'Legal Information'}
        </Text>

        <TouchableOpacity style={styles.legalCard} onPress={handleOpenPrivacyPolicy}>
          <View style={styles.legalContent}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.dark.primary} />
            <Text style={styles.legalTitle}>
              {isFrench ? 'Politique de confidentialité' : 'Privacy Policy'}
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color={Colors.dark.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.legalCard} onPress={handleOpenTermsOfService}>
          <View style={styles.legalContent}>
            <Ionicons name="document-text-outline" size={24} color={Colors.dark.primary} />
            <Text style={styles.legalTitle}>
              {isFrench ? 'Conditions d\'utilisation' : 'Terms of Service'}
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color={Colors.dark.textSecondary} />
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>Soutrali</Text>
          <Text style={styles.appInfoVersion}>
            {isFrench ? 'Version' : 'Version'} 1.0.0
          </Text>
          <Text style={styles.appInfoCopyright}>
            © 2025 Soutrali. {isFrench ? 'Tous droits réservés.' : 'All rights reserved.'}
          </Text>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  howToTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  howToTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
  },
  howToTabActiveClient: {
    borderColor: Colors.dark.primary,
    backgroundColor: `${Colors.dark.primary}18`,
  },
  howToTabActivePro: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b18',
  },
  howToTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  howToTabTextActive: {
    color: Colors.dark.text,
  },
  stepCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumPro: {
    backgroundColor: '#f59e0b',
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13.5,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  paymentCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  faqCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    paddingLeft: 28,
  },
  legalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  legalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  appInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  appInfoCopyright: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
});
