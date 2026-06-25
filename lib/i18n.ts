import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

const SUPPORTED_LANGUAGES = ["ar", "fr", "en"] as const;

export type SupportedLanguage =
  (typeof SUPPORTED_LANGUAGES)[number];

const fallbackLng: SupportedLanguage = "ar";

// تهيئة i18n أولاً
i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: fallbackLng,
  fallbackLng,
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

// تحميل اللغة المحفوظة أو لغة الجهاز
export async function initLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem("app-language");

    const deviceLanguage =
      Localization.getLocales()?.[0]?.languageCode ?? fallbackLng;

    const candidate = (saved ?? deviceLanguage) as SupportedLanguage;

    const resolved: SupportedLanguage =
      SUPPORTED_LANGUAGES.includes(candidate)
        ? candidate
        : fallbackLng;

    await i18n.changeLanguage(resolved);
  } catch (error) {
    console.warn("Failed to initialize language:", error);
    await i18n.changeLanguage(fallbackLng);
  }
}

export default i18n;
