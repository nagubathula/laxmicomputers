'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, Search, Trash2, UserPlus, Keyboard, ChevronDown, X, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BarcodeScanner from '@/components/BarcodeScanner';
import ShortcutsOverlay, { type ShortcutGroup } from '@/components/ShortcutsOverlay';
import PageHeader from '@/components/admin/PageHeader';
import { useToast } from '@/components/admin/Toaster';
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatMoney, round2, roundOffDelta, type Currency } from '@/lib/money';
import { computeLineGst, isInterState } from '@/lib/gst';
import { createInvoice, findProductByBarcode, listAvailableSerials, searchCustomers, type CartLineInput } from './actions';

type CartLine = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  hsn: string | null;
  stockAvailable: number;
  tracksSerials: boolean;
  availableSerials: { id: string; serial_number: string }[];
  selectedSerialIds: string[];
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  state: string | null;
  state_code: string | null;
};

type Props = {
  currency: Currency;
  businessStateCode: string | null;
};

const PAYMENT_OPTIONS: { value: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit' | 'mixed'; label: string; key: string }[] = [
  { value: 'cash', label: 'Cash', key: '1' },
  { value: 'upi', label: 'UPI', key: '2' },
  { value: 'card', label: 'Card', key: '3' },
  { value: 'bank_transfer', label: 'Bank', key: '4' },
  { value: 'credit', label: 'Credit', key: '5' },
  { value: 'mixed', label: 'Mixed', key: '6' },
];

export default function POSClient({ currency, businessStateCode }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<typeof PAYMENT_OPTIONS[number]['value']>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [finalBill, setFinalBill] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(-1);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);

  const handleScannedBarcode = async (code: string) => {
    if (!code) return;
    const result = await findProductByBarcode(code);
    if (!result.ok) { toast.error(result.error); return; }
    const p = result.product;
    if (p.stock_qty <= 0 && !cart.find((l) => l.productId === p.id)) {
      toast.error(`"${p.name}" is out of stock`);
      return;
    }

    let availableSerials: { id: string; serial_number: string }[] = [];
    if (p.tracks_serials) {
      const sr = await listAvailableSerials(p.id);
      if (sr.ok) availableSerials = sr.serials as any[];
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.qty + 1 > p.stock_qty) { toast.error(`Only ${p.stock_qty} of "${p.name}" in stock`); return prev; }
        return prev.map((l) => l.productId === p.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, {
        productId: p.id, name: p.name, qty: 1, unitPrice: Number(p.price),
        discount: 0, gstRate: Number(p.gst_rate ?? 0), hsn: p.hsn_code ?? null,
        stockAvailable: p.stock_qty, tracksSerials: !!p.tracks_serials,
        availableSerials, selectedSerialIds: [],
      }];
    });
  };

  useBarcodeWedge({ onScan: handleScannedBarcode, disabled: scannerOpen });

  // Customer search (debounced)
  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await searchCustomers(searchTerm);
      if (res.ok) setSearchResults(res.customers as Customer[]);
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const interState = isInterState(businessStateCode, customer?.state_code);
  const breakdown = useMemo(() => {
    let subtotal = 0, cgst = 0, sgst = 0, igst = 0, discount = 0;
    for (const line of cart) {
      const b = computeLineGst({
        qty: line.qty, unitPrice: line.unitPrice, discount: line.discount,
        gstRate: line.gstRate, interState,
      });
      subtotal = round2(subtotal + b.taxable);
      cgst = round2(cgst + b.cgst); sgst = round2(sgst + b.sgst); igst = round2(igst + b.igst);
      discount = round2(discount + line.discount);
    }
    const preRound = round2(subtotal + cgst + sgst + igst);
    const roundOff = roundOffDelta(preRound);
    const grand = round2(preRound + roundOff);
    return { subtotal, cgst, sgst, igst, discount, roundOff, grand };
  }, [cart, interState]);

  const updateLine = (productId: string, patch: Partial<CartLine>) =>
    setCart((prev) => prev.map((l) => l.productId === productId ? { ...l, ...patch } : l));
  const removeLine = (productId: string) => setCart((prev) => prev.filter((l) => l.productId !== productId));

  // Bill-level override: owner types the final amount they want to charge.
  // Discount = difference between computed grand and the override.
  const parsedFinalBill = parseFloat(finalBill);
  const billDiscount =
    finalBill !== '' && !isNaN(parsedFinalBill) && parsedFinalBill < breakdown.grand && parsedFinalBill > 0
      ? round2(breakdown.grand - parsedFinalBill)
      : 0;
  const effectiveGrand = round2(breakdown.grand - billDiscount);

  const onCheckout = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }

    // Distribute the bill-level discount proportionally across lines by their share of grand.
    const lines = cart.map<CartLineInput>((l) => {
      const lineTotal = computeLineGst({
        qty: l.qty, unitPrice: l.unitPrice, discount: l.discount,
        gstRate: l.gstRate, interState,
      }).total;
      const additionalDiscount = billDiscount > 0
        ? round2(billDiscount * (lineTotal / breakdown.grand))
        : 0;
      return {
        productId: l.productId, qty: l.qty, unitPrice: l.unitPrice,
        discount: round2(l.discount + additionalDiscount),
        serialIds: l.tracksSerials ? l.selectedSerialIds : undefined,
      };
    });

    const payload = {
      customerId: customer?.id ?? null,
      paymentMethod,
      amountPaid: amountPaid === '' ? undefined : parseFloat(amountPaid),
      notes: notes || undefined,
      lines,
    };
    startTransition(async () => {
      const res = await createInvoice(payload);
      if (!res.ok) { toast.error(res.error); return; }
      window.open(`/api/invoices/${res.invoiceId}/pdf`, '_blank');
      toast.success(`Invoice ${res.invoiceNumber} created`);
      setCart([]); setCustomer(null); setAmountPaid(''); setFinalBill(''); setNotes('');
      setSelectedLineIndex(-1);
      router.refresh();
      setTimeout(() => barcodeInputRef.current?.focus(), 50);
    });
  };

  const bumpQty = (delta: number) => {
    if (selectedLineIndex < 0 || selectedLineIndex >= cart.length) return;
    const line = cart[selectedLineIndex];
    const next = line.qty + delta;
    if (next < 1) { removeLine(line.productId); setSelectedLineIndex(-1); return; }
    if (next > line.stockAvailable) { toast.error(`Only ${line.stockAvailable} in stock`); return; }
    updateLine(line.productId, { qty: next });
  };

  useKeyboardShortcuts({
    'f1': () => barcodeInputRef.current?.focus(),
    'f2': () => { setCustomer(null); setTimeout(() => customerInputRef.current?.focus(), 0); },
    'f12': () => onCheckout(),
    'mod+enter': () => onCheckout(),
    'escape': () => {
      if (shortcutsOpen) { setShortcutsOpen(false); return; }
      if (selectedLineIndex >= 0) { setSelectedLineIndex(-1); return; }
      (document.activeElement as HTMLElement | null)?.blur?.();
    },
    'arrowdown': () => setSelectedLineIndex((i) => Math.min(cart.length - 1, i + 1)),
    'arrowup': () => setSelectedLineIndex((i) => Math.max(0, (i < 0 ? cart.length : i) - 1)),
    '+': () => bumpQty(1),
    '=': () => bumpQty(1),
    '-': () => bumpQty(-1),
    'delete': () => { if (selectedLineIndex < 0) return; const l = cart[selectedLineIndex]; removeLine(l.productId); setSelectedLineIndex(-1); },
    'backspace': () => { if (selectedLineIndex < 0) return; const l = cart[selectedLineIndex]; removeLine(l.productId); setSelectedLineIndex(-1); },
    '1': () => setPaymentMethod('cash'),
    '2': () => setPaymentMethod('upi'),
    '3': () => setPaymentMethod('card'),
    '4': () => setPaymentMethod('bank_transfer'),
    '5': () => setPaymentMethod('credit'),
    '?': () => setShortcutsOpen(true),
    'shift+?': () => setShortcutsOpen(true),
  }, { disabled: scannerOpen });

  useEffect(() => {
    if (cart.length > 0 && selectedLineIndex < 0) setSelectedLineIndex(cart.length - 1);
    else if (cart.length === 0 && selectedLineIndex !== -1) setSelectedLineIndex(-1);
    else if (selectedLineIndex >= cart.length) setSelectedLineIndex(cart.length - 1);
  }, [cart.length, selectedLineIndex]);

  const shortcutGroups: ShortcutGroup[] = [
    { title: 'Focus', items: [
      { keys: ['F1'], description: 'Focus barcode / search' },
      { keys: ['F2'], description: 'Pick customer' },
      { keys: ['Esc'], description: 'Clear selection / close' },
    ]},
    { title: 'Cart', items: [
      { keys: ['↑'], description: 'Select previous line' },
      { keys: ['↓'], description: 'Select next line' },
      { keys: ['+'], description: 'Increase qty' },
      { keys: ['−'], description: 'Decrease qty (removes at 0)' },
      { keys: ['Del'], description: 'Remove line' },
    ]},
    { title: 'Payment', items: [
      { keys: ['1'], description: 'Cash' },
      { keys: ['2'], description: 'UPI' },
      { keys: ['3'], description: 'Card' },
      { keys: ['4'], description: 'Bank transfer' },
      { keys: ['5'], description: 'On credit' },
    ]},
    { title: 'Checkout', items: [
      { keys: ['F12'], description: 'Charge & print' },
      { keys: ['Ctrl', '↵'], description: 'Charge & print (alt)' },
      { keys: ['?'], description: 'Show this list' },
    ]},
  ];

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Point of Sale"
        description="Scan a barcode or search to add items. Press ? for shortcuts."
        actions={
          <>
            <div className={`text-xs px-2.5 py-1 rounded-full font-medium ${interState ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {interState ? 'Inter-state · IGST' : 'Intra-state · CGST+SGST'}
            </div>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 px-2 py-1 rounded-md hover:bg-stone-100"
            >
              <Keyboard className="h-3.5 w-3.5" /> Shortcuts
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* LEFT: scan + cart */}
        <div className="space-y-4 min-w-0">
          {/* Scan bar */}
          <div className="admin-card p-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => { e.preventDefault(); handleScannedBarcode(manualBarcode); setManualBarcode(''); }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  <input
                    ref={barcodeInputRef}
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Scan or type barcode…"
                    autoFocus
                    className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-16 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 admin-kbd">F1</span>
                </div>
                <Button type="submit" variant="outline" className="h-11 px-4">Add</Button>
              </form>
              <Button type="button" variant="outline" className="h-11 px-3" onClick={() => setScannerOpen(true)}>
                <ScanBarcode className="h-4 w-4 mr-1.5" /> Camera
              </Button>
            </div>
          </div>

          {/* Cart */}
          <div className="admin-card overflow-hidden">
            {cart.length === 0 ? (
              <EmptyCart />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-stone-400 border-b border-stone-200">
                      <th className="text-left px-4 py-3 font-medium">Item</th>
                      <th className="text-right px-3 py-3 font-medium w-20">Qty</th>
                      <th className="text-right px-3 py-3 font-medium w-28">Unit ₹</th>
                      <th className="text-right px-3 py-3 font-medium w-24">Disc</th>
                      <th className="text-right px-3 py-3 font-medium w-14">GST</th>
                      <th className="text-right px-4 py-3 font-medium w-28">Line</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {cart.map((line, idx) => {
                      const lineTotal = computeLineGst({
                        qty: line.qty, unitPrice: line.unitPrice, discount: line.discount,
                        gstRate: line.gstRate, interState,
                      }).total;
                      const isSelected = idx === selectedLineIndex;
                      return (
                        <Fragment key={line.productId}>
                          <tr
                            className={`group cursor-pointer transition-colors ${isSelected ? 'bg-violet-50/50' : 'hover:bg-stone-50'}`}
                            onClick={() => setSelectedLineIndex(idx)}
                          >
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-stone-900 line-clamp-1">{line.name}</div>
                              {line.hsn && <div className="text-[11px] text-stone-400 mt-0.5">HSN {line.hsn}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number" min={1} max={line.stockAvailable} value={line.qty}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (isNaN(v) || v < 1) return;
                                  if (v > line.stockAvailable) { toast.error(`Only ${line.stockAvailable} in stock`); return; }
                                  updateLine(line.productId, { qty: v });
                                }}
                                className="h-8 w-16 text-right ml-auto"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number" min={0} step="0.01" value={line.unitPrice}
                                onChange={(e) => updateLine(line.productId, { unitPrice: parseFloat(e.target.value) || 0 })}
                                className="h-8 w-24 text-right ml-auto"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number" min={0} step="0.01" value={line.discount}
                                onChange={(e) => updateLine(line.productId, { discount: parseFloat(e.target.value) || 0 })}
                                className="h-8 w-20 text-right ml-auto"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right text-stone-500 font-mono text-xs">{line.gstRate}%</td>
                            <td className="px-4 py-2.5 text-right font-mono text-stone-900 tabular-nums">{formatMoney(lineTotal, currency)}</td>
                            <td className="px-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeLine(line.productId); }}
                                className="p-1.5 rounded text-stone-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                          {line.tracksSerials && (
                            <tr className="bg-violet-50/30 border-b border-stone-100">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-violet-900">
                                    Select {line.qty} serial{line.qty === 1 ? '' : 's'} · {line.selectedSerialIds.length} selected
                                  </span>
                                </div>
                                {line.availableSerials.length === 0 ? (
                                  <div className="text-xs text-amber-700">No serials in stock — record them via GRN first.</div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {line.availableSerials.map((s) => {
                                      const selected = line.selectedSerialIds.includes(s.id);
                                      return (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateLine(line.productId, {
                                              selectedSerialIds: selected
                                                ? line.selectedSerialIds.filter((x) => x !== s.id)
                                                : line.selectedSerialIds.length < line.qty
                                                  ? [...line.selectedSerialIds, s.id]
                                                  : line.selectedSerialIds,
                                            });
                                          }}
                                          className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-colors ${
                                            selected
                                              ? 'bg-violet-600 text-white border-violet-600'
                                              : 'bg-white text-stone-700 border-stone-200 hover:border-violet-300'
                                          }`}
                                        >
                                          {s.serial_number}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: customer · totals · payment */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="admin-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Customer</h3>
              <a href="/admin/customers/new" target="_blank" className="text-xs text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
                <UserPlus className="h-3 w-3" /> New
              </a>
            </div>
            {customer ? (
              <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-stone-900 truncate">{customer.name}</div>
                    <div className="mt-0.5 text-xs text-stone-500 space-y-0.5">
                      {customer.phone && <div>{customer.phone}</div>}
                      {customer.gstin && <div className="font-mono text-[11px]">{customer.gstin}</div>}
                    </div>
                  </div>
                  <button onClick={() => setCustomer(null)} className="p-1 -mr-1 rounded text-stone-400 hover:text-stone-900 hover:bg-stone-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <input
                  ref={customerInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, phone, or GSTIN"
                  className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-12 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 admin-kbd">F2</span>
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-stone-200 bg-white shadow-lg max-h-64 overflow-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCustomer(c); setSearchTerm(''); setSearchResults([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-stone-50 border-b border-stone-100 last:border-0"
                      >
                        <div className="font-medium text-sm text-stone-900">{c.name}</div>
                        <div className="text-xs text-stone-500">{c.phone ?? ''} {c.gstin ? ` · ${c.gstin}` : ''}</div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-stone-400">Leave empty for walk-in</p>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="admin-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Summary</h3>
            <div className="space-y-1.5">
              <Row label="Subtotal" value={formatMoney(breakdown.subtotal, currency)} />
              {breakdown.discount > 0 && <Row label="Line discounts" value={`− ${formatMoney(breakdown.discount, currency)}`} muted />}
              {interState ? (
                <Row label="IGST" value={formatMoney(breakdown.igst, currency)} muted />
              ) : (
                <>
                  <Row label="CGST" value={formatMoney(breakdown.cgst, currency)} muted />
                  <Row label="SGST" value={formatMoney(breakdown.sgst, currency)} muted />
                </>
              )}
              {breakdown.roundOff !== 0 && <Row label="Round off" value={formatMoney(breakdown.roundOff, currency)} muted />}
              <div className="mt-3 pt-3 border-t border-stone-200 flex items-baseline justify-between">
                <span className="text-sm text-stone-500">Bill total</span>
                <span className={`font-mono tabular-nums ${billDiscount > 0 ? 'line-through text-stone-400 text-sm' : 'text-xl font-semibold text-stone-900'}`}>
                  {formatMoney(breakdown.grand, currency)}
                </span>
              </div>

              {/* Final bill override */}
              <div className="pt-2">
                <label className="text-xs text-stone-500 block mb-1.5">
                  Override final bill <span className="text-stone-400">(leave blank to charge full amount)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none">₹</span>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={finalBill}
                    onChange={(e) => setFinalBill(e.target.value)}
                    placeholder={String(breakdown.grand)}
                    className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-7 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                {billDiscount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-emerald-700 font-medium">Auto discount</span>
                    <span className="text-emerald-700 font-mono tabular-nums font-semibold">− {formatMoney(billDiscount, currency)}</span>
                  </div>
                )}
                {finalBill !== '' && !isNaN(parsedFinalBill) && (parsedFinalBill <= 0 || parsedFinalBill >= breakdown.grand) && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    {parsedFinalBill <= 0 ? 'Amount must be greater than zero.' : 'Amount must be less than the bill total.'}
                  </p>
                )}
              </div>

              {billDiscount > 0 && (
                <div className="mt-2 pt-2 border-t border-stone-200 flex items-baseline justify-between">
                  <span className="font-semibold text-stone-900">Final bill</span>
                  <span className="text-xl font-semibold font-mono tabular-nums text-violet-700">{formatMoney(effectiveGrand, currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="admin-card p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2 block">Payment method</label>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_OPTIONS.slice(0, 6).map((opt) => {
                  const active = paymentMethod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`relative h-10 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {opt.label}
                      {opt.key !== '6' && (
                        <span className={`absolute top-1 right-1.5 text-[9px] font-mono ${active ? 'text-violet-100' : 'text-stone-400'}`}>{opt.key}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <details className="text-sm">
              <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-900 inline-flex items-center gap-1 select-none">
                <ChevronDown className="h-3 w-3" /> Amount paid & notes
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="amount_paid" className="text-xs text-stone-500 block mb-1">Amount paid</label>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={`Leave blank for ${formatMoney(breakdown.grand, currency)}`}
                    className="h-9"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="text-xs text-stone-500 block mb-1">Note</label>
                  <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional remark" className="h-9" />
                </div>
              </div>
            </details>

            <button
              type="button"
              onClick={onCheckout}
              disabled={pending || cart.length === 0}
              className="w-full h-12 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-base transition-colors flex items-center justify-center gap-2.5 group"
            >
              <Receipt className="h-4 w-4" />
              <span>{pending ? 'Processing…' : 'Charge'}</span>
              <span className="font-mono tabular-nums">{formatMoney(effectiveGrand, currency)}</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded border border-white/30 bg-white/10 font-mono text-[10px] font-normal">F12</kbd>
            </button>
          </div>
        </div>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onDetected={(code) => { setScannerOpen(false); handleScannedBarcode(code); }}
        onClose={() => setScannerOpen(false)}
      />
      <ShortcutsOverlay open={shortcutsOpen} groups={shortcutGroups} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={muted ? 'text-stone-500' : 'text-stone-700'}>{label}</span>
      <span className={`font-mono tabular-nums ${muted ? 'text-stone-500' : 'text-stone-900'}`}>{value}</span>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <ScanBarcode className="h-7 w-7 text-stone-400" />
      </div>
      <h3 className="text-sm font-medium text-stone-900">Cart is empty</h3>
      <p className="text-xs text-stone-500 mt-1.5 max-w-xs">
        Scan a barcode, type a code in the search bar, or use the camera to add items.
      </p>
    </div>
  );
}
