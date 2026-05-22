import Link from 'next/link';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function QuotesPage(props: { searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const { status } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('quotes')
    .select('id, quote_number, quote_date, valid_until, status, grand_total, currency, customer_snapshot')
    .order('quote_date', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status as any);

  const { data: quotes } = await query;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Quotes / Estimates</h1>
          <p className="text-slate-500 mt-1">Pre-sale estimates. Convert accepted quotes into invoices.</p>
        </div>
        <Link href="/admin/quotes/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" /> New Quote
        </Link>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap text-xs">
        <Link href="/admin/quotes" className={chipClass(!status)}>All</Link>
        {(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'] as const).map(s => (
          <Link key={s} href={`/admin/quotes?status=${s}`} className={chipClass(status === s)}>{s}</Link>
        ))}
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Number</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Valid until</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!quotes || quotes.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No quotes yet.</td></tr>
              ) : quotes.map(q => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono">
                    <Link href={`/admin/quotes/${q.id}`} className="font-medium hover:text-blue-600">{q.quote_number}</Link>
                  </td>
                  <td className="px-6 py-4">{q.quote_date}</td>
                  <td className="px-6 py-4">{(q.customer_snapshot as any)?.name ?? '—'}</td>
                  <td className="px-6 py-4">{q.valid_until ?? '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={q.status} /></td>
                  <td className="px-6 py-4 font-mono text-right">{formatMoney(Number(q.grand_total), (q.currency ?? 'INR') as Currency)}</td>
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
    draft: 'bg-slate-400', sent: 'bg-blue-500', accepted: 'bg-emerald-500',
    rejected: 'bg-red-400', expired: 'bg-slate-500', converted: 'bg-emerald-700',
  };
  return <Badge className={map[status] ?? 'bg-slate-400'}>{status}</Badge>;
}
