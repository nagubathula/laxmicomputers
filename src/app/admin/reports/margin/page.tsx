import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';

export default async function MarginReport(props: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireUser(['admin', 'manager']);
  const { from, to } = await props.searchParams;
  const today = new Date();
  const fromDate = from ?? new Date(today.getTime() - 29 * 86400_000).toISOString().slice(0, 10);
  const toDate = to ?? today.toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: linesData }, { data: products }, { data: settings }] = await Promise.all([
    supabase
      .from('invoice_lines')
      .select('product_id, qty, taxable_amount, invoices!inner(invoice_date, status)')
      .gte('invoices.invoice_date', fromDate)
      .lte('invoices.invoice_date', toDate)
      .neq('invoices.status', 'cancelled'),
    supabase.from('products').select('id, name, category, cost_price'),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  const agg = new Map<string, { qty: number; revenue: number }>();
  for (const row of (linesData ?? []) as any[]) {
    const a = agg.get(row.product_id) ?? { qty: 0, revenue: 0 };
    a.qty += Number(row.qty);
    a.revenue += Number(row.taxable_amount);
    agg.set(row.product_id, a);
  }

  const rows = (products ?? []).map(p => {
    const a = agg.get(p.id) ?? { qty: 0, revenue: 0 };
    const cost = a.qty * Number(p.cost_price ?? 0);
    const margin = a.revenue - cost;
    const marginPct = a.revenue > 0 ? (margin / a.revenue) * 100 : 0;
    return { id: p.id, name: p.name, category: p.category, qty: a.qty, revenue: a.revenue, cost, margin, marginPct, hasCost: p.cost_price != null };
  }).filter(r => r.qty > 0).sort((a, b) => b.margin - a.margin);

  const totals = rows.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    cost: acc.cost + r.cost,
    margin: acc.margin + r.margin,
  }), { revenue: 0, cost: 0, margin: 0 });
  const totalPct = totals.revenue > 0 ? (totals.margin / totals.revenue) * 100 : 0;
  const missingCost = rows.filter(r => !r.hasCost).length;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-navy-900 mb-6">Margin by Product</h1>

      <form className="mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">From</label>
          <input type="date" name="from" defaultValue={fromDate} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">To</label>
          <input type="date" name="to" defaultValue={toDate} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <button className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm">Apply</button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Tile label="Revenue" value={formatMoney(totals.revenue, currency)} />
        <Tile label="Cost of goods" value={formatMoney(totals.cost, currency)} />
        <Tile label="Gross margin" value={formatMoney(totals.margin, currency)} highlight />
        <Tile label="Margin %" value={`${totalPct.toFixed(1)}%`} />
      </div>

      {missingCost > 0 && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          ⚠ {missingCost} product(s) sold without a cost_price set — their margin shows as full revenue. Set cost prices in product edit to fix.
        </div>
      )}

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-right px-4 py-2 font-medium">Qty</th>
                <th className="text-right px-4 py-2 font-medium">Revenue</th>
                <th className="text-right px-4 py-2 font-medium">Cost</th>
                <th className="text-right px-4 py-2 font-medium">Margin</th>
                <th className="text-right px-4 py-2 font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No sales in this range.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.name}</div>
                    {!r.hasCost && <div className="text-xs text-amber-700">cost_price missing</div>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{r.qty}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(r.revenue, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(r.cost, currency)}</td>
                  <td className={`px-4 py-2 text-right font-mono font-semibold ${r.margin < 0 ? 'text-red-600' : ''}`}>{formatMoney(r.margin, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.marginPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-4 ${highlight ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white'}`}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-xl font-bold font-mono">{value}</div>
    </div>
  );
}
