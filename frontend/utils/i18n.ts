import { I18n } from 'i18n-js';

// Set French as default language
let deviceLanguage = 'fr';
try {
  const locales = require('expo-localization').getLocales();
  if (locales && locales[0]) {
    // Keep French as default even if device is in another language
    deviceLanguage = 'fr';
  }
} catch (e) {
  console.log('Could not load localization:', e);
}

const i18n = new I18n({
  en: {
    welcome: {
      title: 'Welcome to Soutrali',
      subtitle: 'Find trusted taskers in Africa',
      getStarted: 'Get Started',
      login: 'Login',
    },
    auth: {
      login: {
        title: 'Login',
        subtitle: 'Welcome back!',
        email: 'Email',
        emailPlaceholder: 'Enter your email',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        forgotPassword: 'Forgot Password?',
        button: 'Login',
        noAccount: "Don't have an account?",
        signUp: 'Sign Up',
      },
      signup: {
        title: 'Sign Up',
        subtitle: 'Create your account',
        fullName: 'Full Name',
        fullNamePlaceholder: 'Enter your full name',
        email: 'Email',
        emailPlaceholder: 'Enter your email',
        phone: 'Phone Number',
        phonePlaceholder: 'Enter your phone number',
        password: 'Password',
        passwordPlaceholder: 'Create a password',
        confirmPassword: 'Confirm Password',
        confirmPasswordPlaceholder: 'Confirm your password',
        selectRole: 'I want to:',
        client: 'Hire a Tasker',
        tasker: 'Become a Tasker',
        button: 'Sign Up',
        haveAccount: 'Already have an account?',
        login: 'Login',
      },
      loggingIn: 'Logging in...',
      signingUp: 'Creating account...',
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      nameRequired: 'Full name is required',
      phoneRequired: 'Phone number is required',
      countryRequired: 'Country is required',
      invalidEmail: 'Invalid email address',
      loginError: 'Invalid email or password',
      signupError: 'Failed to create account',
    },
    home: {
      title: 'Find Taskers',
      search: 'Search services...',
      categories: 'Categories',
      featured: 'Featured Taskers',
    },
    taskers: {
      title: 'Taskers',
    },
    bookings: {
      title: 'My Bookings',
      active: 'Active',
      completed: 'Completed',
      noBookings: 'No bookings yet',
    },
    profile: {
      title: 'Profile',
      logout: 'Logout',
      settings: 'Settings',
      language: 'Language',
    },
  },
  fr: {
    welcome: {
      title: 'Bienvenue sur Soutrali',
      subtitle: 'Trouvez des pros de confiance en Afrique',
      getStarted: 'Commencer',
      login: 'Connexion',
    },
    auth: {
      login: {
        title: 'Connexion',
        subtitle: 'Bienvenue!',
        email: 'Email',
        emailPlaceholder: 'Entrez votre email',
        password: 'Mot de passe',
        passwordPlaceholder: 'Entrez votre mot de passe',
        forgotPassword: 'Mot de passe oublié?',
        button: 'Se connecter',
        noAccount: 'Pas de compte?',
        signUp: "S'inscrire",
      },
      signup: {
        title: 'Inscription',
        subtitle: 'Créez votre compte',
        fullName: 'Nom complet',
        fullNamePlaceholder: 'Entrez votre nom complet',
        email: 'Email',
        emailPlaceholder: 'Entrez votre email',
        phone: 'Numéro de téléphone',
        phonePlaceholder: 'Entrez votre numéro',
        password: 'Mot de passe',
        passwordPlaceholder: 'Créez un mot de passe',
        confirmPassword: 'Confirmer le mot de passe',
        confirmPasswordPlaceholder: 'Confirmez votre mot de passe',
        selectRole: 'Je veux:',
        client: 'Embaucher un pro',
        tasker: 'Devenir pro',
        button: "S'inscrire",
        haveAccount: 'Vous avez déjà un compte?',
        login: 'Connexion',
      },
      loggingIn: 'Connexion...',
      signingUp: 'Création du compte...',
      emailRequired: 'Email requis',
      passwordRequired: 'Mot de passe requis',
      nameRequired: 'Nom complet requis',
      phoneRequired: 'Numéro de téléphone requis',
      countryRequired: 'Pays requis',
      invalidEmail: 'Email invalide',
      loginError: 'Email ou mot de passe invalide',
      signupError: 'Échec de création du compte',
    },
    home: {
      title: 'Trouver des pros',
      search: 'Rechercher des services...',
      categories: 'Catégories',
      featured: 'pros en vedette',
    },
    taskers: {
      title: 'pros',
    },
    bookings: {
      title: 'Mes Réservations',
      active: 'Actives',
      completed: 'Terminées',
      noBookings: 'Aucune réservation',
    },
    profile: {
      title: 'Profil',
      logout: 'Déconnexion',
      settings: 'Paramètres',
      language: 'Langue',
    },
  },
});

i18n.locale = deviceLanguage;
i18n.enableFallback = true;

export default i18n;
