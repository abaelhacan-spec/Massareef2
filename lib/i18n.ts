import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";

import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

export const LANGUAGE_KEY = "app-language";

const SUPPORTED_LANGUAGES = ["ar", "fr", "en"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const fallbackLng: SupportedLanguage = "ar";

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

export async function initLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);

    const deviceLanguage =
      Localization.getLocales()?.[0]?.languageCode ?? fallbackLng;

    const candidate = (saved ?? deviceLanguage) as SupportedLanguage;

    const resolved: SupportedLanguage = SUPPORTED_LANGUAGES.includes(candidate)
      ? candidate
      : fallbackLng;

    // ✅ تطبيق اتجاه الواجهة قبل رسم أي عنصر
    // هذا ضروري حتى يعمل RTL بشكل صحيح بعد إعادة التشغيل
    const isRTL = resolved === "ar";
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);

    await i18n.changeLanguage(resolved);
  } catch (error) {
    console.warn("Failed to initialize language:", error);

    // في حالة الخطأ نرجع للعربية مع RTL
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
    await i18n.changeLanguage(fallbackLng);
  }
}

export default i18n;
