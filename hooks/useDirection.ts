import { useLanguage } from "@/lib/useLanguage";

/**
 * قيم ديناميكية للمحاذاة بناءً على اتجاه اللغة الحالية (RTL / LTR)
 *
 * ⚠️ مبدأ أساسي:
 * التطبيق يعتمد على I18nManager.forceRTL() لعكس الواجهة تلقائياً.
 * هذا يعني أن React Native يعكس كل flexDirection: "row" → "row-reverse"
 * تلقائياً عند تفعيل RTL، لذا:
 *
 * ✅ استخدم "row"  دائماً — النظام يعكسها تلقائياً في RTL
 * ✅ استخدم "flex-start" دائماً — النظام يعكسها تلقائياً في RTL
 * ✅ استخدم marginStart/marginEnd بدل marginLeft/marginRight
 * ✅ استخدم paddingStart/paddingEnd بدل paddingLeft/paddingRight
 *
 * ❌ لا تستخدم dir.isRTL لعكس flexDirection يدوياً — هذا يعكسها مرتين
 * ❌ لا تستخدم dir.isRTL لتغيير alignSelf/justifyContent يدوياً
 *
 * الاستثناءات المقبولة لـ dir.isRTL:
 * - textAlign (النظام لا يعكسه تلقائياً)
 * - أيقونات الاتجاه (chevron-left/right)
 * - منطق برمجي (ليس تصميم)
 */
export type DirectionValues = {
  textAlign: "right" | "left";
  isRTL: boolean;
  locale: string;
};

export function useDirection(): DirectionValues {
  const { language, isRTL } = useLanguage();

  const locale =
    language === "ar" ? "ar-DZ" : language === "fr" ? "fr-FR" : "en-US";

  return {
    textAlign: isRTL ? "right" : "left",
    isRTL,
    locale,
  };
}
