"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingCart, User } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isProductPage = pathname?.includes('/products');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          {pathname === '/' && (
            <div className="w-6 h-6 bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs rounded-sm">L</div>
          )}
          <span className="font-display font-bold text-xl tracking-tight text-primary">
            Laksmi Computers
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/products/laptops" className={`text-sm font-medium ${pathname === '/' ? 'text-secondary border-b-2 border-secondary pb-1' : 'text-muted-foreground hover:text-primary transition-colors'}`}>Laptops</Link>
          <Link href="/products/graphics-cards" className={`text-sm font-medium ${isProductPage ? 'text-secondary border-b-2 border-secondary pb-1' : 'text-muted-foreground hover:text-primary transition-colors'}`}>Components</Link>
          <Link href="/products/peripherals" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Peripherals</Link>
          <Link href="/contact" className={`text-sm font-medium ${pathname !== '/contact' ? 'text-muted-foreground hover:text-primary transition-colors' : 'text-muted-foreground hover:text-primary transition-colors'}`}>Service & Repair</Link>
          {pathname === '/contact' && (
            <Link href="/contact" className="text-sm font-medium text-secondary border-b-2 border-secondary pb-1">Location</Link>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {(isProductPage || pathname === '/contact') && (
            <div className="relative hidden lg:block w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder={pathname === '/contact' ? "Search tech..." : "Search components..."}
                className="w-full h-9 pl-9 pr-4 rounded-sm border bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-sm transition-all"
              />
            </div>
          )}
          <button className="relative p-2 text-primary hover:bg-muted rounded-sm transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {isProductPage && (
              <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-secondary text-[9px] text-white flex items-center justify-center font-bold">3</span>
            )}
          </button>
          <button className="p-2 text-primary hover:bg-muted rounded-sm transition-colors">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
