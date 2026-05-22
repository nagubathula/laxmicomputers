'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { convertQuoteToInvoice, updateQuoteStatus } from '../actions';

type Status = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

const NEXT: Record<Status, Status[]> = {
  draft: ['sent', 'rejected'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: ['rejected', 'expired'],
  rejected: ['draft'],
  expired: ['draft'],
  converted: [],
};

const LABEL: Record<Status, string> = {
  draft: 'Draft', sent: 'Mark Sent', accepted: 'Mark Accepted',
  rejected: 'Reject', expired: 'Mark Expired', converted: 'Converted',
};

const selectClass = "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm";

export default function QuoteActions({ quoteId, status }: { quoteId: string; status: Status }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit'>('cash');

  const change = (next: Status) => {
    if (next === 'converted') return;
    startTransition(async () => {
      const r = await updateQuoteStatus(quoteId, next as any);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  };

  const convert = () => {
    if (!confirm('Convert this accepted quote into an invoice? Stock will be decremented.')) return;
    startTransition(async () => {
      const r = await convertQuoteToInvoice(quoteId, paymentMethod);
      if (!r.ok) { alert(r.error); return; }
      window.open(`/api/invoices/${r.invoiceId}/pdf`, '_blank');
      router.refresh();
    });
  };

  if (status === 'converted') return null;

  return (
    <div className="rounded-md border bg-blue-50/40 border-blue-200 p-4 flex flex-wrap items-end gap-3">
      <div className="text-sm font-semibold text-blue-900 mr-4 self-center">Actions:</div>
      {NEXT[status].map(s => (
        <Button key={s} size="sm" type="button" disabled={pending} onClick={() => change(s)}
          className={s === 'rejected' || s === 'expired' ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'}>
          {LABEL[s]}
        </Button>
      ))}
      {status === 'accepted' && (
        <div className="ml-auto flex items-end gap-2">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Payment</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className={selectClass}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit">On Credit</option>
            </select>
          </div>
          <Button size="sm" type="button" disabled={pending} onClick={convert} className="bg-emerald-600 hover:bg-emerald-700">
            Convert to Invoice
          </Button>
        </div>
      )}
    </div>
  );
}
