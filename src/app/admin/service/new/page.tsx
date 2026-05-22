import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import NewTicketForm from './NewTicketForm';

export default async function NewTicketPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: technicians } = await supabase
    .from('profiles')
    .select('user_id, full_name, role')
    .in('role', ['admin', 'manager'])
    .eq('is_active', true)
    .order('full_name');

  return <NewTicketForm technicians={technicians ?? []} />;
}
