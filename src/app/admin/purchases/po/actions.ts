'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { computeLineGst, isInterState, financialYearCode } from '@/lib/gst';
import { round2 } from '@/lib/money';

export type POLineInput = {
  productId: string;
  qty: number;
  unitCost: number;
  gstRate: number;
};

export type CreatePOInput = {
  supplierId: string;
  expectedDate?: string | null;
  notes?: string;
  lines: POLineInput[];
  status?: 'draft' | 'sent';
};

export async function searchSuppliers(term: string) {
  const supabase = await createClient();
  const q = term.trim();
  if (!q) return { ok: true as const, suppliers: [] };
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, phone, gstin, state, state_code')
    .ilike('name', `%${q}%`)
    .eq('is_active', true)
    .limit(10);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, suppliers: data ?? [] };
}

export async function searchProductsForPO(term: string) {
  const supabase = await createClient();
  const q = term.trim();
  if (!q) return { ok: true as const, products: [] };
  const { data, error } = await supabase
    .from('products')
    .select('id, name, cost_price, price, gst_rate, hsn_code, barcode, tracks_serials')
    .or(`name.ilike.%${q}%,barcode.eq.${q}`)
    .limit(10);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, products: data ?? [] };
}

async function nextPoNumber(supabase: any, prefix = 'PO'): Promise<string> {
  const fy = financialYearCode();
  const { data, error } = await supabase.rpc('next_po_seq', { p_fy: fy });
  if (error || typeof data !== 'number') throw new Error(error?.message ?? 'PO numbering failed');
  return `${prefix}/${fy}/${String(data).padStart(4, '0')}`;
}

export async function createPurchaseOrder(input: CreatePOInput) {
  const user = await requireUser(['admin', 'manager']);
  const supabase = await createClient();

  if (!input.supplierId) return { ok: false as const, error: 'Supplier is required.' };
  if (!input.lines || input.lines.length === 0) return { ok: false as const, error: 'Add at least one line item.' };

  const { data: settings } = await supabase.from('business_settings').select('*').eq('id', 1).single();
  const { data: supplier, error: supplierErr } = await supabase.from('suppliers').select('*').eq('id', input.supplierId).single();
  if (supplierErr || !supplier) return { ok: false as const, error: 'Supplier not found.' };

  const interState = isInterState(settings?.state_code, supplier.state_code);

  const productIds = Array.from(new Set(input.lines.map(l => l.productId)));
  const { data: products } = await supabase.from('products').select('id, name, hsn_code').in('id', productIds);
  const productById = new Map((products ?? []).map(p => [p.id, p]));

  let subtotal = 0, cgst = 0, sgst = 0, igst = 0;
  const lineRows = input.lines.map(line => {
    const p = productById.get(line.productId);
    if (!p) throw new Error(`Missing product: ${line.productId}`);
    const b = computeLineGst({ qty: line.qty, unitPrice: line.unitCost, gstRate: line.gstRate, interState });
    subtotal = round2(subtotal + b.taxable);
    cgst = round2(cgst + b.cgst);
    sgst = round2(sgst + b.sgst);
    igst = round2(igst + b.igst);
    return {
      product_id: p.id,
      product_name: p.name,
      hsn_code: p.hsn_code,
      qty_ordered: line.qty,
      qty_received: 0,
      unit_cost: line.unitCost,
      gst_rate: line.gstRate,
      taxable_amount: b.taxable,
      cgst_amount: b.cgst,
      sgst_amount: b.sgst,
      igst_amount: b.igst,
      line_total: b.total,
    };
  });
  const grandTotal = round2(subtotal + cgst + sgst + igst);

  const poNumber = await nextPoNumber(supabase);

  const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
    po_number: poNumber,
    supplier_id: supplier.id,
    supplier_snapshot: {
      name: supplier.name, phone: supplier.phone, gstin: supplier.gstin,
      state: supplier.state, state_code: supplier.state_code,
      address_line1: supplier.address_line1, city: supplier.city, pincode: supplier.pincode,
    },
    status: input.status ?? 'draft',
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: input.expectedDate || null,
    subtotal,
    cgst_total: cgst,
    sgst_total: sgst,
    igst_total: igst,
    grand_total: grandTotal,
    is_inter_state: interState,
    notes: input.notes || null,
    created_by: user.id,
  }).select('id, po_number').single();

  if (poErr || !po) return { ok: false as const, error: poErr?.message ?? 'PO creation failed' };

  const lines = lineRows.map(l => ({ ...l, po_id: po.id }));
  const { error: linesErr } = await supabase.from('purchase_order_lines').insert(lines);
  if (linesErr) {
    await supabase.from('purchase_orders').delete().eq('id', po.id);
    return { ok: false as const, error: linesErr.message };
  }

  revalidatePath('/admin/purchases');
  return { ok: true as const, poId: po.id, poNumber: po.po_number };
}

export async function updatePOStatus(poId: string, newStatus: 'draft' | 'sent' | 'cancelled') {
  await requireUser(['admin', 'manager']);
  const supabase = await createClient();
  const { data: prev } = await supabase.from('purchase_orders').select('status, po_number').eq('id', poId).single();
  const { error } = await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', poId);
  if (error) return { ok: false as const, error: error.message };
  await audit(supabase, 'po.status_change', {
    entityType: 'purchase_order',
    entityId: poId,
    details: { po_number: prev?.po_number, from: prev?.status, to: newStatus },
  });
  revalidatePath('/admin/purchases');
  revalidatePath(`/admin/purchases/po/${poId}`);
  return { ok: true as const };
}
