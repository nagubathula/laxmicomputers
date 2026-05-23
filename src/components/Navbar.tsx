"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, User, Menu, X, Cpu } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Laptops",    href: "/products?category=laptops" },
  { label: "Components", href: "/products?category=components" },
  { label: "Peripherals",href: "/products?category=peripherals" },
  { label: "All Products",href: "/products" },
  { label: "Service",    href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href.includes("?")) {
      const [hPath, hQuery] = href.split("?");
      const param = new URLSearchParams(hQuery);
      return pathname === hPath && searchParams.get("category") === param.get("category");
    }
    return pathname === href && !searchParams.get("category");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">Laxmi Computers</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-md bg-slate-100 hover:bg-slate-200 text-sm text-slate-500 transition-colors w-52"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span>Search products…</span>
          </Link>
          <Link href="/login" className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <User className="h-4 w-4" /> Account
          </Link>
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md">
              <User className="h-4 w-4" /> Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
