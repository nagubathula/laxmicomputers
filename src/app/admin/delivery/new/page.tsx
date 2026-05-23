import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import DCBuilder from './DCBuilder';

export default async function NewDCPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: settings } = await supabase.from('business_settings').select('default_currency').eq('id', 1).single();
  return <DCBuilder currency={(settings?.default_currency ?? 'INR') as 'INR' | 'USD'} />;
}
