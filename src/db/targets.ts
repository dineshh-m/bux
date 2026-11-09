import type { SQLiteDatabase } from 'expo-sqlite';

export interface MonthlyTarget {
  month: string;
  expectedIncomeMinor: number | null;
  budgetMinor: number | null;
}

interface TargetRow {
  month: string;
  expectedIncomeMinor: number | null;
  budgetMinor: number | null;
}

export async function getMonthlyTarget(
  db: SQLiteDatabase,
  month: string,
): Promise<MonthlyTarget> {
  const row = await db.getFirstAsync<TargetRow>(
    `SELECT month, expected_income_minor AS expectedIncomeMinor, budget_minor AS budgetMinor
     FROM monthly_targets
     WHERE month = ?`,
    [month],
  );

  return (
    row ?? {
      month,
      expectedIncomeMinor: null,
      budgetMinor: null,
    }
  );
}

export async function upsertMonthlyTarget(
  db: SQLiteDatabase,
  target: MonthlyTarget,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO monthly_targets (month, expected_income_minor, budget_minor)
     VALUES (?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET
       expected_income_minor = excluded.expected_income_minor,
       budget_minor = excluded.budget_minor`,
    [target.month, target.expectedIncomeMinor, target.budgetMinor],
  );
}
