import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from './translations';

type TranslationType = typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationType;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Default language is ALWAYS English. Users can change it explicitly in settings;
// only an explicit stored choice overrides English (no browser auto-detection).
const detectLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';

  try {
    const stored = localStorage.getItem('sovereign-language');
    if (stored && ['en', 'tr', 'de', 'fr'].includes(stored)) {
      return stored as Language;
    }
    return 'en';
  } catch {
    return 'en';
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => detectLanguage());

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('sovereign-language', lang);
    } catch {
      // localStorage might not be available
    }
  };

  const value = {
    language,
    setLanguage,
    t: translations[language] as TranslationType,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
