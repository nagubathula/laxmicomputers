"use client";

import Link from "next/link";
import { Cpu } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">Laxmi Computers</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your trusted local tech partner — genuine hardware, expert repairs, and honest service since 2010.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">Shop</h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link href="/products?category=laptops"     className="hover:text-blue-600 transition-colors">Laptops</Link></li>
              <li><Link href="/products?category=components"  className="hover:text-blue-600 transition-colors">Components</Link></li>
              <li><Link href="/products?category=peripherals" className="hover:text-blue-600 transition-colors">Peripherals</Link></li>
              <li><Link href="/products?category=graphics-cards" className="hover:text-blue-600 transition-colors">Graphics Cards</Link></li>
              <li><Link href="/products"                      className="hover:text-blue-600 transition-colors">All Products</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">Support</h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Service & Repair</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Store Location</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Laxmi Computers. All rights reserved.</p>
          <p>GST-compliant billing · Authorised dealer · Same-day service</p>
        </div>
      </div>
    </footer>
  );
}
