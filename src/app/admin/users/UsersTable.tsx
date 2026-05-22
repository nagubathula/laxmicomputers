'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { setUserRole, setUserActive, setUserFullName } from './actions';

type Role = 'admin' | 'manager' | 'cashier';
type Row = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export default function UsersTable({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingName, setEditingName] = useState<{ id: string; value: string } | null>(null);

  const onRoleChange = (id: string, role: Role) => {
    startTransition(async () => {
      const r = await setUserRole(id, role);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  };
  const onActiveToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      const r = await setUserActive(id, isActive);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  };
  const saveName = (id: string) => {
    if (!editingName) return;
    const v = editingName.value.trim();
    startTransition(async () => {
      const r = await setUserFullName(id, v);
      if (!r.ok) alert(r.error);
      setEditingName(null);
      router.refresh();
    });
  };

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Role</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Joined</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users yet.</td></tr>
            ) : rows.map(r => {
              const isMe = r.user_id === currentUserId;
              return (
                <tr key={r.user_id} className={`hover:bg-slate-50 ${!r.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.email ?? <span className="text-slate-400">[email hidden]</span>}</div>
                    <div className="text-xs text-slate-400 font-mono">{r.user_id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-2">
                    {editingName?.id === r.user_id ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          value={editingName.value}
                          onChange={(e) => setEditingName({ id: r.user_id, value: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveName(r.user_id); if (e.key === 'Escape') setEditingName(null); }}
                          className="rounded border px-2 py-1 text-sm"
                        />
                        <Button size="sm" type="button" onClick={() => saveName(r.user_id)}>Save</Button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setEditingName({ id: r.user_id, value: r.full_name ?? '' })} className="hover:text-blue-600 text-left">
                        {r.full_name ?? <span className="text-slate-400">—</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={r.role}
                      disabled={pending || (isMe && r.role === 'admin')}
                      onChange={(e) => onRoleChange(r.user_id, e.target.value as Role)}
                      className="rounded-md border px-2 py-1 text-sm"
                    >
                      <option value="admin">admin</option>
                      <option value="manager">manager</option>
                      <option value="cashier">cashier</option>
                    </select>
                    {isMe && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-2">
                    <Badge className={r.is_active ? 'bg-emerald-500' : 'bg-slate-400'}>
                      {r.is_active ? 'active' : 'inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || isMe}
                      onClick={() => onActiveToggle(r.user_id, !r.is_active)}
                    >
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
