import Link from 'next/link';
import { ArrowLeft, Truck, FileText, PackagePlus, Users } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function PurchasesHub() {
  await requireUser(['admin', 'manager']);
  const supabase = await createClient();

  const [{ data: pos }, { data: grns }, { data: settings }] = await Promise.all([
    supabase.from('purchase_orders').select('id, po_number, order_date, status, grand_total, supplier_snapshot').order('order_date', { ascending: false }).limit(10),
    supabase.from('goods_receipts').select('id, grn_number, receipt_date, supplier_snapshot, po_id').order('receipt_date', { ascending: false }).limit(10),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency: Currency = (settings?.default_currency ?? 'INR') as Currency;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Purchases</h1>
        <p className="text-slate-500 mt-1">Suppliers, purchase orders, and goods receipts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/suppliers" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow group">
          <Users className="h-6 w-6 text-blue-600 mb-2" />
          <div className="font-semibold">Suppliers</div>
          <div className="text-sm text-slate-500">Vendor master</div>
        </Link>
        <Link href="/admin/purchases/po/new" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <FileText className="h-6 w-6 text-blue-600 mb-2" />
          <div className="font-semibold">New Purchase Order</div>
          <div className="text-sm text-slate-500">Order from supplier</div>
        </Link>
        <Link href="/admin/purchases/grn/new" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <PackagePlus className="h-6 w-6 text-emerald-600 mb-2" />
          <div className="font-semibold">Receive Goods (GRN)</div>
          <div className="text-sm text-slate-500">Stock-in from supplier</div>
        </Link>
        <Link href="/admin/purchases/po" className="rounded-md border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <Truck className="h-6 w-6 text-amber-600 mb-2" />
          <div className="font-semibold">All Orders</div>
          <div className="text-sm text-slate-500">Browse purchase orders</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <div className="border-b bg-slate-50 px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Recent Purchase Orders</h2>
            <Link href="/admin/purchases/po" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs">
                <tr><th className="text-left px-4 py-2 font-medium">Number</th><th className="text-left px-4 py-2 font-medium">Date</th><th className="text-left px-4 py-2 font-medium">Supplier</th><th className="text-left px-4 py-2 font-medium">Status</th><th className="text-right px-4 py-2 font-medium">Total</th></tr>
              </thead>
              <tbody className="divide-y">
                {!pos || pos.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No purchase orders yet.</td></tr>
                ) : pos.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono"><Link href={`/admin/purchases/po/${po.id}`} className="hover:text-blue-600">{po.po_number}</Link></td>
                    <td className="px-4 py-2">{po.order_date}</td>
                    <td className="px-4 py-2">{(po.supplier_snapshot as any)?.name ?? '—'}</td>
                    <td className="px-4 py-2"><StatusBadge status={po.status} /></td>
                    <td className="px-4 py-2 font-mono text-right">{formatMoney(Number(po.grand_total), currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <div className="border-b bg-slate-50 px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Recent Receipts (GRN)</h2>
            <Link href="/admin/purchases/grn/new" className="text-xs text-emerald-700 hover:underline">+ New GRN</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs">
                <tr><th className="text-left px-4 py-2 font-medium">GRN #</th><th className="text-left px-4 py-2 font-medium">Date</th><th className="text-left px-4 py-2 font-medium">Supplier</th><th className="text-left px-4 py-2 font-medium">PO</th></tr>
              </thead>
              <tbody className="divide-y">
                {!grns || grns.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No receipts yet.</td></tr>
                ) : grns.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono">{g.grn_number}</td>
                    <td className="px-4 py-2">{g.receipt_date}</td>
                    <td className="px-4 py-2">{(g.supplier_snapshot as any)?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{g.po_id ? 'Against PO' : 'Direct'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'draft' ? 'bg-slate-400' :
    status === 'sent' ? 'bg-blue-500' :
    status === 'partial' ? 'bg-amber-500' :
    status === 'received' ? 'bg-emerald-500' :
    'bg-red-400';
  return <Badge className={cls}>{status}</Badge>;
}
