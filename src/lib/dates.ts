export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const MONTH_NAMES_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Local-date ISO string, avoiding the UTC shift that toISOString would introduce. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function addDaysISO(iso: string, delta: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

export function monthRange(monthKey: string): { start: string; end: string } {
  return { start: `${monthKey}-01`, end: `${addMonths(monthKey, 1)}-01` };
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function monthLabelLong(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES_LONG[month - 1]} ${year}`;
}

export function previousMonths(monthKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addMonths(monthKey, index - count + 1));
}

export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Today';
  if (iso === addDaysISO(today, -1)) return 'Yesterday';

  const date = parseISODate(iso);
  return `${WEEKDAY_SHORT[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export function longDateLabel(iso: string): string {
  const date = parseISODate(iso);
  return `${date.getDate()} ${MONTH_NAMES_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

/** Days elapsed in a month, clamped to the month length. Past months count fully. */
export function daysElapsedInMonth(monthKey: string, today: string = todayISO()): number {
  const total = daysInMonth(monthKey);
  const todayMonth = today.slice(0, 7);
  if (monthKey < todayMonth) return total;
  if (monthKey > todayMonth) return 0;
  return Math.min(Number(today.slice(8, 10)), total);
}

export function isFutureDate(iso: string, today: string = todayISO()): boolean {
  return iso > today;
}

export function startOfMonth(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export interface CalendarCell {
  iso: string | null;
  day: number | null;
}

/** Sunday-first calendar grid cells for a month, padded to whole weeks. */
export function buildCalendar(monthKey: string): CalendarCell[] {
  const first = startOfMonth(monthKey);
  const offset = first.getDay();
  const total = daysInMonth(monthKey);
  const cells: CalendarCell[] = [];

  for (let index = 0; index < offset; index += 1) {
    cells.push({ iso: null, day: null });
  }
  for (let day = 1; day <= total; day += 1) {
    cells.push({ iso: `${monthKey}-${pad2(day)}`, day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ iso: null, day: null });
  }

  return cells;
}
