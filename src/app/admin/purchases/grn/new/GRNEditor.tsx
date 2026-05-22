'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, CheckCircle2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney, round2, type Currency } from '@/lib/money';
import { createGRN, type GRNLineInput } from '../actions';
import { searchProductsForPO, searchSuppliers } from '../../po/actions';

type Supplier = { id: string; name: string; phone: string | null; gstin: string | null; state: string | null; state_code: string | null };
type ProductHit = { id: string; name: string; cost_price: number | null; price: number; gst_rate: number; hsn_code: string | null; barcode: string | null; tracks_serials?: boolean };
type Line = {
  productId: string; poLineId: string | null; name: string;
  qty: number; unitCost: number;
  qtyOrdered?: number; qtyAlreadyReceived?: number;
  tracksSerials: boolean;
  serialsText: string;       // newline-separated serials in the textarea
};

type PrefilledPO = {
  po: { id: string; po_number: string; supplier_snapshot: any; status: string };
  lines: { id: string; product_id: string; product_name: string; qty_ordered: number; qty_received: number; unit_cost: number; tracks_serials: boolean }[];
};

type Props = {
  currency: Currency;
  prefilledPO: PrefilledPO | null;
};

export default function GRNEditor({ currency, prefilledPO }: Props) {
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierTerm, setSupplierTerm] = useState('');
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);
  const [productTerm, setProductTerm] = useState('');
  const [productResults, setProductResults] = useState<ProductHit[]>([]);
  const [lines, setLines] = useState<Line[]>(() => {
    if (!prefilledPO) return [];
    return prefilledPO.lines.map(l => ({
      productId: l.product_id,
      poLineId: l.id,
      name: l.product_name,
      qty: Math.max(0, Number(l.qty_ordered) - Number(l.qty_received)),
      unitCost: Number(l.unit_cost),
      qtyOrdered: Number(l.qty_ordered),
      qtyAlreadyReceived: Number(l.qty_received),
      tracksSerials: !!l.tracks_serials,
      serialsText: '',
    }));
  });
  const [invoiceRef, setInvoiceRef] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [updateCost, setUpdateCost] = useState(true);
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const tt = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (kind: 'error' | 'success', text: string) => {
    setToast({ kind, text });
    if (tt.current) clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast(null), 4000);
  };

  // Supplier search (only for standalone GRN)
  useEffect(() => {
    if (prefilledPO || !supplierTerm.trim()) { setSupplierResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchSuppliers(supplierTerm);
      if (r.ok) setSupplierResults(r.suppliers as Supplier[]);
    }, 200);
    return () => clearTimeout(t);
  }, [supplierTerm, prefilledPO]);

  // Product search (only for standalone — PO mode adds rows automatically)
  useEffect(() => {
    if (prefilledPO || !productTerm.trim()) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchProductsForPO(productTerm);
      if (r.ok) setProductResults(r.products as ProductHit[]);
    }, 200);
    return () => clearTimeout(t);
  }, [productTerm, prefilledPO]);

  const addProduct = (p: ProductHit) => {
    setLines(prev => {
      const existing = prev.find(l => l.productId === p.id);
      if (existing) return prev.map(l => l.productId === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, {
        productId: p.id,
        poLineId: null,
        name: p.name,
        qty: 1,
        unitCost: Number(p.cost_price ?? p.price ?? 0),
        tracksSerials: !!p.tracks_serials,
        serialsText: '',
      }];
    });
    setProductTerm('');
    setProductResults([]);
  };

  const total = useMemo(() => round2(lines.reduce((s, l) => s + l.qty * l.unitCost, 0)), [lines]);

  const submit = () => {
    const validLines = lines.filter(l => l.qty > 0);
    if (validLines.length === 0) { showToast('error', 'Set quantity > 0 on at least one line.'); return; }
    if (!prefilledPO && !supplier) { showToast('error', 'Pick a supplier.'); return; }

    const payload = {
      poId: prefilledPO?.po.id ?? null,
      supplierId: supplier?.id ?? null,
      invoiceRef: invoiceRef || null,
      receiptDate,
      notes: notes || undefined,
      updateCostPrice: updateCost,
      lines: validLines.map<GRNLineInput>(l => ({
        productId: l.productId,
        poLineId: l.poLineId,
        qty: l.qty,
        unitCost: l.unitCost,
        serials: l.tracksSerials ? l.serialsText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : undefined,
      })),
    };
    startTransition(async () => {
      const r = await createGRN(payload);
      if (!r.ok) { showToast('error', r.error); return; }
      showToast('success', `${r.grnNumber} posted.`);
      if (prefilledPO) router.push(`/admin/purchases/po/${prefilledPO.po.id}`);
      else router.push('/admin/purchases');
    });
  };

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-6xl">
      <div className="mb-4">
        <Link href={prefilledPO ? `/admin/purchases/po/${prefilledPO.po.id}` : '/admin/purchases'} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-navy-900 mb-1">
        Receive Goods {prefilledPO && <span className="text-slate-400 font-normal text-2xl">· {prefilledPO.po.po_number}</span>}
      </h1>
      <p className="text-slate-500 mb-6">Stock-in from supplier — posts inventory movements automatically.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          {/* Supplier (only when standalone) */}
          {!prefilledPO && (
            <div className="rounded-md border bg-white p-4 shadow-sm space-y-3">
              <Label>Supplier *</Label>
              {supplier ? (
                <div className="flex items-start justify-between rounded-md bg-slate-50 p-3 border">
                  <div>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{supplier.phone ?? ''}{supplier.gstin ? ` · ${supplier.gstin}` : ''}</div>
                  </div>
                  <Button variant="outline" size="sm" type="button" onClick={() => setSupplier(null)}>Change</Button>
                </div>
              ) : (
                <div className="relative">
                  <Input value={supplierTerm} onChange={(e) => setSupplierTerm(e.target.value)} placeholder="Search supplier…" />
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
                </div>
              )}
            </div>
          )}

          {prefilledPO && (
            <div className="rounded-md border bg-blue-50 border-blue-200 p-3 text-sm text-blue-900">
              Receiving against <strong>{prefilledPO.po.po_number}</strong> from <strong>{(prefilledPO.po.supplier_snapshot as any)?.name ?? 'supplier'}</strong>.
              Reduce quantities below if you&apos;re receiving partially.
            </div>
          )}

          {/* Product picker (standalone) */}
          {!prefilledPO && (
            <div className="rounded-md border bg-white p-4 shadow-sm">
              <Label>Add product</Label>
              <div className="relative mt-2">
                <Input value={productTerm} onChange={(e) => setProductTerm(e.target.value)} placeholder="Search by name or barcode…" />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                {productResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-auto rounded-md border bg-white shadow-lg">
                    {productResults.map(p => (
                      <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0">
                        <div className="font-medium text-sm">{p.name}</div>
                        {p.barcode && <div className="text-xs text-slate-400 font-mono">{p.barcode}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lines */}
          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    {prefilledPO && <th className="px-4 py-3 font-medium text-right">Ordered</th>}
                    {prefilledPO && <th className="px-4 py-3 font-medium text-right">Prev. recv.</th>}
                    <th className="px-4 py-3 font-medium text-right">Receiving</th>
                    <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
                    <th className="px-4 py-3 font-medium text-right">Line</th>
                    {!prefilledPO && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.length === 0 ? (
                    <tr><td colSpan={prefilledPO ? 6 : 5} className="px-4 py-10 text-center text-slate-400">Add products above.</td></tr>
                  ) : lines.map((line, i) => {
                    const update = (patch: Partial<Line>) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
                    const colSpan = prefilledPO ? 6 : 5;
                    const serialCount = line.serialsText.split(/[\n,]+/).filter(s => s.trim()).length;
                    const expectedQty = Math.floor(line.qty);
                    return (
                      <Fragment key={`${line.productId}-${line.poLineId ?? i}`}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">
                          {line.name}
                          {line.tracksSerials && <span className="ml-2 text-xs text-blue-600 font-normal">[serial-tracked]</span>}
                        </td>
                        {prefilledPO && <td className="px-4 py-2 text-right font-mono">{line.qtyOrdered}</td>}
                        {prefilledPO && <td className="px-4 py-2 text-right font-mono text-slate-500">{line.qtyAlreadyReceived}</td>}
                        <td className="px-4 py-2 text-right">
                          <Input type="number" min={0} step="0.01" value={line.qty}
                            onChange={(e) => update({ qty: parseFloat(e.target.value) || 0 })}
                            className="w-24 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input type="number" min={0} step="0.01" value={line.unitCost}
                            onChange={(e) => update({ unitCost: parseFloat(e.target.value) || 0 })}
                            className="w-28 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatMoney(line.qty * line.unitCost, currency)}</td>
                        {!prefilledPO && (
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-slate-400 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                      {line.tracksSerials && (
                        <tr className="bg-blue-50/30">
                          <td colSpan={colSpan} className="px-4 py-2">
                            <Label className="text-xs">Serial numbers (one per line, or comma-separated)</Label>
                            <textarea
                              value={line.serialsText}
                              onChange={(e) => update({ serialsText: e.target.value })}
                              rows={Math.min(4, Math.max(2, expectedQty))}
                              placeholder={`Paste ${expectedQty || 1} serial number(s)…`}
                              className="mt-1 w-full rounded-md border border-input bg-white px-2 py-1 text-xs font-mono"
                            />
                            <div className={`text-xs mt-1 ${serialCount !== expectedQty ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {serialCount} of {expectedQty} serials entered{serialCount !== expectedQty && expectedQty > 0 ? ' — will receive anyway' : ''}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
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
              <Label htmlFor="receipt_date">Receipt date</Label>
              <Input id="receipt_date" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice_ref">Supplier invoice #</Label>
              <Input id="invoice_ref" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="e.g. INV-12345" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="update_cost" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} />
              <Label htmlFor="update_cost" className="cursor-pointer text-sm">Update product cost prices to received cost</Label>
            </div>
          </div>

          <div className="rounded-md border bg-white p-4 shadow-sm">
            <div className="flex justify-between font-bold text-lg">
              <span>Goods value</span>
              <span className="font-mono">{formatMoney(total, currency)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Excludes GST. Use the PO for taxed totals.</p>
          </div>

          <Button type="button" onClick={submit} disabled={pending} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
            {pending ? 'Posting…' : 'Post GRN & update stock'}
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
    </div>
  );
}
