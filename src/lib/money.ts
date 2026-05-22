/**
 * Currency formatting. Indian rupee uses lakh/crore grouping (1,00,000)
 * which Intl.NumberFormat handles natively with the 'en-IN' locale.
 */

export type Currency = 'INR' | 'USD';

const SYMBOLS: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
};

export function currencySymbol(c: Currency): string {
  return SYMBOLS[c] ?? c;
}

/**
 * Format a number as currency. Indian grouping for INR, western for USD.
 *
 *   formatMoney(123456.5, 'INR') → '₹1,23,456.50'
 *   formatMoney(123456.5, 'USD') → '$123,456.50'
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: Currency = 'INR',
  opts: { withSymbol?: boolean } = {},
): string {
  const { withSymbol = true } = opts;
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (!isFinite(n)) return withSymbol ? `${currencySymbol(currency)}0.00` : '0.00';

  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const body = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  return withSymbol ? `${currencySymbol(currency)}${body}` : body;
}

/**
 * Round to 2 decimals using banker's rounding-safe approach (half-away-from-zero).
 * GST math demands consistent rounding across line totals and grand total.
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Round-off helper: returns the delta needed to bring `n` to the nearest rupee.
 *   roundOffDelta(1234.37) → -0.37
 *   roundOffDelta(1234.62) → +0.38
 */
export function roundOffDelta(n: number): number {
  return round2(Math.round(n) - n);
}
