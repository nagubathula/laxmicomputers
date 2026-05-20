import { MapPin, Clock, Phone, Mail, Navigation, Star } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-border py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="font-mono text-xs font-bold text-secondary tracking-widest uppercase mb-2 block">Visit Our Lab</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-primary">Contact & Location</h1>
          </div>
          <div className="flex items-center gap-3 bg-white border border-border p-4 rounded-sm tech-shadow">
            <div className="bg-blue-600 text-white font-bold text-xl px-3 py-1 rounded-sm">4.9</div>
            <div>
              <div className="flex text-blue-600 mb-1">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">500+ Local Tech Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Map & Info) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 rounded-sm overflow-hidden border border-border relative h-[400px]">
              {/* Map Placeholder */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,_#ffffff_1px,_transparent_1px)] [background-size:24px_24px]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="bg-black text-white p-3 rounded-sm border border-slate-700 shadow-xl mb-2">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div className="bg-white text-black font-mono text-xs font-bold px-3 py-1 rounded-sm shadow-lg">
                    HQ: Laksmi Technology Hub
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-4 right-4 flex flex-col bg-white rounded-sm overflow-hidden border border-border shadow-lg">
                <button className="w-10 h-10 flex items-center justify-center hover:bg-muted text-xl border-b border-border">+</button>
                <button className="w-10 h-10 flex items-center justify-center hover:bg-muted text-xl">-</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-8 border border-border rounded-sm tech-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-full">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-xl">Location</h3>
                </div>
                <div className="text-sm text-muted-foreground space-y-1 mb-6">
                  <p>42nd Technical Avenue, Silicon Park</p>
                  <p>Suite 105 - Repair Wing</p>
                  <p>Tech City, TC 10240</p>
                </div>
                <a href="#" className="text-sm font-medium text-secondary flex items-center gap-1 hover:underline">
                  Get Directions <Navigation className="w-3 h-3" />
                </a>
              </div>

              <div className="bg-white p-8 border border-border rounded-sm tech-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-full">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-xl">Hours</h3>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mon — Fri</span>
                    <span className="font-mono font-medium">09:00 — 20:00</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-muted-foreground">Saturday</span>
                    <span className="font-mono font-medium">10:00 — 18:00</span>
                  </li>
                  <li className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="text-muted-foreground">Sunday</span>
                    <span className="font-mono font-bold text-destructive">CLOSED</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column (Form & Contact) */}
          <div className="lg:col-span-5">
            <div className="bg-white p-8 border border-border rounded-sm tech-shadow h-full flex flex-col">
              <h2 className="font-display text-2xl font-bold mb-2">Service & Sales Inquiry</h2>
              <p className="text-sm text-muted-foreground mb-8">Response time: Usually within 2 business hours.</p>

              <form className="space-y-6 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                    <input type="text" placeholder="John Doe" className="w-full bg-muted border border-transparent focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary px-4 py-3 rounded-sm text-sm transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                    <input type="email" placeholder="john@tech.com" className="w-full bg-muted border border-transparent focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary px-4 py-3 rounded-sm text-sm transition-all outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inquiry Type</label>
                  <select className="w-full bg-muted border border-transparent focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary px-4 py-3 rounded-sm text-sm transition-all outline-none appearance-none">
                    <option>Technical Service Request</option>
                    <option>Custom Build Inquiry</option>
                    <option>Order Support</option>
                    <option>Enterprise Sales</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project/Ticket Details</label>
                  <textarea rows={5} placeholder="Please describe your technical needs or the specifications you are looking for..." className="w-full bg-muted border border-transparent focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary px-4 py-3 rounded-sm text-sm transition-all outline-none resize-none"></textarea>
                </div>

                <button type="button" className="w-full bg-black hover:bg-slate-800 text-white font-semibold py-4 rounded-sm transition-colors flex items-center justify-center gap-2">
                  SUBMIT REQUEST
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-border space-y-6">
                <div className="flex items-center gap-4">
                  <div className="border border-border p-3 rounded-sm">
                    <Phone className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Support Hotline</p>
                    <p className="font-medium">+1 (800) 555-TECH</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="border border-border p-3 rounded-sm">
                    <Mail className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Technical Mail</p>
                    <p className="font-medium">lab@laksmicomputers.com</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>

      {/* Partners Banner */}
      <div className="border-t border-border bg-white py-12 mt-8">
        <div className="container mx-auto px-4">
          <p className="font-mono text-xs font-bold text-center tracking-[0.2em] text-muted-foreground uppercase mb-10">
            Authorized Technical Partner For
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale">
            {/* Logos represented by stylized text for demo */}
            <span className="font-display font-bold text-2xl tracking-tighter">NVIDIA</span>
            <span className="font-display font-bold text-2xl tracking-tighter">AMD</span>
            <span className="font-display font-bold text-2xl tracking-widest">INTEL</span>
            <span className="font-display font-bold text-2xl tracking-tight">CORSAIR</span>
            <span className="font-display font-bold text-2xl tracking-tight">ASUS ROG</span>
            <span className="font-display font-bold text-2xl tracking-tight">MSI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
