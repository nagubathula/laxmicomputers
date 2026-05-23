'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ScanLine, FileText, ClipboardList, PackageCheck, Wrench,
  Box, Truck, Hash, Users, BarChart3, Settings as SettingsIcon, History, ShieldAlert,
  LogOut,
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
    items: [
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
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

export default function Sidebar({
  user,
}: {
  user: { email: string | null; role: 'admin' | 'manager' | 'cashier'; fullName: string | null };
}) {
  const pathname = usePathname();
  const canSee = (group: Group) => {
    if (!group.minRole) return true;
    if (group.minRole === 'admin') return user.role === 'admin';
    if (group.minRole === 'manager') return user.role === 'admin' || user.role === 'manager';
    return true;
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-stone-200 bg-white">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-stone-200">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm">L</div>
          <span className="font-semibold text-stone-900">Laxmi</span>
        </Link>
      </div>

      {/* Groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        <div>
          <Link
            href="/admin/pos"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/admin/pos'
                ? 'bg-violet-50 text-violet-800'
                : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> POS
          </Link>
        </div>

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
                        active
                          ? 'bg-violet-50 text-violet-800 font-medium'
                          : 'text-stone-700 hover:bg-stone-100'
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

      {/* User */}
      <div className="border-t border-stone-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 text-xs font-medium">
            {(user.fullName ?? user.email ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-stone-900 truncate">
              {user.fullName ?? user.email ?? 'User'}
            </div>
            <div className="text-[11px] text-stone-400 capitalize">{user.role}</div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="p-2 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
