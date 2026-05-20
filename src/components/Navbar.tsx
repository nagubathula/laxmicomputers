import Link from "next/link";
import { Search, ShoppingCart, User } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs rounded-sm">L</div>
          <span className="font-display font-bold text-xl tracking-tight text-primary">
            Laksmi Computers
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/products/laptops" className="text-sm font-medium text-secondary border-b-2 border-secondary pb-1">Laptops</Link>
          <Link href="/products/graphics-cards" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Components</Link>
          <Link href="/products/peripherals" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Peripherals</Link>
          <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Service & Repair</Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-primary hover:bg-muted rounded-sm transition-colors">
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button className="p-2 text-primary hover:bg-muted rounded-sm transition-colors">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
