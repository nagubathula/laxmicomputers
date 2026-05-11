import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.main}>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={`animate-fade-in ${styles.heroTitle}`}>
              Next-Gen <span className="text-gradient">Hardware</span> for Enthusiasts
            </h1>
            <p className={`animate-fade-in ${styles.heroDescription}`} style={{ animationDelay: '0.1s' }}>
              Elevate your build with premium components, unparalleled performance, and cutting-edge aesthetics.
            </p>
            <div className={`animate-fade-in ${styles.heroActions}`} style={{ animationDelay: '0.2s' }}>
              <Link href="/products" className="btn btn-primary">
                Shop Now
              </Link>
              <Link href="/products?category=new" className="btn btn-secondary">
                View New Arrivals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ margin: '6rem auto' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>Featured Categories</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {['Processors', 'Graphics Cards', 'Motherboards', 'Memory'].map((category) => (
            <Link key={category} href={`/products?category=${category.toLowerCase()}`} className={styles.categoryCard}>
              <h3>{category}</h3>
              <p>Explore</p>
            </Link>
          ))}
        </div>
      </section>
      
      <section className="container" style={{ margin: '6rem auto' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>Trending Products</h2>
          <Link href="/products" className="text-gradient" style={{ fontWeight: 600 }}>View All &rarr;</Link>
        </div>
        
        {/* Placeholder for Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ padding: '1rem' }}>
              <div style={{ aspectRatio: '1', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}></div>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Category {i}</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>$299</span>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>High-End Component {i}</h3>
              <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem' }}>
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
