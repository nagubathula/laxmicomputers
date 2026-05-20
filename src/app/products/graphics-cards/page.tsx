import { ProductCard } from "@/components/ui/ProductCard";

export default function GraphicsCardsPage() {
  const products = [
    {
      id: "rtx-4070-ti",
      brand: "NVIDIA",
      name: "GeForce RTX 4070 Ti",
      specs: "ASUS TUF Gaming OC Edition 12GB GDDR6X",
      price: "$849.00",
      image: "https://placehold.co/400x400/f8fafc/0a192f?text=RTX+4070+Ti",
      inStock: true,
      tags: ["12GB VRAM", "DLSS 3.0", "750W PSU"],
    },
    {
      id: "rx-7900-xtx",
      brand: "AMD",
      name: "Radeon RX 7900 XTX",
      specs: "Sapphire Nitro+ Gaming OC 24GB",
      price: "$999.00",
      image: "https://placehold.co/400x400/f8fafc/0a192f?text=RX+7900+XTX",
      inStock: true,
      tags: ["24GB VRAM", "RDNA 3", "Raytracing"],
    },
    {
      id: "rtx-3060",
      brand: "MSI",
      name: "GeForce RTX 3060",
      specs: "Ventus 2X 12G OC LHR",
      price: "$299.99",
      image: "https://placehold.co/400x400/f8fafc/0a192f?text=RTX+3060",
      inStock: false,
      tags: ["12GB VRAM", "Dual Fan", "Entry Level"],
    },
    {
      id: "rtx-4080",
      brand: "NVIDIA",
      name: "GeForce RTX 4080",
      specs: "Gigabyte Gaming OC 16GB",
      price: "$1,199.00",
      image: "https://placehold.co/400x400/f8fafc/0a192f?text=RTX+4080",
      inStock: true,
      tags: ["16GB VRAM", "Triple Fan"],
    },
    {
      id: "rtx-3080",
      brand: "EVGA",
      name: "GeForce RTX 3080",
      specs: "FTW3 Ultra Gaming 10GB",
      price: "$699.00",
      image: "https://placehold.co/400x400/f8fafc/0a192f?text=RTX+3080",
      inStock: true,
      tags: ["10GB VRAM", "ARGB"],
    },
    {
      id: "rtx-4060",
      brand: "ZOTAC",
      name: "Gaming RTX 4060",
      specs: "Twin Edge 8GB White Edition",
      price: "$329.00",
      image: "https://placehold.co/400x400/f8fafc/0a192f?text=RTX+4060",
      inStock: true,
      tags: ["8GB VRAM", "White Theme"],
    },
  ];

  return (
    <div className="bg-background min-h-screen py-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-lg">Filters</h2>
            <button className="text-secondary text-xs font-medium hover:underline">Reset All</button>
          </div>
          
          <div className="space-y-8">
            {/* Category Filter */}
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Category</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded-sm border-border text-secondary focus:ring-secondary" />
                  <span>Processors</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded-sm border-border text-secondary focus:ring-secondary" />
                  <span>Motherboards</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded-sm border-border text-secondary focus:ring-secondary" />
                  <span className="font-semibold text-secondary">Graphics Cards (GPUs)</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded-sm border-border text-secondary focus:ring-secondary" />
                  <span>RAM / Memory</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded-sm border-border text-secondary focus:ring-secondary" />
                  <span>Storage (SSD/HDD)</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded-sm border-border text-secondary focus:ring-secondary" />
                  <span>Power Supplies</span>
                </li>
              </ul>
            </div>

            {/* Price Filter */}
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Price Range</h3>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Min" className="w-full px-3 py-2 border border-border rounded-sm text-sm focus:outline-none focus:border-secondary" />
                <input type="text" placeholder="Max" className="w-full px-3 py-2 border border-border rounded-sm text-sm focus:outline-none focus:border-secondary" />
              </div>
            </div>

            {/* Availability */}
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Availability</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <input type="radio" name="avail" defaultChecked className="text-secondary focus:ring-secondary border-border" />
                  <span className="font-medium text-primary">In Stock</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="radio" name="avail" className="text-secondary focus:ring-secondary border-border" />
                  <span>Pre-Order</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-primary">Graphics Cards</h1>
              <p className="text-sm text-muted-foreground mt-1">Showing 1-6 of 423 items found</p>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort by:</span>
              <select className="border border-border rounded-sm px-3 py-2 bg-white focus:outline-none focus:border-secondary">
                <option>Best Selling</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest Arrivals</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-12">
            <button className="w-8 h-8 flex items-center justify-center border border-border bg-white rounded-sm hover:bg-muted text-muted-foreground">&lt;</button>
            <button className="w-8 h-8 flex items-center justify-center border border-border bg-black text-white rounded-sm font-medium">1</button>
            <button className="w-8 h-8 flex items-center justify-center border border-border bg-white rounded-sm hover:bg-muted font-medium">2</button>
            <button className="w-8 h-8 flex items-center justify-center border border-border bg-white rounded-sm hover:bg-muted font-medium">3</button>
            <span className="px-2 text-muted-foreground">...</span>
            <button className="w-8 h-8 flex items-center justify-center border border-border bg-white rounded-sm hover:bg-muted font-medium">36</button>
            <button className="w-8 h-8 flex items-center justify-center border border-border bg-white rounded-sm hover:bg-muted text-muted-foreground">&gt;</button>
          </div>
        </main>
      </div>
    </div>
  );
}
