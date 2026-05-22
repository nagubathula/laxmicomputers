'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { computeLineGst, isInterState, financialYearCode } from '@/lib/gst';
import { round2, roundOffDelta } from '@/lib/money';
import { nextInvoiceNumber } from '@/lib/invoiceNumber';
import { recordStockMovement } from '@/lib/stock';
import { markSerialsSold } from '@/lib/serials';

export type QuoteLineInput = {
  productId: string;
  qty: number;
  unitPrice: number;
  discount?: number;
};

export type CreateQuoteInput = {
  customerId?: string | null;
  validUntil?: string | null;
  notes?: string;
  status?: 'draft' | 'sent';
  lines: QuoteLineInput[];
};

async function nextQuoteNumber(supabase: any, prefix: string): Promise<string> {
  const fy = financialYearCode();
  const { data, error } = await supabase.rpc('next_quote_seq', { p_fy: fy });
  if (error || typeof data !== 'number') throw new Error(error?.message ?? 'Quote numbering failed');
  return `${prefix}/Q/${fy}/${String(data).padStart(4, '0')}`;
}

export async function createQuote(input: CreateQuoteInput) {
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
  const interState = isInterState(settings.state_code, customer?.state_code);

  const productIds = Array.from(new Set(input.lines.map(l => l.productId)));
  const { data: products } = await supabase.from('products').select('id, name, gst_rate, hsn_code').in('id', productIds);
  const productById = new Map((products ?? []).map(p => [p.id, p]));

  let subtotal = 0, cgst = 0, sgst = 0, igst = 0, discount = 0;
  const lineRows = input.lines.map(line => {
    const p = productById.get(line.productId);
    if (!p) throw new Error(`Missing product: ${line.productId}`);
    const b = computeLineGst({
      qty: line.qty, unitPrice: line.unitPrice, discount: line.discount ?? 0,
      gstRate: Number(p.gst_rate ?? 0), interState,
    });
    subtotal = round2(subtotal + b.taxable);
    cgst = round2(cgst + b.cgst);
    sgst = round2(sgst + b.sgst);
    igst = round2(igst + b.igst);
    discount = round2(discount + (line.discount ?? 0));
    return {
      product_id: p.id, product_name: p.name, hsn_code: p.hsn_code ?? null,
      qty: line.qty, unit_price: line.unitPrice, discount_amount: line.discount ?? 0,
      taxable_amount: b.taxable, gst_rate: Number(p.gst_rate ?? 0),
      cgst_amount: b.cgst, sgst_amount: b.sgst, igst_amount: b.igst,
      line_total: b.total,
    };
  });
  const grandTotal = round2(subtotal + cgst + sgst + igst);

  const quoteNumber = await nextQuoteNumber(supabase, settings.invoice_prefix ?? 'LC');

  const { data: quote, error } = await supabase.from('quotes').insert({
    quote_number: quoteNumber,
    quote_date: new Date().toISOString().slice(0, 10),
    valid_until: input.validUntil || null,
    customer_id: customer?.id ?? null,
    customer_snapshot: customer ? {
      name: customer.name, phone: customer.phone, gstin: customer.gstin,
      state: customer.state, state_code: customer.state_code,
      address_line1: customer.address_line1, address_line2: customer.address_line2,
      city: customer.city, pincode: customer.pincode,
    } : { name: 'Prospective customer' },
    business_snapshot: {
      legal_name: settings.legal_name, gstin: settings.gstin, pan: settings.pan,
      address_line1: settings.address_line1, address_line2: settings.address_line2,
      city: settings.city, state: settings.state, state_code: settings.state_code,
      pincode: settings.pincode, phone: settings.phone, email: settings.email,
    },
    status: input.status ?? 'draft',
    currency: settings.default_currency ?? 'INR',
    is_inter_state: interState,
    subtotal, cgst_total: cgst, sgst_total: sgst, igst_total: igst,
    discount_total: discount, grand_total: grandTotal,
    notes: input.notes || null,
    created_by: user.id,
  }).select('id, quote_number').single();
  if (error || !quote) return { ok: false as const, error: error?.message ?? 'Quote creation failed' };

  const linesPayload = lineRows.map(l => ({ ...l, quote_id: quote.id }));
  const { error: linesErr } = await supabase.from('quote_lines').insert(linesPayload);
  if (linesErr) {
    await supabase.from('quotes').delete().eq('id', quote.id);
    return { ok: false as const, error: linesErr.message };
  }

  revalidatePath('/admin/quotes');
  return { ok: true as const, quoteId: quote.id, quoteNumber: quote.quote_number };
}

export async function updateQuoteStatus(quoteId: string, newStatus: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired') {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', quoteId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/quotes');
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true as const };
}

/**
 * Convert an accepted quote into an invoice. Reuses the full POS flow:
 *  - validate stock for each line (and serial selection if tracked)
 *  - decrement stock + create stock_movements
 *  - assign invoice number + create invoice + lines
 *  - mark quote as 'converted' with a pointer to the new invoice
 *
 * Returns ok with new invoice id, or error.
 */
export async function convertQuoteToInvoice(quoteId: string, paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit' = 'cash') {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: quote, error: quoteErr } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
  if (quoteErr || !quote) return { ok: false as const, error: 'Quote not found.' };
  if (quote.status === 'converted') return { ok: false as const, error: 'Already converted.' };

  const { data: lines, error: linesErr } = await supabase.from('quote_lines').select('*').eq('quote_id', quoteId);
  if (linesErr || !lines || lines.length === 0) return { ok: false as const, error: 'Quote has no lines.' };

  // Stock check
  const productIds = Array.from(new Set(lines.map(l => l.product_id).filter(Boolean) as string[]));
  const { data: products } = await supabase.from('products').select('id, name, stock_qty, tracks_serials').in('id', productIds);
  const productById = new Map((products ?? []).map(p => [p.id, p]));

  for (const l of lines) {
    if (!l.product_id) return { ok: false as const, error: `Line "${l.product_name}" is missing product reference.` };
    const p = productById.get(l.product_id);
    if (!p) return { ok: false as const, error: `Product missing: ${l.product_name}` };
    if (Number(p.stock_qty) < Number(l.qty)) {
      return { ok: false as const, error: `Insufficient stock for "${p.name}". Available ${p.stock_qty}, needed ${l.qty}.` };
    }
    if (p.tracks_serials) {
      return { ok: false as const, error: `"${p.name}" tracks serials; please ring up via POS to pick which units.` };
    }
  }

  // Allocate invoice number
  const numberResult = await nextInvoiceNumber(supabase, (await supabase.from('business_settings').select('invoice_prefix').eq('id', 1).single()).data?.invoice_prefix ?? 'LC');
  if (!numberResult.ok) return { ok: false as const, error: numberResult.error };

  const { data: invoice, error: invoiceErr } = await supabase.from('invoices').insert({
    invoice_number: numberResult.number,
    customer_id: quote.customer_id,
    customer_snapshot: quote.customer_snapshot,
    business_snapshot: quote.business_snapshot,
    status: 'issued',
    payment_method: paymentMethod,
    currency: quote.currency,
    is_inter_state: quote.is_inter_state,
    subtotal: quote.subtotal,
    cgst_total: quote.cgst_total,
    sgst_total: quote.sgst_total,
    igst_total: quote.igst_total,
    discount_total: quote.discount_total,
    round_off: roundOffDelta(Number(quote.subtotal) + Number(quote.cgst_total) + Number(quote.sgst_total) + Number(quote.igst_total)),
    grand_total: quote.grand_total,
    amount_paid: quote.grand_total,
    notes: `Converted from quote ${quote.quote_number}`,
    created_by: user.id,
  }).select('id, invoice_number').single();
  if (invoiceErr || !invoice) return { ok: false as const, error: invoiceErr?.message ?? 'Invoice creation failed' };

  // Copy lines
  const invoiceLines = lines.map(l => ({
    invoice_id: invoice.id,
    product_id: l.product_id,
    product_name: l.product_name,
    hsn_code: l.hsn_code,
    qty: l.qty,
    unit_price: l.unit_price,
    discount_amount: l.discount_amount,
    taxable_amount: l.taxable_amount,
    gst_rate: l.gst_rate,
    cgst_amount: l.cgst_amount,
    sgst_amount: l.sgst_amount,
    igst_amount: l.igst_amount,
    line_total: l.line_total,
  }));
  const { error: ilErr } = await supabase.from('invoice_lines').insert(invoiceLines);
  if (ilErr) {
    await supabase.from('invoices').delete().eq('id', invoice.id);
    return { ok: false as const, error: ilErr.message };
  }

  // Stock movements
  for (const l of lines) {
    const r = await recordStockMovement(supabase, {
      productId: l.product_id!, qtyDelta: -Number(l.qty), reason: 'sale',
      refTable: 'invoices', refId: invoice.id,
      note: `Invoice ${invoice.invoice_number} (from quote ${quote.quote_number})`,
      createdBy: user.id,
    });
    if (!r.ok) return { ok: false as const, error: r.error };
  }

  // Mark quote as converted
  await supabase.from('quotes').update({ status: 'converted', converted_invoice_id: invoice.id }).eq('id', quoteId);

  revalidatePath('/admin/quotes');
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath('/admin/invoices');
  return { ok: true as const, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number };
}
