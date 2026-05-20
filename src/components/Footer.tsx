import Link from "next/link";
import { Link as LinkIcon, Share2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand Col */}
          <div className="space-y-6">
            <h2 className="font-display font-bold text-2xl tracking-tight">Laksmi Computers</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              &copy; 2024 Laksmi Computers. Expert Tech Sales & Service. Delivering precision computing solutions for professionals and enthusiasts since 1998.
            </p>
            <div className="flex gap-4">
              <button className="p-2 border border-slate-700 hover:bg-slate-800 rounded-sm transition-colors text-slate-300">
                <LinkIcon className="h-4 w-4" />
              </button>
              <button className="p-2 border border-slate-700 hover:bg-slate-800 rounded-sm transition-colors text-slate-300">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Navigation Col */}
          <div>
            <h3 className="font-mono text-sm font-semibold tracking-wider text-slate-400 mb-6 uppercase">Navigation</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-slate-300 hover:text-white transition-colors">Store Hours</Link></li>
              <li><Link href="/contact" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Location</Link></li>
              <li><Link href="#" className="text-sm text-slate-300 hover:text-white transition-colors">Service Tracking</Link></li>
              <li><Link href="#" className="text-sm text-slate-300 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-sm text-slate-300 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Newsletter Col */}
          <div>
            <h3 className="font-mono text-sm font-semibold tracking-wider text-slate-400 mb-6 uppercase">Newsletter</h3>
            <p className="text-sm text-slate-300 mb-4">Get hardware alerts and technical deep-dives.</p>
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
          </div>
        </div>
      </div>
    </footer>
  );
}
