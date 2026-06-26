import { useLanguage } from "@/lib/useLanguage";

/**
 * قيم ديناميكية للمحاذاة بناءً على اتجاه اللغة الحالية (RTL / LTR)
 *
 * الاستخدام:
 *   const dir = useDirection();
 *   <Text style={{ textAlign: dir.textAlign }}>...</Text>
 */
export type DirectionValues = {
  /** محاذاة النص حسب الاتجاه: "right" للعربية، "left" للغات الأخرى */
  textAlign: "right" | "left";
  /** اتجاه flex للصفوف: "row" للعربية (تعكسها I18nManager تلقائياً)، "row-reverse" لـ LTR */
  flexRow: "row" | "row-reverse";
  /** محاذاة بداية المحتوى (يسار في LTR، يمين في RTL) */
  alignStart: "flex-start" | "flex-end";
  /** محاذاة نهاية المحتوى (يمين في LTR، يسار في RTL) */
  alignEnd: "flex-start" | "flex-end";
  /** محاذاة العنصر نفسه نحو النهاية */
  alignSelf: "flex-start" | "flex-end";
  /** هل الاتجاه RTL حالياً */
  isRTL: boolean;
  /** locale المناسب للتنسيق (أرقام، تواريخ) */
  locale: string;
};

export function useDirection(): DirectionValues {
  const { language, isRTL } = useLanguage();

  const locale =
    language === "ar" ? "ar-DZ" : language === "fr" ? "fr-FR" : "en-US";

  return {
    textAlign: isRTL ? "right" : "left",
    flexRow: isRTL ? "row" : "row-reverse",
    alignStart: isRTL ? "flex-end" : "flex-start",
    alignEnd: isRTL ? "flex-start" : "flex-end",
    alignSelf: isRTL ? "flex-end" : "flex-start",
    isRTL,
    locale,
  };
}
