import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { LogOut, LayoutDashboard, PlusCircle } from 'lucide-react';
import { logout } from '@/app/login/actions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-display text-xl font-bold text-navy-900">
              Admin Panel
            </Link>
            <nav className="hidden md:flex gap-4">
              <Link href="/admin" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link href="/admin/products/new" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600">
                <PlusCircle className="h-4 w-4" />
                Add Product
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline-block">{user.email}</span>
            <form action={logout}>
              <button className="flex items-center gap-2 rounded-sm bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
