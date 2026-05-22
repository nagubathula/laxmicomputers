'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateTicketStatus } from '../actions';

type TicketStatus = 'received' | 'diagnosed' | 'awaiting_parts' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

const NEXT: Record<TicketStatus, TicketStatus[]> = {
  received:       ['diagnosed', 'cancelled'],
  diagnosed:      ['awaiting_parts', 'in_progress', 'cancelled'],
  awaiting_parts: ['in_progress', 'cancelled'],
  in_progress:    ['ready', 'awaiting_parts', 'cancelled'],
  ready:          ['delivered', 'in_progress'],
  delivered:      [],
  cancelled:      ['received'],
};

const LABELS: Record<TicketStatus, string> = {
  received: 'Received', diagnosed: 'Mark Diagnosed', awaiting_parts: 'Awaiting Parts',
  in_progress: 'Start Work', ready: 'Mark Ready', delivered: 'Mark Delivered', cancelled: 'Cancel',
};

export default function TicketActions({ ticketId, currentStatus }: { ticketId: string; currentStatus: TicketStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');

  const advance = (status: TicketStatus) => {
    startTransition(async () => {
      const r = await updateTicketStatus(ticketId, status, note);
      if (!r.ok) { alert(r.error); return; }
      setNote('');
      router.refresh();
    });
  };

  const next = NEXT[currentStatus];
  if (next.length === 0) return null;

  return (
    <div className="rounded-md border bg-blue-50/40 border-blue-200 p-4 mb-6">
      <div className="text-sm font-semibold text-blue-900 mb-2">Advance ticket</div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g. 'Replaced keyboard ribbon')"
        className="mb-3 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {next.map(s => (
          <Button
            key={s}
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => advance(s)}
            className={s === 'cancelled' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}
          >
            {LABELS[s]}
          </Button>
        ))}
      </div>
    </div>
  );
}
