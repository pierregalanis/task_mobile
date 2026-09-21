import { reportAPI } from '../services/api';

interface ReportDetails {
  contentType: 'chat_conversation' | 'review';
  reason: string;
  reportedUserName?: string;
  reportedUserId?: string;
  contextId?: string; // task ID or review ID
  excerpt?: string;
}

/**
 * Submits a content report to the backend moderation queue.
 * The reporter is inferred server-side from the auth token.
 */
export const reportContent = async (details: ReportDetails): Promise<boolean> => {
  const { contentType, reason, reportedUserName, reportedUserId, contextId, excerpt } = details;

  try {
    await reportAPI.create({
      content_type: contentType,
      reported_user_id: reportedUserId,
      reported_user_name: reportedUserName,
      reference_id: contextId,
      reason,
      excerpt,
    });
    return true;
  } catch (error) {
    console.error('Error submitting report:', error);
    return false;
  }
};
