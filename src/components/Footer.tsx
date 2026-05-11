import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerGrid}`}>
        <div>
          <h3 className={styles.brand}><span className="text-gradient">Laxmi</span>Computers</h3>
          <p className={styles.description}>
            Premium hardware and peripherals for enthusiasts and professionals.
          </p>
        </div>
        <div>
          <h4 className={styles.heading}>Shop</h4>
          <ul className={styles.list}>
            <li><a href="#">Processors</a></li>
            <li><a href="#">Graphics Cards</a></li>
            <li><a href="#">Motherboards</a></li>
            <li><a href="#">Memory</a></li>
          </ul>
        </div>
        <div>
          <h4 className={styles.heading}>Support</h4>
          <ul className={styles.list}>
            <li><a href="#">Contact Us</a></li>
            <li><a href="#">Shipping & Returns</a></li>
            <li><a href="#">Warranty</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>&copy; {new Date().getFullYear()} Laxmi Computers. All rights reserved.</p>
      </div>
    </footer>
  );
}
