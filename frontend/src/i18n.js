import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fi from './locales/fi/translation.json';
import en from './locales/en/translation.json';
import sv from './locales/sv/translation.json';

const resources = {
  fi: { translation: fi },
  en: { translation: en },
  sv: { translation: sv },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fi',
    supportedLngs: ['fi', 'en', 'sv'],

    detection: {
      order: ['sessionStorage', 'navigator'],
      lookupSessionStorage: 'language',
      caches: ['sessionStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
