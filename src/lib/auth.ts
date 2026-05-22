import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export type Role = 'admin' | 'manager' | 'cashier';

export type SessionUser = {
  id: string;
  email: string | null;
  role: Role;
  fullName: string | null;
};

/**
 * Get the current logged-in user + role.
 * Returns null if not signed in (no redirect — caller decides).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('user_id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role as Role) ?? 'cashier',
    fullName: profile?.full_name ?? null,
  };
}

/**
 * Require an authenticated user; redirect to /login if not.
 * Optionally enforce one or more roles; redirects to /admin on insufficient privilege.
 */
export async function requireUser(allowedRoles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect('/admin?error=forbidden');
  }
  return user;
}

/** Convenience predicates */
export const canManageInventory = (role: Role) => role === 'admin' || role === 'manager';
export const canManageSettings = (role: Role) => role === 'admin';
export const canManageUsers = (role: Role) => role === 'admin';
export const canSeeReports = (role: Role) => role === 'admin' || role === 'manager';
