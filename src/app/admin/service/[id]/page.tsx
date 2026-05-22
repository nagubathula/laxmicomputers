import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { formatMoney, type Currency } from '@/lib/money';
import TicketActions from './TicketActions';
import TicketTimeline from './TicketTimeline';

export default async function TicketDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: ticket }, { data: notes }, { data: technicians }, { data: settings }] = await Promise.all([
    supabase.from('service_tickets').select('*').eq('id', id).single(),
    supabase.from('service_ticket_notes').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('user_id, full_name, role').eq('is_active', true).in('role', ['admin', 'manager']).order('full_name'),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  if (!ticket) notFound();
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  const customer = ticket.customer_snapshot as any;

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/service" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Tickets
        </Link>
        <span className="text-xs text-slate-500">Received {new Date(ticket.received_at).toLocaleString()}</span>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-navy-900">{ticket.ticket_number}</h1>
        <StatusBadge status={ticket.status} />
        {ticket.estimated_charge && (
          <span className="text-sm text-slate-500">Est. <span className="font-semibold">{formatMoney(Number(ticket.estimated_charge), currency)}</span></span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500 mb-1">Customer</div>
          <div className="font-semibold">{customer?.name ?? '—'}</div>
          {customer?.phone && <div className="text-sm text-slate-500 font-mono">{customer.phone}</div>}
          {ticket.customer_id && (
            <Link href={`/admin/customers/${ticket.customer_id}/edit`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">View customer →</Link>
          )}
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500 mb-1">Device</div>
          <div className="font-semibold">{[ticket.device_brand, ticket.device_model].filter(Boolean).join(' ') || '—'}</div>
          <div className="text-sm text-slate-500">{ticket.device_type}</div>
          {ticket.serial_number && <div className="text-xs text-slate-400 font-mono mt-1">SN: {ticket.serial_number}</div>}
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500 mb-1">Workflow</div>
          {ticket.estimated_ready_at && <div className="text-sm">Ready by: <span className="font-semibold">{ticket.estimated_ready_at}</span></div>}
          {ticket.delivered_at && <div className="text-sm">Delivered: {new Date(ticket.delivered_at).toLocaleDateString()}</div>}
          <div className="text-xs text-slate-500 mt-1">Technician: {(technicians ?? []).find(t => t.user_id === ticket.technician_id)?.full_name ?? '—'}</div>
        </div>
      </div>

      <div className="rounded-md border bg-white p-4 shadow-sm mb-6">
        <div className="text-xs uppercase text-slate-500 mb-2">Problem</div>
        <div className="whitespace-pre-wrap text-sm">{ticket.problem_description}</div>
        {ticket.accessories && (
          <div className="mt-3 pt-3 border-t text-xs text-slate-500">
            <strong>Accessories:</strong> {ticket.accessories}
          </div>
        )}
        {ticket.notes && (
          <div className="mt-3 pt-3 border-t text-xs text-slate-500">
            <strong>Internal notes:</strong> {ticket.notes}
          </div>
        )}
      </div>

      <TicketActions ticketId={ticket.id} currentStatus={ticket.status} />

      <TicketTimeline ticketId={ticket.id} notes={notes ?? []} />
    </div>
  );
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
