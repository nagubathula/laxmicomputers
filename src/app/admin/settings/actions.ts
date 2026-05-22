'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function saveBusinessSettings(prevState: any, formData: FormData) {
  await requireUser(['admin']);
  const supabase = await createClient();

  const payload = {
    id: 1,
    legal_name: (formData.get('legal_name') as string)?.trim() || 'Laxmi Computers',
    address_line1: (formData.get('address_line1') as string)?.trim() || null,
    address_line2: (formData.get('address_line2') as string)?.trim() || null,
    city: (formData.get('city') as string)?.trim() || null,
    state: (formData.get('state') as string)?.trim() || null,
    state_code: (formData.get('state_code') as string)?.trim() || null,
    pincode: (formData.get('pincode') as string)?.trim() || null,
    gstin: (formData.get('gstin') as string)?.trim().toUpperCase() || null,
    pan: (formData.get('pan') as string)?.trim().toUpperCase() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    default_currency: (formData.get('default_currency') as string) || 'INR',
    invoice_prefix: (formData.get('invoice_prefix') as string)?.trim() || 'LC',
    logo_url: (formData.get('logo_url') as string)?.trim() || null,
  };

  const { error } = await supabase
    .from('business_settings')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Settings save error:', error);
    return { error: error.message };
  }

  await audit(supabase, 'settings.update', { entityType: 'business_settings', entityId: '1' });

  revalidatePath('/admin/settings');
  revalidatePath('/admin');
  revalidatePath('/products');
  return { success: true };
}
