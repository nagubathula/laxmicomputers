import { createClient } from '@/utils/supabase/server';
import POSClient from './POSClient';

export default async function POSPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('business_settings').select('default_currency, state_code').eq('id', 1).single();

  return (
    <POSClient
      currency={(settings?.default_currency ?? 'INR') as 'INR' | 'USD'}
      businessStateCode={settings?.state_code ?? null}
    />
  );
}
