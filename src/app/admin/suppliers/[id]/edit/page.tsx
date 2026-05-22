import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import SupplierForm from '../../SupplierForm';

export default async function EditSupplierPage(props: { params: Promise<{ id: string }> }) {
  await requireUser(['admin', 'manager']);
  const { id } = await props.params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
  if (error || !data) notFound();
  return <SupplierForm initial={data} />;
}
