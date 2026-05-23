import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';
import { formatMoney, type Currency } from '@/lib/money';
import { deriveStockStatus } from '@/lib/stock';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product, error }, { data: settings }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency: Currency = (settings?.default_currency ?? 'INR') as Currency;

  if (error || !product) {
    notFound();
  }

  // Parse specs if it's a string or array
  let specs: string[] = [];
  try {
    if (Array.isArray(product.specs)) {
      specs = product.specs as string[];
    } else if (typeof product.specs === 'string') {
      specs = JSON.parse(product.specs);
    }
  } catch (e) {
    console.error("Failed to parse specs", e);
  }

  return (
    <div className="container mx-auto min-h-[80vh] px-6 py-16">
      <Link href="/products" className="mb-8 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        &larr; Back to Products
      </Link>
      
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        {/* Product Image Section */}
        <div className="flex aspect-square items-center justify-center rounded-xl border bg-secondary relative overflow-hidden">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          ) : (
            <span className="text-xl text-muted-foreground">High-Res Product Image</span>
          )}
        </div>
        
        {/* Product Details Section */}
        <div className="flex flex-col gap-6">
          <div>
            <Badge variant="outline" className="mb-3">
              {product.category}
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{product.name}</h1>
          </div>
          
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold text-primary">
              {formatMoney(product.price, currency)}
            </div>
            <Badge
              className={
                deriveStockStatus((product as any).stock_qty ?? 0, (product as any).reorder_level ?? 0) === 'In Stock'
                  ? 'bg-emerald-500'
                  : deriveStockStatus((product as any).stock_qty ?? 0, (product as any).reorder_level ?? 0) === 'Low Stock'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }
            >
              {deriveStockStatus((product as any).stock_qty ?? 0, (product as any).reorder_level ?? 0)}
            </Badge>
          </div>
          
          <p className="text-lg leading-relaxed text-muted-foreground">
            {product.description}
          </p>
          
          {specs.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Key Specifications</h3>
                <ul className="flex flex-col gap-2 pl-5 list-disc text-muted-foreground">
                  {specs.map((spec, i) => (
                    <li key={i}>{spec}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          

        </div>
      </div>
    </div>
  );
}
