import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { loadPOForReceive } from '../actions';
import GRNEditor from './GRNEditor';

export default async function NewGRNPage(props: { searchParams: Promise<{ po?: string }> }) {
  await requireUser(['admin', 'manager']);
  const { po: poId } = await props.searchParams;

  const supabase = await createClient();
  const { data: settings } = await supabase.from('business_settings').select('default_currency').eq('id', 1).single();
  const currency = (settings?.default_currency ?? 'INR') as 'INR' | 'USD';

  if (poId) {
    const r = await loadPOForReceive(poId);
    if (r.ok) {
      return <GRNEditor currency={currency} prefilledPO={{ po: r.po, lines: r.lines }} />;
    }
  }

  return <GRNEditor currency={currency} prefilledPO={null} />;
}
