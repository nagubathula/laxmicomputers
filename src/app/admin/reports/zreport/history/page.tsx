import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';

export default async function ZReportHistory() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: rows }, { data: settings }] = await Promise.all([
    supabase.from('z_reports').select('id, z_number, report_date, invoice_count, gross_total, cash_sales, variance, closed_at').order('report_date', { ascending: false }).order('closed_at', { ascending: false }).limit(200),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin/reports/zreport" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Z-report
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Z-report History</h1>
        <p className="text-slate-500 mt-1">All past shift-close records.</p>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Z #</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Closed at</th>
                <th className="text-right px-4 py-3 font-medium">Invoices</th>
                <th className="text-right px-4 py-3 font-medium">Cash sales</th>
                <th className="text-right px-4 py-3 font-medium">Gross</th>
                <th className="text-right px-4 py-3 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!rows || rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No Z-reports yet.</td></tr>
              ) : rows.map(z => (
                <tr key={z.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono"><Link href={`/admin/reports/zreport/${z.id}`} className="hover:text-blue-600 font-medium">{z.z_number}</Link></td>
                  <td className="px-4 py-2">{z.report_date}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{new Date(z.closed_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono">{z.invoice_count}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(z.cash_sales), currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(z.gross_total), currency)}</td>
                  <td className={`px-4 py-2 text-right font-mono ${Number(z.variance) === 0 ? 'text-emerald-700' : Number(z.variance) > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {Number(z.variance) > 0 ? '+' : ''}{formatMoney(Number(z.variance), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
