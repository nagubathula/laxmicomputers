import Link from 'next/link';
import { ArrowLeft, FileText, History } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { computeDayTotals } from './actions';
import ZReportForm from './ZReportForm';

export default async function ZReportPage(props: { searchParams: Promise<{ date?: string }> }) {
  await requireUser();
  const { date: dateParam } = await props.searchParams;
  const date = dateParam ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const [totalsResult, { data: existing }, { data: settings }, { data: history }] = await Promise.all([
    computeDayTotals(date),
    supabase.from('z_reports').select('id, z_number, closed_at').eq('report_date', date).order('closed_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
    supabase.from('z_reports').select('id, z_number, report_date, gross_total, variance').order('report_date', { ascending: false }).limit(5),
  ]);

  const currency = (settings?.default_currency ?? 'INR') as Currency;
  const totals = totalsResult.ok ? totalsResult.totals : null;

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
        <Link href="/admin/reports/zreport/history" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600">
          <History className="h-3.5 w-3.5" /> History
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy-900">Day-end / Z-report</h1>
        <p className="text-slate-500 mt-1">Reconcile the cash drawer at shift close.</p>
      </div>

      <form className="mb-4 flex items-end gap-2">
        <div>
          <label className="text-xs text-slate-500 block mb-1">For date</label>
          <input type="date" name="date" defaultValue={date} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <button className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm">Load</button>
      </form>

      {existing && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          A Z-report (<Link href={`/admin/reports/zreport/${existing.id}`} className="font-mono underline">{existing.z_number}</Link>) was already closed for {date}.
          Closing another will create a new entry — usually for multi-shift days.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Tile label="Invoices" value={String(totals?.count ?? 0)} />
        <Tile label="Net taxable" value={formatMoney(totals?.netTaxable ?? 0, currency)} />
        <Tile label="GST" value={formatMoney(totals?.gst ?? 0, currency)} />
        <Tile label="Gross" value={formatMoney(totals?.gross ?? 0, currency)} highlight />
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden mb-6">
        <div className="border-b px-4 py-3 font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" /> Payment method breakdown
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y">
            <Row label="Cash" value={formatMoney(totals?.cash ?? 0, currency)} />
            <Row label="UPI" value={formatMoney(totals?.upi ?? 0, currency)} />
            <Row label="Card" value={formatMoney(totals?.card ?? 0, currency)} />
            <Row label="Bank transfer" value={formatMoney(totals?.bank ?? 0, currency)} />
            <Row label="On credit" value={formatMoney(totals?.credit ?? 0, currency)} muted />
          </tbody>
        </table>
      </div>

      <ZReportForm date={date} currency={currency} cashSales={totals?.cash ?? 0} />

      {history && history.length > 0 && (
        <div className="mt-8 rounded-md border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-4 py-3 font-semibold">Recent closes</div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {history.map(z => (
                <tr key={z.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/admin/reports/zreport/${z.id}`} className="hover:text-blue-600">{z.z_number}</Link>
                  </td>
                  <td className="px-4 py-2">{z.report_date}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(z.gross_total), currency)}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    <span className={Number(z.variance) === 0 ? 'text-emerald-700' : Number(z.variance) > 0 ? 'text-blue-700' : 'text-red-700'}>
                      {Number(z.variance) > 0 ? '+' : ''}{formatMoney(Number(z.variance), currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? 'bg-navy-900 text-white border-navy-900' : 'bg-white'}`}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-lg font-bold font-mono">{value}</div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <tr>
      <td className={`px-4 py-2 ${muted ? 'text-slate-400' : ''}`}>{label}</td>
      <td className={`px-4 py-2 font-mono text-right ${muted ? 'text-slate-400' : ''}`}>{value}</td>
    </tr>
  );
}
