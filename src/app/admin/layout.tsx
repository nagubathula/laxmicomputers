import Link from 'next/link';
import { LogOut, LayoutDashboard, ScanLine, Users, FileText, Truck, BarChart3, ShieldAlert, Wrench, ClipboardList, Hash, History } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { logout } from '@/app/login/actions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(); // redirects to /login if not signed in

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-display text-xl font-bold text-navy-900">
              Admin Panel
            </Link>
            <nav className="hidden lg:flex gap-4">
              <Link href="/admin" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <Link href="/admin/pos" className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800">
                <ScanLine className="h-4 w-4" /> POS
              </Link>
              <Link href="/admin/invoices" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                <FileText className="h-4 w-4" /> Invoices
              </Link>
              <Link href="/admin/quotes" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                <ClipboardList className="h-4 w-4" /> Quotes
              </Link>
              <Link href="/admin/service" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                <Wrench className="h-4 w-4" /> Service
              </Link>
              {(user.role === 'admin' || user.role === 'manager') && (
                <>
                  <Link href="/admin/purchases" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                    <Truck className="h-4 w-4" /> Purchases
                  </Link>
                  <Link href="/admin/customers" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                    <Users className="h-4 w-4" /> Customers
                  </Link>
                  <Link href="/admin/reports" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                    <BarChart3 className="h-4 w-4" /> Reports
                  </Link>
                  <Link href="/admin/serials" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                    <Hash className="h-4 w-4" /> Serials
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs text-slate-500">{user.email}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{user.role}</span>
            </div>
            {user.role === 'admin' && (
              <>
                <Link href="/admin/audit" className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600">
                  <History className="h-3.5 w-3.5" /> Audit
                </Link>
                <Link href="/admin/users" className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600">
                  <ShieldAlert className="h-3.5 w-3.5" /> Users
                </Link>
              </>
            )}
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
