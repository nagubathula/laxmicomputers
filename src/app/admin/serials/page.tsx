import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function SerialsPage(props: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireUser();
  const { q, status } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('product_serials')
    .select(`
      id, serial_number, status, received_at, sold_at, unit_cost, notes,
      products(id, name),
      customers(id, name, phone),
      invoices(id, invoice_number),
      goods_receipts(id, grn_number)
    `)
    .order('received_at', { ascending: false })
    .limit(200);

  if (q) query = query.ilike('serial_number', `%${q}%`);
  if (status) query = query.eq('status', status as any);

  const [{ data: serials, error }, { data: settings }] = await Promise.all([
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Serial Number Lookup</h1>
        <p className="text-slate-500 mt-1">Warranty checks, sold-unit history. Type any serial below.</p>
      </div>

      <form className="mb-4">
        <div className="relative max-w-xl">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Enter or scan a serial number…"
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10 font-mono"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
      </form>

      <div className="mb-4 flex gap-2 flex-wrap text-xs">
        <Link href="/admin/serials" className={chipClass(!status)}>All</Link>
        <Link href="/admin/serials?status=available" className={chipClass(status === 'available')}>Available</Link>
        <Link href="/admin/serials?status=sold" className={chipClass(status === 'sold')}>Sold</Link>
        <Link href="/admin/serials?status=in_service" className={chipClass(status === 'in_service')}>In service</Link>
        <Link href="/admin/serials?status=returned" className={chipClass(status === 'returned')}>Returned</Link>
        <Link href="/admin/serials?status=damaged" className={chipClass(status === 'damaged')}>Damaged</Link>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Serial</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">GRN</th>
                <th className="px-4 py-3 font-medium">Sold to</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium text-right">Unit cost</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!serials || serials.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">{q ? `No serials match "${q}".` : 'No serials yet — receive serial-tracked products via GRN.'}</td></tr>
              ) : serials.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium">{s.serial_number}</td>
                  <td className="px-4 py-3">
                    {s.products?.id ? (
                      <Link href={`/admin/products/${s.products.id}/edit`} className="hover:text-blue-600">{s.products.name}</Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.received_at ? new Date(s.received_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{s.goods_receipts?.grn_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.customers?.id ? (
                      <Link href={`/admin/customers/${s.customers.id}/edit`} className="hover:text-blue-600">
                        {s.customers.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">
                    {s.invoices?.id ? (
                      <Link href={`/api/invoices/${s.invoices.id}/pdf`} target="_blank" className="hover:text-blue-600">
                        {s.invoices.invoice_number}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{s.unit_cost != null ? formatMoney(Number(s.unit_cost), currency) : '—'}</td>
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
    available: 'bg-emerald-500',
    sold: 'bg-blue-500',
    in_service: 'bg-amber-500',
    returned: 'bg-slate-500',
    damaged: 'bg-red-500',
  };
  return <Badge className={map[status] ?? 'bg-slate-400'}>{status.replace('_', ' ')}</Badge>;
}
