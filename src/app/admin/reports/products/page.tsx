import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function ProductSalesReport(props: {
  searchParams: Promise<{ from?: string; to?: string; sort?: string; days?: string }>;
}) {
  await requireUser(['admin', 'manager']);
  const { from, to, sort, days } = await props.searchParams;
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 89 * 86400_000).toISOString().slice(0, 10);
  const fromDate = from ?? defaultFrom;
  const toDate = to ?? today.toISOString().slice(0, 10);
  const slowDays = Number(days ?? 60);

  const supabase = await createClient();

  // Pull invoice_lines joined with invoices in the period and aggregate in JS
  // (cheaper to keep this single shop query than a per-period SQL view)
  const [{ data: linesData }, { data: products }, { data: settings }] = await Promise.all([
    supabase
      .from('invoice_lines')
      .select('product_id, qty, taxable_amount, invoices!inner(invoice_date, status)')
      .gte('invoices.invoice_date', fromDate)
      .lte('invoices.invoice_date', toDate)
      .neq('invoices.status', 'cancelled'),
    supabase.from('products').select('id, name, category, stock_qty, cost_price, price'),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  const agg = new Map<string, { qty: number; revenue: number; lastSold: string | null }>();
  for (const row of (linesData ?? []) as any[]) {
    const pid = row.product_id;
    if (!pid) continue;
    const a = agg.get(pid) ?? { qty: 0, revenue: 0, lastSold: null };
    a.qty += Number(row.qty);
    a.revenue += Number(row.taxable_amount);
    const d = row.invoices?.invoice_date;
    if (d && (!a.lastSold || d > a.lastSold)) a.lastSold = d;
    agg.set(pid, a);
  }

  const rows = (products ?? []).map(p => {
    const a = agg.get(p.id) ?? { qty: 0, revenue: 0, lastSold: null };
    const margin = a.revenue - a.qty * Number(p.cost_price ?? 0);
    return {
      id: p.id, name: p.name, category: p.category,
      stock: Number(p.stock_qty ?? 0),
      qty: a.qty, revenue: a.revenue, margin,
      lastSold: a.lastSold,
    };
  });

  // Sort
  const sortKey = sort ?? 'revenue_desc';
  rows.sort((a, b) => {
    switch (sortKey) {
      case 'qty_desc': return b.qty - a.qty;
      case 'qty_asc': return a.qty - b.qty;
      case 'revenue_asc': return a.revenue - b.revenue;
      case 'revenue_desc': default: return b.revenue - a.revenue;
    }
  });

  // Slow movers = no sale within slowDays
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - slowDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const slow = rows.filter(r => !r.lastSold || r.lastSold < cutoffIso).filter(r => r.stock > 0).slice(0, 50);

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-navy-900 mb-6">Top Sellers / Slow Movers</h1>

      <form className="mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">From</label>
          <input type="date" name="from" defaultValue={fromDate} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">To</label>
          <input type="date" name="to" defaultValue={toDate} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Sort by</label>
          <select name="sort" defaultValue={sortKey} className="rounded-md border px-3 py-2 text-sm">
            <option value="revenue_desc">Revenue ↓</option>
            <option value="revenue_asc">Revenue ↑</option>
            <option value="qty_desc">Qty ↓</option>
            <option value="qty_asc">Qty ↑</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Slow-mover threshold (days)</label>
          <input type="number" name="days" defaultValue={slowDays} className="rounded-md border px-3 py-2 text-sm w-28" />
        </div>
        <button className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm">Apply</button>
      </form>

      <h2 className="text-lg font-semibold text-navy-900 mb-2 mt-6">Top 50 sellers</h2>
      <div className="rounded-md border bg-white shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-right px-4 py-2 font-medium">Qty sold</th>
                <th className="text-right px-4 py-2 font-medium">Revenue</th>
                <th className="text-right px-4 py-2 font-medium">Margin</th>
                <th className="text-right px-4 py-2 font-medium">Stock</th>
                <th className="text-left px-4 py-2 font-medium">Last sold</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.slice(0, 50).map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{r.category}</Badge></td>
                  <td className="px-4 py-2 text-right font-mono">{r.qty}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(r.revenue, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(r.margin, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.stock}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.lastSold ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-navy-900 mb-2">Slow movers (in stock, no sale in {slowDays} days)</h2>
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-right px-4 py-2 font-medium">Stock</th>
                <th className="text-left px-4 py-2 font-medium">Last sold</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {slow.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No slow movers — nice!</td></tr>
              ) : slow.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.stock}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.lastSold ?? 'never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
