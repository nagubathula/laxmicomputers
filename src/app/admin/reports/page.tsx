import Link from 'next/link';
import { ArrowLeft, CalendarRange, TrendingUp, Coins, FileSpreadsheet, Banknote } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { formatMoney, type Currency } from '@/lib/money';

export default async function ReportsHub() {
  await requireUser(['admin', 'manager']);
  const supabase = await createClient();

  const todayIso = new Date().toISOString().slice(0, 10);
  const [{ data: today }, { data: settings }] = await Promise.all([
    supabase.from('v_daily_sales').select('*').eq('day', todayIso).maybeSingle(),
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
        <h1 className="text-3xl font-bold text-navy-900">Reports</h1>
        <p className="text-slate-500 mt-1">Sales, inventory, and tax reporting.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KPI label="Today's sales" value={formatMoney(Number(today?.grand_total ?? 0), currency)} sub={`${Number(today?.invoice_count ?? 0)} invoices`} />
        <KPI label="GST collected today" value={formatMoney(Number(today?.tax_total ?? 0), currency)} sub="CGST+SGST+IGST" />
        <KPI label="Cash today" value={formatMoney(Number(today?.cash_total ?? 0), currency)} sub={`UPI ${formatMoney(Number(today?.upi_total ?? 0), currency)}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/reports/daily" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <CalendarRange className="h-6 w-6 text-blue-600 mb-2" />
          <div className="font-semibold">Daily Sales Summary</div>
          <div className="text-sm text-slate-500">Per-day revenue, invoice count, tax, and payment-method split.</div>
        </Link>
        <Link href="/admin/reports/products" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <TrendingUp className="h-6 w-6 text-emerald-600 mb-2" />
          <div className="font-semibold">Top Sellers / Slow Movers</div>
          <div className="text-sm text-slate-500">Ranked product list for a chosen period.</div>
        </Link>
        <Link href="/admin/reports/margin" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <Coins className="h-6 w-6 text-amber-600 mb-2" />
          <div className="font-semibold">Margin by Product</div>
          <div className="text-sm text-slate-500">Cost vs. sale price. Requires cost_price set on products.</div>
        </Link>
        <Link href="/admin/reports/gstr1" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <FileSpreadsheet className="h-6 w-6 text-purple-600 mb-2" />
          <div className="font-semibold">GSTR-1 Export (CSV)</div>
          <div className="text-sm text-slate-500">Monthly B2B / B2C output by tax rate. CSV for your accountant.</div>
        </Link>
        <Link href="/admin/reports/zreport" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <Banknote className="h-6 w-6 text-emerald-600 mb-2" />
          <div className="font-semibold">Day-end / Z-report</div>
          <div className="text-sm text-slate-500">Close the shift and reconcile the cash drawer. Printable summary.</div>
        </Link>
      </div>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border bg-white p-5 shadow-sm">
      <div className="text-xs uppercase text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold font-mono text-navy-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
