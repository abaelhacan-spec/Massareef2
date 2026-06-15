import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

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
      UNIQUE(cycle_id, date)
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
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
      `INSERT OR IGNORE INTO expenses (cycle_id, date, amount) VALUES (?, ?, 0.0)`,
      [cycleId, dateStr]
    );
    curr.setDate(curr.getDate() + 1);
  }

  return db.getFirstAsync<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
}

export async function get
