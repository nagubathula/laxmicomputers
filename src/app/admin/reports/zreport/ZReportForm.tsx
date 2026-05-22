'use client';

import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney, round2, type Currency } from '@/lib/money';
import { createZReport } from './actions';

type Props = { date: string; currency: Currency; cashSales: number };

export default function ZReportForm({ date, currency, cashSales }: Props) {
  const [state, formAction, pending] = useActionState(createZReport, null);
  const [openingFloat, setOpeningFloat] = useState('0');
  const [counted, setCounted] = useState('');

  const opening = parseFloat(openingFloat) || 0;
  const count = parseFloat(counted) || 0;
  const expected = useMemo(() => round2(opening + cashSales), [opening, cashSales]);
  const variance = useMemo(() => round2(count - expected), [count, expected]);

  return (
    <form action={formAction} className="rounded-md border bg-white shadow-sm p-4 space-y-4">
      <input type="hidden" name="report_date" value={date} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="opening_float">Opening cash float</Label>
          <Input id="opening_float" name="opening_float" type="number" step="0.01" min="0" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} />
          <p className="text-xs text-slate-500">Cash in the drawer at the start of shift.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Cash sales today</Label>
          <div className="h-10 flex items-center px-3 rounded-md border bg-slate-50 font-mono">{formatMoney(cashSales, currency)}</div>
          <p className="text-xs text-slate-500">From invoices with payment method = cash.</p>
        </div>
      </div>

      <div className="rounded-md bg-slate-50 p-3 text-sm">
        <div className="flex justify-between">
          <span>Expected cash in drawer</span>
          <span className="font-mono font-semibold">{formatMoney(expected, currency)}</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">opening float + cash sales</div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="counted_cash">Actual cash counted *</Label>
        <Input id="counted_cash" name="counted_cash" type="number" step="0.01" min="0" required value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0.00" />
      </div>

      {counted && (
        <div className={`rounded-md p-3 text-sm font-medium border ${
          variance === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          variance > 0 ? 'bg-blue-50 border-blue-200 text-blue-900' :
          'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex justify-between">
            <span>Variance (counted − expected)</span>
            <span className="font-mono">{variance > 0 ? '+' : ''}{formatMoney(variance, currency)}</span>
          </div>
          <div className="text-xs mt-1 opacity-80">
            {variance === 0 ? 'Drawer balances — no discrepancy.' : variance > 0 ? 'Overage. Confirm count.' : 'Shortage. Investigate before closing.'}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (reason for variance, shift handover, etc.)</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">{state.error}</div>
      )}

      <div className="pt-2 flex justify-end border-t">
        <Button type="submit" disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
          {pending ? 'Saving…' : 'Close shift & save Z-report'}
        </Button>
      </div>
    </form>
  );
}
