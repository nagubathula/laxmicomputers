import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { PlusCircle, Edit, ScanLine, Users, Settings as SettingsIcon, FileText, Truck, BarChart3, Wrench, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DeleteProductButton } from './DeleteProductButton';
import { formatMoney, type Currency } from '@/lib/money';
import { deriveStockStatus } from '@/lib/stock';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ data: products, error }, { data: settings }] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);

  if (error) {
    console.error('Error fetching products:', error);
  }

  const currency: Currency = (settings?.default_currency ?? 'INR') as Currency;

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Product Catalog</h1>
          <p className="text-slate-500 mt-1">Manage inventory, stock, and pricing</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/pos" className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm">
            <ScanLine className="h-4 w-4" /> Open POS
          </Link>
          <Link href="/admin/invoices" className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <FileText className="h-4 w-4" /> Invoices
          </Link>
          <Link href="/admin/quotes" className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <ClipboardList className="h-4 w-4" /> Quotes
          </Link>
          <Link href="/admin/service" className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <Wrench className="h-4 w-4" /> Service
          </Link>
          <Link href="/admin/purchases" className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <Truck className="h-4 w-4" /> Purchases
          </Link>
          <Link href="/admin/reports" className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <BarChart3 className="h-4 w-4" /> Reports
          </Link>
          <Link href="/admin/customers" className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <Users className="h-4 w-4" /> Customers
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
          <Link href="/admin/products/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
            <PlusCircle className="h-4 w-4" /> Add Product
          </Link>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">Stock</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!products || products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No products found. Add some to get started.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const status = deriveStockStatus(product.stock_qty ?? 0, product.reorder_level ?? 0);
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-navy-900">
                        <div className="line-clamp-1">{product.name}</div>
                        {product.barcode && (
                          <div className="text-xs text-slate-400 font-mono">{product.barcode}</div>
                        )}
                      </td>
                      <td className="px-6 py-4"><Badge variant="outline">{product.category}</Badge></td>
                      <td className="px-6 py-4 font-mono text-right">{formatMoney(product.price, currency)}</td>
                      <td className="px-6 py-4 font-mono text-right">{product.stock_qty ?? 0}</td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            status === 'In Stock' ? 'bg-emerald-500 hover:bg-emerald-600' :
                            status === 'Low Stock' ? 'bg-amber-500 hover:bg-amber-600' :
                            'bg-red-500 hover:bg-red-600'
                          }
                        >
                          {status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/products/${product.id}/edit`} className="p-2 text-slate-400 hover:text-blue-600 rounded-sm hover:bg-blue-50 transition-colors" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Link>
                          <DeleteProductButton id={product.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
