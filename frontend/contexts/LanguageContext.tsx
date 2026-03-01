import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../utils/i18n';
import { storage } from '../utils/storage';

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(i18n.locale);

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      const savedLanguage = await storage.getLanguage();
      if (savedLanguage && savedLanguage !== locale) {
        i18n.locale = savedLanguage;
        setLocaleState(savedLanguage);
      }
    };
    loadLanguage();
  }, []);

  const setLocale = async (newLocale: string) => {
    i18n.locale = newLocale;
    await storage.saveLanguage(newLocale);
    setLocaleState(newLocale);
  };

  const t = (key: string) => {
    return i18n.t(key);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}