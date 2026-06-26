import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import { LANGUAGE_KEY, type SupportedLanguage } from "@/lib/i18n";

/**
 * Hook للتحكم في اللغة داخل التطبيق
 * الاستخدام: const { t, language, isRTL, changeLanguage } = useLanguage();
 */
export function useLanguage() {
  const { t, i18n } = useTranslation();

  const language = i18n.language as SupportedLanguage;
  const isRTL = language === "ar";

  const changeLanguage = async (lang: SupportedLanguage) => {
    const prevIsRTL = i18n.language === "ar";
    const nextIsRTL = lang === "ar";

    // حفظ اللغة في التخزين المحلي
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);

    // تغيير لغة i18next (يعيد رسم الواجهة فوراً)
    await i18n.changeLanguage(lang);

    // إذا تغير اتجاه الكتابة (RTL ↔ LTR) نحتاج إعادة تشغيل التطبيق
    if (prevIsRTL !== nextIsRTL) {
      I18nManager.forceRTL(nextIsRTL);
      try {
        await Updates.reloadAsync();
      } catch {
        // في بيئة التطوير reloadAsync لا تعمل — نطلب من المستخدم إعادة التشغيل يدوياً
        const msg = nextIsRTL
          ? "يرجى إعادة تشغيل التطبيق لتطبيق اتجاه الكتابة الجديد."
          : "Please restart the app to apply the new layout direction.";
        Alert.alert(
          nextIsRTL ? "إعادة تشغيل مطلوبة" : "Restart Required",
          msg,
          [{ text: "OK" }]
        );
      }
    }
  };

  return {
    t,
    language,
    isRTL,
    changeLanguage,
  };
}
