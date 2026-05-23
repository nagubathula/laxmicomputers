import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Cpu, HardDrive, Monitor, Mouse, Wrench, ShieldCheck, Zap, HeadphonesIcon, Star, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { deriveStockStatus } from "@/lib/stock";

const CATEGORIES = [
  { label: "Laptops",     href: "/products?category=laptops",       icon: Monitor,   color: "from-blue-500 to-blue-700",    bg: "bg-blue-50",   text: "text-blue-700", desc: "Work & gaming notebooks" },
  { label: "Components",  href: "/products?category=components",     icon: Cpu,       color: "from-violet-500 to-violet-700", bg: "bg-violet-50", text: "text-violet-700", desc: "CPUs, GPUs, RAM & storage" },
  { label: "Peripherals", href: "/products?category=peripherals",    icon: Mouse,     color: "from-emerald-500 to-emerald-700", bg: "bg-emerald-50", text: "text-emerald-700", desc: "Keyboards, mice & monitors" },
  { label: "Graphics Cards", href: "/products?category=graphics-cards", icon: HardDrive, color: "from-orange-500 to-orange-700", bg: "bg-orange-50", text: "text-orange-700", desc: "NVIDIA & AMD GPUs" },
];

const WHY_US = [
  { icon: ShieldCheck, title: "Genuine Products", desc: "All hardware is sourced from authorised distributors with full manufacturer warranty." },
  { icon: Zap,         title: "Same-Day Service", desc: "Walk in with a problem, walk out with a solution. Diagnostics in under an hour." },
  { icon: HeadphonesIcon, title: "Expert Support", desc: "Our certified engineers have 10+ years of experience across all major brands." },
];

export default async function Home() {
  const supabase = await createClient();
  const [{ data: featuredProducts }, { data: settings }] = await Promise.all([
    supabase.from("products").select("*").gt("stock_qty", 0).order("price", { ascending: false }).limit(8),
    supabase.from("business_settings").select("default_currency, legal_name").eq("id", 1).single(),
  ]);
  const currency: Currency = (settings?.default_currency ?? "INR") as Currency;
  const shopName = settings?.legal_name ?? "Laxmi Computers";

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        {/* Gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-3xl rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left copy */}
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Star className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
                Trusted computer store since 2010
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
                Premium Tech,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
                  Expert Service.
                </span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                Shop genuine laptops, GPUs, and accessories — or bring your device in for same-day repair. Everything a tech enthusiast needs, under one roof.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/products" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                  Shop Now <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-xl border border-white/10 transition-colors">
                  Book a Repair
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-6 pt-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Authorised dealer</span>
                <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-400" /> Same-day repair</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-blue-400" /> GST billing</span>
              </div>
            </div>

            {/* Right: product preview grid */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {(featuredProducts ?? []).slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group bg-slate-900/60 border border-slate-800 rounded-2xl p-4 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all"
                >
                  <div className="aspect-square rounded-xl bg-slate-800 mb-3 overflow-hidden relative flex items-center justify-center">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="200px" />
                    ) : (
                      <Cpu className="w-10 h-10 text-slate-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono capitalize mb-0.5">{p.category}</p>
                  <p className="text-sm font-semibold text-white line-clamp-1">{p.name}</p>
                  <p className="text-blue-400 font-bold text-sm mt-1">{formatMoney(p.price, currency)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "400+", label: "Products in stock" },
            { value: "10 yr", label: "In business" },
            { value: "1-hr", label: "Diagnostics" },
            { value: "100%", label: "Genuine hardware" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Shop by category</p>
            <h2 className="text-2xl font-extrabold text-slate-900">What are you looking for?</h2>
          </div>
          <Link href="/products" className="hidden sm:flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.href}
                href={cat.href}
                className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-300 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${cat.text}`} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{cat.label}</h3>
                <p className="text-xs text-slate-500">{cat.desc}</p>
                <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${cat.text}`}>
                  Shop now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────────────────────────── */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">In stock now</p>
                <h2 className="text-2xl font-extrabold text-slate-900">Featured Products</h2>
              </div>
              <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                All products <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredProducts.slice(0, 8).map((p) => {
                const status = deriveStockStatus((p as any).stock_qty ?? 0, (p as any).reorder_level ?? 0);
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all"
                  >
                    <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, 25vw" />
                      ) : (
                        <Cpu className="w-12 h-12 text-slate-200" />
                      )}
                      {status === "Out of Stock" && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-full border">Out of stock</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-1 capitalize">{p.category?.replace("-", " ")}</p>
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug mb-3">{p.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-600">{formatMoney(p.price, currency)}</span>
                        {status === "Low Stock" && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Low stock</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── WHY CHOOSE US ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Why {shopName}</p>
          <h2 className="text-2xl font-extrabold text-slate-900">The smarter way to buy tech</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {WHY_US.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                  <Icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SERVICE CTA ──────────────────────────────────────────────────── */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Service centre</p>
            <h2 className="text-3xl font-extrabold leading-tight">Device broken?<br />We fix it fast.</h2>
            <p className="text-slate-400 leading-relaxed">
              From liquid-damaged laptops to slow desktops, our engineers diagnose and repair all major brands. Walk in — no appointment needed.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              <Wrench className="w-4 h-4" /> Book a Repair
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🔍", title: "Diagnostics",  desc: "Hardware & software assessment" },
              { icon: "🧹", title: "Deep Clean",    desc: "Thermal paste + fan cleaning" },
              { icon: "💾", title: "Data Recovery", desc: "Safe extraction from failed drives" },
              { icon: "⬆️", title: "Upgrades",      desc: "RAM, SSD & OS installation" },
            ].map((s) => (
              <div key={s.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                <div className="text-2xl mb-3">{s.icon}</div>
                <h4 className="font-semibold text-sm mb-1">{s.title}</h4>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
