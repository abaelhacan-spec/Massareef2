import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";
import type { SupportedLanguage } from "@/lib/i18n";

/**
 * Hook للتحكم في اللغة داخل التطبيق
 * الاستخدام: const { t, language, changeLanguage } = useLanguage();
 */
export function useLanguage() {
  const { t, i18n } = useTranslation();

  const language = i18n.language as SupportedLanguage;
  const isRTL = language === "ar";

  const changeLanguage = async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    // تفعيل RTL للعربية تلقائياً
    I18nManager.forceRTL(lang === "ar");
  };

  return {
    t,
    language,
    isRTL,
    changeLanguage,
  };
}
