'use client';

import { Trash2 } from 'lucide-react';
import { deleteProduct } from '@/app/admin/actions';

export function DeleteProductButton({ id }: { id: string }) {
  const handleDelete = (e: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteProduct} onSubmit={handleDelete}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="p-1.5 text-stone-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
