'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function createProduct(prevState: any, formData: FormData) {
  const supabase = await createClient();

  // Authentication check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized. Please log in.' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const priceString = formData.get('price') as string;
  const price = parseFloat(priceString);
  const category = formData.get('category') as string;
  const status = formData.get('status') as string;
  const image_url = formData.get('image_url') as string;
  const specsString = formData.get('specs') as string;

  // Basic validation
  if (!name || !description || isNaN(price) || !category || !status) {
    return { error: 'Please fill in all required fields.' };
  }

  // Parse specs if provided (assuming comma separated)
  let specs: string[] = [];
  if (specsString) {
    specs = specsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  const { error } = await supabase.from('products').insert({
    name,
    description,
    price,
    category,
    status,
    image_url: image_url || null,
    specs: specs,
  });

  if (error) {
    console.error("Insert error:", error);
    return { error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/products');
  redirect('/admin');
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const id = formData.get('id') as string;
  
  if (!id) {
    throw new Error('Product ID is required');
  }

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    console.error("Delete error:", error);
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/products');
}

export async function updateProduct(prevState: any, formData: FormData) {
  const supabase = await createClient();

  // Authentication check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized. Please log in.' };
  }

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const priceString = formData.get('price') as string;
  const price = parseFloat(priceString);
  const category = formData.get('category') as string;
  const status = formData.get('status') as string;
  const image_url = formData.get('image_url') as string;
  const specsString = formData.get('specs') as string;

  if (!id) return { error: 'Product ID is missing.' };

  // Basic validation
  if (!name || !description || isNaN(price) || !category || !status) {
    return { error: 'Please fill in all required fields.' };
  }

  // Parse specs if provided
  let specs: string[] = [];
  if (specsString) {
    specs = specsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  const { error } = await supabase.from('products').update({
    name,
    description,
    price,
    category,
    status,
    image_url: image_url || null,
    specs: specs,
  }).eq('id', id);

  if (error) {
    console.error("Update error:", error);
    return { error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/products');
  redirect('/admin');
}
