'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, LogOut, LayoutDashboard, ScanLine, FileText, ClipboardList, PackageCheck,
  Wrench, Box, Truck, Hash, Users, BarChart3, Settings as SettingsIcon, History,
  ShieldAlert,
} from 'lucide-react';
import { logout } from '@/app/(storefront)/login/actions';

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type Group = { title: string; items: Item[]; minRole?: 'admin' | 'manager' };

const GROUPS: Group[] = [
  {
    title: 'Sell',
    items: [
      { href: '/admin/pos', label: 'Point of Sale', icon: ScanLine },
      { href: '/admin/invoices', label: 'Invoices', icon: FileText },
      { href: '/admin/quotes', label: 'Quotes', icon: ClipboardList },
      { href: '/admin/delivery', label: 'Delivery Challans', icon: PackageCheck },
    ],
  },
  {
    title: 'Stock',
    items: [
      { href: '/admin/products', label: 'Products', icon: Box },
      { href: '/admin/purchases', label: 'Purchases', icon: Truck },
      { href: '/admin/serials', label: 'Serials', icon: Hash },
    ],
    minRole: 'manager',
  },
  {
    title: 'People',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/service', label: 'Service tickets', icon: Wrench },
    ],
  },
  {
    title: 'Insights',
    items: [{ href: '/admin/reports', label: 'Reports', icon: BarChart3 }],
    minRole: 'manager',
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
      { href: '/admin/users', label: 'Users & roles', icon: ShieldAlert },
      { href: '/admin/audit', label: 'Audit log', icon: History },
    ],
    minRole: 'admin',
  },
];

export default function MobileNav({
  user,
}: {
  user: { email: string | null; role: 'admin' | 'manager' | 'cashier'; fullName: string | null };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const canSee = (g: Group) => {
    if (!g.minRole) return true;
    if (g.minRole === 'admin') return user.role === 'admin';
    return user.role === 'admin' || user.role === 'manager';
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-white border-b border-stone-200 flex items-center justify-between px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-xs">L</div>
          <span className="font-semibold text-stone-900 text-sm">Laxmi</span>
        </Link>
        <button onClick={() => setOpen(true)} className="p-2 -mr-2 text-stone-600" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
          <div className="w-72 bg-white flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-stone-200">
              <span className="font-semibold text-stone-900 text-sm">Laxmi</span>
              <button onClick={() => setOpen(false)} className="p-2 -mr-2 text-stone-600" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5" onClick={() => setOpen(false)}>
              <Link
                href="/admin/pos"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/admin/pos' ? 'bg-violet-50 text-violet-800' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" /> POS
              </Link>

              {GROUPS.filter(canSee).map((group) => (
                <div key={group.title}>
                  <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    {group.title}
                  </div>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                              active ? 'bg-violet-50 text-violet-800 font-medium' : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${active ? 'text-violet-600' : 'text-stone-400'}`} />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="border-t border-stone-200 p-3 flex items-center justify-between">
              <div className="text-xs">
                <div className="font-medium text-stone-900">{user.fullName ?? user.email ?? 'User'}</div>
                <div className="text-stone-400 capitalize">{user.role}</div>
              </div>
              <form action={logout}>
                <button className="p-2 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
