import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

const i18n = new I18n({
  en: {
    welcome: {
      title: 'Welcome to Soutrali',
      subtitle: 'Find trusted taskers in Africa',
      getStarted: 'Get Started',
      login: 'Login',
    },
    auth: {
      login: 'Login',
      signup: 'Sign Up',
      email: 'Email',
      password: 'Password',
      fullName: 'Full Name',
      phone: 'Phone Number',
      country: 'Country',
      selectRole: 'I want to:',
      client: 'Hire a Tasker',
      tasker: 'Become a Tasker',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      loginButton: 'Login',
      signupButton: 'Sign Up',
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
      subtitle: 'Trouvez des tâcherons de confiance en Afrique',
      getStarted: 'Commencer',
      login: 'Connexion',
    },
    auth: {
      login: 'Connexion',
      signup: 'Inscription',
      email: 'Email',
      password: 'Mot de passe',
      fullName: 'Nom complet',
      phone: 'Numéro de téléphone',
      country: 'Pays',
      selectRole: 'Je veux:',
      client: 'Embaucher un Tâcheron',
      tasker: 'Devenir Tâcheron',
      forgotPassword: 'Mot de passe oublié?',
      noAccount: "Pas de compte?",
      haveAccount: 'Vous avez déjà un compte?',
      loginButton: 'Se connecter',
      signupButton: "S'inscrire",
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
      title: 'Trouver des Tâcherons',
      search: 'Rechercher des services...',
      categories: 'Catégories',
      featured: 'Tâcherons en vedette',
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

const locales = getLocales();
i18n.locale = locales && locales[0] ? locales[0].languageCode || 'en' : 'en';
i18n.enableFallback = true;

export default i18n;
