import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';

export default async function GSTR1Report(props: { searchParams: Promise<{ month?: string }> }) {
  await requireUser(['admin', 'manager']);
  const { month } = await props.searchParams;
  const m = month ?? new Date().toISOString().slice(0, 7); // YYYY-MM
  const [yy, mm] = m.split('-');
  const monthStart = `${yy}-${mm}-01`;
  const monthEndDate = new Date(Number(yy), Number(mm), 0); // last day of month
  const monthEnd = monthEndDate.toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: lines }, { data: settings }] = await Promise.all([
    supabase
      .from('invoice_lines')
      .select('gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, invoices!inner(invoice_date, status, is_inter_state, customer_snapshot)')
      .gte('invoices.invoice_date', monthStart)
      .lte('invoices.invoice_date', monthEnd)
      .neq('invoices.status', 'cancelled'),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  type Agg = { taxable: number; cgst: number; sgst: number; igst: number; lines: number };
  const b2b = new Map<number, Agg>(); // rate → agg
  const b2c = new Map<number, Agg>();

  for (const row of (lines ?? []) as any[]) {
    const inv = row.invoices;
    const hasGstin = !!inv?.customer_snapshot?.gstin;
    const bucket = hasGstin ? b2b : b2c;
    const rate = Number(row.gst_rate ?? 0);
    const a = bucket.get(rate) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0, lines: 0 };
    a.taxable += Number(row.taxable_amount);
    a.cgst += Number(row.cgst_amount);
    a.sgst += Number(row.sgst_amount);
    a.igst += Number(row.igst_amount);
    a.lines += 1;
    bucket.set(rate, a);
  }

  const renderTable = (map: Map<number, Agg>, label: string) => {
    const rows = Array.from(map.entries()).sort(([a], [b]) => a - b);
    const totals = rows.reduce((acc, [, v]) => ({
      taxable: acc.taxable + v.taxable, cgst: acc.cgst + v.cgst, sgst: acc.sgst + v.sgst, igst: acc.igst + v.igst, lines: acc.lines + v.lines,
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, lines: 0 });
    return (
      <div className="rounded-md border bg-white shadow-sm overflow-hidden mb-6">
        <div className="border-b px-4 py-3 font-semibold">{label}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-right px-4 py-2 font-medium">Tax Rate</th>
                <th className="text-right px-4 py-2 font-medium">Lines</th>
                <th className="text-right px-4 py-2 font-medium">Taxable</th>
                <th className="text-right px-4 py-2 font-medium">CGST</th>
                <th className="text-right px-4 py-2 font-medium">SGST</th>
                <th className="text-right px-4 py-2 font-medium">IGST</th>
                <th className="text-right px-4 py-2 font-medium">Total tax</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No data.</td></tr>
              ) : rows.map(([rate, v]) => (
                <tr key={rate} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-right">{rate}%</td>
                  <td className="px-4 py-2 text-right font-mono">{v.lines}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(v.taxable, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(v.cgst, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(v.sgst, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(v.igst, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">{formatMoney(v.cgst + v.sgst + v.igst, currency)}</td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-2 text-right">Total</td>
                  <td className="px-4 py-2 text-right font-mono">{totals.lines}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(totals.taxable, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(totals.cgst, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(totals.sgst, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(totals.igst, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(totals.cgst + totals.sgst + totals.igst, currency)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-navy-900">GSTR-1 Summary</h1>
        <Link
          href={`/api/reports/gstr1.csv?month=${m}`}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Download className="h-4 w-4" /> Download CSV
        </Link>
      </div>

      <form className="mb-6 flex items-end gap-2">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Month</label>
          <input type="month" name="month" defaultValue={m} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <button className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm">Apply</button>
      </form>

      {renderTable(b2b, 'B2B (with customer GSTIN)')}
      {renderTable(b2c, 'B2C (no GSTIN)')}

      <p className="text-xs text-slate-500 mt-2">
        Summary aggregates only — for actual GSTR-1 filing your accountant needs invoice-wise data (B2B section). The CSV download includes the full per-invoice breakdown.
      </p>
    </div>
  );
}
