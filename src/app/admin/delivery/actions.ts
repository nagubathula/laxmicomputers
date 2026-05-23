'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { computeLineGst, isInterState, financialYearCode } from '@/lib/gst';
import { round2, roundOffDelta } from '@/lib/money';
import { nextInvoiceNumber } from '@/lib/invoiceNumber';
import { recordStockMovement } from '@/lib/stock';

export type DCLineInput = {
  productId: string;
  qty: number;
  unitPrice: number;       // indicative; not taxed
};

export type DCReason = 'sale' | 'sale_on_approval' | 'job_work' | 'sample' | 'replacement' | 'return' | 'other';

export type CreateDCInput = {
  customerId?: string | null;
  reason: DCReason;
  vehicleNumber?: string | null;
  transportMode?: string | null;
  lrNumber?: string | null;
  notes?: string;
  lines: DCLineInput[];
};

async function nextDcNumber(supabase: any): Promise<string> {
  const fy = financialYearCode();
  const { data, error } = await supabase.rpc('next_dc_seq', { p_fy: fy });
  if (error || typeof data !== 'number') throw new Error(error?.message ?? 'DC numbering failed');
  return `DC/${fy}/${String(data).padStart(4, '0')}`;
}

export async function createDeliveryChallan(input: CreateDCInput) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!input.lines || input.lines.length === 0) return { ok: false as const, error: 'Add at least one line.' };

  const { data: settings } = await supabase.from('business_settings').select('*').eq('id', 1).single();
  if (!settings) return { ok: false as const, error: 'Configure business settings first.' };

  let customer: any = null;
  if (input.customerId) {
    const { data } = await supabase.from('customers').select('*').eq('id', input.customerId).single();
    customer = data;
  }

  const productIds = Array.from(new Set(input.lines.map(l => l.productId)));
  const { data: products } = await supabase
    .from('products')
    .select('id, name, hsn_code, stock_qty')
    .in('id', productIds);
  const productById = new Map((products ?? []).map(p => [p.id, p]));

  // Stock check
  for (const line of input.lines) {
    const p = productById.get(line.productId);
    if (!p) return { ok: false as const, error: `Missing product: ${line.productId}` };
    if (line.qty <= 0) return { ok: false as const, error: `Invalid quantity for "${p.name}"` };
    if ((p.stock_qty ?? 0) < line.qty) {
      return { ok: false as const, error: `Insufficient stock for "${p.name}". Available ${p.stock_qty}, requested ${line.qty}.` };
    }
  }

  let goodsValue = 0;
  const lineRows = input.lines.map(line => {
    const p = productById.get(line.productId)!;
    const lineTotal = round2(line.qty * line.unitPrice);
    goodsValue = round2(goodsValue + lineTotal);
    return {
      product_id: p.id,
      product_name: p.name,
      hsn_code: p.hsn_code ?? null,
      qty: line.qty,
      unit_price: line.unitPrice,
      line_total: lineTotal,
    };
  });

  const dcNumber = await nextDcNumber(supabase);

  // Insert DC header
  const { data: dc, error: dcErr } = await supabase
    .from('delivery_challans')
    .insert({
      dc_number: dcNumber,
      customer_id: customer?.id ?? null,
      customer_snapshot: customer ? {
        name: customer.name, phone: customer.phone, gstin: customer.gstin,
        state: customer.state, state_code: customer.state_code,
        address_line1: customer.address_line1, address_line2: customer.address_line2,
        city: customer.city, pincode: customer.pincode,
      } : { name: 'Self / not specified' },
      business_snapshot: {
        legal_name: settings.legal_name, gstin: settings.gstin, pan: settings.pan,
        address_line1: settings.address_line1, address_line2: settings.address_line2,
        city: settings.city, state: settings.state, state_code: settings.state_code,
        pincode: settings.pincode, phone: settings.phone, email: settings.email,
      },
      reason: input.reason,
      status: 'open',
      vehicle_number: input.vehicleNumber || null,
      transport_mode: input.transportMode || null,
      lr_number: input.lrNumber || null,
      goods_value: goodsValue,
      notes: input.notes || null,
      created_by: user.id,
    })
    .select('id, dc_number')
    .single();

  if (dcErr || !dc) return { ok: false as const, error: dcErr?.message ?? 'DC creation failed' };

  // Insert lines
  const linesPayload = lineRows.map(l => ({ ...l, dc_id: dc.id }));
  const { error: linesErr } = await supabase.from('delivery_challan_lines').insert(linesPayload);
  if (linesErr) {
    await supabase.from('delivery_challans').delete().eq('id', dc.id);
    return { ok: false as const, error: linesErr.message };
  }

  // Post stock movements (reason='delivery')
  const applied: { productId: string; qty: number }[] = [];
  for (const line of input.lines) {
    const result = await recordStockMovement(supabase, {
      productId: line.productId,
      qtyDelta: -line.qty,
      reason: 'delivery' as any,
      refTable: 'delivery_challans',
      refId: dc.id,
      note: `DC ${dc.dc_number}`,
      createdBy: user.id,
    });
    if (!result.ok) {
      // Roll back
      for (const a of applied) {
        await recordStockMovement(supabase, {
          productId: a.productId, qtyDelta: a.qty, reason: 'adjustment',
          note: `Reversal of failed DC ${dc.dc_number}`, createdBy: user.id,
        });
      }
      await supabase.from('delivery_challan_lines').delete().eq('dc_id', dc.id);
      await supabase.from('delivery_challans').delete().eq('id', dc.id);
      return { ok: false as const, error: result.error };
    }
    applied.push({ productId: line.productId, qty: line.qty });
  }

  await audit(supabase, 'dc.create', { entityType: 'delivery_challan', entityId: dc.id, details: { dc_number: dc.dc_number, lines: input.lines.length } });

  revalidatePath('/admin/delivery');
  return { ok: true as const, dcId: dc.id, dcNumber: dc.dc_number };
}

export async function updateDcStatus(dcId: string, newStatus: 'open' | 'delivered' | 'cancelled') {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: prev } = await supabase.from('delivery_challans').select('status, dc_number').eq('id', dcId).single();
  if (!prev) return { ok: false as const, error: 'DC not found' };
  if (prev.status === 'invoiced') return { ok: false as const, error: 'Cannot change status of an invoiced DC.' };

  // Cancelling restores stock
  if (newStatus === 'cancelled' && prev.status !== 'cancelled') {
    const { data: lines } = await supabase.from('delivery_challan_lines').select('product_id, qty').eq('dc_id', dcId);
    for (const line of lines ?? []) {
      if (!line.product_id) continue;
      await recordStockMovement(supabase, {
        productId: line.product_id,
        qtyDelta: Number(line.qty),
        reason: 'return_in',
        refTable: 'delivery_challans',
        refId: dcId,
        note: `Cancel DC reversal`,
        createdBy: user.id,
      });
    }
  }

  const { error } = await supabase.from('delivery_challans').update({ status: newStatus }).eq('id', dcId);
  if (error) return { ok: false as const, error: error.message };

  await audit(supabase, 'dc.status_change', { entityType: 'delivery_challan', entityId: dcId, details: { dc_number: prev.dc_number, from: prev.status, to: newStatus } });

  revalidatePath('/admin/delivery');
  revalidatePath(`/admin/delivery/${dcId}`);
  return { ok: true as const };
}

/**
 * Convert a delivered DC into an invoice.
 *
 * Critically: this does NOT re-decrement stock — the DC already did that
 * when it was created. Just creates the invoice header + lines with GST
 * computed, then marks the DC as 'invoiced'.
 */
export async function convertDcToInvoice(dcId: string, paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit' = 'credit') {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: dc, error: dcErr } = await supabase.from('delivery_challans').select('*').eq('id', dcId).single();
  if (dcErr || !dc) return { ok: false as const, error: 'DC not found' };
  if (dc.status === 'invoiced') return { ok: false as const, error: 'Already invoiced.' };
  if (dc.status === 'cancelled') return { ok: false as const, error: 'Cancelled DCs cannot be invoiced.' };

  const { data: lines } = await supabase.from('delivery_challan_lines').select('*').eq('dc_id', dcId);
  if (!lines || lines.length === 0) return { ok: false as const, error: 'DC has no lines.' };

  // Pull GST rates from products
  const productIds = Array.from(new Set(lines.map(l => l.product_id).filter(Boolean) as string[]));
  const { data: products } = await supabase.from('products').select('id, name, gst_rate, hsn_code').in('id', productIds);
  const productById = new Map((products ?? []).map(p => [p.id, p]));

  const { data: settings } = await supabase.from('business_settings').select('*').eq('id', 1).single();
  if (!settings) return { ok: false as const, error: 'Configure business settings first.' };

  const customerSnapshot = dc.customer_snapshot as any;
  const interState = isInterState(settings.state_code, customerSnapshot?.state_code);

  let subtotal = 0, cgst = 0, sgst = 0, igst = 0;
  const invoiceLines = lines.map(l => {
    const p = l.product_id ? productById.get(l.product_id) : null;
    const gstRate = Number(p?.gst_rate ?? 0);
    const b = computeLineGst({
      qty: Number(l.qty),
      unitPrice: Number(l.unit_price),
      gstRate,
      interState,
    });
    subtotal = round2(subtotal + b.taxable);
    cgst = round2(cgst + b.cgst);
    sgst = round2(sgst + b.sgst);
    igst = round2(igst + b.igst);
    return {
      product_id: l.product_id,
      product_name: l.product_name,
      hsn_code: l.hsn_code ?? p?.hsn_code ?? null,
      qty: l.qty,
      unit_price: l.unit_price,
      discount_amount: 0,
      taxable_amount: b.taxable,
      gst_rate: gstRate,
      cgst_amount: b.cgst,
      sgst_amount: b.sgst,
      igst_amount: b.igst,
      line_total: b.total,
    };
  });

  const preRound = round2(subtotal + cgst + sgst + igst);
  const roundOff = roundOffDelta(preRound);
  const grandTotal = round2(preRound + roundOff);

  const numberResult = await nextInvoiceNumber(supabase, settings.invoice_prefix ?? 'LC');
  if (!numberResult.ok) return { ok: false as const, error: numberResult.error };

  const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
    invoice_number: numberResult.number,
    customer_id: dc.customer_id,
    customer_snapshot: dc.customer_snapshot,
    business_snapshot: dc.business_snapshot,
    status: 'issued',
    payment_method: paymentMethod,
    currency: settings.default_currency ?? 'INR',
    is_inter_state: interState,
    subtotal,
    cgst_total: cgst,
    sgst_total: sgst,
    igst_total: igst,
    discount_total: 0,
    round_off: roundOff,
    grand_total: grandTotal,
    amount_paid: paymentMethod === 'credit' ? 0 : grandTotal,
    notes: `Invoice for Delivery Challan ${dc.dc_number}`,
    created_by: user.id,
  }).select('id, invoice_number').single();

  if (invErr || !invoice) return { ok: false as const, error: invErr?.message ?? 'Invoice creation failed' };

  const payload = invoiceLines.map(l => ({ ...l, invoice_id: invoice.id }));
  const { error: ilErr } = await supabase.from('invoice_lines').insert(payload);
  if (ilErr) {
    await supabase.from('invoices').delete().eq('id', invoice.id);
    return { ok: false as const, error: ilErr.message };
  }

  // No stock_movements posted — DC already did the decrement.
  await supabase.from('delivery_challans').update({ status: 'invoiced', converted_invoice_id: invoice.id }).eq('id', dcId);

  await audit(supabase, 'dc.invoice', {
    entityType: 'delivery_challan',
    entityId: dcId,
    details: { dc_number: dc.dc_number, invoice_number: invoice.invoice_number },
  });

  revalidatePath('/admin/delivery');
  revalidatePath(`/admin/delivery/${dcId}`);
  revalidatePath('/admin/invoices');
  return { ok: true as const, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number };
}
