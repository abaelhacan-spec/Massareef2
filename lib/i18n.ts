import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

// الحصول على لغة الجهاز تلقائياً
const deviceLanguage = Localization.getLocales()?.[0]?.languageCode ?? "ar";

// اللغات المدعومة
const SUPPORTED_LANGUAGES = ["ar", "fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const fallbackLng: SupportedLanguage = "ar";

const resolvedLanguage: SupportedLanguage = SUPPORTED_LANGUAGES.includes(
  deviceLanguage as SupportedLanguage
)
  ? (deviceLanguage as SupportedLanguage)
  : fallbackLng;

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: resolvedLanguage,
  fallbackLng,
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

export default i18n;
