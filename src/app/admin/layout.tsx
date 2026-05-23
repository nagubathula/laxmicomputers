import { requireUser } from '@/lib/auth';
import Sidebar from '@/components/admin/Sidebar';
import MobileNav from '@/components/admin/MobileNav';
import { Toaster } from '@/components/admin/Toaster';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const u = { email: user.email, role: user.role, fullName: user.fullName };

  return (
    <Toaster>
      <div className="min-h-screen flex bg-stone-50 text-stone-900">
        <Sidebar user={u} />
        <div className="flex-1 min-w-0 flex flex-col">
          <MobileNav user={u} />
          <main className="flex-1 admin-page-enter">
            {children}
          </main>
        </div>
      </div>
    </Toaster>
  );
}
