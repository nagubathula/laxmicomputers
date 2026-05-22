'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveBusinessSettings } from './actions';

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Common Indian state codes for the picker. Not exhaustive — user can type their own.
const STATE_CODES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

export default function SettingsForm({ initial }: { initial: any }) {
  const [state, formAction, pending] = useActionState(saveBusinessSettings, null);

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Business Settings</h1>
        <p className="text-slate-500 mt-1">Appears on invoices and the storefront.</p>
      </div>

      <form action={formAction} className="rounded-md border bg-white p-6 shadow-sm space-y-6">
        <section className="space-y-4">
          <h2 className="font-semibold text-navy-900">Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="legal_name">Legal Name *</Label>
              <Input id="legal_name" name="legal_name" defaultValue={initial.legal_name ?? ''} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={initial.phone ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={initial.email ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input id="logo_url" name="logo_url" type="url" defaultValue={initial.logo_url ?? ''} />
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-2 border-t">
          <h2 className="font-semibold text-navy-900">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input id="address_line1" name="address_line1" defaultValue={initial.address_line1 ?? ''} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input id="address_line2" name="address_line2" defaultValue={initial.address_line2 ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={initial.city ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" name="pincode" defaultValue={initial.pincode ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={initial.state ?? ''} placeholder="e.g. Maharashtra" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state_code">State Code</Label>
              <select id="state_code" name="state_code" className={selectClass} defaultValue={initial.state_code ?? ''}>
                <option value="">— select —</option>
                {STATE_CODES.map(s => (
                  <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-2 border-t">
          <h2 className="font-semibold text-navy-900">Tax & Invoicing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" name="gstin" defaultValue={initial.gstin ?? ''} placeholder="27AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pan">PAN</Label>
              <Input id="pan" name="pan" defaultValue={initial.pan ?? ''} placeholder="AAAAA0000A" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice_prefix">Invoice Number Prefix</Label>
              <Input id="invoice_prefix" name="invoice_prefix" defaultValue={initial.invoice_prefix ?? 'LC'} />
              <p className="text-xs text-slate-500">e.g. &apos;LC&apos; → LC/25-26/0001</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default_currency">Default Currency</Label>
              <select id="default_currency" name="default_currency" className={selectClass} defaultValue={initial.default_currency ?? 'INR'}>
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
              </select>
            </div>
          </div>
        </section>

        {state?.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Settings saved.
          </div>
        )}

        <div className="pt-4 flex justify-end gap-4 border-t">
          <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700">
            {pending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
