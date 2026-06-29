import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export const CURRENCY_KEY = "app_currency";
export const DEFAULT_CURRENCY = "$";

/**
 * Hook للتحكم في عملة العرض داخل التطبيق.
 * - يقرأ العملة من AsyncStorage عند التشغيل.
 * - يوفر دالة setCurrency لتغيير العملة وحفظها فوراً.
 * - يُطلق إعادة رسم تلقائية لكل مكوّن يستخدمه عند التغيير.
 *
 * الاستخدام: const { currency, setCurrency } = useCurrency();
 */

// مشاركة الحالة بين جميع الـ hooks في نفس الجلسة (بدون Context)
let _currency = DEFAULT_CURRENCY;
const _listeners = new Set<(c: string) => void>();

function notifyAll(c: string) {
  _currency = c;
  _listeners.forEach((fn) => fn(c));
}

export async function initCurrency(): Promise<void> {
  const saved = await AsyncStorage.getItem(CURRENCY_KEY);
  if (saved) notifyAll(saved);
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState(_currency);

  useEffect(() => {
    _listeners.add(setCurrencyState);
    return () => {
      _listeners.delete(setCurrencyState);
    };
  }, []);

  async function setCurrency(symbol: string) {
    await AsyncStorage.setItem(CURRENCY_KEY, symbol);
    notifyAll(symbol);
  }

  return { currency, setCurrency };
}
