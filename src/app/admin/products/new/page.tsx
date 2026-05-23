'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge';
import { createProduct } from '@/app/admin/actions';
import { ImageUpload } from '@/components/admin/ImageUpload';

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function NewProductPage() {
  const [state, formAction, pending] = useActionState(createProduct, null);
  const [barcode, setBarcode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  useBarcodeWedge({ onScan: setBarcode, disabled: scannerOpen });

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
        <p className="text-slate-500 mt-1">Stock status is derived from quantity automatically.</p>
      </div>

      <div className="rounded-md border bg-white p-6 shadow-sm">
        <form action={formAction} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" name="name" placeholder="e.g. RTX 4090" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select id="category" name="category" className={selectClass} required defaultValue="laptops">
                <option value="laptops">Laptops</option>
                <option value="graphics-cards">Graphics Cards</option>
                <option value="peripherals">Peripherals</option>
                <option value="components">Other Components</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Selling Price (₹) *</Label>
              <Input id="price" name="price" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price (₹)</Label>
              <Input id="cost_price" name="cost_price" type="number" step="0.01" min="0" placeholder="0.00" />
              <p className="text-xs text-slate-500">Used for margin reports. Not shown to customers.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hsn_code">HSN Code</Label>
              <Input id="hsn_code" name="hsn_code" placeholder="e.g. 8471" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst_rate">GST Rate (%)</Label>
              <select id="gst_rate" name="gst_rate" className={selectClass} defaultValue="18">
                <option value="0">0% (exempt)</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening_qty">Opening Stock</Label>
              <Input id="opening_qty" name="opening_qty" type="number" min="0" defaultValue="0" />
              <p className="text-xs text-slate-500">Recorded as an &apos;opening&apos; movement.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_level">Reorder Level</Label>
              <Input id="reorder_level" name="reorder_level" type="number" min="0" defaultValue="0" />
              <p className="text-xs text-slate-500">Show &apos;Low Stock&apos; when qty ≤ this.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="tracks_serials" name="tracks_serials" className="h-4 w-4" />
                <Label htmlFor="tracks_serials" className="cursor-pointer">Track serial numbers</Label>
              </div>
              <p className="text-xs text-slate-500">For laptops, GPUs, monitors etc. — each unit has its own serial. Enables warranty lookup and per-unit history.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product Image</Label>
            <ImageUpload />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                name="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter manually"
              />
              <Button type="button" variant="outline" onClick={() => setScannerOpen(true)}>
                <ScanBarcode className="h-4 w-4 mr-1" /> Scan
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" name="description" rows={4} placeholder="Detailed product description..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specs">Specifications</Label>
            <Textarea id="specs" name="specs" rows={3} placeholder="e.g. 24GB GDDR6X, 384-bit memory interface, HDMI 2.1 (comma separated)" />
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

      <BarcodeScanner
        open={scannerOpen}
        onDetected={(code) => { setBarcode(code); setScannerOpen(false); }}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
