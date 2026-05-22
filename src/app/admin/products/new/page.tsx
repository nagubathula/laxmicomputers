'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createProduct } from '@/app/admin/actions';

export default function NewProductPage() {
  const [state, formAction, pending] = useActionState(createProduct, null);

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Add New Product</h1>
        <p className="text-slate-500 mt-1">Enter the details for the new product</p>
      </div>

      <div className="rounded-md border bg-white p-6 shadow-sm">
        <form action={formAction} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" name="name" placeholder="e.g. RTX 4090" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD) *</Label>
              <Input id="price" name="price" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select 
                id="category" 
                name="category" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                defaultValue="laptops"
              >
                <option value="laptops">Laptops</option>
                <option value="graphics-cards">Graphics Cards</option>
                <option value="peripherals">Peripherals</option>
                <option value="components">Other Components</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select 
                id="status" 
                name="status" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                defaultValue="In Stock"
              >
                <option value="In Stock">In Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Pre-order">Pre-order</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" name="image_url" type="url" placeholder="https://example.com/image.jpg" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea 
              id="description" 
              name="description" 
              rows={4} 
              placeholder="Detailed product description..."
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specs">Specifications</Label>
            <Textarea 
              id="specs" 
              name="specs" 
              rows={3} 
              placeholder="e.g. 24GB GDDR6X, 384-bit memory interface, HDMI 2.1 (comma separated)" 
            />
            <p className="text-xs text-slate-500">Enter specifications separated by commas.</p>
          </div>

          {state?.error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 border border-red-200">
              {state.error}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-4 border-t">
            <Link href="/admin">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700">
              {pending ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
