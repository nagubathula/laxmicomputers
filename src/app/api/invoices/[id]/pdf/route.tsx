import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/utils/supabase/server';
import { InvoicePDF, type InvoiceDoc } from '@/components/invoice/InvoicePDF';

export const dynamic = 'force-dynamic';
// react-pdf needs the Node runtime (not Edge)
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !invoice) {
    return new NextResponse('Invoice not found', { status: 404 });
  }

  const { data: lines, error: linesError } = await supabase
    .from('invoice_lines')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at');

  if (linesError) {
    return new NextResponse('Failed to load invoice lines', { status: 500 });
  }

  const doc: InvoiceDoc = {
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    currency: invoice.currency,
    is_inter_state: invoice.is_inter_state,
    subtotal: Number(invoice.subtotal),
    cgst_total: Number(invoice.cgst_total),
    sgst_total: Number(invoice.sgst_total),
    igst_total: Number(invoice.igst_total),
    discount_total: Number(invoice.discount_total),
    round_off: Number(invoice.round_off),
    grand_total: Number(invoice.grand_total),
    amount_paid: Number(invoice.amount_paid),
    payment_method: invoice.payment_method,
    notes: invoice.notes,
    business_snapshot: invoice.business_snapshot ?? {},
    customer_snapshot: invoice.customer_snapshot ?? { name: 'Walk-in Customer' },
    lines: (lines ?? []).map((l: any) => ({
      product_name: l.product_name,
      hsn_code: l.hsn_code,
      qty: Number(l.qty),
      unit_price: Number(l.unit_price),
      discount_amount: Number(l.discount_amount),
      taxable_amount: Number(l.taxable_amount),
      gst_rate: Number(l.gst_rate),
      cgst_amount: Number(l.cgst_amount),
      sgst_amount: Number(l.sgst_amount),
      igst_amount: Number(l.igst_amount),
      line_total: Number(l.line_total),
    })),
  };

  const buffer = await renderToBuffer(<InvoicePDF invoice={doc} />);
  // renderToBuffer returns a Node Buffer; NextResponse wants BodyInit
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoice_number.replace(/[\/]/g, '-')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
