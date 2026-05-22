import Link from "next/link";
import { PackageSearch, Wrench, Clock, ArrowRight, Cpu } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { deriveStockStatus } from "@/lib/stock";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: topProducts }, { data: settings }] = await Promise.all([
    supabase.from('products').select('*').order('price', { ascending: false }).limit(3),
    supabase.from('business_settings').select('default_currency').eq('id', 1).single(),
  ]);
  const currency: Currency = (settings?.default_currency ?? 'INR') as Currency;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-navy-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_#ffffff_1px,_transparent_1px)] [background-size:24px_24px]"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block bg-blue-600 font-mono text-xs font-bold px-3 py-1 uppercase tracking-wider rounded-sm">
                System Integrated
              </div>
              <h1 className="font-display text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Expert Tech.<br/>
                Professional Service.
              </h1>
              <p className="text-slate-300 text-lg max-w-md leading-relaxed">
                Premium computers, parts, and certified repair services for professionals and enthusiasts. Engineered for performance and reliability.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/products/graphics-cards" className="bg-white text-navy-900 hover:bg-slate-100 font-semibold px-6 py-3 rounded-sm text-center transition-colors">
                  Browse Products
                </Link>
                <Link href="/contact" className="bg-transparent border border-slate-600 text-white hover:bg-slate-800 font-semibold px-6 py-3 rounded-sm text-center transition-colors">
                  Book Service
                </Link>
              </div>
            </div>
            <div className="relative h-[400px] lg:h-[500px] w-full flex items-center justify-center">
              {/* Placeholder for PC Case Image */}
              <div className="relative w-[300px] h-[400px] bg-slate-800/50 rounded border border-slate-700 backdrop-blur flex items-center justify-center shadow-2xl">
                 <Cpu className="w-24 h-24 text-blue-500 opacity-50" />
                 <span className="absolute bottom-4 font-mono text-xs text-slate-400">HIGH PERFORMANCE RIG</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Banner */}
      <section className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 divide-y md:divide-y-0 md:divide-x border-border">
            <div className="flex items-center gap-4 md:justify-center pt-4 md:pt-0">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                <PackageSearch className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">400+ Products</h4>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Ready to Ship</p>
              </div>
            </div>
            <div className="flex items-center gap-4 md:justify-center pt-4 md:pt-0">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Expert Repair</h4>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Certified Techs</p>
              </div>
            </div>
            <div className="flex items-center gap-4 md:justify-center pt-4 md:pt-0">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Fast Turnaround</h4>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Same-Day Service</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Categories */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="font-mono text-xs font-bold text-secondary tracking-widest uppercase mb-2 block">Inventory</span>
              <h2 className="font-display text-3xl font-bold">Hardware Categories</h2>
            </div>
            <Link href="/products/graphics-cards" className="text-secondary font-medium text-sm flex items-center gap-1 hover:underline">
              View All Collections <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category 1 */}
            <Link href="/products/laptops" className="group col-span-1 lg:col-span-2 bg-white border border-border p-8 rounded-sm tech-shadow flex flex-col md:flex-row gap-8 items-center h-[340px]">
              <div className="flex-1 space-y-4">
                <h3 className="font-display text-2xl font-bold">Professional Laptops</h3>
                <p className="text-sm text-muted-foreground max-w-sm">Mobile workstations for developers, designers, and engineers.</p>
                <div className="text-secondary font-medium text-sm flex items-center gap-1 pt-4">
                  Explore Series <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
              <div className="flex-1 w-full h-full bg-slate-100 rounded relative">
                {/* Placeholder Image */}
                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                  <PackageSearch className="w-16 h-16" />
                </div>
              </div>
            </Link>

            <div className="flex flex-col gap-6">
              {/* Category 2 */}
              <Link href="/products/graphics-cards" className="group bg-white border border-border p-6 rounded-sm tech-shadow flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Custom PC Parts</h3>
                  <p className="text-xs text-muted-foreground mt-1">CPUs, GPUs, RAM, Motherboards</p>
                </div>
                <div className="self-end mt-4">
                   <Cpu className="w-12 h-12 text-slate-200" />
                </div>
              </Link>
              
              {/* Category 3 */}
              <Link href="/products/peripherals" className="group bg-slate-800 text-white border border-slate-700 p-6 rounded-sm tech-shadow flex-1 flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-display text-lg font-bold">Gaming Gear</h3>
                  <p className="text-xs text-slate-400 mt-1">Mechanical Keyboards, Mice, Displays</p>
                </div>
                <div className="mt-8 relative z-10">
                   <span className="bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-sm inline-block">Shop Gaming</span>
                </div>
                {/* Background graphic */}
                <div className="absolute -bottom-10 -right-10 opacity-20">
                  <Wrench className="w-32 h-32" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Service Center */}
      <section className="py-20 bg-slate-50 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 border border-border rounded-sm">
                <div className="text-blue-600 mb-4"><PackageSearch className="w-6 h-6" /></div>
                <h4 className="font-bold text-sm mb-2">Diagnostics</h4>
                <p className="text-xs text-muted-foreground">Hardware assessment using industry-standard tools.</p>
              </div>
              <div className="bg-white p-6 border border-border rounded-sm">
                <div className="text-blue-600 mb-4"><Wrench className="w-6 h-6" /></div>
                <h4 className="font-bold text-sm mb-2">Maintenance</h4>
                <p className="text-xs text-muted-foreground">Deep cleaning and thermal paste replacement.</p>
              </div>
              <div className="bg-white p-6 border border-border rounded-sm">
                <div className="text-blue-600 mb-4"><Cpu className="w-6 h-6" /></div>
                <h4 className="font-bold text-sm mb-2">OS Support</h4>
                <p className="text-xs text-muted-foreground">System optimization and secure data recovery.</p>
              </div>
              <div className="bg-white p-6 border border-border rounded-sm">
                <div className="text-blue-600 mb-4"><PackageSearch className="w-6 h-6" /></div>
                <h4 className="font-bold text-sm mb-2">Upgrades</h4>
                <p className="text-xs text-muted-foreground">Component installation and bios configuration.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <span className="font-mono text-xs font-bold text-secondary tracking-widest uppercase block">Service Center</span>
              <h2 className="font-display text-4xl font-bold leading-tight">Same-Day Diagnostics & Professional Repairs</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our laboratory is equipped for component-level repair. Whether it&apos;s a liquid-damaged laptop or a failing workstation, our certified engineers provide precise solutions with full warranties.
              </p>
              <Link href="/contact" className="inline-block bg-black text-white font-medium px-8 py-3 rounded-sm transition-colors hover:bg-slate-800">
                Book Your Service
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Hotspots */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-2xl font-bold text-center mb-10">Current Inventory Hotspots</h2>
          <div className="max-w-4xl mx-auto border border-border rounded-sm overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 font-semibold border-b border-border">Component</th>
                  <th className="p-4 font-semibold border-b border-border">Specification</th>
                  <th className="p-4 font-semibold border-b border-border">Availability</th>
                  <th className="p-4 font-semibold border-b border-border text-right">Price</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {topProducts?.map((product) => {
                  let specString = "";
                  try {
                    const parsedSpecs = Array.isArray(product.specs) 
                      ? product.specs 
                      : (typeof product.specs === 'string' ? JSON.parse(product.specs) : []);
                    specString = Array.isArray(parsedSpecs) ? parsedSpecs.join(", ") : "";
                  } catch (e) {
                    specString = "";
                  }
                  
                  const status = deriveStockStatus(
                    (product as any).stock_qty ?? 0,
                    (product as any).reorder_level ?? 0,
                  );
                  const statusClass =
                    status === 'In Stock' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-600 border-red-200';
                  return (
                    <tr key={product.id} className="border-b border-border zebra-row">
                      <td className="p-4 font-medium">{product.name}</td>
                      <td className="p-4 font-mono text-muted-foreground text-xs">{specString}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-1 border text-[10px] font-bold uppercase rounded-sm tracking-wider ${statusClass}`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-medium text-right">{formatMoney(product.price, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
