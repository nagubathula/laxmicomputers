"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Link as LinkIcon, Share2, Mail, Phone, Building2 } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  const isProductPage = pathname?.includes('/products');

  return (
    <footer className="bg-[#2a2e33] text-white mt-auto">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand Col */}
          <div className="space-y-6">
            <h2 className="font-display font-bold text-2xl tracking-tight">Laksmi Computers</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              Expert tech sales and repair services since 2008. Your trusted partner for high-performance computing solutions.
            </p>
            <div className="flex gap-4">
              <button className="p-2 hover:text-white transition-colors text-slate-400">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="p-2 hover:text-white transition-colors text-slate-400">
                <Mail className="h-5 w-5" />
              </button>
              <button className="p-2 hover:text-white transition-colors text-slate-400">
                <Phone className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Col */}
          <div>
            <h3 className="font-mono text-sm font-semibold tracking-wider text-slate-400 mb-6 uppercase">QUICK LINKS</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-slate-300 hover:text-white transition-colors">Store Hours</Link></li>
              <li><Link href="/contact" className="text-sm text-slate-300 hover:text-white transition-colors">Location</Link></li>
              <li><Link href="#" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Service Tracking</Link></li>
              <li><Link href="#" className="text-sm text-slate-300 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-sm text-slate-300 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Right Col */}
          <div>
            {isProductPage ? (
              <>
                <h3 className="font-mono text-sm font-semibold tracking-wider text-slate-400 mb-6 uppercase">SUPPORT</h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                  Get technical assistance from our expert team. Available Mon-Sat 9:00 - 18:00.
                </p>
                <div className="border border-slate-600 bg-navy-900 p-6 rounded-sm">
                  <h4 className="font-bold mb-2">Need a Custom Build?</h4>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Our technicians can design a workstation tailored to your professional needs.
                  </p>
                  <button className="bg-white text-navy-900 hover:bg-slate-100 px-4 py-2 text-sm font-bold rounded-sm transition-colors">
                    Contact Expert
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-mono text-sm font-semibold tracking-wider text-slate-400 mb-6 uppercase">Newsletter</h3>
                <p className="text-sm text-slate-300 mb-4">Subscribe for technical deep-dives and inventory updates.</p>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    className="flex-1 bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-sm text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-sm font-medium transition-colors">
                    JOIN
                  </button>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                  <span className="font-mono text-xs text-slate-400">Live Support Online</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="container mx-auto px-4 py-6 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 gap-4">
        <p>&copy; 2024 Laksmi Computers. Expert Tech Sales & Service.</p>
        <div className="flex gap-4 text-slate-300">
          <Building2 className="w-4 h-4" />
          <Phone className="w-4 h-4" />
        </div>
      </div>
    </footer>
  );
}
