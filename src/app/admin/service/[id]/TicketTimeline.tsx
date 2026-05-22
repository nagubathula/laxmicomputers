'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { addTicketNote } from '../actions';

type Note = {
  id: string;
  status_change: string | null;
  body: string | null;
  created_at: string;
  created_by: string | null;
};

export default function TicketTimeline({ ticketId, notes }: { ticketId: string; notes: Note[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState('');

  const submit = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await addTicketNote(ticketId, body);
      if (!r.ok) { alert(r.error); return; }
      setBody('');
      router.refresh();
    });
  };

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <div className="border-b px-4 py-3 font-semibold flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-slate-500" /> Timeline
      </div>

      <div className="p-4 border-b">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Add a note (visible on the jobsheet)…" />
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" onClick={submit} disabled={pending || !body.trim()}>Add note</Button>
        </div>
      </div>

      <ul className="divide-y">
        {notes.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-400">No notes yet.</li>
        ) : notes.map(n => (
          <li key={n.id} className="px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                {n.status_change && (
                  <Badge variant="outline" className="text-[10px] uppercase">{n.status_change.replace('_', ' ')}</Badge>
                )}
                <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
              </div>
            </div>
            {n.body && <div className="text-slate-700 whitespace-pre-wrap">{n.body}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
