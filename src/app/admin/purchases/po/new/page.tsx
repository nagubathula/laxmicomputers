import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import POEditor from './POEditor';

export default async function NewPOPage() {
  await requireUser(['admin', 'manager']);
  const supabase = await createClient();
  const { data: settings } = await supabase.from('business_settings').select('default_currency, state_code').eq('id', 1).single();
  return (
    <POEditor
      currency={(settings?.default_currency ?? 'INR') as 'INR' | 'USD'}
      businessStateCode={settings?.state_code ?? null}
    />
  );
}
