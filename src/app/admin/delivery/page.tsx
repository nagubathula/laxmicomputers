import Link from 'next/link';
import { ArrowLeft, PlusCircle, Truck } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function DeliveryListPage(props: { searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const { status } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('delivery_challans')
    .select('id, dc_number, dc_date, status, reason, goods_value, customer_snapshot, vehicle_number')
    .order('dc_date', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status as any);

  const [{ data: rows }, { data: settings }] = await Promise.all([
    query,
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 flex items-center gap-2">
            <Truck className="h-7 w-7 text-blue-600" /> Delivery Challans
          </h1>
          <p className="text-slate-500 mt-1">Goods out — no GST. Invoice can follow later.</p>
        </div>
        <Link href="/admin/delivery/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" /> New Delivery Challan
        </Link>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap text-xs">
        <Link href="/admin/delivery" className={chipClass(!status)}>All</Link>
        {(['open', 'delivered', 'invoiced', 'cancelled'] as const).map(s => (
          <Link key={s} href={`/admin/delivery?status=${s}`} className={chipClass(status === s)}>{s}</Link>
        ))}
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">DC #</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Consignee</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Vehicle</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Goods value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!rows || rows.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No delivery challans yet.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono"><Link href={`/admin/delivery/${r.id}`} className="font-medium hover:text-blue-600">{r.dc_number}</Link></td>
                  <td className="px-6 py-4">{r.dc_date}</td>
                  <td className="px-6 py-4">{(r.customer_snapshot as any)?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-xs capitalize">{r.reason.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-xs font-mono">{r.vehicle_number ?? '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-4 font-mono text-right">{formatMoney(Number(r.goods_value), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function chipClass(active: boolean) {
  return `px-3 py-1.5 rounded-md font-medium border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50'}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-blue-500',
    delivered: 'bg-emerald-500',
    invoiced: 'bg-emerald-700',
    cancelled: 'bg-red-400',
  };
  return <Badge className={map[status] ?? 'bg-slate-400'}>{status}</Badge>;
}
