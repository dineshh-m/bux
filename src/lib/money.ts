export const DEFAULT_CURRENCY = 'INR';

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function currencySymbol(code: string = DEFAULT_CURRENCY): string {
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/** Groups digits the Indian way: 12,34,567. */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

/**
 * Parses user input ("1,234.5", "1234", "0.99") into integer minor units.
 * Returns null for empty, zero, or malformed input so callers can disable submit.
 */
export function parseAmountToMinor(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '.') return null;
  if (!/^\d*(\.\d{1,2})?$/.test(cleaned)) return null;

  const [integerPart = '', fractionPart = ''] = cleaned.split('.');
  const rupees = integerPart === '' ? 0 : Number.parseInt(integerPart, 10);
  const paise = Number.parseInt(`${fractionPart}00`.slice(0, 2), 10);
  const minor = rupees * 100 + paise;

  return Number.isFinite(minor) && minor > 0 ? minor : null;
}

/** Turns stored minor units back into keypad input ("125050" -> "1250.50"). */
export function minorToInput(minor: number): string {
  const rupees = Math.floor(minor / 100);
  const paise = minor % 100;
  return paise === 0 ? String(rupees) : `${rupees}.${String(paise).padStart(2, '0')}`;
}

/** Adds thousands separators to in-progress keypad input, keeping the decimal tail. */
export function formatTypedAmount(raw: string): string {
  if (!raw) return '';
  const [integerPart = '', fractionPart] = raw.split('.');
  const grouped = groupIndian(integerPart || '0');
  return raw.includes('.') ? `${grouped}.${fractionPart ?? ''}` : grouped;
}

export interface FormatMoneyOptions {
  symbol?: boolean;
  /** Defaults to true when the amount has paise. */
  withPaise?: boolean;
  code?: string;
}

export function formatMinor(minor: number, options: FormatMoneyOptions = {}): string {
  const { symbol = true, withPaise, code = DEFAULT_CURRENCY } = options;
  const abs = Math.abs(Math.round(minor));
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  const showPaise = withPaise ?? paise > 0;
  const amount = `${groupIndian(String(rupees))}${showPaise ? `.${String(paise).padStart(2, '0')}` : ''}`;

  return `${minor < 0 ? '-' : ''}${symbol ? currencySymbol(code) : ''}${amount}`;
}

/** Short labels for chart axes: ₹1.2k, ₹1.25L, ₹1.2Cr. */
export function formatCompactMinor(minor: number, code: string = DEFAULT_CURRENCY): string {
  const abs = Math.abs(minor) / 100;
  const prefix = `${minor < 0 ? '-' : ''}${currencySymbol(code)}`;
  const trim = (value: number) => value.toFixed(1).replace(/\.0$/, '');

  if (abs >= 10_000_000) return `${prefix}${trim(abs / 10_000_000)}Cr`;
  if (abs >= 100_000) return `${prefix}${trim(abs / 100_000)}L`;
  if (abs >= 1_000) return `${prefix}${trim(abs / 1_000)}k`;
  return `${prefix}${trim(abs)}`;
}
