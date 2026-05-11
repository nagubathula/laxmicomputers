import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/login/actions';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          LaxmiComputers
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/products" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Hardware
          </Link>
          <Link href="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]">
              3
            </Badge>
          </Link>
          
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {user.email}
              </span>
              <form action={logout}>
                <Button variant="ghost" type="submit">Logout</Button>
              </form>
            </div>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "secondary" })}>Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
