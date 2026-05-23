import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, PackagePlus, Download } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatusActions from './StatusActions';

export default async function PODetailPage(props: { params: Promise<{ id: string }> }) {
  await requireUser(['admin', 'manager']);
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: po }, { data: settings }] = await Promise.all([
    supabase.from('purchase_orders').select('*').eq('id', id).single(),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  if (!po) notFound();
  const currency: Currency = (settings?.default_currency ?? 'INR') as Currency;

  const { data: lines } = await supabase
    .from('purchase_order_lines')
    .select('*')
    .eq('po_id', id)
    .order('created_at');

  const supplier = po.supplier_snapshot as any;

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/purchases/po" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to POs
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/api/purchases/po/${po.id}/pdf`} target="_blank" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            <Download className="h-4 w-4" /> PDF
          </Link>
          {(po.status === 'sent' || po.status === 'partial') && (
            <Link href={`/admin/purchases/grn/new?po=${po.id}`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <PackagePlus className="h-4 w-4 mr-1" /> Receive Goods
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-navy-900">{po.po_number}</h1>
        <StatusBadge status={po.status} />
        <span className="text-sm text-slate-500">{po.order_date}{po.expected_date ? ` · expected ${po.expected_date}` : ''}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500 mb-1">Supplier</div>
          <div className="font-semibold">{supplier?.name ?? '—'}</div>
          <div className="text-sm text-slate-500 space-y-0.5 mt-1">
            {supplier?.phone && <div>{supplier.phone}</div>}
            {supplier?.gstin && <div className="font-mono text-xs">{supplier.gstin}</div>}
            {supplier?.state && <div>{supplier.state} ({supplier.state_code})</div>}
          </div>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500 mb-1">Summary</div>
          <div className="text-2xl font-bold font-mono">{formatMoney(Number(po.grand_total), currency)}</div>
          <div className="text-xs text-slate-500 mt-1">
            {po.is_inter_state ? 'Inter-state — IGST' : 'Intra-state — CGST + SGST'}
          </div>
          <div className="mt-3">
            <StatusActions poId={po.id} status={po.status} />
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden mb-6">
        <div className="border-b px-4 py-3 font-semibold">Line items</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-right px-4 py-2 font-medium">Ordered</th>
                <th className="text-right px-4 py-2 font-medium">Received</th>
                <th className="text-right px-4 py-2 font-medium">Unit Cost</th>
                <th className="text-right px-4 py-2 font-medium">GST%</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(lines ?? []).map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{l.product_name}</div>
                    {l.hsn_code && <div className="text-xs text-slate-400">HSN {l.hsn_code}</div>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{Number(l.qty_ordered)}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    <span className={Number(l.qty_received) >= Number(l.qty_ordered) ? 'text-emerald-700' : Number(l.qty_received) > 0 ? 'text-amber-700' : 'text-slate-400'}>
                      {Number(l.qty_received)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(l.unit_cost), currency)}</td>
                  <td className="px-4 py-2 text-right">{l.gst_rate}%</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(l.line_total), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {po.notes && (
        <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700 border">
          <span className="text-xs uppercase text-slate-500 mr-2">Notes</span>{po.notes}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'draft' ? 'bg-slate-400' :
    status === 'sent' ? 'bg-blue-500' :
    status === 'partial' ? 'bg-amber-500' :
    status === 'received' ? 'bg-emerald-500' :
    'bg-red-400';
  return <Badge className={cls}>{status}</Badge>;
}
