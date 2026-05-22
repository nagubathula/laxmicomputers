import Link from 'next/link';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function POListPage(props: { searchParams: Promise<{ status?: string }> }) {
  await requireUser(['admin', 'manager']);
  const { status } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('purchase_orders')
    .select('id, po_number, order_date, expected_date, status, grand_total, supplier_snapshot')
    .order('order_date', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status as any);

  const [{ data: pos }, { data: settings }] = await Promise.all([
    query,
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency: Currency = (settings?.default_currency ?? 'INR') as Currency;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin/purchases" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Purchases
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Purchase Orders</h1>
        </div>
        <Link href="/admin/purchases/po/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" /> New PO
        </Link>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {(['', 'draft', 'sent', 'partial', 'received', 'cancelled'] as const).map(s => (
          <Link
            key={s}
            href={`/admin/purchases/po${s ? `?status=${s}` : ''}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
              (status ?? '') === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s || 'All'}
          </Link>
        ))}
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Number</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Expected</th>
                <th className="px-6 py-4 font-medium">Supplier</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!pos || pos.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No purchase orders.</td></tr>
              ) : pos.map(po => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono">
                    <Link href={`/admin/purchases/po/${po.id}`} className="hover:text-blue-600 font-medium">{po.po_number}</Link>
                  </td>
                  <td className="px-6 py-4">{po.order_date}</td>
                  <td className="px-6 py-4">{po.expected_date ?? '—'}</td>
                  <td className="px-6 py-4">{(po.supplier_snapshot as any)?.name ?? '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={po.status} /></td>
                  <td className="px-6 py-4 font-mono text-right">{formatMoney(Number(po.grand_total), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
