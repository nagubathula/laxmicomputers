import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';

export default async function DailySalesReport(props: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireUser(['admin', 'manager']);
  const { from, to } = await props.searchParams;
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 29 * 86400_000).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);
  const fromDate = from ?? defaultFrom;
  const toDate = to ?? defaultTo;

  const supabase = await createClient();
  const [{ data: rows }, { data: settings }] = await Promise.all([
    supabase.from('v_daily_sales').select('*').gte('day', fromDate).lte('day', toDate),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  const totals = (rows ?? []).reduce((acc, r) => ({
    invoiceCount: acc.invoiceCount + Number(r.invoice_count ?? 0),
    subtotal: acc.subtotal + Number(r.subtotal ?? 0),
    tax: acc.tax + Number(r.tax_total ?? 0),
    grand: acc.grand + Number(r.grand_total ?? 0),
    cash: acc.cash + Number(r.cash_total ?? 0),
    upi: acc.upi + Number(r.upi_total ?? 0),
    card: acc.card + Number(r.card_total ?? 0),
    bank: acc.bank + Number(r.bank_total ?? 0),
    credit: acc.credit + Number(r.credit_total ?? 0),
  }), { invoiceCount: 0, subtotal: 0, tax: 0, grand: 0, cash: 0, upi: 0, card: 0, bank: 0, credit: 0 });

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-navy-900 mb-6">Daily Sales Summary</h1>

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
        <Tile label="Invoices" value={String(totals.invoiceCount)} />
        <Tile label="Net (taxable)" value={formatMoney(totals.subtotal, currency)} />
        <Tile label="GST" value={formatMoney(totals.tax, currency)} />
        <Tile label="Grand total" value={formatMoney(totals.grand, currency)} highlight />
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Day</th>
                <th className="text-right px-4 py-2 font-medium">Invoices</th>
                <th className="text-right px-4 py-2 font-medium">Net</th>
                <th className="text-right px-4 py-2 font-medium">GST</th>
                <th className="text-right px-4 py-2 font-medium">Cash</th>
                <th className="text-right px-4 py-2 font-medium">UPI</th>
                <th className="text-right px-4 py-2 font-medium">Card</th>
                <th className="text-right px-4 py-2 font-medium">Bank/Credit</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!rows || rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No sales in this range.</td></tr>
              ) : rows.map(r => (
                <tr key={r.day} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono">{r.day}</td>
                  <td className="px-4 py-2 text-right font-mono">{Number(r.invoice_count)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(r.subtotal), currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(r.tax_total), currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(r.cash_total), currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(r.upi_total), currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(r.card_total), currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(r.bank_total) + Number(r.credit_total), currency)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">{formatMoney(Number(r.grand_total), currency)}</td>
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
    <div className={`rounded-md border p-4 ${highlight ? 'bg-navy-900 text-white border-navy-900' : 'bg-white'}`}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-xl font-bold font-mono">{value}</div>
    </div>
  );
}
