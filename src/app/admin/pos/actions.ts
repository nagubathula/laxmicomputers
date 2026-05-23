'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { computeLineGst, isInterState } from '@/lib/gst';
import { round2, roundOffDelta } from '@/lib/money';
import { nextInvoiceNumber } from '@/lib/invoiceNumber';
import { recordStockMovement } from '@/lib/stock';
import { markSerialsSold } from '@/lib/serials';

export type CartLineInput = {
  productId: string;
  qty: number;
  unitPrice: number;     // pre-tax, post-discount per-unit price the cashier wants to apply
  discount?: number;     // absolute, per-line
  serialIds?: string[];  // selected serial-unit ids when product tracks serials
};

export type CreateInvoiceInput = {
  customerId?: string | null;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit' | 'mixed';
  amountPaid?: number;
  notes?: string;
  lines: CartLineInput[];
};

/** Fast lookup used by the POS scan handler. */
export async function findProductByBarcode(barcode: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, gst_rate, hsn_code, stock_qty, reorder_level, barcode, tracks_serials')
    .eq('barcode', barcode.trim())
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: 'No product matches that barcode.' };
  return { ok: true as const, product: data };
}

/** Available serial units for a product (used by POS to let cashier pick which unit they're selling). */
export async function listAvailableSerials(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_serials')
    .select('id, serial_number, received_at')
    .eq('product_id', productId)
    .eq('status', 'available')
    .order('received_at', { ascending: true })
    .limit(100);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, serials: data ?? [] };
}

/** Customer search for the POS picker. */
export async function searchCustomers(term: string) {
  const supabase = await createClient();
  const q = term.trim();
  if (!q) return { ok: true as const, customers: [] };
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, gstin, state, state_code')
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%,gstin.ilike.%${q}%`)
    .limit(10);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, customers: data ?? [] };
}

/** Quick customer creation from POS — name + phone only. */
export async function quickCreateCustomer(name: string, phone: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: 'Unauthorized' };

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  if (!trimmedName) return { ok: false as const, error: 'Name is required.' };

  const { data, error } = await supabase
    .from('customers')
    .insert({ name: trimmedName, phone: trimmedPhone || null, created_by: user.id })
    .select('id, name, phone, gstin, state, state_code')
    .single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/customers');
  return { ok: true as const, customer: data };
}

/** Quick product creation from POS — minimum required fields. */
export async function quickAddProduct(input: {
  name: string;
  price: number;
  category: string;
  stock_qty: number;
  gst_rate: number;
  barcode?: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: 'Unauthorized' };

  if (!input.name.trim()) return { ok: false as const, error: 'Product name is required.' };
  if (input.price < 0) return { ok: false as const, error: 'Price must be non-negative.' };

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name.trim(),
      price: input.price,
      category: input.category.trim() || 'General',
      stock_qty: input.stock_qty,
      gst_rate: input.gst_rate,
      barcode: input.barcode?.trim() || null,
      created_by: user.id,
    })
    .select('id, name, price, gst_rate, hsn_code, stock_qty, barcode, tracks_serials')
    .single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/products');
  return { ok: true as const, product: data };
}

export async function createInvoice(input: CreateInvoiceInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: 'Unauthorized' };

  if (!input.lines || input.lines.length === 0) {
    return { ok: false as const, error: 'Cart is empty.' };
  }

  // Load business settings (for state_code, currency, invoice prefix)
  const { data: settings, error: settingsError } = await supabase
    .from('business_settings').select('*').eq('id', 1).single();
  if (settingsError || !settings) {
    return { ok: false as const, error: 'Business settings not configured. Visit /admin/settings.' };
  }

  // Optional customer (B2B with GSTIN, or repeat-customer tracking)
  let customer: any = null;
  if (input.customerId) {
    const { data, error } = await supabase
      .from('customers').select('*').eq('id', input.customerId).single();
    if (error || !data) return { ok: false as const, error: 'Customer not found.' };
    customer = data;
  }

  const interState = isInterState(settings.state_code, customer?.state_code);

  // Load products in one query to get GST rate, HSN, stock — and snapshot fields
  const productIds = Array.from(new Set(input.lines.map(l => l.productId)));
  const { data: products, error: productsError } = await supabase
    .from('products').select('id, name, gst_rate, hsn_code, stock_qty, price, tracks_serials').in('id', productIds);
  if (productsError || !products) {
    return { ok: false as const, error: productsError?.message ?? 'Failed to load products' };
  }
  const productById = new Map(products.map(p => [p.id, p]));

  // Validate serial selection up-front
  for (const line of input.lines) {
    const p = productById.get(line.productId);
    if (!p) continue;
    if (p.tracks_serials && (line.serialIds?.length ?? 0) !== line.qty) {
      return { ok: false as const, error: `"${p.name}" requires ${line.qty} serial number(s); ${line.serialIds?.length ?? 0} selected.` };
    }
  }

  // Build computed lines and accumulate totals
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let discountTotal = 0;

  const computedLines = input.lines.map(line => {
    const p = productById.get(line.productId);
    if (!p) throw new Error(`Product missing in cart: ${line.productId}`);
    if (line.qty <= 0) throw new Error(`Invalid quantity for "${p.name}".`);
    if ((p.stock_qty ?? 0) < line.qty) {
      throw new Error(`Insufficient stock for "${p.name}". Available: ${p.stock_qty}, requested: ${line.qty}.`);
    }

    const breakdown = computeLineGst({
      qty: line.qty,
      unitPrice: line.unitPrice,
      discount: line.discount ?? 0,
      gstRate: Number(p.gst_rate ?? 0),
      interState,
    });

    subtotal = round2(subtotal + breakdown.taxable);
    cgstTotal = round2(cgstTotal + breakdown.cgst);
    sgstTotal = round2(sgstTotal + breakdown.sgst);
    igstTotal = round2(igstTotal + breakdown.igst);
    discountTotal = round2(discountTotal + (line.discount ?? 0));

    return {
      product_id: p.id,
      product_name: p.name,
      hsn_code: p.hsn_code ?? null,
      qty: line.qty,
      unit_price: line.unitPrice,
      discount_amount: line.discount ?? 0,
      taxable_amount: breakdown.taxable,
      gst_rate: Number(p.gst_rate ?? 0),
      cgst_amount: breakdown.cgst,
      sgst_amount: breakdown.sgst,
      igst_amount: breakdown.igst,
      line_total: breakdown.total,
    };
  });

  const preRound = round2(subtotal + cgstTotal + sgstTotal + igstTotal);
  const roundOff = roundOffDelta(preRound);
  const grandTotal = round2(preRound + roundOff);

  // Allocate invoice number
  const numberResult = await nextInvoiceNumber(supabase, settings.invoice_prefix ?? 'LC');
  if (!numberResult.ok) return { ok: false as const, error: numberResult.error };

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: numberResult.number,
      customer_id: customer?.id ?? null,
      customer_snapshot: customer ? {
        name: customer.name, phone: customer.phone, gstin: customer.gstin,
        state: customer.state, state_code: customer.state_code,
        address_line1: customer.address_line1, address_line2: customer.address_line2,
        city: customer.city, pincode: customer.pincode,
      } : { name: 'Walk-in Customer' },
      business_snapshot: {
        legal_name: settings.legal_name, gstin: settings.gstin, pan: settings.pan,
        address_line1: settings.address_line1, address_line2: settings.address_line2,
        city: settings.city, state: settings.state, state_code: settings.state_code,
        pincode: settings.pincode, phone: settings.phone, email: settings.email,
      },
      status: 'issued',
      payment_method: input.paymentMethod,
      currency: settings.default_currency ?? 'INR',
      is_inter_state: interState,
      subtotal,
      cgst_total: cgstTotal,
      sgst_total: sgstTotal,
      igst_total: igstTotal,
      discount_total: discountTotal,
      round_off: roundOff,
      grand_total: grandTotal,
      amount_paid: input.amountPaid ?? grandTotal,
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select('id, invoice_number')
    .single();

  if (invoiceError || !invoice) {
    return { ok: false as const, error: invoiceError?.message ?? 'Failed to create invoice' };
  }

  // Insert invoice lines
  const linesPayload = computedLines.map(l => ({ ...l, invoice_id: invoice.id }));
  const { error: linesError } = await supabase.from('invoice_lines').insert(linesPayload);
  if (linesError) {
    // Roll back invoice header
    await supabase.from('invoices').delete().eq('id', invoice.id);
    return { ok: false as const, error: linesError.message };
  }

  // Record stock movements (one per line). If any fails we attempt rollback of
  // previously-applied movements + the invoice. This is best-effort without
  // true Postgres transactions on supabase-js.
  const applied: { productId: string; qty: number }[] = [];
  for (const line of computedLines) {
    const result = await recordStockMovement(supabase, {
      productId: line.product_id,
      qtyDelta: -line.qty,
      reason: 'sale',
      refTable: 'invoices',
      refId: invoice.id,
      note: `Invoice ${invoice.invoice_number}`,
      createdBy: user.id,
    });
    if (!result.ok) {
      // Reverse what we already did
      for (const a of applied) {
        await recordStockMovement(supabase, {
          productId: a.productId, qtyDelta: a.qty, reason: 'adjustment',
          note: `Reversal of failed invoice ${invoice.invoice_number}`, createdBy: user.id,
        });
      }
      await supabase.from('invoice_lines').delete().eq('invoice_id', invoice.id);
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return { ok: false as const, error: result.error };
    }
    applied.push({ productId: line.product_id, qty: line.qty });
  }

  // Mark serial units as sold (after stock movements + invoice are in place)
  for (const inputLine of input.lines) {
    if (!inputLine.serialIds || inputLine.serialIds.length === 0) continue;
    const result = await markSerialsSold(supabase, {
      productId: inputLine.productId,
      serialIds: inputLine.serialIds,
      invoiceId: invoice.id,
      customerId: customer?.id ?? null,
    });
    if (!result.ok) {
      // Log but don't roll back the whole invoice — stock is already decremented, serials are advisory
      console.warn(`Serial-mark warning for invoice ${invoice.invoice_number}: ${result.error}`);
    }
  }

  revalidatePath('/admin');
  revalidatePath('/admin/invoices');
  return { ok: true as const, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number };
}
