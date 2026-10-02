import { reportAPI } from '../services/api';

interface ReportDetails {
  contentType: 'conversation' | 'review' | 'user';
  reason: string;
  reportedUserName?: string; // display-only, not sent to the API
  reportedUserId?: string;
  contextId?: string; // task ID for a conversation, review ID for a review
  excerpt?: string;
}

/**
 * Submits a content report to the backend moderation queue.
 * The reporter is inferred server-side from the auth token.
 */
export const reportContent = async (details: ReportDetails): Promise<boolean> => {
  const { contentType, reason, reportedUserId, contextId, excerpt } = details;

  try {
    await reportAPI.create({
      content_type: contentType,
      reported_user_id: reportedUserId,
      reference_id: contextId,
      reason,
      excerpt: excerpt?.slice(0, 500),
    });
    return true;
  } catch (error) {
    console.error('Error submitting report:', error);
    return false;
  }
};
