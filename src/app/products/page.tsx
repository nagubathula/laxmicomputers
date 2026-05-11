'use client';

import Link from 'next/link';

// Mock data to demonstrate UI
const MOCK_PRODUCTS = [
  { id: 1, name: 'RTX 4090 OC Edition', price: 1599, category: 'Graphics Cards', status: 'In Stock' },
  { id: 2, name: 'Ryzen 9 7950X3D', price: 699, category: 'Processors', status: 'In Stock' },
  { id: 3, name: 'Z790 AORUS MASTER', price: 499, category: 'Motherboards', status: 'Low Stock' },
  { id: 4, name: 'Dominator Platinum RGB 64GB', price: 299, category: 'Memory', status: 'In Stock' },
  { id: 5, name: 'SN850X 2TB NVMe SSD', price: 159, category: 'Storage', status: 'In Stock' },
  { id: 6, name: 'RM1000x 1000W 80+ Gold', price: 189, category: 'Power Supplies', status: 'In Stock' },
];

export default function ProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const categoryFilter = searchParams?.category;
  
  const filteredProducts = categoryFilter 
    ? MOCK_PRODUCTS.filter(p => p.category.toLowerCase() === categoryFilter.toLowerCase())
    : MOCK_PRODUCTS;

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '80vh' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          {categoryFilter ? <span style={{ textTransform: 'capitalize' }}>{categoryFilter}</span> : 'All Products'}
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select style={{ padding: '0.5rem', borderRadius: 'var(--radius)', backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            <option>Sort by: Featured</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Link href={`/products/${product.id}`} key={product.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ aspectRatio: '1', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <span style={{ color: 'var(--muted-foreground)' }}>Image Placeholder</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {product.category}
                </span>
                <span style={{ fontSize: '0.75rem', color: product.status === 'In Stock' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {product.status}
                </span>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', flex: 1 }}>{product.name}</h3>
              <div className="flex justify-between items-center" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>${product.price}</span>
                <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={(e) => { e.preventDefault(); /* Prevent navigation to use add to cart logic */ }}>
                  Add
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
