import Link from 'next/link';

export default function CartPage() {
  return (
    <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '80vh' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '3rem' }}>Your Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div style={{ gridColumn: 'span 2' }}>
          {/* Cart Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[1, 2, 3].map((item) => (
              <div key={item} className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: '100px', height: '100px', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius)' }}></div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Premium Hardware Component {item}</h3>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Category</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                      <button style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>-</button>
                      <span style={{ padding: '0 0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>1</span>
                      <button style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>+</button>
                    </div>
                    <button style={{ color: 'var(--accent)', background: 'transparent', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>$299.00</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Order Summary */}
        <div>
          <div className="card" style={{ padding: '2rem', position: 'sticky', top: '6rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Order Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>$897.00</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Shipping</span>
                <span style={{ fontWeight: 600 }}>Calculated at checkout</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Tax</span>
                <span style={{ fontWeight: 600 }}>$0.00</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }} className="flex justify-between items-center">
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>$897.00</span>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.125rem' }}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
