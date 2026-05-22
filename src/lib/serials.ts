import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ingest a batch of serial numbers for a product. Idempotent per (product, serial).
 * Returns ok with `inserted` count (skips duplicates), or error.
 */
export async function recordReceivedSerials(
  supabase: SupabaseClient,
  args: {
    productId: string;
    serials: string[];
    grnId?: string | null;
    unitCost?: number | null;
    notes?: string | null;
  },
): Promise<{ ok: true; inserted: number; skipped: number } | { ok: false; error: string }> {
  const clean = Array.from(new Set(args.serials.map(s => s.trim()).filter(Boolean)));
  if (clean.length === 0) return { ok: true, inserted: 0, skipped: 0 };

  // Find any existing serials so we report accurate inserted/skipped counts
  const { data: existing } = await supabase
    .from('product_serials')
    .select('serial_number')
    .eq('product_id', args.productId)
    .in('serial_number', clean);

  const existingSet = new Set((existing ?? []).map(r => r.serial_number));
  const toInsert = clean.filter(s => !existingSet.has(s));
  if (toInsert.length === 0) return { ok: true, inserted: 0, skipped: clean.length };

  const rows = toInsert.map(serial_number => ({
    product_id: args.productId,
    serial_number,
    status: 'available' as const,
    grn_id: args.grnId ?? null,
    received_at: new Date().toISOString(),
    unit_cost: args.unitCost ?? null,
    notes: args.notes ?? null,
  }));

  const { error } = await supabase.from('product_serials').insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, inserted: toInsert.length, skipped: clean.length - toInsert.length };
}

/**
 * Mark serials as sold against an invoice. Used during POS checkout.
 * All serials must currently be `available` for the same product, or fails.
 */
export async function markSerialsSold(
  supabase: SupabaseClient,
  args: { productId: string; serialIds: string[]; invoiceId: string; customerId?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (args.serialIds.length === 0) return { ok: true };

  const { data: serials, error: readErr } = await supabase
    .from('product_serials')
    .select('id, status, product_id, serial_number')
    .in('id', args.serialIds);
  if (readErr || !serials) return { ok: false, error: readErr?.message ?? 'Serial lookup failed' };

  for (const s of serials) {
    if (s.product_id !== args.productId) return { ok: false, error: `Serial ${s.serial_number} belongs to a different product` };
    if (s.status !== 'available') return { ok: false, error: `Serial ${s.serial_number} is not available (status: ${s.status})` };
  }

  const { error } = await supabase
    .from('product_serials')
    .update({
      status: 'sold',
      invoice_id: args.invoiceId,
      sold_at: new Date().toISOString(),
      customer_id: args.customerId ?? null,
    })
    .in('id', args.serialIds);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
