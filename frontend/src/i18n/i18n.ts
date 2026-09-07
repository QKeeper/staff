import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ru from "./locales/ru.json";
import en from "./locales/en.json";

export const defaultNS = "translation";
export const resources = {
  ru: {
    translation: ru,
  },
  en: {
    translation: en,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    supportedLngs: ["ru", "en"],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    fallbackLng: "ru",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      convertDetectedLanguage: (lng: string) => lng.split("-")[0],
    },
  });

export default i18n;
