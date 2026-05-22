import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import EditProductForm from './EditProductForm';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) {
    notFound();
  }

  // Parse specs if it's a JSON array
  let specsString = '';
  try {
    const parsedSpecs = Array.isArray(product.specs) 
      ? product.specs 
      : (typeof product.specs === 'string' ? JSON.parse(product.specs) : []);
    specsString = Array.isArray(parsedSpecs) ? parsedSpecs.join(', ') : '';
  } catch (e) {
    console.error("Failed to parse specs", e);
  }

  const productData = {
    ...product,
    specsString,
  };

  return <EditProductForm product={productData} />;
}
