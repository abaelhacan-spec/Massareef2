export const DAILY_BUDGET = 1000;
export const TOTAL_BUDGET = 30000;
export const CYCLE_START_DAY = 6;

// ─── ثوابت عربية للتوافق مع الكود القديم ────────────────────────────────────

const MONTHS_AR = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** @deprecated استخدم getDayName(dateStr, locale) بدلاً منها */
export function getDayNameAr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return DAYS_AR[d.getDay()];
}

/** @deprecated استخدم formatShortDate(dateStr, locale) بدلاً منها */
export function formatDateAr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]}`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── دوال متعددة اللغات ──────────────────────────────────────────────────────

/**
 * اسم اليوم بحسب اللغة المُمرَّرة (locale).
 * مثال: getDayName("2025-01-06", "fr-FR") → "lundi"
 */
export function getDayName(dateStr: string, locale: string = "ar-DZ"): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(locale, { weekday: "long" });
}

/**
 * تاريخ مختصر (يوم + شهر) بحسب اللغة.
 * مثال: formatShortDate("2025-01-06", "en-US") → "January 6"
 */
export function formatShortDate(dateStr: string, locale: string = "ar-DZ"): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(locale, { day: "numeric", month: "long" });
}

/**
 * عنوان عرض الدورة (شهر + سنة) بحسب اللغة — للعرض فقط، لا للتخزين.
 * مثال: formatCycleDisplayName(new Date("2025-01-06"), "fr-FR") → "janvier 2025"
 */
export function formatCycleDisplayName(startDate: Date, locale: string = "ar-DZ"): string {
  return startDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

/**
 * تنسيق رقم بحسب اللغة.
 * مثال: formatNumber(1234, "ar-DZ") → "١٬٢٣٤"
 */
export function formatNumber(n: number, locale: string = "ar-DZ"): string {
  return Math.round(n).toLocaleString(locale);
}

// ─── دوال الدورة ─────────────────────────────────────────────────────────────

export function getMonthNameAr(month: number): string {
  return MONTHS_AR[month - 1];
}

export function getCycleStartDate(
  now: Date = new Date(),
  startDay: number = CYCLE_START_DAY
): Date {
  if (now.getDate() >= startDay) {
    return new Date(now.getFullYear(), now.getMonth(), startDay);
  }
  const prevMonth = now.getMonth() - 1;
  if (prevMonth < 0) {
    return new Date(now.getFullYear() - 1, 11, startDay);
  }
  return new Date(now.getFullYear(), prevMonth, startDay);
}

export function getCycleEndDate(
  startDate: Date,
  startDay: number = CYCLE_START_DAY
): Date {
  const nextMonth = startDate.getMonth() + 1;
  const endDay = startDay > 1 ? startDay - 1 : 5;
  if (nextMonth > 11) {
    return new Date(startDate.getFullYear() + 1, 0, endDay);
  }
  return new Date(startDate.getFullYear(), nextMonth, endDay);
}

/**
 * اسم الدورة المُخزَّن في قاعدة البيانات — يبقى بالعربية دائماً للاتساق.
 * للعرض المتعدد اللغات استخدم formatCycleDisplayName.
 */
export function getCycleName(startDate: Date): string {
  return `${getMonthNameAr(startDate.getMonth() + 1)} ${startDate.getFullYear()}`;
}

// ─── إحصائيات الميزانية ───────────────────────────────────────────────────────

export interface BudgetStats {
  totalSpent: number;
  allowedSoFar: number;
  difference: number;
  remaining: number;
  isOverBudget: boolean;
  daysElapsed: number;
  totalDays: number;
  percentUsed: number;
}

export function computeBudgetStats(
  expenses: { date: string; amount: number }[],
  startDate: Date,
  endDate: Date,
  today: Date,
  dailyBudget: number = DAILY_BUDGET,
  totalBudget: number = TOTAL_BUDGET
): BudgetStats {
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const startMs = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  ).getTime();
  const todayMs = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  const endMs = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  ).getTime();

  const msPerDay = 86400000;
  const totalDays = Math.round((endMs - startMs) / msPerDay) + 1;
  const rawElapsed = Math.round((todayMs - startMs) / msPerDay) + 1;
  const daysElapsed = Math.max(1, Math.min(rawElapsed, totalDays));

  const allowedSoFar = daysElapsed * dailyBudget;
  const difference = totalSpent - allowedSoFar;
  const remaining = totalBudget - totalSpent;
  const isOverBudget = totalSpent > allowedSoFar;
  const percentUsed =
    totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  return {
    totalSpent,
    allowedSoFar,
    difference,
    remaining,
    isOverBudget,
    daysElapsed,
    totalDays,
    percentUsed,
  };
}
