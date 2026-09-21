import { Linking } from 'react-native';

const SUPPORT_EMAIL = 'help@soutrali.net';

interface ReportDetails {
  contentType: 'chat_conversation' | 'review';
  reason: string;
  reportedUserName?: string;
  reportedUserId?: string;
  contextId?: string; // task ID or review ID
  excerpt?: string;
  reporterEmail?: string;
  isFrench: boolean;
}

/**
 * Sends a content report to the support inbox via a pre-filled email.
 * No backend endpoint required — human moderation happens on receipt.
 */
export const reportContent = async (details: ReportDetails) => {
  const { contentType, reason, reportedUserName, reportedUserId, contextId, excerpt, reporterEmail, isFrench } = details;

  const subject = isFrench
    ? `Signalement — ${contentType === 'review' ? 'avis' : 'conversation'}`
    : `Report — ${contentType === 'review' ? 'review' : 'conversation'}`;

  const bodyLines = isFrench
    ? [
        `Type de contenu : ${contentType === 'review' ? 'Avis' : 'Conversation'}`,
        reportedUserName ? `Utilisateur signalé : ${reportedUserName}` : '',
        reportedUserId ? `ID utilisateur : ${reportedUserId}` : '',
        contextId ? `ID de référence : ${contextId}` : '',
        `Raison : ${reason}`,
        excerpt ? `Contenu signalé : "${excerpt}"` : '',
        reporterEmail ? `Contact du signalant : ${reporterEmail}` : '',
      ]
    : [
        `Content type: ${contentType === 'review' ? 'Review' : 'Conversation'}`,
        reportedUserName ? `Reported user: ${reportedUserName}` : '',
        reportedUserId ? `User ID: ${reportedUserId}` : '',
        contextId ? `Reference ID: ${contextId}` : '',
        `Reason: ${reason}`,
        excerpt ? `Reported content: "${excerpt}"` : '',
        reporterEmail ? `Reporter contact: ${reporterEmail}` : '',
      ];

  const body = bodyLines.filter(Boolean).join('\n');
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Error opening report email:', error);
    return false;
  }
};
