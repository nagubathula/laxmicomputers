'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { financialYearCode } from '@/lib/gst';

type TicketStatus = 'received' | 'diagnosed' | 'awaiting_parts' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

function field(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  return v ? v : null;
}

async function nextTicketNumber(supabase: any): Promise<string> {
  const fy = financialYearCode();
  const { data, error } = await supabase.rpc('next_ticket_seq', { p_fy: fy });
  if (error || typeof data !== 'number') throw new Error(error?.message ?? 'Ticket numbering failed');
  return `SVC/${fy}/${String(data).padStart(4, '0')}`;
}

export async function createTicket(prevState: any, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const customerId = field(formData, 'customer_id');
  const problem = field(formData, 'problem_description');
  if (!problem) return { error: 'Problem description is required.' };

  // Resolve customer for snapshot (optional)
  let customer: any = null;
  if (customerId) {
    const { data } = await supabase.from('customers').select('*').eq('id', customerId).single();
    customer = data;
  }

  const ticketNumber = await nextTicketNumber(supabase);

  const { data: ticket, error } = await supabase.from('service_tickets').insert({
    ticket_number: ticketNumber,
    customer_id: customer?.id ?? null,
    customer_snapshot: customer ? {
      name: customer.name, phone: customer.phone, email: customer.email,
      address_line1: customer.address_line1, city: customer.city, pincode: customer.pincode,
    } : { name: field(formData, 'walkin_name') ?? 'Walk-in', phone: field(formData, 'walkin_phone') },
    device_type: field(formData, 'device_type'),
    device_brand: field(formData, 'device_brand'),
    device_model: field(formData, 'device_model'),
    serial_number: field(formData, 'serial_number'),
    accessories: field(formData, 'accessories'),
    problem_description: problem,
    estimated_charge: field(formData, 'estimated_charge') ? Number(field(formData, 'estimated_charge')) : null,
    estimated_ready_at: field(formData, 'estimated_ready_at'),
    technician_id: field(formData, 'technician_id'),
    notes: field(formData, 'notes'),
    created_by: user.id,
  }).select('id').single();

  if (error || !ticket) return { error: error?.message ?? 'Failed to create ticket' };

  // Initial "received" timeline entry
  await supabase.from('service_ticket_notes').insert({
    ticket_id: ticket.id,
    status_change: 'received',
    body: 'Ticket created.',
    created_by: user.id,
  });

  revalidatePath('/admin/service');
  redirect(`/admin/service/${ticket.id}`);
}

export async function updateTicketStatus(ticketId: string, newStatus: TicketStatus, note?: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const patch: Record<string, any> = { status: newStatus };
  if (newStatus === 'delivered') patch.delivered_at = new Date().toISOString();

  const { error } = await supabase.from('service_tickets').update(patch).eq('id', ticketId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from('service_ticket_notes').insert({
    ticket_id: ticketId,
    status_change: newStatus,
    body: note?.trim() || null,
    created_by: user.id,
  });

  revalidatePath('/admin/service');
  revalidatePath(`/admin/service/${ticketId}`);
  return { ok: true as const };
}

export async function addTicketNote(ticketId: string, body: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const trimmed = body.trim();
  if (!trimmed) return { ok: false as const, error: 'Empty note.' };

  const { error } = await supabase.from('service_ticket_notes').insert({
    ticket_id: ticketId,
    body: trimmed,
    created_by: user.id,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/service/${ticketId}`);
  return { ok: true as const };
}

export async function updateTicketDetails(ticketId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  const patch = {
    device_type: field(formData, 'device_type'),
    device_brand: field(formData, 'device_brand'),
    device_model: field(formData, 'device_model'),
    serial_number: field(formData, 'serial_number'),
    accessories: field(formData, 'accessories'),
    estimated_charge: field(formData, 'estimated_charge') ? Number(field(formData, 'estimated_charge')) : null,
    estimated_ready_at: field(formData, 'estimated_ready_at'),
    technician_id: field(formData, 'technician_id'),
    notes: field(formData, 'notes'),
  };

  const { error } = await supabase.from('service_tickets').update(patch).eq('id', ticketId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/service/${ticketId}`);
  return { ok: true as const };
}
