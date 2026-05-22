import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

export default async function AuditLogPage(props: { searchParams: Promise<{ q?: string; action?: string }> }) {
  await requireUser(['admin']);
  const { q, action } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('audit_log')
    .select('id, actor_id, actor_email, actor_role, action, entity_type, entity_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (q) query = query.or(`actor_email.ilike.%${q}%,entity_id.ilike.%${q}%`);
  if (action) query = query.eq('action', action);

  const { data: rows } = await query;

  // Distinct action types for the filter chips
  const { data: actionTypes } = await supabase
    .from('audit_log')
    .select('action')
    .order('created_at', { ascending: false })
    .limit(500);
  const actions = Array.from(new Set((actionTypes ?? []).map(r => r.action))).sort();

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Audit Log</h1>
        <p className="text-slate-500 mt-1">All sensitive actions. Append-only.</p>
      </div>

      <form className="mb-4">
        <input name="q" defaultValue={q ?? ''} placeholder="Filter by actor email or entity id…" className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm" />
        {action && <input type="hidden" name="action" value={action} />}
      </form>

      {actions.length > 0 && (
        <div className="mb-4 flex gap-2 flex-wrap text-xs">
          <Link href="/admin/audit" className={chipClass(!action)}>All actions</Link>
          {actions.map(a => (
            <Link key={a} href={`/admin/audit?action=${a}`} className={chipClass(action === a)}>{a}</Link>
          ))}
        </div>
      )}

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!rows || rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No entries yet.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{r.actor_email ?? '—'}</div>
                    {r.actor_role && <Badge variant="outline" className="text-[10px] mt-0.5">{r.actor_role}</Badge>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.entity_type && <div className="text-slate-500">{r.entity_type}</div>}
                    {r.entity_id && <div className="font-mono text-slate-400 truncate max-w-[10rem]">{r.entity_id}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-pre-wrap break-all max-w-md">
                    {r.details ? JSON.stringify(r.details, null, 0) : ''}
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

function chipClass(active: boolean) {
  return `px-3 py-1.5 rounded-md font-medium border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50'}`;
}
