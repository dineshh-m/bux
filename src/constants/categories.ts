export type CategoryKind = 'expense' | 'income';

export interface CategorySeed {
  id: number;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  sortOrder: number;
}

/**
 * Fixed ids keep the seed stable across installs. Only additive changes are safe.
 * Icons are Ionicons names (https://icons.expo.fyi).
 */
export const CATEGORY_SEEDS: CategorySeed[] = [
  { id: 1, name: 'Food & Dining', icon: 'restaurant', color: '#F97316', kind: 'expense', sortOrder: 1 },
  { id: 2, name: 'Groceries', icon: 'cart', color: '#22C55E', kind: 'expense', sortOrder: 2 },
  { id: 3, name: 'Transport', icon: 'car', color: '#06B6D4', kind: 'expense', sortOrder: 3 },
  { id: 4, name: 'Rent & Housing', icon: 'home', color: '#8B5CF6', kind: 'expense', sortOrder: 4 },
  { id: 5, name: 'Utilities', icon: 'flash', color: '#EAB308', kind: 'expense', sortOrder: 5 },
  { id: 6, name: 'Shopping', icon: 'bag-handle', color: '#EC4899', kind: 'expense', sortOrder: 6 },
  { id: 7, name: 'Health', icon: 'medkit', color: '#EF4444', kind: 'expense', sortOrder: 7 },
  { id: 8, name: 'Entertainment', icon: 'game-controller', color: '#6366F1', kind: 'expense', sortOrder: 8 },
  { id: 9, name: 'Subscriptions', icon: 'repeat', color: '#14B8A6', kind: 'expense', sortOrder: 9 },
  { id: 10, name: 'Travel', icon: 'airplane', color: '#0EA5E9', kind: 'expense', sortOrder: 10 },
  { id: 11, name: 'Education', icon: 'school', color: '#F59E0B', kind: 'expense', sortOrder: 11 },
  { id: 12, name: 'Personal Care', icon: 'sparkles', color: '#D946EF', kind: 'expense', sortOrder: 12 },
  { id: 13, name: 'Other', icon: 'ellipsis-horizontal', color: '#64748B', kind: 'expense', sortOrder: 13 },
  { id: 14, name: 'Salary', icon: 'cash', color: '#10B981', kind: 'income', sortOrder: 1 },
  { id: 15, name: 'Freelance', icon: 'briefcase', color: '#3B82F6', kind: 'income', sortOrder: 2 },
  { id: 16, name: 'Interest', icon: 'trending-up', color: '#84CC16', kind: 'income', sortOrder: 3 },
  { id: 17, name: 'Gift', icon: 'gift', color: '#F43F5E', kind: 'income', sortOrder: 4 },
  { id: 18, name: 'Other Income', icon: 'add-circle', color: '#94A3B8', kind: 'income', sortOrder: 5 },
];

export const CATEGORY_COLORS = CATEGORY_SEEDS.filter((category) => category.kind === 'expense').map(
  (category) => category.color,
);

export const DEFAULT_CATEGORY_ICON = 'pricetag';
