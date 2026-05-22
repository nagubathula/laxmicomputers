import type { SupabaseClient } from '@supabase/supabase-js';
import { financialYearCode } from './gst';

/**
 * Generate the next invoice number, e.g. 'LC/25-26/0001'.
 *
 * Uses the `next_invoice_seq` Postgres function for race-free numbering
 * (UPDATE ... RETURNING is atomic per FY row).
 */
export async function nextInvoiceNumber(
  supabase: SupabaseClient,
  prefix: string,
  date: Date = new Date(),
): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const fy = financialYearCode(date);

  const { data, error } = await supabase.rpc('next_invoice_seq', { p_fy: fy });

  if (error || typeof data !== 'number') {
    return { ok: false, error: error?.message ?? 'Failed to allocate invoice number' };
  }

  const padded = String(data).padStart(4, '0');
  return { ok: true, number: `${prefix}/${fy}/${padded}` };
}
