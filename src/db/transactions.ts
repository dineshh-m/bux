import type { SQLiteDatabase } from 'expo-sqlite';

import { addMonths, currentMonthKey, monthRange } from '@/lib/dates';

import { SETTING_DEMO_STATUS } from './index';

export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: number;
  type: TransactionType;
  amountMinor: number;
  categoryId: number;
  occurredOn: string;
  note: string | null;
  isDemo: boolean;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
}

export interface TransactionInput {
  type: TransactionType;
  amountMinor: number;
  categoryId: number;
  occurredOn: string;
  note?: string | null;
}

export interface TransactionFilters {
  month?: string;
  type?: TransactionType;
  categoryId?: number;
  search?: string;
  limit?: number;
}

export interface MonthSummary {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
  remainingMinor: number;
  transactionCount: number;
}

export interface CategoryBreakdownItem {
  categoryId: number;
  name: string;
  icon: string;
  color: string;
  totalMinor: number;
  count: number;
}

export interface MonthlyPoint {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
}

interface TransactionDbRow extends Omit<Transaction, 'isDemo'> {
  isDemo: number;
}

const SELECT_TRANSACTION = `
  SELECT
    t.id,
    t.type,
    t.amount_minor AS amountMinor,
    t.category_id AS categoryId,
    t.occurred_on AS occurredOn,
    t.note,
    t.is_demo AS isDemo,
    c.name AS categoryName,
    c.icon AS categoryIcon,
    c.color AS categoryColor
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
`;

function mapTransaction(row: TransactionDbRow): Transaction {
  return { ...row, isDemo: row.isDemo === 1 };
}

function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

export async function listTransactions(
  db: SQLiteDatabase,
  filters: TransactionFilters = {},
): Promise<Transaction[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.month) {
    const { start, end } = monthRange(filters.month);
    conditions.push('t.occurred_on >= ? AND t.occurred_on < ?');
    params.push(start, end);
  }
  if (filters.type) {
    conditions.push('t.type = ?');
    params.push(filters.type);
  }
  if (filters.categoryId) {
    conditions.push('t.category_id = ?');
    params.push(filters.categoryId);
  }
  const search = filters.search?.trim();
  if (search) {
    conditions.push('(c.name LIKE ? OR t.note LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  let sql = SELECT_TRANSACTION;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ' ORDER BY t.occurred_on DESC, t.id DESC';
  if (filters.limit && filters.limit > 0) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const rows = await db.getAllAsync<TransactionDbRow>(sql, params);
  return rows.map(mapTransaction);
}

export async function getTransaction(
  db: SQLiteDatabase,
  id: number,
): Promise<Transaction | null> {
  const row = await db.getFirstAsync<TransactionDbRow>(`${SELECT_TRANSACTION} WHERE t.id = ?`, [id]);
  return row ? mapTransaction(row) : null;
}

export async function createTransaction(
  db: SQLiteDatabase,
  input: TransactionInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO transactions (type, amount_minor, category_id, occurred_on, note)
     VALUES (?, ?, ?, ?, ?)`,
    [input.type, input.amountMinor, input.categoryId, input.occurredOn, normalizeNote(input.note)],
  );
  return result.lastInsertRowId;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: number,
  input: TransactionInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE transactions
     SET type = ?, amount_minor = ?, category_id = ?, occurred_on = ?, note = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      input.type,
      input.amountMinor,
      input.categoryId,
      input.occurredOn,
      normalizeNote(input.note),
      id,
    ],
  );
}

export async function deleteTransaction(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function getMonthSummary(
  db: SQLiteDatabase,
  month: string,
): Promise<MonthSummary> {
  const { start, end } = monthRange(month);
  const row = await db.getFirstAsync<{
    incomeMinor: number;
    expenseMinor: number;
    transactionCount: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS incomeMinor,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expenseMinor,
       COUNT(*) AS transactionCount
     FROM transactions
     WHERE occurred_on >= ? AND occurred_on < ?`,
    [start, end],
  );

  const incomeMinor = row?.incomeMinor ?? 0;
  const expenseMinor = row?.expenseMinor ?? 0;

  return {
    month,
    incomeMinor,
    expenseMinor,
    remainingMinor: incomeMinor - expenseMinor,
    transactionCount: row?.transactionCount ?? 0,
  };
}

export async function getCategoryBreakdown(
  db: SQLiteDatabase,
  month: string,
): Promise<CategoryBreakdownItem[]> {
  const { start, end } = monthRange(month);
  return db.getAllAsync<CategoryBreakdownItem>(
    `SELECT
       c.id AS categoryId,
       c.name AS name,
       c.icon AS icon,
       c.color AS color,
       SUM(t.amount_minor) AS totalMinor,
       COUNT(*) AS count
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense' AND t.occurred_on >= ? AND t.occurred_on < ?
     GROUP BY c.id
     ORDER BY totalMinor DESC`,
    [start, end],
  );
}

export async function getMonthlySeries(
  db: SQLiteDatabase,
  months: string[],
): Promise<MonthlyPoint[]> {
  if (months.length === 0) return [];

  const first = months[0];
  const last = months[months.length - 1];
  const { start } = monthRange(first);
  const { end } = monthRange(last);

  const rows = await db.getAllAsync<MonthlyPoint>(
    `SELECT
       substr(occurred_on, 1, 7) AS month,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS incomeMinor,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expenseMinor
     FROM transactions
     WHERE occurred_on >= ? AND occurred_on < ?
     GROUP BY month
     ORDER BY month ASC`,
    [start, end],
  );

  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map(
    (month) => byMonth.get(month) ?? { month, incomeMinor: 0, expenseMinor: 0 },
  );
}

export async function getRecentTransactions(
  db: SQLiteDatabase,
  limit = 5,
  month?: string,
): Promise<Transaction[]> {
  return listTransactions(db, { limit, month });
}

export async function countDemoTransactions(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM transactions WHERE is_demo = 1',
  );
  return row?.count ?? 0;
}

export async function deleteDemoTransactions(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE is_demo = 1');

  // Drop the demo plan too, but only where it still holds the seeded values.
  const demoMonths = [0, -1, -2].map((offset) => addMonths(currentMonthKey(), offset));
  await db.runAsync(
    `DELETE FROM monthly_targets
     WHERE month IN (?, ?, ?)
       AND expected_income_minor = ?
       AND budget_minor = ?`,
    [...demoMonths, 85_000_00, 50_000_00],
  );

  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SETTING_DEMO_STATUS, 'cleared'],
  );
}
