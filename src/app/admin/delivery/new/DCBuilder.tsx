'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Trash2, CheckCircle2, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ShortcutsOverlay, { type ShortcutGroup } from '@/components/ShortcutsOverlay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatMoney, round2, type Currency } from '@/lib/money';
import { searchCustomers } from '@/app/admin/pos/actions';
import { searchProductsForPO } from '@/app/admin/purchases/po/actions';
import { createDeliveryChallan, type DCLineInput, type DCReason } from '../actions';

type Customer = { id: string; name: string; phone: string | null; gstin: string | null; state: string | null; state_code: string | null };
type ProductHit = { id: string; name: string; cost_price: number | null; price: number; gst_rate: number; hsn_code: string | null; barcode: string | null };
type Line = { productId: string; name: string; qty: number; unitPrice: number; hsn: string | null };

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const REASONS: { value: DCReason; label: string }[] = [
  { value: 'sale', label: 'Sale (partial delivery, invoice follows)' },
  { value: 'sale_on_approval', label: 'Sale on approval' },
  { value: 'job_work', label: 'Job work' },
  { value: 'sample', label: 'Sample' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'return', label: 'Return to supplier' },
  { value: 'other', label: 'Other' },
];

export default function DCBuilder({ currency }: { currency: Currency }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custTerm, setCustTerm] = useState('');
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [prodTerm, setProdTerm] = useState('');
  const [prodResults, setProdResults] = useState<ProductHit[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [reason, setReason] = useState<DCReason>('sale');
  const [vehicle, setVehicle] = useState('');
  const [transport, setTransport] = useState('Road');
  const [lr, setLr] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const tt = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (k: 'error' | 'success', t: string) => {
    setToast({ kind: k, text: t });
    if (tt.current) clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!custTerm.trim()) { setCustResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchCustomers(custTerm);
      if (r.ok) setCustResults(r.customers as Customer[]);
    }, 200);
    return () => clearTimeout(t);
  }, [custTerm]);

  useEffect(() => {
    if (!prodTerm.trim()) { setProdResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchProductsForPO(prodTerm);
      if (r.ok) setProdResults(r.products as ProductHit[]);
    }, 200);
    return () => clearTimeout(t);
  }, [prodTerm]);

  const addProduct = (p: ProductHit) => {
    setLines(prev => {
      const existing = prev.find(l => l.productId === p.id);
      if (existing) return prev.map(l => l.productId === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { productId: p.id, name: p.name, qty: 1, unitPrice: Number(p.price ?? 0), hsn: p.hsn_code }];
    });
    setProdTerm(''); setProdResults([]);
  };

  const bumpQty = (delta: number) => {
    if (selectedIdx < 0 || selectedIdx >= lines.length) return;
    const line = lines[selectedIdx];
    const next = line.qty + delta;
    if (next < 1) { setLines(prev => prev.filter((_, i) => i !== selectedIdx)); setSelectedIdx(-1); return; }
    setLines(prev => prev.map((l, i) => i === selectedIdx ? { ...l, qty: next } : l));
  };

  const total = useMemo(() => round2(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)), [lines]);

  const submit = () => {
    if (lines.length === 0) { showToast('error', 'Add at least one line.'); return; }
    const payload = {
      customerId: customer?.id ?? null,
      reason,
      vehicleNumber: vehicle || null,
      transportMode: transport || null,
      lrNumber: lr || null,
      notes: notes || undefined,
      lines: lines.map<DCLineInput>(l => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })),
    };
    startTransition(async () => {
      const r = await createDeliveryChallan(payload);
      if (!r.ok) { showToast('error', r.error); return; }
      router.push(`/admin/delivery/${r.dcId}`);
    });
  };

  useKeyboardShortcuts({
    'f1': () => productInputRef.current?.focus(),
    'f2': () => { setCustomer(null); setTimeout(() => customerInputRef.current?.focus(), 0); },
    'f12': () => submit(),
    'mod+enter': () => submit(),
    'escape': () => { if (shortcutsOpen) setShortcutsOpen(false); else if (selectedIdx >= 0) setSelectedIdx(-1); else (document.activeElement as HTMLElement)?.blur?.(); },
    'arrowdown': () => setSelectedIdx(i => Math.min(lines.length - 1, i + 1)),
    'arrowup': () => setSelectedIdx(i => Math.max(0, (i < 0 ? lines.length : i) - 1)),
    '+': () => bumpQty(1),
    '=': () => bumpQty(1),
    '-': () => bumpQty(-1),
    'delete': () => { if (selectedIdx < 0) return; setLines(prev => prev.filter((_, i) => i !== selectedIdx)); setSelectedIdx(-1); },
    '?': () => setShortcutsOpen(true),
    'shift+?': () => setShortcutsOpen(true),
  });

  // Keep selection valid as lines change
  useEffect(() => {
    if (lines.length > 0 && selectedIdx < 0) setSelectedIdx(lines.length - 1);
    else if (lines.length === 0 && selectedIdx !== -1) setSelectedIdx(-1);
    else if (selectedIdx >= lines.length) setSelectedIdx(lines.length - 1);
  }, [lines.length, selectedIdx]);

  const shortcutGroups: ShortcutGroup[] = [
    { title: 'Focus', items: [
      { keys: ['F1'], description: 'Focus product search' },
      { keys: ['F2'], description: 'Focus customer search' },
      { keys: ['Esc'], description: 'Clear selection / close' },
    ]},
    { title: 'Cart', items: [
      { keys: ['↑'], description: 'Previous line' },
      { keys: ['↓'], description: 'Next line' },
      { keys: ['+'], description: 'Increase qty' },
      { keys: ['−'], description: 'Decrease qty' },
      { keys: ['Del'], description: 'Remove line' },
    ]},
    { title: 'Save', items: [
      { keys: ['F12'], description: 'Save delivery challan' },
      { keys: ['Ctrl', '↵'], description: 'Save (alt)' },
      { keys: ['?'], description: 'This help' },
    ]},
  ];

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin/delivery" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Deliveries
        </Link>
        <button type="button" onClick={() => setShortcutsOpen(true)} className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
          <Keyboard className="h-3.5 w-3.5" /> Shortcuts
        </button>
      </div>

      <h1 className="text-3xl font-bold text-navy-900 mb-1">New Delivery Challan</h1>
      <p className="text-slate-500 mb-6">Goods leaving the shop. No GST collected — invoice can follow later.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-md border bg-white p-4 shadow-sm space-y-3">
            <Label>Customer / Consignee</Label>
            {customer ? (
              <div className="flex items-start justify-between rounded-md bg-slate-50 p-3 border">
                <div>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs text-slate-500">{customer.phone ?? ''}{customer.gstin ? ` · ${customer.gstin}` : ''}</div>
                </div>
                <Button variant="outline" size="sm" type="button" onClick={() => setCustomer(null)}>Change</Button>
              </div>
            ) : (
              <div className="relative">
                <Input ref={customerInputRef} value={custTerm} onChange={(e) => setCustTerm(e.target.value)} placeholder="Search customer…  [F2]" />
                {custResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-auto rounded-md border bg-white shadow-lg">
                    {custResults.map(c => (
                      <button key={c.id} type="button" onClick={() => { setCustomer(c); setCustTerm(''); setCustResults([]); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0">
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.phone ?? ''}{c.gstin ? ` · ${c.gstin}` : ''}</div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-400">Leave empty for goods going to self / unspecified.</p>
              </div>
            )}
          </div>

          {/* Product picker */}
          <div className="rounded-md border bg-white p-4 shadow-sm">
            <Label>Add product</Label>
            <div className="relative mt-2">
              <Input ref={productInputRef} value={prodTerm} onChange={(e) => setProdTerm(e.target.value)} placeholder="Search by name or barcode…  [F1]" />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {prodResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-auto rounded-md border bg-white shadow-lg">
                  {prodResults.map(p => (
                    <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono text-slate-500">{formatMoney(Number(p.price ?? 0), currency)}</span>
                      </div>
                      {p.barcode && <div className="text-xs text-slate-400 font-mono">{p.barcode}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">F1</kbd> search ·
              <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">↑↓</kbd> select ·
              <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">+/−</kbd> qty ·
              <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">F12</kbd> save
            </p>
          </div>

          {/* Lines */}
          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium text-right">Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Unit value</th>
                    <th className="px-4 py-3 font-medium text-right">Line</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Add products above.</td></tr>
                  ) : lines.map((line, i) => {
                    const isSel = i === selectedIdx;
                    const update = (patch: Partial<Line>) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
                    return (
                      <tr key={line.productId} className={`cursor-pointer hover:bg-slate-50 ${isSel ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`} onClick={() => setSelectedIdx(i)}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{line.name}</div>
                          {line.hsn && <div className="text-xs text-slate-400">HSN {line.hsn}</div>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input type="number" min={1} step="0.01" value={line.qty}
                            onChange={(e) => update({ qty: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input type="number" min={0} step="0.01" value={line.unitPrice}
                            onChange={(e) => update({ unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-24 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatMoney(line.qty * line.unitPrice, currency)}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setLines(prev => prev.filter((_, idx) => idx !== i)); }} className="p-1 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-md border bg-white p-4 shadow-sm space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason for transport *</Label>
              <select id="reason" className={selectClass} value={reason} onChange={(e) => setReason(e.target.value as DCReason)}>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle">Vehicle number</Label>
              <Input id="vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="MH 12 AB 1234" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="transport">Mode</Label>
                <select id="transport" className={selectClass} value={transport} onChange={(e) => setTransport(e.target.value)}>
                  <option>Road</option><option>Rail</option><option>Air</option><option>Ship</option><option>Hand</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lr">LR / Consignment #</Label>
                <Input id="lr" value={lr} onChange={(e) => setLr(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border bg-white p-4 shadow-sm">
            <div className="flex justify-between font-bold text-lg">
              <span>Goods value</span>
              <span className="font-mono">{formatMoney(total, currency)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Indicative only — no GST collected on a Delivery Challan.</p>
          </div>

          <Button type="button" onClick={submit} disabled={pending || lines.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
            <span>{pending ? 'Saving…' : 'Save DC & post stock'}</span>
            <kbd className="ml-2 px-1.5 py-0.5 rounded border border-white/30 bg-white/10 font-mono text-[10px] font-normal">F12</kbd>
          </Button>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-md px-4 py-3 shadow-lg border text-sm flex items-center gap-2 ${
          toast.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.kind === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      <ShortcutsOverlay open={shortcutsOpen} groups={shortcutGroups} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
