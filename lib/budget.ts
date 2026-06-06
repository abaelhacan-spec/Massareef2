export const DAILY_BUDGET = 1000;
export const TOTAL_BUDGET = 30000;
export const CYCLE_START_DAY = 6;

const MONTHS_AR = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function getMonthNameAr(month: number): string {
  return MONTHS_AR[month - 1];
}

export function getDayNameAr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return DAYS_AR[d.getDay()];
}

export function formatDateAr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${getMonthNameAr(d.getMonth() + 1)}`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCycleStartDate(now: Date = new Date()): Date {
  if (now.getDate() >= CYCLE_START_DAY) {
    return new Date(now.getFullYear(), now.getMonth(), CYCLE_START_DAY);
  }
  const prevMonth = now.getMonth() - 1;
  if (prevMonth < 0) {
    return new Date(now.getFullYear() - 1, 11, CYCLE_START_DAY);
  }
  return new Date(now.getFullYear(), prevMonth, CYCLE_START_DAY);
}

export function getCycleEndDate(startDate: Date): Date {
  const nextMonth = startDate.getMonth() + 1;
  if (nextMonth > 11) {
    return new Date(startDate.getFullYear() + 1, 0, 5);
  }
  return new Date(startDate.getFullYear(), nextMonth, 5);
}

export function getCycleName(startDate: Date): string {
  return `${getMonthNameAr(startDate.getMonth() + 1)} ${startDate.getFullYear()}`;
}

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
  today: Date
): BudgetStats {
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const startMs = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endMs = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

  const msPerDay = 86400000;
  const totalDays = Math.round((endMs - startMs) / msPerDay) + 1;
  const rawElapsed = Math.round((todayMs - startMs) / msPerDay) + 1;
  const daysElapsed = Math.max(1, Math.min(rawElapsed, totalDays));

  const allowedSoFar = daysElapsed * DAILY_BUDGET;
  const difference = totalSpent - allowedSoFar;
  const remaining = TOTAL_BUDGET - totalSpent;
  const isOverBudget = totalSpent > allowedSoFar;
  const percentUsed = Math.min(100, (totalSpent / TOTAL_BUDGET) * 100);

  return { totalSpent, allowedSoFar, difference, remaining, isOverBudget, daysElapsed, totalDays, percentUsed };
}
