import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import CustomerForm from '../../CustomerForm';

export default async function EditCustomerPage(props: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: customer, error }, { data: invoices }, { data: settings }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('invoices').select('id, invoice_number, invoice_date, grand_total, status, currency').eq('customer_id', id).order('invoice_date', { ascending: false }).limit(50),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  if (error || !customer) notFound();
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  const lifetimeValue = (invoices ?? [])
    .filter(inv => inv.status !== 'cancelled')
    .reduce((s, inv) => s + Number(inv.grand_total), 0);

  return (
    <div>
      <CustomerForm initial={customer} />

      <div className="container mx-auto px-6 lg:px-10 max-w-3xl pb-10">
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-5 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-navy-900">Purchase history</h2>
              <p className="text-xs text-slate-500">Lifetime value: <span className="font-mono font-semibold">{formatMoney(lifetimeValue, currency)}</span> across {invoices?.length ?? 0} invoices</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Invoice</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!invoices || invoices.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No purchases yet.</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono">
                      <Link href={`/api/invoices/${inv.id}/pdf`} target="_blank" className="hover:text-blue-600">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{inv.invoice_date}</td>
                    <td className="px-4 py-2 text-xs capitalize">{inv.status}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatMoney(Number(inv.grand_total), (inv.currency ?? 'INR') as Currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
