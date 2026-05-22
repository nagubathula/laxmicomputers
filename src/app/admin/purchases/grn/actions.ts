'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { recordStockMovement } from '@/lib/stock';
import { financialYearCode } from '@/lib/gst';
import { recordReceivedSerials } from '@/lib/serials';

export type GRNLineInput = {
  productId: string;
  poLineId?: string | null;
  qty: number;
  unitCost: number;
  serials?: string[];          // optional: serial numbers being received for this line
};

export type CreateGRNInput = {
  supplierId?: string | null;       // can be omitted only if poId is present
  poId?: string | null;
  invoiceRef?: string | null;       // supplier's invoice number
  receiptDate?: string;
  notes?: string;
  lines: GRNLineInput[];
  updateCostPrice?: boolean;        // default true — refresh product.cost_price to received cost
};

async function nextGrnNumber(supabase: any): Promise<string> {
  const fy = financialYearCode();
  const { data, error } = await supabase.rpc('next_grn_seq', { p_fy: fy });
  if (error || typeof data !== 'number') throw new Error(error?.message ?? 'GRN numbering failed');
  return `GRN/${fy}/${String(data).padStart(4, '0')}`;
}

/** Load a PO with its lines, for the GRN editor when receiving against a PO. */
export async function loadPOForReceive(poId: string) {
  const supabase = await createClient();
  const { data: po, error: poErr } = await supabase
    .from('purchase_orders')
    .select('id, po_number, supplier_id, supplier_snapshot, status')
    .eq('id', poId)
    .single();
  if (poErr || !po) return { ok: false as const, error: 'PO not found.' };

  const { data: lines, error: linesErr } = await supabase
    .from('purchase_order_lines')
    .select('id, product_id, product_name, qty_ordered, qty_received, unit_cost, products(tracks_serials)')
    .eq('po_id', poId)
    .order('created_at');
  if (linesErr) return { ok: false as const, error: linesErr.message };

  // Flatten the joined products.tracks_serials field
  const flatLines = (lines ?? []).map((l: any) => ({
    id: l.id,
    product_id: l.product_id,
    product_name: l.product_name,
    qty_ordered: l.qty_ordered,
    qty_received: l.qty_received,
    unit_cost: l.unit_cost,
    tracks_serials: l.products?.tracks_serials ?? false,
  }));

  return { ok: true as const, po, lines: flatLines };
}

export async function createGRN(input: CreateGRNInput) {
  const user = await requireUser(['admin', 'manager']);
  const supabase = await createClient();

  if (!input.lines || input.lines.length === 0) {
    return { ok: false as const, error: 'Add at least one received line.' };
  }
  if (!input.supplierId && !input.poId) {
    return { ok: false as const, error: 'Pick a supplier or PO.' };
  }

  // Resolve supplier (either directly or via PO)
  let supplier: any = null;
  let po: any = null;
  if (input.poId) {
    const { data, error } = await supabase.from('purchase_orders').select('*').eq('id', input.poId).single();
    if (error || !data) return { ok: false as const, error: 'PO not found.' };
    po = data;
  }
  const effectiveSupplierId = input.supplierId ?? po?.supplier_id;
  if (effectiveSupplierId) {
    const { data } = await supabase.from('suppliers').select('*').eq('id', effectiveSupplierId).single();
    supplier = data;
  }

  const grnNumber = await nextGrnNumber(supabase);

  // Insert GRN header
  const { data: grn, error: grnErr } = await supabase.from('goods_receipts').insert({
    grn_number: grnNumber,
    supplier_id: effectiveSupplierId ?? null,
    supplier_snapshot: supplier ? {
      name: supplier.name, phone: supplier.phone, gstin: supplier.gstin,
      state: supplier.state, state_code: supplier.state_code,
    } : (po?.supplier_snapshot ?? null),
    po_id: input.poId ?? null,
    receipt_date: input.receiptDate || new Date().toISOString().slice(0, 10),
    invoice_ref: input.invoiceRef || null,
    notes: input.notes || null,
    created_by: user.id,
  }).select('id, grn_number').single();

  if (grnErr || !grn) return { ok: false as const, error: grnErr?.message ?? 'GRN creation failed' };

  // Load product names for snapshot
  const productIds = Array.from(new Set(input.lines.map(l => l.productId)));
  const { data: products } = await supabase.from('products').select('id, name').in('id', productIds);
  const nameById = new Map((products ?? []).map(p => [p.id, p.name]));

  // Insert GRN lines
  const grnLines = input.lines.map(l => ({
    grn_id: grn.id,
    po_line_id: l.poLineId ?? null,
    product_id: l.productId,
    product_name: nameById.get(l.productId) ?? '',
    qty_received: l.qty,
    unit_cost: l.unitCost,
  }));
  const { error: linesErr } = await supabase.from('goods_receipt_lines').insert(grnLines);
  if (linesErr) {
    await supabase.from('goods_receipts').delete().eq('id', grn.id);
    return { ok: false as const, error: linesErr.message };
  }

  // Apply stock movements + update product cost_price (latest cost)
  const applied: { productId: string; qty: number }[] = [];
  const updateCost = input.updateCostPrice ?? true;
  for (const line of input.lines) {
    if (line.qty <= 0) continue;
    const result = await recordStockMovement(supabase, {
      productId: line.productId,
      qtyDelta: line.qty,
      reason: 'purchase',
      refTable: 'goods_receipts',
      refId: grn.id,
      note: `GRN ${grn.grn_number}`,
      createdBy: user.id,
    });
    if (!result.ok) {
      // Roll back
      for (const a of applied) {
        await recordStockMovement(supabase, {
          productId: a.productId, qtyDelta: -a.qty, reason: 'adjustment',
          note: `Reversal of failed GRN ${grn.grn_number}`, createdBy: user.id,
        });
      }
      await supabase.from('goods_receipt_lines').delete().eq('grn_id', grn.id);
      await supabase.from('goods_receipts').delete().eq('id', grn.id);
      return { ok: false as const, error: result.error };
    }
    applied.push({ productId: line.productId, qty: line.qty });

    if (updateCost) {
      await supabase.from('products').update({ cost_price: line.unitCost }).eq('id', line.productId);
    }

    // Record any received serials (no-op if line.serials is empty)
    if (line.serials && line.serials.length > 0) {
      const serialResult = await recordReceivedSerials(supabase, {
        productId: line.productId,
        serials: line.serials,
        grnId: grn.id,
        unitCost: line.unitCost,
      });
      if (!serialResult.ok) {
        // Don't roll back the whole GRN — serials are advisory. Surface a warning instead.
        console.warn(`Serial capture warning for product ${line.productId}: ${serialResult.error}`);
      }
    }
  }

  // If against PO: bump qty_received on po_lines and flip PO status
  if (input.poId) {
    for (const line of input.lines) {
      if (!line.poLineId) continue;
      const { data: poLine } = await supabase
        .from('purchase_order_lines')
        .select('qty_received')
        .eq('id', line.poLineId)
        .single();
      const newReceived = (Number(poLine?.qty_received) ?? 0) + Number(line.qty);
      await supabase.from('purchase_order_lines').update({ qty_received: newReceived }).eq('id', line.poLineId);
    }
    // Recompute PO status
    const { data: allLines } = await supabase
      .from('purchase_order_lines')
      .select('qty_ordered, qty_received')
      .eq('po_id', input.poId);
    const fullyReceived = (allLines ?? []).every(l => Number(l.qty_received) >= Number(l.qty_ordered));
    const anyReceived = (allLines ?? []).some(l => Number(l.qty_received) > 0);
    const newStatus = fullyReceived ? 'received' : anyReceived ? 'partial' : 'sent';
    await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', input.poId);
  }

  revalidatePath('/admin/purchases');
  if (input.poId) revalidatePath(`/admin/purchases/po/${input.poId}`);
  return { ok: true as const, grnId: grn.id, grnNumber: grn.grn_number };
}
