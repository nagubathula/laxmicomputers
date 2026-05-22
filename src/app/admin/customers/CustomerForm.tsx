'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertCustomer } from './actions';

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const STATE_CODES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' }, { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' }, { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' }, { code: '37', name: 'Andhra Pradesh' },
];

export default function CustomerForm({ initial }: { initial: any }) {
  const [state, formAction, pending] = useActionState(upsertCustomer, null);
  const isEdit = !!initial?.id;

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">{isEdit ? 'Edit Customer' : 'New Customer'}</h1>
      </div>

      <form action={formAction} className="rounded-md border bg-white p-6 shadow-sm space-y-6">
        {isEdit && <input type="hidden" name="id" value={initial.id} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={initial?.name ?? ''} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={initial?.phone ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gstin">GSTIN (B2B only)</Label>
            <Input id="gstin" name="gstin" defaultValue={initial?.gstin ?? ''} placeholder="27AAAAA0000A1Z5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue={initial?.state ?? ''} placeholder="Maharashtra" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state_code">State Code</Label>
            <select id="state_code" name="state_code" className={selectClass} defaultValue={initial?.state_code ?? ''}>
              <option value="">— select —</option>
              {STATE_CODES.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input id="address_line1" name="address_line1" defaultValue={initial?.address_line1 ?? ''} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input id="address_line2" name="address_line2" defaultValue={initial?.address_line2 ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={initial?.city ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pincode">Pincode</Label>
            <Input id="pincode" name="pincode" defaultValue={initial?.pincode ?? ''} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={initial?.notes ?? ''} />
          </div>
        </div>

        {state?.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">{state.error}</div>
        )}

        <div className="pt-4 flex justify-end gap-4 border-t">
          <Link href="/admin/customers"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700">
            {pending ? 'Saving...' : isEdit ? 'Update Customer' : 'Save Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
