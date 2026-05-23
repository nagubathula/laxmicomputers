import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/utils/supabase/server';
import { POPDF, type PODoc } from '@/components/invoice/POPDF';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: po, error } = await supabase.from('purchase_orders').select('*').eq('id', id).single();
  if (error || !po) return new NextResponse('Purchase Order not found', { status: 404 });

  const { data: lines } = await supabase
    .from('purchase_order_lines').select('*').eq('po_id', id).order('created_at');

  const { data: settings } = await supabase
    .from('business_settings').select('legal_name, gstin, pan, address_line1, address_line2, city, state, state_code, pincode, phone, email, default_currency').eq('id', 1).single();

  // Compose business snapshot from current settings (POs don't store one)
  const business_snapshot = settings ? {
    legal_name: settings.legal_name, gstin: settings.gstin, pan: settings.pan,
    address_line1: settings.address_line1, address_line2: settings.address_line2,
    city: settings.city, state: settings.state, state_code: settings.state_code,
    pincode: settings.pincode, phone: settings.phone, email: settings.email,
  } : {};

  const doc: PODoc = {
    po_number: po.po_number,
    order_date: po.order_date,
    expected_date: po.expected_date,
    status: po.status,
    currency: settings?.default_currency ?? 'INR',
    is_inter_state: po.is_inter_state,
    subtotal: Number(po.subtotal),
    cgst_total: Number(po.cgst_total),
    sgst_total: Number(po.sgst_total),
    igst_total: Number(po.igst_total),
    grand_total: Number(po.grand_total),
    notes: po.notes,
    supplier_snapshot: po.supplier_snapshot ?? {},
    business_snapshot,
    lines: (lines ?? []).map((l: any) => ({
      product_name: l.product_name,
      hsn_code: l.hsn_code,
      qty_ordered: Number(l.qty_ordered),
      unit_cost: Number(l.unit_cost),
      gst_rate: Number(l.gst_rate),
      taxable_amount: Number(l.taxable_amount),
      cgst_amount: Number(l.cgst_amount),
      sgst_amount: Number(l.sgst_amount),
      igst_amount: Number(l.igst_amount),
      line_total: Number(l.line_total),
    })),
  };

  const buffer = await renderToBuffer(<POPDF po={doc} />);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${po.po_number.replace(/[\/]/g, '-')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
