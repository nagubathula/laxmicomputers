import Link from 'next/link';
import { ArrowLeft, PlusCircle, Edit } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

export default async function SuppliersPage(props: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(['admin', 'manager']);
  const { q } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase.from('suppliers').select('*').order('name').limit(200);
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,gstin.ilike.%${q}%`);

  const { data: suppliers } = await query;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin/purchases" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Purchases
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Suppliers</h1>
          <p className="text-slate-500 mt-1">Vendors you buy from.</p>
        </div>
        <Link href="/admin/suppliers/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" /> Add Supplier
        </Link>
      </div>

      <form className="mb-4">
        <input name="q" defaultValue={q ?? ''} placeholder="Search by name, phone, or GSTIN…" className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </form>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">GSTIN</th>
                <th className="px-6 py-4 font-medium">State</th>
                <th className="px-6 py-4 font-medium">Terms</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!suppliers || suppliers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No suppliers yet.</td></tr>
              ) : suppliers.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50 ${!s.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 font-medium text-navy-900">
                    {s.name}
                    {!s.is_active && <Badge variant="outline" className="ml-2 text-xs">Inactive</Badge>}
                  </td>
                  <td className="px-6 py-4">
                    <div>{s.contact_person ?? '—'}</div>
                    <div className="text-xs text-slate-500 font-mono">{s.phone ?? ''}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{s.gstin ?? '—'}</td>
                  <td className="px-6 py-4">{s.state ?? '—'}{s.state_code ? ` (${s.state_code})` : ''}</td>
                  <td className="px-6 py-4 text-xs">{s.payment_terms ?? '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/suppliers/${s.id}/edit`} className="p-2 inline-flex text-slate-400 hover:text-blue-600 rounded-sm hover:bg-blue-50">
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
