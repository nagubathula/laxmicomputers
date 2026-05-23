import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/utils/supabase/server';
import { DeliveryChallanPDF, type DCDoc } from '@/components/invoice/DeliveryChallanPDF';
import type { Currency } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: dc, error } = await supabase.from('delivery_challans').select('*').eq('id', id).single();
  if (error || !dc) return new NextResponse('Delivery Challan not found', { status: 404 });

  const { data: lines } = await supabase
    .from('delivery_challan_lines').select('*').eq('dc_id', id).order('created_at');

  const { data: settings } = await supabase
    .from('business_settings').select('default_currency').eq('id', 1).single();
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  const doc: DCDoc = {
    dc_number: dc.dc_number,
    dc_date: dc.dc_date,
    reason: dc.reason,
    vehicle_number: dc.vehicle_number,
    transport_mode: dc.transport_mode,
    lr_number: dc.lr_number,
    goods_value: Number(dc.goods_value),
    notes: dc.notes,
    business_snapshot: dc.business_snapshot ?? {},
    customer_snapshot: dc.customer_snapshot ?? { name: 'Self / not specified' },
    lines: (lines ?? []).map((l: any) => ({
      product_name: l.product_name,
      hsn_code: l.hsn_code,
      qty: Number(l.qty),
      unit_price: Number(l.unit_price),
      line_total: Number(l.line_total),
    })),
  };

  const buffer = await renderToBuffer(<DeliveryChallanPDF dc={doc} currency={currency} />);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${dc.dc_number.replace(/[\/]/g, '-')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
