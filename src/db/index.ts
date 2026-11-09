import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORY_SEEDS } from '@/constants/categories';
import { addMonths, currentMonthKey, pad2, todayISO } from '@/lib/dates';

export const DATABASE_NAME = 'bux.db';
export const SETTING_CURRENCY = 'currency';
export const SETTING_DEMO_STATUS = 'demo_seed_status';

const DATABASE_VERSION = 1;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'pricetag',
  color TEXT NOT NULL DEFAULT '#64748B',
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  occurred_on TEXT NOT NULL,
  note TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions (occurred_on);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type, occurred_on);

CREATE TABLE IF NOT EXISTS monthly_targets (
  month TEXT PRIMARY KEY NOT NULL,
  expected_income_minor INTEGER,
  budget_minor INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`;

interface DemoTransaction {
  day: number;
  type: 'expense' | 'income';
  categoryId: number;
  amountMinor: number;
  note: string;
}

const DEMO_TRANSACTIONS: DemoTransaction[] = [
  { day: 1, type: 'income', categoryId: 14, amountMinor: 85_000_00, note: 'Monthly salary' },
  { day: 2, type: 'expense', categoryId: 4, amountMinor: 22_000_00, note: 'Rent' },
  { day: 3, type: 'expense', categoryId: 5, amountMinor: 3_150_00, note: 'Electricity + internet' },
  { day: 5, type: 'expense', categoryId: 9, amountMinor: 1_499_00, note: 'Streaming subscriptions' },
  { day: 6, type: 'expense', categoryId: 2, amountMinor: 4_280_00, note: 'Weekly groceries' },
  { day: 8, type: 'expense', categoryId: 1, amountMinor: 850_00, note: 'Dinner with friends' },
  { day: 9, type: 'expense', categoryId: 3, amountMinor: 620_00, note: 'Cab rides' },
  { day: 11, type: 'expense', categoryId: 6, amountMinor: 2_350_00, note: 'New shoes' },
  { day: 13, type: 'expense', categoryId: 2, amountMinor: 3_740_00, note: 'Groceries' },
  { day: 15, type: 'expense', categoryId: 8, amountMinor: 900_00, note: 'Movie night' },
  { day: 17, type: 'expense', categoryId: 1, amountMinor: 1_260_00, note: 'Lunch out' },
  { day: 19, type: 'expense', categoryId: 7, amountMinor: 1_800_00, note: 'Pharmacy' },
  { day: 21, type: 'expense', categoryId: 3, amountMinor: 1_100_00, note: 'Fuel' },
  { day: 23, type: 'expense', categoryId: 12, amountMinor: 700_00, note: 'Haircut' },
  { day: 25, type: 'expense', categoryId: 2, amountMinor: 4_560_00, note: 'Groceries' },
  { day: 27, type: 'expense', categoryId: 10, amountMinor: 2_800_00, note: 'Weekend trip' },
  { day: 28, type: 'expense', categoryId: 1, amountMinor: 980_00, note: 'Brunch' },
];

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = versionRow?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(SCHEMA_SQL);
    await seedCategories(db);
    await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [
      SETTING_CURRENCY,
      'INR',
    ]);
    version = 1;
  }

  if (__DEV__ && version >= 1) {
    await seedDemoDataIfNeeded(db);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}

async function seedCategories(db: SQLiteDatabase): Promise<void> {
  for (const category of CATEGORY_SEEDS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, icon, color, kind, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.name,
        category.icon,
        category.color,
        category.kind,
        category.sortOrder,
      ],
    );
  }
}

/**
 * Demo rows are development-only and tagged with is_demo = 1 so Settings can
 * remove them in one tap. The settings flag prevents re-seeding after removal.
 */
async function seedDemoDataIfNeeded(db: SQLiteDatabase): Promise<void> {
  const status = await db.getFirstAsync<{ value: string | null }>(
    'SELECT value FROM settings WHERE key = ?',
    [SETTING_DEMO_STATUS],
  );
  if (status?.value) return;

  const today = todayISO();
  const months = [0, -1, -2].map((offset) => addMonths(currentMonthKey(), offset));
  const factors = [1, 1.12, 0.94];

  for (const [index, month] of months.entries()) {
    const factor = factors[index] ?? 1;

    for (const transaction of DEMO_TRANSACTIONS) {
      const occurredOn = `${month}-${pad2(transaction.day)}`;
      if (occurredOn > today) continue;

      const amountMinor =
        transaction.type === 'income'
          ? transaction.amountMinor
          : Math.round((transaction.amountMinor * factor) / 100) * 100;

      await db.runAsync(
        `INSERT INTO transactions (type, amount_minor, category_id, occurred_on, note, is_demo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [transaction.type, amountMinor, transaction.categoryId, occurredOn, transaction.note],
      );
    }

    await db.runAsync(
      `INSERT OR IGNORE INTO monthly_targets (month, expected_income_minor, budget_minor)
       VALUES (?, ?, ?)`,
      [month, 85_000_00, 50_000_00],
    );
  }

  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [SETTING_DEMO_STATUS, 'seeded'],
  );
}

export { DEMO_TRANSACTIONS };
