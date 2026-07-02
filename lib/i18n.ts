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

const fallbackLng: SupportedLanguage = "en";

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

    // أول تثبيت: لا يوجد saved → نستخدم لغة الجهاز
    // تثبيت سابق: يستخدم اللغة المحفوظة
    const deviceLanguageCode = Localization.getLocales()[0]?.languageCode ?? "en";
    const candidate = saved ?? deviceLanguageCode;

    // لو اللغة (محفوظة أو لغة الجهاز) غير مدعومة، نرجع للإنجليزية تلقائياً
    const resolved: SupportedLanguage = SUPPORTED_LANGUAGES.includes(
      candidate as SupportedLanguage
    )
      ? (candidate as SupportedLanguage)
      : "en";

    // ✅ تطبيق اتجاه الواجهة قبل رسم أي عنصر
    // هذا ضروري حتى يعمل RTL بشكل صحيح بعد إعادة التشغيل
    const isRTL = resolved === "ar";
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);

    await i18n.changeLanguage(resolved);

    // نحفظ اللغة المُحلَّلة عند أول تشغيل (لم يكن هناك saved من قبل)
    // حتى لا يتأثر التطبيق لاحقاً بتغيير لغة الجهاز، ويبقى القرار
    // بيد المستخدم عبر الإعدادات بعد أول تشغيل.
    if (!saved) {
      await AsyncStorage.setItem(LANGUAGE_KEY, resolved);
    }
  } catch (error) {
    console.warn("Failed to initialize language:", error);

    // في حالة الخطأ نرجع للإنجليزية مع LTR
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
    await i18n.changeLanguage("en");
  }
}

export default i18n;
