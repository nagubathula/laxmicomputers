'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney, round2, type Currency } from '@/lib/money';
import { computeLineGst, isInterState } from '@/lib/gst';
import { createPurchaseOrder, searchProductsForPO, searchSuppliers, type POLineInput } from '../actions';

type Supplier = { id: string; name: string; phone: string | null; gstin: string | null; state: string | null; state_code: string | null };
type ProductHit = { id: string; name: string; cost_price: number | null; price: number; gst_rate: number; hsn_code: string | null; barcode: string | null };
type Line = { productId: string; name: string; qty: number; unitCost: number; gstRate: number; hsn: string | null };

type Props = { currency: Currency; businessStateCode: string | null };

export default function POEditor({ currency, businessStateCode }: Props) {
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierTerm, setSupplierTerm] = useState('');
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);
  const [productTerm, setProductTerm] = useState('');
  const [productResults, setProductResults] = useState<ProductHit[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const tt = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (kind: 'error' | 'success', text: string) => {
    setToast({ kind, text });
    if (tt.current) clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast(null), 4000);
  };

  // Debounced supplier search
  useEffect(() => {
    if (!supplierTerm.trim()) { setSupplierResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchSuppliers(supplierTerm);
      if (r.ok) setSupplierResults(r.suppliers as Supplier[]);
    }, 200);
    return () => clearTimeout(t);
  }, [supplierTerm]);

  // Debounced product search
  useEffect(() => {
    if (!productTerm.trim()) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchProductsForPO(productTerm);
      if (r.ok) setProductResults(r.products as ProductHit[]);
    }, 200);
    return () => clearTimeout(t);
  }, [productTerm]);

  const addProduct = (p: ProductHit) => {
    setLines(prev => {
      const existing = prev.find(l => l.productId === p.id);
      if (existing) return prev.map(l => l.productId === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, {
        productId: p.id,
        name: p.name,
        qty: 1,
        unitCost: Number(p.cost_price ?? p.price ?? 0),
        gstRate: Number(p.gst_rate ?? 18),
        hsn: p.hsn_code,
      }];
    });
    setProductTerm('');
    setProductResults([]);
  };

  const interState = isInterState(businessStateCode, supplier?.state_code);
  const totals = useMemo(() => {
    let sub = 0, c = 0, s = 0, ig = 0;
    for (const ln of lines) {
      const b = computeLineGst({ qty: ln.qty, unitPrice: ln.unitCost, gstRate: ln.gstRate, interState });
      sub = round2(sub + b.taxable); c = round2(c + b.cgst); s = round2(s + b.sgst); ig = round2(ig + b.igst);
    }
    return { sub, c, s, ig, total: round2(sub + c + s + ig) };
  }, [lines, interState]);

  const submit = (status: 'draft' | 'sent') => {
    if (!supplier) { showToast('error', 'Pick a supplier.'); return; }
    if (lines.length === 0) { showToast('error', 'Add at least one line.'); return; }
    const payload = {
      supplierId: supplier.id,
      expectedDate: expectedDate || null,
      notes: notes || undefined,
      status,
      lines: lines.map<POLineInput>(l => ({
        productId: l.productId, qty: l.qty, unitCost: l.unitCost, gstRate: l.gstRate,
      })),
    };
    startTransition(async () => {
      const r = await createPurchaseOrder(payload);
      if (!r.ok) { showToast('error', r.error); return; }
      router.push(`/admin/purchases/po/${r.poId}`);
    });
  };

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-6xl">
      <div className="mb-4">
        <Link href="/admin/purchases" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Purchases
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-navy-900 mb-6">New Purchase Order</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          {/* Supplier picker */}
          <div className="rounded-md border bg-white p-4 shadow-sm space-y-3">
            <Label>Supplier *</Label>
            {supplier ? (
              <div className="flex items-start justify-between rounded-md bg-slate-50 p-3 border">
                <div>
                  <div className="font-medium">{supplier.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {supplier.phone ?? ''} {supplier.gstin ? ` · ${supplier.gstin}` : ''}
                  </div>
                  <div className="text-xs text-slate-500">{supplier.state ?? ''} {supplier.state_code ? `(${supplier.state_code})` : ''}</div>
                </div>
                <Button variant="outline" size="sm" type="button" onClick={() => setSupplier(null)}>Change</Button>
              </div>
            ) : (
              <div className="relative">
                <Input value={supplierTerm} onChange={(e) => setSupplierTerm(e.target.value)} placeholder="Search supplier by name…" />
                {supplierResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-auto rounded-md border bg-white shadow-lg">
                    {supplierResults.map(s => (
                      <button key={s.id} type="button" onClick={() => { setSupplier(s); setSupplierTerm(''); setSupplierResults([]); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0">
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.phone ?? ''}{s.gstin ? ` · ${s.gstin}` : ''}</div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-400">Need a new vendor? <Link href="/admin/suppliers/new" className="text-blue-600 hover:underline">Add supplier</Link></p>
              </div>
            )}
          </div>

          {/* Product picker */}
          <div className="rounded-md border bg-white p-4 shadow-sm">
            <Label>Add product</Label>
            <div className="relative mt-2">
              <Input value={productTerm} onChange={(e) => setProductTerm(e.target.value)} placeholder="Search by name or barcode…" />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {productResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-auto rounded-md border bg-white shadow-lg">
                  {productResults.map(p => (
                    <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono text-slate-500">{formatMoney(Number(p.cost_price ?? p.price ?? 0), currency)}</span>
                      </div>
                      {p.barcode && <div className="text-xs text-slate-400 font-mono">{p.barcode}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lines */}
          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium text-right">Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
                    <th className="px-4 py-3 font-medium text-right">GST%</th>
                    <th className="px-4 py-3 font-medium text-right">Line</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Add products above.</td></tr>
                  ) : lines.map((line, i) => {
                    const b = computeLineGst({ qty: line.qty, unitPrice: line.unitCost, gstRate: line.gstRate, interState });
                    const update = (patch: Partial<Line>) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
                    return (
                      <tr key={line.productId} className="hover:bg-slate-50">
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
                          <Input type="number" min={0} step="0.01" value={line.unitCost}
                            onChange={(e) => update({ unitCost: parseFloat(e.target.value) || 0 })}
                            className="w-24 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input type="number" min={0} step="0.01" value={line.gstRate}
                            onChange={(e) => update({ gstRate: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-3 font-mono text-right">{formatMoney(b.total, currency)}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-slate-400 hover:text-red-600">
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
              <Label htmlFor="expected">Expected delivery</Label>
              <Input id="expected" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="text-xs">
              {interState ? <span className="text-amber-700 font-medium">Inter-state (IGST)</span> : <span className="text-emerald-700 font-medium">Intra-state (CGST+SGST)</span>}
            </div>
          </div>

          <div className="rounded-md border bg-white p-4 shadow-sm space-y-2">
            <Row label="Subtotal" value={formatMoney(totals.sub, currency)} />
            {interState ? (
              <Row label="IGST" value={formatMoney(totals.ig, currency)} />
            ) : (
              <>
                <Row label="CGST" value={formatMoney(totals.c, currency)} />
                <Row label="SGST" value={formatMoney(totals.s, currency)} />
              </>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="font-mono">{formatMoney(totals.total, currency)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button type="button" onClick={() => submit('sent')} disabled={pending || lines.length === 0} className="w-full bg-blue-600 hover:bg-blue-700">
              {pending ? 'Saving…' : 'Save & send to supplier'}
            </Button>
            <Button type="button" variant="outline" onClick={() => submit('draft')} disabled={pending || lines.length === 0} className="w-full">
              Save as draft
            </Button>
          </div>
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><span className="text-slate-500">{label}</span><span className="font-mono">{value}</span></div>;
}
