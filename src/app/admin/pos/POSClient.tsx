'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScanBarcode, Search, Trash2, UserPlus, CheckCircle2, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BarcodeScanner from '@/components/BarcodeScanner';
import ShortcutsOverlay, { type ShortcutGroup } from '@/components/ShortcutsOverlay';
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

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default function POSClient({ currency, businessStateCode }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit' | 'mixed'>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(-1);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const amountPaidRef = useRef<HTMLInputElement | null>(null);

  const showToast = (kind: 'error' | 'success', text: string) => {
    setToast({ kind, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // Add product to cart by barcode (used by both hardware wedge and camera scan)
  const handleScannedBarcode = async (code: string) => {
    if (!code) return;
    const result = await findProductByBarcode(code);
    if (!result.ok) { showToast('error', result.error); return; }
    const p = result.product;
    if (p.stock_qty <= 0 && !cart.find(l => l.productId === p.id)) {
      showToast('error', `"${p.name}" is out of stock.`);
      return;
    }

    // Pre-load available serials if this product tracks them
    let availableSerials: { id: string; serial_number: string }[] = [];
    if (p.tracks_serials) {
      const serialResult = await listAvailableSerials(p.id);
      if (serialResult.ok) availableSerials = serialResult.serials as any[];
    }

    setCart(prev => {
      const existing = prev.find(l => l.productId === p.id);
      if (existing) {
        if (existing.qty + 1 > p.stock_qty) {
          showToast('error', `Only ${p.stock_qty} of "${p.name}" in stock.`);
          return prev;
        }
        return prev.map(l => l.productId === p.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, {
        productId: p.id,
        name: p.name,
        qty: 1,
        unitPrice: Number(p.price),
        discount: 0,
        gstRate: Number(p.gst_rate ?? 0),
        hsn: p.hsn_code ?? null,
        stockAvailable: p.stock_qty,
        tracksSerials: !!p.tracks_serials,
        availableSerials,
        selectedSerialIds: [],
      }];
    });
    showToast('success', `Added ${p.name}`);
  };

  useBarcodeWedge({
    onScan: handleScannedBarcode,
    disabled: scannerOpen,
  });

  // Live customer search (debounced)
  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await searchCustomers(searchTerm);
      if (res.ok) setSearchResults(res.customers as Customer[]);
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ===== Totals =====
  const interState = isInterState(businessStateCode, customer?.state_code);
  const breakdown = useMemo(() => {
    let subtotal = 0, cgst = 0, sgst = 0, igst = 0, discount = 0;
    for (const line of cart) {
      const b = computeLineGst({
        qty: line.qty, unitPrice: line.unitPrice, discount: line.discount,
        gstRate: line.gstRate, interState,
      });
      subtotal = round2(subtotal + b.taxable);
      cgst = round2(cgst + b.cgst);
      sgst = round2(sgst + b.sgst);
      igst = round2(igst + b.igst);
      discount = round2(discount + line.discount);
    }
    const preRound = round2(subtotal + cgst + sgst + igst);
    const roundOff = roundOffDelta(preRound);
    const grand = round2(preRound + roundOff);
    return { subtotal, cgst, sgst, igst, discount, roundOff, grand };
  }, [cart, interState]);

  const updateLine = (productId: string, patch: Partial<CartLine>) => {
    setCart(prev => prev.map(l => l.productId === productId ? { ...l, ...patch } : l));
  };
  const removeLine = (productId: string) => setCart(prev => prev.filter(l => l.productId !== productId));

  const onCheckout = () => {
    if (cart.length === 0) { showToast('error', 'Cart is empty.'); return; }
    const payload = {
      customerId: customer?.id ?? null,
      paymentMethod,
      amountPaid: amountPaid === '' ? undefined : parseFloat(amountPaid),
      notes: notes || undefined,
      lines: cart.map<CartLineInput>(l => ({
        productId: l.productId, qty: l.qty, unitPrice: l.unitPrice, discount: l.discount,
        serialIds: l.tracksSerials ? l.selectedSerialIds : undefined,
      })),
    };
    startTransition(async () => {
      const res = await createInvoice(payload);
      if (!res.ok) { showToast('error', res.error); return; }
      // Open invoice PDF in a new tab and reset the cart
      window.open(`/api/invoices/${res.invoiceId}/pdf`, '_blank');
      showToast('success', `Invoice ${res.invoiceNumber} created.`);
      setCart([]); setCustomer(null); setAmountPaid(''); setNotes('');
      setSelectedLineIndex(-1);
      router.refresh();
      // Re-focus the barcode input for the next sale
      setTimeout(() => barcodeInputRef.current?.focus(), 50);
    });
  };

  // Selection-aware line mutations driven by keyboard
  const bumpQty = (delta: number) => {
    if (selectedLineIndex < 0 || selectedLineIndex >= cart.length) return;
    const line = cart[selectedLineIndex];
    const nextQty = line.qty + delta;
    if (nextQty < 1) { removeLine(line.productId); setSelectedLineIndex(-1); return; }
    if (nextQty > line.stockAvailable) { showToast('error', `Only ${line.stockAvailable} in stock.`); return; }
    updateLine(line.productId, { qty: nextQty });
  };

  // ===== Keyboard shortcuts =====
  // The barcode wedge already swallows scanner bursts; single keypresses fall
  // through to this hook. F-keys + modifier combos work even inside inputs.
  useKeyboardShortcuts(
    {
      'f1': () => barcodeInputRef.current?.focus(),
      'f2': () => { setCustomer(null); setTimeout(() => customerInputRef.current?.focus(), 0); },
      'f12': () => onCheckout(),
      'mod+enter': () => onCheckout(),
      'escape': () => {
        // Close shortcuts overlay first, else clear selection, else blur
        if (shortcutsOpen) { setShortcutsOpen(false); return; }
        if (selectedLineIndex >= 0) { setSelectedLineIndex(-1); return; }
        (document.activeElement as HTMLElement | null)?.blur?.();
      },
      'arrowdown': () => setSelectedLineIndex(i => Math.min(cart.length - 1, i + 1)),
      'arrowup': () => setSelectedLineIndex(i => Math.max(0, (i < 0 ? cart.length : i) - 1)),
      '+': () => bumpQty(1),
      '=': () => bumpQty(1),         // shift not required on most keyboards
      '-': () => bumpQty(-1),
      'delete': () => {
        if (selectedLineIndex < 0) return;
        const line = cart[selectedLineIndex];
        removeLine(line.productId);
        setSelectedLineIndex(-1);
      },
      'backspace': () => {
        // Only when no input has focus (handled by hook) — duplicates Delete
        if (selectedLineIndex < 0) return;
        const line = cart[selectedLineIndex];
        removeLine(line.productId);
        setSelectedLineIndex(-1);
      },
      '1': () => setPaymentMethod('cash'),
      '2': () => setPaymentMethod('upi'),
      '3': () => setPaymentMethod('card'),
      '4': () => setPaymentMethod('bank_transfer'),
      '5': () => setPaymentMethod('credit'),
      '?': () => setShortcutsOpen(true),
      'shift+?': () => setShortcutsOpen(true),
    },
    { disabled: scannerOpen },
  );

  // Auto-select the most recently added line so + / - have something to act on
  useEffect(() => {
    if (cart.length > 0 && selectedLineIndex < 0) {
      setSelectedLineIndex(cart.length - 1);
    } else if (cart.length === 0 && selectedLineIndex !== -1) {
      setSelectedLineIndex(-1);
    } else if (selectedLineIndex >= cart.length) {
      setSelectedLineIndex(cart.length - 1);
    }
  }, [cart.length, selectedLineIndex]);

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Focus',
      items: [
        { keys: ['F1'], description: 'Focus barcode / search' },
        { keys: ['F2'], description: 'Pick customer' },
        { keys: ['Esc'], description: 'Clear selection / close' },
      ],
    },
    {
      title: 'Cart',
      items: [
        { keys: ['↑'], description: 'Select previous line' },
        { keys: ['↓'], description: 'Select next line' },
        { keys: ['+'], description: 'Increase qty on selected line' },
        { keys: ['−'], description: 'Decrease qty (removes at 0)' },
        { keys: ['Del'], description: 'Remove selected line' },
      ],
    },
    {
      title: 'Payment',
      items: [
        { keys: ['1'], description: 'Cash' },
        { keys: ['2'], description: 'UPI' },
        { keys: ['3'], description: 'Card' },
        { keys: ['4'], description: 'Bank transfer' },
        { keys: ['5'], description: 'On credit' },
      ],
    },
    {
      title: 'Checkout',
      items: [
        { keys: ['F12'], description: 'Charge & print' },
        { keys: ['Ctrl', '↵'], description: 'Charge & print (alt)' },
        { keys: ['?'], description: 'Show this list' },
      ],
    },
  ];

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="text-sm text-slate-500">
          {interState ? <span className="font-medium text-amber-700">Inter-state sale (IGST)</span> :
            <span className="font-medium text-emerald-700">Intra-state sale (CGST+SGST)</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* LEFT: cart & scan */}
        <div className="space-y-4">
          <div className="rounded-md border bg-white p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-2">
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => { e.preventDefault(); handleScannedBarcode(manualBarcode); setManualBarcode(''); }}
              >
                <Input
                  ref={barcodeInputRef}
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Scan barcode or type and press Enter…  [F1]"
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" variant="outline"><Search className="h-4 w-4 mr-1" /> Add</Button>
              </form>
              <Button type="button" variant="outline" onClick={() => setScannerOpen(true)}>
                <ScanBarcode className="h-4 w-4 mr-1" /> Camera
              </Button>
              <Button type="button" variant="outline" onClick={() => setShortcutsOpen(true)} title="Show keyboard shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Hardware scanner is hands-free. Keyboard: <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">F1</kbd> barcode · <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">↑↓</kbd> select · <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">+/−</kbd> qty · <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">F12</kbd> charge · <kbd className="px-1 py-0.5 rounded border bg-slate-50 font-mono text-[10px]">?</kbd> help
            </p>
          </div>

          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium text-right">Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Unit ₹</th>
                    <th className="px-4 py-3 font-medium text-right">Disc</th>
                    <th className="px-4 py-3 font-medium text-right">GST%</th>
                    <th className="px-4 py-3 font-medium text-right">Line</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cart.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Scan a barcode to add the first item.</td></tr>
                  ) : cart.map((line, idx) => {
                    const lineTotal = computeLineGst({
                      qty: line.qty, unitPrice: line.unitPrice, discount: line.discount,
                      gstRate: line.gstRate, interState,
                    }).total;
                    const isSelected = idx === selectedLineIndex;
                    return (
                      <Fragment key={line.productId}>
                      <tr
                        className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                        onClick={() => setSelectedLineIndex(idx)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-navy-900 line-clamp-1">{line.name}</div>
                          {line.hsn && <div className="text-xs text-slate-400">HSN {line.hsn}</div>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number" min={1} max={line.stockAvailable}
                            value={line.qty}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (isNaN(v) || v < 1) return;
                              if (v > line.stockAvailable) { showToast('error', `Only ${line.stockAvailable} in stock.`); return; }
                              updateLine(line.productId, { qty: v });
                            }}
                            className="w-20 text-right ml-auto"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number" min={0} step="0.01" value={line.unitPrice}
                            onChange={(e) => updateLine(line.productId, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-24 text-right ml-auto"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number" min={0} step="0.01" value={line.discount}
                            onChange={(e) => updateLine(line.productId, { discount: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-right ml-auto"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{line.gstRate}%</td>
                        <td className="px-4 py-3 text-right font-mono">{formatMoney(lineTotal, currency)}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => removeLine(line.productId)} className="p-1 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {line.tracksSerials && (
                        <tr className="bg-blue-50/40">
                          <td colSpan={7} className="px-4 py-2">
                            <div className="text-xs text-blue-900 font-medium mb-1">
                              Select {line.qty} serial number{line.qty === 1 ? '' : 's'} ({line.selectedSerialIds.length} selected)
                            </div>
                            {line.availableSerials.length === 0 ? (
                              <div className="text-xs text-amber-700">No serials in stock — record them via GRN first, or sale will fail.</div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {line.availableSerials.map(s => {
                                  const selected = line.selectedSerialIds.includes(s.id);
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        updateLine(line.productId, {
                                          selectedSerialIds: selected
                                            ? line.selectedSerialIds.filter(x => x !== s.id)
                                            : line.selectedSerialIds.length < line.qty
                                              ? [...line.selectedSerialIds, s.id]
                                              : line.selectedSerialIds,
                                        });
                                      }}
                                      className={`text-xs font-mono px-2 py-1 rounded border ${
                                        selected ? 'bg-blue-600 text-white border-blue-600'
                                                 : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
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
          </div>
        </div>

        {/* RIGHT: customer + totals + payment */}
        <div className="space-y-4">
          <div className="rounded-md border bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-navy-900">Customer</div>
              <Link href="/admin/customers/new" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                <UserPlus className="h-3 w-3" /> New
              </Link>
            </div>
            {customer ? (
              <div className="rounded-md bg-slate-50 p-3 border">
                <div className="font-medium">{customer.name}</div>
                <div className="text-xs text-slate-500 space-y-0.5 mt-1">
                  {customer.phone && <div>{customer.phone}</div>}
                  {customer.gstin && <div className="font-mono">{customer.gstin}</div>}
                  {customer.state && <div>{customer.state} ({customer.state_code})</div>}
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setCustomer(null)}>Remove</Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  ref={customerInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, phone or GSTIN…  [F2]"
                />
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-md border bg-white shadow-lg max-h-64 overflow-auto">
                    {searchResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCustomer(c); setSearchTerm(''); setSearchResults([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0"
                      >
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.phone ?? ''} {c.gstin ? ` · ${c.gstin}` : ''}</div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-400">Leave empty for walk-in.</p>
              </div>
            )}
          </div>

          <div className="rounded-md border bg-white p-4 shadow-sm space-y-2">
            <div className="font-semibold text-navy-900 mb-1">Totals</div>
            <Row label="Subtotal (taxable)" value={formatMoney(breakdown.subtotal, currency)} />
            {breakdown.discount > 0 && <Row label="Discount" value={`− ${formatMoney(breakdown.discount, currency)}`} />}
            {interState ? (
              <Row label={`IGST`} value={formatMoney(breakdown.igst, currency)} />
            ) : (
              <>
                <Row label="CGST" value={formatMoney(breakdown.cgst, currency)} />
                <Row label="SGST" value={formatMoney(breakdown.sgst, currency)} />
              </>
            )}
            {breakdown.roundOff !== 0 && <Row label="Round off" value={formatMoney(breakdown.roundOff, currency)} />}
            <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
              <span>Grand Total</span>
              <span className="font-mono">{formatMoney(breakdown.grand, currency)}</span>
            </div>
          </div>

          <div className="rounded-md border bg-white p-4 shadow-sm space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment_method">Payment <span className="text-xs text-slate-400 font-normal ml-1">[1-5]</span></Label>
              <select id="payment_method" className={selectClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                <option value="cash">1 — Cash</option>
                <option value="upi">2 — UPI</option>
                <option value="card">3 — Card</option>
                <option value="bank_transfer">4 — Bank Transfer</option>
                <option value="credit">5 — On Credit</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount_paid">Amount Paid</Label>
              <Input ref={amountPaidRef} id="amount_paid" type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder={String(breakdown.grand)} />
              <p className="text-xs text-slate-500">Leave blank to mark fully paid.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional remark" />
            </div>

            <Button type="button" onClick={onCheckout} disabled={pending || cart.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base">
              <span>{pending ? 'Processing…' : `Charge ${formatMoney(breakdown.grand, currency)}`}</span>
              <kbd className="ml-2 px-1.5 py-0.5 rounded border border-white/30 bg-white/10 font-mono text-[10px] font-normal">F12</kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-md px-4 py-3 shadow-lg border text-sm flex items-center gap-2 ${
          toast.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.kind === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      <BarcodeScanner
        open={scannerOpen}
        onDetected={(code) => { setScannerOpen(false); handleScannedBarcode(code); }}
        onClose={() => setScannerOpen(false)}
      />

      <ShortcutsOverlay open={shortcutsOpen} groups={shortcutGroups} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
