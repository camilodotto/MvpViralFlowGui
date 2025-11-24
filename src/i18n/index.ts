import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './locales/pt-BR/translation.json';
import en from './locales/en/translation.json';

export async function initI18n(initialLocale: string) {
  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        'pt-BR': { translation: ptBR },
        en: { translation: en },
      },
      lng: initialLocale,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });

  return i18n;
}

export default i18n;
