import type { SQLiteDatabase } from 'expo-sqlite';

import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_ICON,
  type CategoryKind,
} from '@/constants/categories';

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  sortOrder: number;
}

export interface NewCategoryInput {
  name: string;
  kind: CategoryKind;
}

export async function listCategories(
  db: SQLiteDatabase,
  kind?: CategoryKind,
): Promise<Category[]> {
  const sql = `SELECT id, name, icon, color, kind, sort_order AS sortOrder
    FROM categories
    WHERE archived = 0${kind ? ' AND kind = ?' : ''}
    ORDER BY kind ASC, sort_order ASC, id ASC`;
  const params = kind ? [kind] : [];
  return db.getAllAsync<Category>(sql, params);
}

export async function createCategory(
  db: SQLiteDatabase,
  input: NewCategoryInput,
): Promise<number> {
  const existing = await listCategories(db, input.kind);
  const usedColors = new Set(existing.map((category) => category.color));
  const color =
    CATEGORY_COLORS.find((candidate) => !usedColors.has(candidate)) ??
    CATEGORY_COLORS[existing.length % CATEGORY_COLORS.length];

  const nextSortRow = await db.getFirstAsync<{ nextSort: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSort FROM categories WHERE kind = ?',
    [input.kind],
  );

  const result = await db.runAsync(
    `INSERT INTO categories (name, icon, color, kind, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.name.trim(),
      DEFAULT_CATEGORY_ICON,
      color,
      input.kind,
      nextSortRow?.nextSort ?? 1,
    ],
  );

  return result.lastInsertRowId;
}
