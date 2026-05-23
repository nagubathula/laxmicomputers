import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import DCActions from './DCActions';

export default async function DCDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: dc }, { data: settings }] = await Promise.all([
    supabase.from('delivery_challans').select('*').eq('id', id).single(),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  if (!dc) notFound();
  const { data: lines } = await supabase.from('delivery_challan_lines').select('*').eq('dc_id', id).order('created_at');
  const currency = (settings?.default_currency ?? 'INR') as Currency;
  const customer = dc.customer_snapshot as any;

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/delivery" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Deliveries
        </Link>
        <Link href={`/api/delivery/${dc.id}/pdf`} target="_blank" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          <Download className="h-4 w-4" /> PDF
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-navy-900">{dc.dc_number}</h1>
        <StatusBadge status={dc.status} />
        <span className="text-sm text-slate-500">{dc.dc_date} · {dc.reason.replace('_', ' ')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500 mb-1">Consignee</div>
          <div className="font-semibold">{customer?.name ?? '—'}</div>
          {customer?.phone && <div className="text-sm text-slate-500">{customer.phone}</div>}
          {customer?.gstin && <div className="text-xs text-slate-400 font-mono">{customer.gstin}</div>}
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500 mb-1">Transport</div>
          <div className="text-sm">Mode: <span className="font-medium">{dc.transport_mode ?? '—'}</span></div>
          {dc.vehicle_number && <div className="text-sm">Vehicle: <span className="font-mono">{dc.vehicle_number}</span></div>}
          {dc.lr_number && <div className="text-sm">LR #: <span className="font-mono">{dc.lr_number}</span></div>}
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500 mb-1">Goods value</div>
          <div className="text-2xl font-bold font-mono">{formatMoney(Number(dc.goods_value), currency)}</div>
          <div className="text-xs text-slate-500 mt-1">Excludes GST</div>
          {dc.converted_invoice_id && (
            <Link href={`/api/invoices/${dc.converted_invoice_id}/pdf`} target="_blank" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
              View invoice →
            </Link>
          )}
        </div>
      </div>

      <DCActions dcId={dc.id} status={dc.status} />

      <div className="rounded-md border bg-white shadow-sm overflow-hidden my-6">
        <div className="border-b px-4 py-3 font-semibold">Items dispatched</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-right px-4 py-2 font-medium">Qty</th>
                <th className="text-right px-4 py-2 font-medium">Unit value</th>
                <th className="text-right px-4 py-2 font-medium">Line</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(lines ?? []).map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{l.product_name}</div>
                    {l.hsn_code && <div className="text-xs text-slate-400">HSN {l.hsn_code}</div>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{Number(l.qty)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(l.unit_price), currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(l.line_total), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dc.notes && (
        <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700 border">
          <span className="text-xs uppercase text-slate-500 mr-2">Notes</span>{dc.notes}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-blue-500', delivered: 'bg-emerald-500', invoiced: 'bg-emerald-700', cancelled: 'bg-red-400',
  };
  return <Badge className={map[status] ?? 'bg-slate-400'}>{status}</Badge>;
}
