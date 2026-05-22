import Link from 'next/link';
import { ArrowLeft, PlusCircle, Wrench } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

const STATUS_ORDER = ['received', 'diagnosed', 'awaiting_parts', 'in_progress', 'ready', 'delivered', 'cancelled'] as const;

export default async function ServiceBoard(props: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireUser();
  const { status, q } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('service_tickets')
    .select('id, ticket_number, received_at, status, device_type, device_brand, device_model, customer_snapshot, estimated_ready_at')
    .order('received_at', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status as any);
  if (q) query = query.or(`ticket_number.ilike.%${q}%,serial_number.ilike.%${q}%,device_model.ilike.%${q}%`);

  const { data: tickets } = await query;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 flex items-center gap-2">
            <Wrench className="h-7 w-7 text-blue-600" /> Service / Repairs
          </h1>
          <p className="text-slate-500 mt-1">Track devices in for repair.</p>
        </div>
        <Link href="/admin/service/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" /> New Ticket
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/service" className={chipClass(!status)}>All</Link>
        {STATUS_ORDER.map(s => (
          <Link key={s} href={`/admin/service?status=${s}`} className={chipClass(status === s)}>{s.replace('_', ' ')}</Link>
        ))}
      </div>

      <form className="mb-4">
        <input name="q" defaultValue={q ?? ''} placeholder="Search ticket #, serial, or device model…" className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </form>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Ticket</th>
                <th className="px-6 py-4 font-medium">Received</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Device</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Est. ready</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!tickets || tickets.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No tickets.</td></tr>
              ) : tickets.map(t => {
                const cust = t.customer_snapshot as any;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono">
                      <Link href={`/admin/service/${t.id}`} className="font-medium hover:text-blue-600">{t.ticket_number}</Link>
                    </td>
                    <td className="px-6 py-4">{new Date(t.received_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{cust?.name ?? '—'}</div>
                      {cust?.phone && <div className="text-xs text-slate-500 font-mono">{cust.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div>{[t.device_brand, t.device_model].filter(Boolean).join(' ') || '—'}</div>
                      {t.device_type && <div className="text-xs text-slate-500">{t.device_type}</div>}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                    <td className="px-6 py-4 text-sm">{t.estimated_ready_at ?? '—'}</td>
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

function chipClass(active: boolean) {
  return `px-3 py-1.5 rounded-md text-xs font-medium border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50'}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    received: 'bg-slate-500',
    diagnosed: 'bg-blue-500',
    awaiting_parts: 'bg-amber-500',
    in_progress: 'bg-indigo-500',
    ready: 'bg-emerald-500',
    delivered: 'bg-emerald-700',
    cancelled: 'bg-red-400',
  };
  return <Badge className={map[status] ?? 'bg-slate-400'}>{status.replace('_', ' ')}</Badge>;
}
