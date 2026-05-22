import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/utils/supabase/server';
import { QuotePDF, type QuoteDoc } from '@/components/invoice/QuotePDF';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: quote, error } = await supabase.from('quotes').select('*').eq('id', id).single();
  if (error || !quote) return new NextResponse('Quote not found', { status: 404 });

  const { data: lines } = await supabase
    .from('quote_lines').select('*').eq('quote_id', id).order('created_at');

  const doc: QuoteDoc = {
    quote_number: quote.quote_number,
    quote_date: quote.quote_date,
    valid_until: quote.valid_until,
    currency: quote.currency,
    is_inter_state: quote.is_inter_state,
    subtotal: Number(quote.subtotal),
    cgst_total: Number(quote.cgst_total),
    sgst_total: Number(quote.sgst_total),
    igst_total: Number(quote.igst_total),
    discount_total: Number(quote.discount_total),
    grand_total: Number(quote.grand_total),
    notes: quote.notes,
    business_snapshot: quote.business_snapshot ?? {},
    customer_snapshot: quote.customer_snapshot ?? { name: 'Prospective customer' },
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

  const buffer = await renderToBuffer(<QuotePDF quote={doc} />);
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.quote_number.replace(/[\/]/g, '-')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
