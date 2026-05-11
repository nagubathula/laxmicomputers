import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.logo}>
          <span className="text-gradient">Laxmi</span>Computers
        </Link>
        <div className={styles.navLinks}>
          <Link href="/products" className={styles.link}>Hardware</Link>
          <Link href="/products?category=peripherals" className={styles.link}>Peripherals</Link>
          <Link href="/cart" className={styles.cartBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className={styles.cartBadge}>3</span>
          </Link>
          <Link href="/login" className="btn btn-secondary">Login</Link>
        </div>
      </div>
    </nav>
  );
}
