// Client-side French translation of backend API error messages.
// Backend always returns English in `detail` — this is a display-only mapping,
// mirrored 1:1 from the web app's frontend/src/utils/apiErrors.js so both
// apps show identical French text. Never edit the backend to "fix" this.

const FR_MAP: Record<string, string> = {
  // Reviews
  'You have already reviewed this task': 'Vous avez déjà laissé un avis pour cette tâche',
  'Task must be completed before review': 'La tâche doit être terminée avant de laisser un avis',
  'Task must be paid before review': 'La tâche doit être payée avant de laisser un avis',
  'You can only review tasks you booked': 'Vous ne pouvez évaluer que les tâches que vous avez réservées',
  'Review window expired. Reviews must be submitted within 14 days of task completion.':
    'Le délai pour laisser un avis a expiré. Les avis doivent être soumis dans les 14 jours suivant la fin de la tâche.',
  'Only clients can submit reviews': 'Seuls les clients peuvent laisser un avis',
  'Failed to create review': "Échec de la création de l'avis",

  // Tasks & Bookings
  'Task not found': 'Tâche introuvable',
  'User not found': 'Utilisateur introuvable',
  'Tasker not found': 'Prestataire introuvable',
  'Tasker is not available': "Ce prestataire n'est pas disponible",
  'Only clients can create bookings': 'Seuls les clients peuvent créer des réservations',
  'Task is not available for applications': "Cette tâche n'accepte plus de candidatures",
  'Already applied to this task': 'Vous avez déjà postulé à cette tâche',
  'Task cannot be accepted in current status': "La tâche ne peut pas être acceptée dans son état actuel",
  'Task is already marked as paid': 'La tâche est déjà marquée comme payée',
  'Task must be completed before marking as paid': "La tâche doit être terminée avant d'être marquée comme payée",
  'Not authorized': 'Non autorisé',
  'Not authorized to cancel this task': "Vous n'êtes pas autorisé à annuler cette tâche",
  'Not your task': "Ce n'est pas votre tâche",
  'Task not assigned to you': "Cette tâche ne vous est pas attribuée",
  'Task has no assigned tasker': "Aucun prestataire n'est attribué à cette tâche",

  // Timer & Tracking
  'Timer is already running': 'Le chronomètre est déjà en cours',
  'Timer is not running': "Le chronomètre n'est pas en cours",
  'Task must be in progress to start timer': 'La tâche doit être en cours pour démarrer le chronomètre',
  'Task must be en route or in progress': 'La tâche doit être en route ou en cours',
  'Task must be accepted before starting tracking': 'La tâche doit être acceptée avant de démarrer le suivi',
  'You must arrive at the job location before assessing work':
    "Vous devez arriver sur le lieu de la tâche avant d'évaluer le travail",

  // Payments
  'Cash payments are no longer supported. Please ask the client to pay via Orange Money or Wave in the app.':
    'Les paiements en espèces ne sont plus acceptés. Veuillez demander au client de payer via Orange Money ou Wave dans l\'application.',

  // Authentication & Account
  'Incorrect email or password': 'Email ou mot de passe incorrect',
  'Email already registered': 'Cet email est déjà utilisé par un autre compte.',
  'Phone number already registered': 'Ce numéro de téléphone est déjà utilisé par un autre compte.',
  'Please verify your account with the code sent to your WhatsApp before logging in.':
    'Veuillez vérifier votre compte avec le code envoyé sur votre WhatsApp avant de vous connecter.',
  'Please verify your email before logging in. Check your inbox for the verification link.':
    'Veuillez vérifier votre email avant de vous connecter. Consultez votre boîte de réception.',
  'Your account has been banned.': 'Votre compte a été banni.',
  'Your account has been deactivated. Please contact an administrator.':
    'Votre compte a été désactivé. Veuillez contacter un administrateur.',
  'Invalid or expired code': 'Code invalide ou expiré',
  'Code has expired. Please request a new one.': 'Le code a expiré. Veuillez en demander un nouveau.',
  'Too many failed attempts. Please request a new code.': 'Trop de tentatives échouées. Veuillez demander un nouveau code.',
  'Please wait a minute before requesting another code.': 'Veuillez patienter une minute avant de demander un autre code.',
  'Invalid or expired reset token': 'Lien de réinitialisation invalide ou expiré',
  'Reset token has expired': 'Le lien de réinitialisation a expiré',
  'Verification link has expired. Please request a new one from the login page.':
    'Le lien de vérification a expiré. Veuillez en demander un nouveau depuis la page de connexion.',
  'No account found for this email. Please sign up again.':
    'Aucun compte trouvé pour cet email. Veuillez vous réinscrire.',
  'Current password is incorrect': 'Le mot de passe actuel est incorrect',
  'Password must be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
  'Password must be at least 8 characters': 'Le mot de passe doit contenir au moins 8 caractères',
  'Failed to update password': 'Échec de la mise à jour du mot de passe',
  'Account not found': 'Compte introuvable',
  'User record not found. Please log out and back in.':
    'Compte utilisateur introuvable. Veuillez vous déconnecter puis vous reconnecter.',

  // Identity Verification
  'You already have a pending verification request': 'Vous avez déjà une demande de vérification en attente',
  'You can only resubmit after a rejection': "Vous ne pouvez soumettre à nouveau qu'après un refus",
  'Your identity is already verified': 'Votre identité est déjà vérifiée',
  'Selfie must be an image (JPEG, PNG)': 'Le selfie doit être une image (JPEG, PNG)',

  // Moderation & Uploads
  'You cannot block yourself': 'Vous ne pouvez pas vous bloquer vous-même',
  'Image upload failed': "Échec du téléchargement de l'image",

  // Chat lock (72h after paid)
  'This chat is closed because the job was completed and paid. Please rebook to start a new conversation.':
    'Cette discussion est fermée car la tâche a été terminée et payée. Veuillez faire une nouvelle réservation pour recommencer une conversation.',
};

// Dynamic (f-string) backend messages — match by prefix.
const FR_PREFIX_RULES: Array<[string, string]> = [
  ['Cannot cancel a task that is already', 'Impossible d\'annuler une tâche déjà terminée ou annulée'],
];

/**
 * Translates a raw backend `detail` string to French when the app language is
 * French. Unmapped strings (including already-French backend messages, e.g.
 * the AfribaPay/minimum-price ones) pass through unchanged — never crashes,
 * never hides a new/unknown backend message.
 */
export const translateApiError = (detail: unknown, language: string): string | null => {
  if (typeof detail !== 'string' || !detail) return null;
  if (language !== 'fr') return detail;
  if (FR_MAP[detail]) return FR_MAP[detail];
  for (const [prefix, fr] of FR_PREFIX_RULES) {
    if (detail.startsWith(prefix)) return fr;
  }
  return detail;
};
