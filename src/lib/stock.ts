import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The ONLY supported path to mutate product stock.
 *
 * Inserts a row in stock_movements and atomically updates products.stock_qty
 * with the delta. Negative deltas (sales, damage) reduce stock; positive
 * deltas (purchases, returns_in, opening balance) increase it.
 *
 * Why not a DB trigger? Because we want server actions to know if a sale
 * would drive stock negative and reject it before writing the invoice.
 * The check happens here.
 */

export type StockReason =
  | 'sale'
  | 'purchase'
  | 'return_in'
  | 'return_out'
  | 'adjustment'
  | 'damage'
  | 'opening';

export type RecordMovementArgs = {
  productId: string;
  qtyDelta: number;
  reason: StockReason;
  refTable?: string;
  refId?: string;
  note?: string;
  createdBy?: string;
  /** If true, allow stock to go negative (e.g. backorder). Default false. */
  allowNegative?: boolean;
};

export async function recordStockMovement(
  supabase: SupabaseClient,
  args: RecordMovementArgs,
): Promise<{ ok: true; newQty: number } | { ok: false; error: string }> {
  const { productId, qtyDelta, reason, refTable, refId, note, createdBy, allowNegative = false } = args;

  if (qtyDelta === 0) return { ok: false, error: 'qty_delta cannot be 0' };

  // Read current stock
  const { data: product, error: readError } = await supabase
    .from('products')
    .select('stock_qty, name')
    .eq('id', productId)
    .single();

  if (readError || !product) {
    return { ok: false, error: `Product not found: ${productId}` };
  }

  const newQty = (product.stock_qty ?? 0) + qtyDelta;
  if (!allowNegative && newQty < 0) {
    return {
      ok: false,
      error: `Insufficient stock for "${product.name}". Available: ${product.stock_qty}, requested: ${-qtyDelta}.`,
    };
  }

  // Update first (Supabase JS doesn't support multi-statement TX; this is
  // good enough for a single-shop workload. If we ever need true atomicity
  // across many lines we'll move to a Postgres function.)
  const { error: updateError } = await supabase
    .from('products')
    .update({ stock_qty: newQty })
    .eq('id', productId);

  if (updateError) {
    return { ok: false, error: `Stock update failed: ${updateError.message}` };
  }

  const { error: insertError } = await supabase.from('stock_movements').insert({
    product_id: productId,
    qty_delta: qtyDelta,
    reason,
    ref_table: refTable ?? null,
    ref_id: refId ?? null,
    note: note ?? null,
    created_by: createdBy ?? null,
  });

  if (insertError) {
    // Best-effort compensation: roll back the stock update
    await supabase.from('products').update({ stock_qty: product.stock_qty }).eq('id', productId);
    return { ok: false, error: `Movement log failed: ${insertError.message}` };
  }

  return { ok: true, newQty };
}

/** Derived stock status from quantity + reorder level. */
export function deriveStockStatus(
  stockQty: number,
  reorderLevel: number = 0,
): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (stockQty <= 0) return 'Out of Stock';
  if (reorderLevel > 0 && stockQty <= reorderLevel) return 'Low Stock';
  return 'In Stock';
}
