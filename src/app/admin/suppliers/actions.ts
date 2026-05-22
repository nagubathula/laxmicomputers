'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';

function field(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  return v ? v : null;
}

export async function upsertSupplier(prevState: any, formData: FormData) {
  await requireUser(['admin', 'manager']);
  const supabase = await createClient();

  const id = field(formData, 'id');
  const name = field(formData, 'name');
  if (!name) return { error: 'Name is required.' };

  const payload = {
    name,
    contact_person: field(formData, 'contact_person'),
    phone: field(formData, 'phone'),
    email: field(formData, 'email'),
    gstin: field(formData, 'gstin')?.toUpperCase() ?? null,
    state: field(formData, 'state'),
    state_code: field(formData, 'state_code'),
    address_line1: field(formData, 'address_line1'),
    address_line2: field(formData, 'address_line2'),
    city: field(formData, 'city'),
    pincode: field(formData, 'pincode'),
    payment_terms: field(formData, 'payment_terms'),
    notes: field(formData, 'notes'),
    is_active: formData.get('is_active') === 'on' || formData.get('is_active') === null,
  };

  const { error } = id
    ? await supabase.from('suppliers').update(payload).eq('id', id)
    : await supabase.from('suppliers').insert(payload);

  if (error) return { error: error.message };

  revalidatePath('/admin/suppliers');
  redirect('/admin/suppliers');
}
