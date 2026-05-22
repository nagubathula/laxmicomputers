import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import UsersTable from './UsersTable';

type Row = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'manager' | 'cashier';
  is_active: boolean;
  created_at: string;
};

export default async function UsersPage() {
  const me = await requireUser(['admin']);
  const supabase = await createClient();

  // profiles + email via auth.users (requires service role on prod — but selecting
  // from auth.users works for the current user's session if you've enabled it.
  // Fallback: just show user_id when email isn't available.)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, role, is_active, created_at')
    .order('created_at');

  // Enrich with emails via security-definer RPC (admin-only)
  const userIds = (profiles ?? []).map(p => p.user_id);
  let emailById = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: emails } = await supabase.rpc('get_user_emails', { p_user_ids: userIds });
    if (emails) {
      emailById = new Map((emails as { id: string; email: string }[]).map(e => [e.id, e.email]));
    }
  }

  const rows: Row[] = (profiles ?? []).map(p => ({
    user_id: p.user_id,
    email: emailById.get(p.user_id) ?? null,
    full_name: p.full_name,
    role: p.role,
    is_active: p.is_active,
    created_at: p.created_at,
  }));

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Users & Roles</h1>
        <p className="text-slate-500 mt-1">Manage staff access. New sign-ups default to cashier.</p>
      </div>

      <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
        New users sign themselves up at <Link href="/signup" className="underline">/signup</Link> and become <strong>cashier</strong> by default.
        Promote them here once they&apos;ve registered.
      </div>

      <UsersTable rows={rows} currentUserId={me.id} />
    </div>
  );
}
