'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

function field(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  return v ? v : null;
}

export async function upsertCustomer(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const id = field(formData, 'id');
  const name = field(formData, 'name');
  if (!name) return { error: 'Name is required.' };

  const payload = {
    name,
    phone: field(formData, 'phone'),
    email: field(formData, 'email'),
    gstin: field(formData, 'gstin')?.toUpperCase() ?? null,
    state: field(formData, 'state'),
    state_code: field(formData, 'state_code'),
    address_line1: field(formData, 'address_line1'),
    address_line2: field(formData, 'address_line2'),
    city: field(formData, 'city'),
    pincode: field(formData, 'pincode'),
    notes: field(formData, 'notes'),
  };

  let error;
  if (id) {
    ({ error } = await supabase.from('customers').update(payload).eq('id', id));
  } else {
    ({ error } = await supabase.from('customers').insert(payload));
  }

  if (error) {
    console.error('Customer save error:', error);
    return { error: error.message };
  }

  revalidatePath('/admin/customers');
  redirect('/admin/customers');
}

export async function deleteCustomer(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Customer ID required');

  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/customers');
}
