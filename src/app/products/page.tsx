'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';

type Product = Database['public']['Tables']['products']['Row'];

export default function ProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const categoryFilter = searchParams?.category;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      let query = supabase.from('products').select('*');
      
      if (categoryFilter) {
        query = query.ilike('category', categoryFilter);
      }
      
      const { data, error } = await query;
      
      if (data) setProducts(data);
      if (error) console.error("Error fetching products:", error);
      setLoading(false);
    }
    
    fetchProducts();
  }, [categoryFilter, supabase]);

  return (
    <div className="container mx-auto min-h-[80vh] px-6 py-16">
      <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {categoryFilter ? <span className="capitalize">{categoryFilter}</span> : 'All Products'}
        </h1>
        <div className="flex items-center gap-4">
          <Select defaultValue="featured">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="flex justify-center py-20 text-muted-foreground">No products found in this category.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <Link href={`/products/${product.id}`} key={product.id}>
              <Card className="flex h-full flex-col transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md">
                <CardHeader className="p-4 pb-0">
                  <div className="mb-4 aspect-square rounded-md bg-secondary flex items-center justify-center overflow-hidden relative">
                    {product.image_url ? (
                      <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    ) : (
                      <span className="text-muted-foreground">Image Placeholder</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col p-4 pt-0">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {product.category}
                    </span>
                    <Badge variant={product.status === 'In Stock' ? 'default' : 'secondary'} className={product.status === 'In Stock' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                      {product.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight line-clamp-2">{product.name}</CardTitle>
                  <span className="text-xl font-bold">${product.price}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
