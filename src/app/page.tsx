import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: trendingProducts } = await supabase
    .from('products')
    .select('*')
    .limit(4);

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.05)_0,transparent_50%)]"></div>
        <div className="container mx-auto px-6 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl">
            Next-Gen <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">Hardware</span> for Enthusiasts
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Elevate your build with premium components, unparalleled performance, and cutting-edge aesthetics.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/products" className={buttonVariants({ size: "lg" })}>Shop Now</Link>
            <Link href="/products?category=new" className={buttonVariants({ size: "lg", variant: "secondary" })}>View New Arrivals</Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto my-24 px-6">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Featured Categories</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {['Processors', 'Graphics Cards', 'Motherboards', 'Memory'].map((category) => (
            <Link key={category} href={`/products?category=${category.toLowerCase()}`}>
              <Card className="flex h-48 flex-col items-center justify-center transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md">
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Explore</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      
      <section className="container mx-auto my-24 px-6">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Trending Products</h2>
          <Link href="/products" className={buttonVariants({ variant: "link", className: "font-semibold" })}>View All &rarr;</Link>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trendingProducts?.map((product) => (
            <Link href={`/products/${product.id}`} key={product.id}>
              <Card className="flex h-full flex-col transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md">
                <CardHeader className="p-4">
                  <div className="mb-4 aspect-square rounded-md bg-secondary flex items-center justify-center overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-muted-foreground">Image</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs uppercase tracking-wider">{product.category}</CardDescription>
                    <span className="font-bold text-primary">${product.price}</span>
                  </div>
                  <CardTitle className="mt-2 text-lg line-clamp-1">{product.name}</CardTitle>
                </CardHeader>

              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
