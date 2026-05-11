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

          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {user.email}
              </span>
              <form action={logout}>
                <Button variant="ghost" type="submit">Logout</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
