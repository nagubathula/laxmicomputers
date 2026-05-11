import Link from 'next/link';

// Mock data
const MOCK_PRODUCTS = [
  { id: '1', name: 'RTX 4090 OC Edition', price: 1599, category: 'Graphics Cards', status: 'In Stock', description: 'The ultimate GeForce GPU. It brings an enormous leap in performance, efficiency, and AI-powered graphics.', specs: ['24GB GDDR6X', '384-bit memory interface', 'PCIe 4.0'] },
  { id: '2', name: 'Ryzen 9 7950X3D', price: 699, category: 'Processors', status: 'In Stock', description: 'The ultimate processor for gaming and creation, featuring AMD 3D V-Cache technology for even more game performance.', specs: ['16 Cores / 32 Threads', 'Up to 5.7 GHz Boost', '144MB Cache'] },
];

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = MOCK_PRODUCTS.find(p => p.id === params.id) || MOCK_PRODUCTS[0]; // fallback for demo

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '80vh' }}>
      <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: '2rem', color: 'var(--muted-foreground)', fontWeight: 500, fontSize: '0.875rem' }}>
        &larr; Back to Products
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image Section */}
        <div style={{ aspectRatio: '1', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted-foreground)', fontSize: '1.25rem' }}>High-Res Product Image</span>
        </div>
        
        {/* Product Details Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              {product.category}
            </span>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.5rem' }}>{product.name}</h1>
          </div>
          
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            ${product.price}
          </div>
          
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.125rem', lineHeight: 1.6 }}>
            {product.description}
          </p>
          
          <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Key Specifications</h3>
            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', color: 'var(--secondary-foreground)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {product.specs.map((spec, i) => (
                <li key={i}>{spec}</li>
              ))}
            </ul>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
               <button style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>-</button>
               <span style={{ padding: '0 1rem', fontWeight: 600 }}>1</span>
               <button style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>+</button>
            </div>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: '1.125rem' }}>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
