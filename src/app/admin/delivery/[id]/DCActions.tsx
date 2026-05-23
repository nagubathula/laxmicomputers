'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { convertDcToInvoice, updateDcStatus } from '../actions';

const selectClass = "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm";

export default function DCActions({ dcId, status }: { dcId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit'>('credit');

  const change = (next: 'open' | 'delivered' | 'cancelled') => {
    startTransition(async () => {
      const r = await updateDcStatus(dcId, next);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  };

  const convert = () => {
    if (!confirm(`Generate a GST invoice from this Delivery Challan? Stock will NOT be touched again — the DC already decremented it.`)) return;
    startTransition(async () => {
      const r = await convertDcToInvoice(dcId, paymentMethod);
      if (!r.ok) { alert(r.error); return; }
      window.open(`/api/invoices/${r.invoiceId}/pdf`, '_blank');
      router.refresh();
    });
  };

  if (status === 'invoiced' || status === 'cancelled') return null;

  return (
    <div className="rounded-md border bg-blue-50/40 border-blue-200 p-4 flex flex-wrap items-end gap-3">
      <div className="text-sm font-semibold text-blue-900 mr-4 self-center">Actions:</div>
      {status === 'open' && (
        <Button size="sm" type="button" disabled={pending} onClick={() => change('delivered')} className="bg-blue-600 hover:bg-blue-700">
          Mark Delivered
        </Button>
      )}
      <Button size="sm" type="button" variant="outline" disabled={pending} onClick={() => change('cancelled')}>
        Cancel (return stock)
      </Button>
      <div className="ml-auto flex items-end gap-2">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Payment</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className={selectClass}>
            <option value="credit">On Credit</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
        <Button size="sm" type="button" disabled={pending} onClick={convert} className="bg-emerald-600 hover:bg-emerald-700">
          Convert to Invoice
        </Button>
      </div>
    </div>
  );
}
