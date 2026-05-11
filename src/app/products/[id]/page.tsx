import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

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
            <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
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
          
          <div className="text-3xl font-bold text-primary">
            ${product.price}
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
