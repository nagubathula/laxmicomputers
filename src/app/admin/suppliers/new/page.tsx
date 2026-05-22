import SupplierForm from '../SupplierForm';
import { requireUser } from '@/lib/auth';

export default async function NewSupplierPage() {
  await requireUser(['admin', 'manager']);
  return <SupplierForm initial={null} />;
}
