import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CURRENCY_KEY, DEFAULT_CURRENCY } from "./useCurrency";
import { LANGUAGE_KEY } from "./i18n";

let _db: SQLite.SQLiteDatabase | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === "web") return null;
  if (!_db) {
    _db = await SQLite.openDatabaseAsync("budget_tracker.db");
  }
  return _db;
}

export interface Cycle {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_locked: number;
}

export interface DayExpense {
  id: number;
  cycle_id: number;
  date: string;
  amount: number;
  is_entered: number;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  settings: Record<string, string>;
  cycles: Cycle[];
  expenses: DayExpense[];
  currency?: string; // رمز العملة المختارة (اختياري للتوافق مع النسخ القديمة)
  language?: string; // اللغة المختارة (اختياري للتوافق مع النسخ القديمة)
}

export async function initDB(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL DEFAULT 0.0,
      is_entered INTEGER DEFAULT 0,
      UNIQUE(cycle_id, date)
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  try {
    await db.execAsync(`ALTER TABLE expenses ADD COLUMN is_entered INTEGER DEFAULT 0`);
  } catch (_) {}
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getOrCreateCurrentCycle(
  cycleName: string,
  startStr: string,
  endStr: string,
  todayStr: string
): Promise<Cycle | null> {
  const db = await getDB();
  if (!db) return null;

  await db.runAsync(
    `UPDATE cycles SET is_locked = 1 WHERE end_date < ? AND is_locked = 0`,
    [todayStr]
  );

  const existing = await db.getFirstAsync<Cycle>(
    `SELECT * FROM cycles WHERE start_date = ?`,
    [startStr]
  );
  if (existing) return existing;

  const result = await db.runAsync(
    `INSERT INTO cycles (name, start_date, end_date, is_locked) VALUES (?, ?, ?, 0)`,
    [cycleName, startStr, endStr]
  );
  const cycleId = result.lastInsertRowId;

  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const curr = new Date(start);
  while (curr <= end) {
    const dateStr = formatDateLocal(curr);
    await db.runAsync(
      `INSERT OR IGNORE INTO expenses (cycle_id, date, amount, is_entered) VALUES (?, ?, 0.0, 0)`,
      [cycleId, dateStr]
    );
    curr.setDate(curr.getDate() + 1);
  }

  return db.getFirstAsync<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
}

export async function getExpensesForCycle(cycleId: number): Promise<DayExpense[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllAsync<DayExpense>(
    `SELECT * FROM expenses WHERE cycle_id = ? ORDER BY date ASC`,
    [cycleId]
  );
}

export async function upsertDayAmount(
  cycleId: number,
  date: string,
  amount: number
): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.runAsync(
    `INSERT OR REPLACE INTO expenses (cycle_id, date, amount, is_entered) VALUES (?, ?, ?, 1)`,
    [cycleId, date, amount]
  );
}

export async function getAllCycles(): Promise<(Cycle & { total_spent: number })[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllAsync<Cycle & { total_spent: number }>(
    `SELECT c.id, c.name, c.start_date, c.end_date, c.is_locked,
            COALESCE(SUM(e.amount), 0) as total_spent
     FROM cycles c
     LEFT JOIN expenses e ON e.cycle_id = c.id
     GROUP BY c.id
     ORDER BY c.start_date DESC`
  );
}

const DEFAULT_CYCLE_START_DAY = 6;

export async function getCycleStartDay(): Promise<number> {
  const db = await getDB();
  if (!db) return DEFAULT_CYCLE_START_DAY;
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'cycle_start_day'`
  );
  if (!row) return DEFAULT_CYCLE_START_DAY;
  const parsed = parseInt(row.value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 28) return DEFAULT_CYCLE_START_DAY;
  return parsed;
}

export async function setCycleStartDay(day: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const safeDay = Math.min(28, Math.max(1, Math.round(day)));
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('cycle_start_day', ?)`,
    [String(safeDay)]
  );
}

export async function getAppLockEnabled(): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'app_lock_enabled'`
  );
  return row?.value === "1";
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('app_lock_enabled', ?)`,
    [enabled ? "1" : "0"]
  );
}

const DEFAULT_DAILY_BUDGET = 0;
const DEFAULT_MONTHLY_BUDGET = 0;

export async function getDailyBudget(): Promise<number> {
  const db = await getDB();
  if (!db) return DEFAULT_DAILY_BUDGET;
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'daily_budget'`
  );
  if (!row) return DEFAULT_DAILY_BUDGET;
  const parsed = parseFloat(row.value);
  return isNaN(parsed) || parsed < 0 ? DEFAULT_DAILY_BUDGET : parsed;
}

export async function setDailyBudget(amount: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('daily_budget', ?)`,
    [String(amount)]
  );
}

export async function getMonthlyBudget(): Promise<number> {
  const db = await getDB();
  if (!db) return DEFAULT_MONTHLY_BUDGET;
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'monthly_budget'`
  );
  if (!row) return DEFAULT_MONTHLY_BUDGET;
  const parsed = parseFloat(row.value);
  return isNaN(parsed) || parsed < 0 ? DEFAULT_MONTHLY_BUDGET : parsed;
}

export async function setMonthlyBudget(amount: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('monthly_budget', ?)`,
    [String(amount)]
  );
}

// ── Backup & Restore ──────────────────────────────────────────────────────────

export async function exportBackup(): Promise<BackupData> {
  const db = await getDB();
  if (!db) throw new Error("قاعدة البيانات غير متوفرة على هذا النظام");

  const settings = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings`
  );
  const cycles = await db.getAllAsync<Cycle>(
    `SELECT * FROM cycles ORDER BY start_date ASC`
  );
  const expenses = await db.getAllAsync<DayExpense>(
    `SELECT * FROM expenses ORDER BY cycle_id ASC, date ASC`
  );

  const currency = (await AsyncStorage.getItem(CURRENCY_KEY)) ?? DEFAULT_CURRENCY;
  const language = (await AsyncStorage.getItem(LANGUAGE_KEY)) ?? undefined;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    cycles,
    expenses,
    currency,
    language,
  };
}

export async function importBackup(backup: BackupData): Promise<void> {
  if (!backup || backup.version !== 1) {
    throw new Error("ملف النسخة الاحتياطية غير صالح أو إصداره غير مدعوم");
  }

  const db = await getDB();
  if (!db) throw new Error("قاعدة البيانات غير متوفرة على هذا النظام");

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM expenses`);
    await db.runAsync(`DELETE FROM cycles`);
    await db.runAsync(`DELETE FROM app_settings`);

    for (const [key, value] of Object.entries(backup.settings)) {
      await db.runAsync(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)`,
        [key, value]
      );
    }

    for (const cycle of backup.cycles) {
      await db.runAsync(
        `INSERT INTO cycles (id, name, start_date, end_date, is_locked) VALUES (?, ?, ?, ?, ?)`,
        [cycle.id, cycle.name, cycle.start_date, cycle.end_date, cycle.is_locked]
      );
    }

    for (const exp of backup.expenses) {
      await db.runAsync(
        `INSERT OR IGNORE INTO expenses (id, cycle_id, date, amount, is_entered) VALUES (?, ?, ?, ?, ?)`,
        [exp.id, exp.cycle_id, exp.date, exp.amount, exp.is_entered ?? 0]
      );
    }
  });

  // استعادة العملة من النسخة الاحتياطية (إن وُجدت)
  if (backup.currency) {
    await AsyncStorage.setItem(CURRENCY_KEY, backup.currency);
  }

  // استعادة اللغة من النسخة الاحتياطية (إن وُجدت)
  // ملاحظة: لا نطبّق تغيير الاتجاه (RTL/LTR) هنا مباشرة؛ يتم ذلك عبر
  // initLanguage() عند إعادة تشغيل التطبيق بعد الاستعادة.
  if (backup.language) {
    await AsyncStorage.setItem(LANGUAGE_KEY, backup.language);
  }
}

export async function saveBackupToFile(backup: BackupData): Promise<string> {
  const filename = `massareef_backup_${new Date().toISOString().split("T")[0]}.json`;
  const docDir = (FileSystem as any).documentDirectory as string ?? "";
  const path = `${docDir}${filename}`;
  await (FileSystem as any).writeAsStringAsync(path, JSON.stringify(backup, null, 2), {
    encoding: "utf8",
  });
  return path;
}

export async function loadBackupFromFile(uri: string): Promise<BackupData> {
  const content: string = await (FileSystem as any).readAsStringAsync(uri, {
    encoding: "utf8",
  });
  return JSON.parse(content) as BackupData;
}
