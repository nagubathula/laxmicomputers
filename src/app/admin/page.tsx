import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { PlusCircle, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DeleteProductButton } from './DeleteProductButton';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="container mx-auto p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Product Catalog</h1>
          <p className="text-slate-500 mt-1">Manage your inventory and store items</p>
        </div>
        <Link 
          href="/admin/products/new" 
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!products || products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No products found. Add some to get started.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-navy-900 line-clamp-1">{product.name}</td>
                    <td className="px-6 py-4"><Badge variant="outline">{product.category}</Badge></td>
                    <td className="px-6 py-4 font-mono">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={product.status === 'In Stock' ? 'default' : 'secondary'} className={product.status === 'In Stock' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                        {product.status}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
