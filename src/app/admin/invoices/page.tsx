import Link from 'next/link';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function InvoicesPage(props: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, grand_total, currency, status, payment_method, customer_snapshot')
    .order('invoice_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (q) query = query.ilike('invoice_number', `%${q}%`);

  const { data: invoices, error } = await query;
  if (error) console.error('invoices fetch error:', error);

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Invoices</h1>
          <p className="text-slate-500 mt-1">All sales. Click any invoice to download the PDF.</p>
        </div>
        <Link href="/admin/pos" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm">
          New sale (POS)
        </Link>
      </div>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search invoice number…"
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </form>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice #</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Payment</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
                <th className="px-6 py-4 font-medium text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!invoices || invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No invoices yet.</td></tr>
              ) : invoices.map((inv) => {
                const c = (inv.currency ?? 'INR') as Currency;
                const customerName = (inv.customer_snapshot as any)?.name ?? '—';
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-medium">
                      <Link href={`/api/invoices/${inv.id}/pdf`} target="_blank" className="hover:text-blue-600">{inv.invoice_number}</Link>
                    </td>
                    <td className="px-6 py-4">{inv.invoice_date}</td>
                    <td className="px-6 py-4">{customerName}</td>
                    <td className="px-6 py-4 capitalize">{inv.payment_method?.replace('_', ' ') ?? '—'}</td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          inv.status === 'paid' ? 'bg-emerald-500' :
                          inv.status === 'issued' ? 'bg-blue-500' :
                          inv.status === 'cancelled' ? 'bg-slate-400' :
                          inv.status === 'refunded' ? 'bg-amber-500' :
                          'bg-slate-300'
                        }
                      >{inv.status}</Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-right">{formatMoney(Number(inv.grand_total), c)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/api/invoices/${inv.id}/pdf`} target="_blank" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                        <Download className="h-3 w-3" /> PDF
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
