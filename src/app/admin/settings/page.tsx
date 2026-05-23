import { createClient } from '@/utils/supabase/server';
import SettingsForm from './SettingsForm';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const initial = settings ?? { id: 1, legal_name: 'Laxmi Computers', default_currency: 'INR', invoice_prefix: 'LC' };
  return <SettingsForm key={settings?.updated_at ?? 'default'} initial={initial} />;
}
