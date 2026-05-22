'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { searchCustomers } from '@/app/admin/pos/actions';
import { createTicket } from '../actions';

type Customer = { id: string; name: string; phone: string | null; gstin: string | null; state: string | null; state_code: string | null };
type Technician = { user_id: string; full_name: string | null; role: string };

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default function NewTicketForm({ technicians }: { technicians: Technician[] }) {
  const [state, formAction, pending] = useActionState(createTicket, null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const tt = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    if (tt.current) clearTimeout(tt.current);
    tt.current = setTimeout(async () => {
      const r = await searchCustomers(search);
      if (r.ok) setResults(r.customers as Customer[]);
    }, 200);
  }, [search]);

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/service" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Tickets
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-navy-900 mb-6">New Service Ticket</h1>

      <form action={formAction} className="rounded-md border bg-white p-6 shadow-sm space-y-6">
        {/* Customer */}
        <section>
          <Label className="mb-2 block">Customer</Label>
          {customer ? (
            <div className="rounded-md bg-slate-50 p-3 border flex items-start justify-between">
              <div>
                <input type="hidden" name="customer_id" value={customer.id} />
                <div className="font-medium">{customer.name}</div>
                <div className="text-xs text-slate-500">{customer.phone ?? ''}</div>
              </div>
              <Button variant="outline" size="sm" type="button" onClick={() => setCustomer(null)}>Change</Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, or GSTIN…" />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                {results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-auto rounded-md border bg-white shadow-lg">
                    {results.map(c => (
                      <button key={c.id} type="button" onClick={() => { setCustomer(c); setSearch(''); setResults([]); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0">
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.phone ?? ''}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">Or enter walk-in customer details below:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <Input name="walkin_name" placeholder="Walk-in customer name" />
                <Input name="walkin_phone" placeholder="Phone" />
              </div>
            </>
          )}
        </section>

        <section className="space-y-4 pt-4 border-t">
          <h2 className="font-semibold text-navy-900">Device details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="device_type">Device type</Label>
              <select id="device_type" name="device_type" className={selectClass} defaultValue="Laptop">
                <option value="Laptop">Laptop</option>
                <option value="Desktop">Desktop</option>
                <option value="Printer">Printer</option>
                <option value="Monitor">Monitor</option>
                <option value="Networking">Networking</option>
                <option value="Mobile">Mobile</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="device_brand">Brand</Label>
              <Input id="device_brand" name="device_brand" placeholder="HP, Dell, Lenovo…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="device_model">Model</Label>
              <Input id="device_model" name="device_model" placeholder="e.g. Pavilion 15-eg2018TU" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serial_number">Serial / Service tag</Label>
              <Input id="serial_number" name="serial_number" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="accessories">Accessories received</Label>
              <Input id="accessories" name="accessories" placeholder="e.g. charger, bag, mouse" />
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t">
          <h2 className="font-semibold text-navy-900">Problem & workflow</h2>
          <div className="space-y-1.5">
            <Label htmlFor="problem_description">Problem description *</Label>
            <Textarea id="problem_description" name="problem_description" rows={3} required placeholder="What's wrong with the device?" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="estimated_charge">Estimated charge (₹)</Label>
              <Input id="estimated_charge" name="estimated_charge" type="number" min={0} step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimated_ready_at">Estimated ready date</Label>
              <Input id="estimated_ready_at" name="estimated_ready_at" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="technician_id">Assign technician</Label>
              <select id="technician_id" name="technician_id" className={selectClass} defaultValue="">
                <option value="">— unassigned —</option>
                {technicians.map(t => (
                  <option key={t.user_id} value={t.user_id}>{t.full_name ?? t.user_id.slice(0, 8)} ({t.role})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Internal notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
        </section>

        {state?.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">{state.error}</div>
        )}

        <div className="pt-4 flex justify-end gap-4 border-t">
          <Link href="/admin/service"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700">
            {pending ? 'Creating…' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </div>
  );
}
