import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { PlusCircle, Edit, ScanLine, Package } from 'lucide-react';
import { DeleteProductButton } from './DeleteProductButton';
import { formatMoney, type Currency } from '@/lib/money';
import { deriveStockStatus } from '@/lib/stock';
import PageHeader from '@/components/admin/PageHeader';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ data: products, error }, { data: settings }] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);

  if (error) console.error('Error fetching products:', error);

  const currency: Currency = (settings?.default_currency ?? 'INR') as Currency;
  const totalProducts = products?.length ?? 0;
  const lowStock = (products ?? []).filter((p: any) => {
    const status = deriveStockStatus(p.stock_qty ?? 0, p.reorder_level ?? 0);
    return status === 'Low Stock';
  }).length;
  const outOfStock = (products ?? []).filter((p: any) => (p.stock_qty ?? 0) <= 0).length;

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Products"
        description="Your full inventory. Click a row to edit."
        actions={
          <>
            <Link
              href="/admin/pos"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-medium transition-colors"
            >
              <ScanLine className="h-4 w-4 text-stone-500" /> Open POS
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
            >
              <PlusCircle className="h-4 w-4" /> Add product
            </Link>
          </>
        }
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Total products" value={String(totalProducts)} />
        <Stat label="Low stock" value={String(lowStock)} tone={lowStock > 0 ? 'warn' : 'neutral'} />
        <Stat label="Out of stock" value={String(outOfStock)} tone={outOfStock > 0 ? 'danger' : 'neutral'} />
        <Stat label="Currency" value={currency} />
      </div>

      {/* Products table */}
      <div className="admin-card overflow-hidden">
        {!products || products.length === 0 ? (
          <EmptyProducts />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-stone-400 border-b border-stone-200">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Category</th>
                  <th className="text-right px-5 py-3 font-medium">Price</th>
                  <th className="text-right px-5 py-3 font-medium">Stock</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((product: any) => {
                  const status = deriveStockStatus(product.stock_qty ?? 0, product.reorder_level ?? 0);
                  return (
                    <tr key={product.id} className="group hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-stone-900">{product.name}</div>
                        {product.barcode && (
                          <div className="text-[11px] text-stone-400 font-mono mt-0.5">{product.barcode}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-stone-600 capitalize">{product.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-stone-900">{formatMoney(product.price, currency)}</td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-stone-900">{product.stock_qty ?? 0}</td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="p-1.5 text-stone-400 hover:text-violet-600 rounded-md hover:bg-violet-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <DeleteProductButton id={product.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'warn' | 'danger' }) {
  const valueClass =
    tone === 'warn' ? 'text-amber-700' :
    tone === 'danger' ? 'text-red-600' :
    'text-stone-900';
  return (
    <div className="admin-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">{label}</div>
      <div className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: 'In Stock' | 'Low Stock' | 'Out of Stock' }) {
  const styles = {
    'In Stock':    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Low Stock':   'bg-amber-50 text-amber-700 border-amber-200',
    'Out of Stock':'bg-red-50 text-red-700 border-red-200',
  } as const;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function EmptyProducts() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <Package className="h-6 w-6 text-stone-400" />
      </div>
      <h3 className="text-sm font-medium text-stone-900">No products yet</h3>
      <p className="text-xs text-stone-500 mt-1.5 mb-5 max-w-xs">
        Add your first product to start tracking stock and ringing up sales.
      </p>
      <Link
        href="/admin/products/new"
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
      >
        <PlusCircle className="h-4 w-4" /> Add product
      </Link>
    </div>
  );
}
