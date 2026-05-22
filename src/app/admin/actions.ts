'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { recordStockMovement } from '@/lib/stock'
import { audit } from '@/lib/audit'

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw === null || raw === '') return null;
  const n = parseFloat(raw as string);
  return isNaN(n) ? null : n;
}

function int(formData: FormData, key: string, fallback = 0): number {
  const raw = formData.get(key);
  if (raw === null || raw === '') return fallback;
  const n = parseInt(raw as string, 10);
  return isNaN(n) ? fallback : n;
}

export async function createProduct(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized. Please log in.' };

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = num(formData, 'price');
  const category = formData.get('category') as string;
  const image_url = formData.get('image_url') as string;
  const specsString = formData.get('specs') as string;
  const barcode = formData.get('barcode') as string;
  const hsn_code = formData.get('hsn_code') as string;
  const gst_rate = num(formData, 'gst_rate') ?? 18;
  const cost_price = num(formData, 'cost_price');
  const reorder_level = int(formData, 'reorder_level', 0);
  const opening_qty = int(formData, 'opening_qty', 0);
  const tracks_serials = formData.get('tracks_serials') === 'on';

  if (!name || !description || price === null || !category) {
    return { error: 'Please fill in all required fields.' };
  }

  const specs: string[] = specsString
    ? specsString.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const { data: inserted, error } = await supabase
    .from('products')
    .insert({
      name,
      description,
      price,
      category,
      image_url: image_url || null,
      specs,
      barcode: barcode?.trim() || null,
      hsn_code: hsn_code?.trim() || null,
      gst_rate,
      cost_price,
      reorder_level,
      tracks_serials,
      stock_qty: 0, // stock is only set via stock_movements
      // status column intentionally not set; derived from stock_qty
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('Insert error:', error);
    return { error: error?.message ?? 'Failed to create product' };
  }

  if (opening_qty > 0) {
    const result = await recordStockMovement(supabase, {
      productId: inserted.id,
      qtyDelta: opening_qty,
      reason: 'opening',
      note: 'Opening stock on creation',
      createdBy: user.id,
    });
    if (!result.ok) {
      // Product is in; opening stock failed — surface it but don't roll back.
      console.error('Opening stock failed:', result.error);
      return { error: `Product created, but opening stock failed: ${result.error}` };
    }
  }

  revalidatePath('/admin');
  revalidatePath('/products');
  redirect('/admin');
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Product ID is required');

  // Capture product name for audit log
  const { data: existing } = await supabase.from('products').select('name').eq('id', id).single();

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    console.error('Delete error:', error);
    throw new Error(error.message);
  }

  await audit(supabase, 'product.delete', {
    entityType: 'product',
    entityId: id,
    details: { name: existing?.name },
  });

  revalidatePath('/admin');
  revalidatePath('/products');
}

export async function updateProduct(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized. Please log in.' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Product ID is missing.' };

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = num(formData, 'price');
  const category = formData.get('category') as string;
  const image_url = formData.get('image_url') as string;
  const specsString = formData.get('specs') as string;
  const barcode = formData.get('barcode') as string;
  const hsn_code = formData.get('hsn_code') as string;
  const gst_rate = num(formData, 'gst_rate') ?? 18;
  const cost_price = num(formData, 'cost_price');
  const reorder_level = int(formData, 'reorder_level', 0);
  const stock_adjustment = int(formData, 'stock_adjustment', 0);
  const adjustment_note = formData.get('adjustment_note') as string | null;
  const tracks_serials = formData.get('tracks_serials') === 'on';

  if (!name || !description || price === null || !category) {
    return { error: 'Please fill in all required fields.' };
  }

  const specs: string[] = specsString
    ? specsString.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const { error } = await supabase
    .from('products')
    .update({
      name,
      description,
      price,
      category,
      image_url: image_url || null,
      specs,
      barcode: barcode?.trim() || null,
      hsn_code: hsn_code?.trim() || null,
      gst_rate,
      cost_price,
      reorder_level,
      tracks_serials,
    })
    .eq('id', id);

  if (error) {
    console.error('Update error:', error);
    return { error: error.message };
  }

  if (stock_adjustment !== 0) {
    const result = await recordStockMovement(supabase, {
      productId: id,
      qtyDelta: stock_adjustment,
      reason: 'adjustment',
      note: adjustment_note || 'Manual adjustment from edit form',
      createdBy: user.id,
    });
    if (!result.ok) return { error: result.error };
  }

  revalidatePath('/admin');
  revalidatePath('/products');
  redirect('/admin');
}
