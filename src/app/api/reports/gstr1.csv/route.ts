import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Escape a value for CSV (RFC-4180). */
function csv(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  await requireUser(['admin', 'manager']);
  const supabase = await createClient();
  const url = new URL(req.url);
  const m = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  const [yy, mm] = m.split('-');
  const monthStart = `${yy}-${mm}-01`;
  const monthEndDate = new Date(Number(yy), Number(mm), 0);
  const monthEnd = monthEndDate.toISOString().slice(0, 10);

  // Load invoices in the month, with lines
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, currency, is_inter_state, subtotal, cgst_total, sgst_total, igst_total, grand_total, customer_snapshot')
    .gte('invoice_date', monthStart)
    .lte('invoice_date', monthEnd)
    .neq('status', 'cancelled')
    .order('invoice_date');

  if (error) return new NextResponse(`Failed: ${error.message}`, { status: 500 });

  const invoiceIds = (invoices ?? []).map(i => i.id);
  const { data: lines } = invoiceIds.length > 0
    ? await supabase
        .from('invoice_lines')
        .select('invoice_id, product_name, hsn_code, qty, unit_price, taxable_amount, gst_rate, cgst_amount, sgst_amount, igst_amount')
        .in('invoice_id', invoiceIds)
    : { data: [] };

  const linesByInvoice = new Map<string, any[]>();
  for (const l of (lines ?? [])) {
    const arr = linesByInvoice.get(l.invoice_id) ?? [];
    arr.push(l);
    linesByInvoice.set(l.invoice_id, arr);
  }

  // Header
  const headers = [
    'invoice_number', 'invoice_date', 'customer_name', 'customer_gstin', 'place_of_supply',
    'is_inter_state', 'product_name', 'hsn_code', 'qty', 'unit_price', 'taxable_amount',
    'gst_rate', 'cgst', 'sgst', 'igst', 'line_total',
  ];
  const rows: string[] = [headers.join(',')];

  for (const inv of invoices ?? []) {
    const cust = inv.customer_snapshot as any;
    const ils = linesByInvoice.get(inv.id) ?? [];
    for (const l of ils) {
      rows.push([
        csv(inv.invoice_number),
        csv(inv.invoice_date),
        csv(cust?.name ?? ''),
        csv(cust?.gstin ?? ''),
        csv([cust?.state, cust?.state_code].filter(Boolean).join(' ')),
        csv(inv.is_inter_state ? 'YES' : 'NO'),
        csv(l.product_name),
        csv(l.hsn_code ?? ''),
        csv(Number(l.qty)),
        csv(Number(l.unit_price).toFixed(2)),
        csv(Number(l.taxable_amount).toFixed(2)),
        csv(Number(l.gst_rate)),
        csv(Number(l.cgst_amount).toFixed(2)),
        csv(Number(l.sgst_amount).toFixed(2)),
        csv(Number(l.igst_amount).toFixed(2)),
        csv((Number(l.taxable_amount) + Number(l.cgst_amount) + Number(l.sgst_amount) + Number(l.igst_amount)).toFixed(2)),
      ].join(','));
    }
  }

  const body = '﻿' + rows.join('\r\n'); // BOM so Excel opens UTF-8 correctly
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="GSTR1-${m}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
