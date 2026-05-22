'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updatePOStatus } from '../actions';

export default function StatusActions({ poId, status }: { poId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (next: 'draft' | 'sent' | 'cancelled') => {
    startTransition(async () => {
      const r = await updatePOStatus(poId, next);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'draft' && (
        <Button size="sm" disabled={pending} onClick={() => change('sent')}>Mark as Sent</Button>
      )}
      {(status === 'draft' || status === 'sent') && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => change('cancelled')}>Cancel</Button>
      )}
      {status === 'cancelled' && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => change('draft')}>Reactivate</Button>
      )}
    </div>
  );
}
