import Link from 'next/link';
import { ArrowLeft, PlusCircle, Edit } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { Badge } from '@/components/ui/badge';

export default async function CustomersPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(200);
  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,gstin.ilike.%${q}%`);
  }
  const { data: customers, error } = await query;
  if (error) console.error('customers fetch error:', error);

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Customers</h1>
          <p className="text-slate-500 mt-1">Walk-in and B2B customers. GSTIN required for B2B invoices.</p>
        </div>
        <Link href="/admin/customers/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" /> Add Customer
        </Link>
      </div>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name, phone, or GSTIN..."
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </form>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">GSTIN</th>
                <th className="px-6 py-4 font-medium">State</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!customers || customers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No customers found.</td></tr>
              ) : customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-navy-900">
                    {c.name}
                    {c.gstin && <Badge variant="outline" className="ml-2 text-xs">B2B</Badge>}
                  </td>
                  <td className="px-6 py-4 font-mono">{c.phone ?? '—'}</td>
                  <td className="px-6 py-4 font-mono text-xs">{c.gstin ?? '—'}</td>
                  <td className="px-6 py-4">{c.state ?? '—'}{c.state_code ? ` (${c.state_code})` : ''}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/customers/${c.id}/edit`} className="p-2 inline-flex text-slate-400 hover:text-blue-600 rounded-sm hover:bg-blue-50" title="Edit">
                      <Edit className="h-4 w-4" />
                    </Link>
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
