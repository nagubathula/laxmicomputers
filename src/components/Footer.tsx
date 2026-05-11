export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary/50 py-16">
      <div className="container mx-auto grid grid-cols-1 gap-12 px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <h3 className="mb-4 text-2xl font-extrabold tracking-tight">LaxmiComputers</h3>
          <p className="max-w-xs text-muted-foreground leading-relaxed">
            Premium hardware and peripherals for enthusiasts and professionals.
          </p>
        </div>
        <div>
          <h4 className="mb-6 font-semibold">Shop</h4>
          <ul className="flex flex-col gap-3">
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Processors</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Graphics Cards</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Motherboards</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Memory</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-6 font-semibold">Support</h4>
          <ul className="flex flex-col gap-3">
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Shipping & Returns</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Warranty</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-16 border-t pt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Laxmi Computers. All rights reserved.</p>
      </div>
    </footer>
  );
}
