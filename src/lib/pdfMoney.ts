import { formatMoney, type Currency } from './money';

/**
 * PDF-safe currency formatter.
 * Helvetica (the default react-pdf font) does not include the ₹ glyph (U+20B9).
 * We replace it with "Rs." which is the official ISO abbreviation and valid on GST invoices.
 */
export function pdfMoney(
  amount: number | string | null | undefined,
  currency: Currency,
  withSymbol = true,
): string {
  return formatMoney(amount, currency, { withSymbol }).replace('₹', 'Rs. ');
}
