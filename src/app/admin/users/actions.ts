'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import type { Role } from '@/lib/auth';

export async function setUserRole(userId: string, role: Role) {
  const me = await requireUser(['admin']);
  if (userId === me.id && role !== 'admin') {
    return { ok: false as const, error: "You can't demote yourself." };
  }
  const supabase = await createClient();

  const { data: prev } = await supabase.from('profiles').select('role').eq('user_id', userId).single();

  const { error } = await supabase.from('profiles').update({ role }).eq('user_id', userId);
  if (error) return { ok: false as const, error: error.message };

  await audit(supabase, 'user.role_change', {
    entityType: 'user',
    entityId: userId,
    details: { from: prev?.role, to: role },
  });

  revalidatePath('/admin/users');
  return { ok: true as const };
}

export async function setUserActive(userId: string, isActive: boolean) {
  const me = await requireUser(['admin']);
  if (userId === me.id && !isActive) {
    return { ok: false as const, error: "You can't deactivate yourself." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('user_id', userId);
  if (error) return { ok: false as const, error: error.message };

  await audit(supabase, isActive ? 'user.activate' : 'user.deactivate', {
    entityType: 'user',
    entityId: userId,
  });

  revalidatePath('/admin/users');
  return { ok: true as const };
}

export async function setUserFullName(userId: string, fullName: string) {
  await requireUser(['admin']);
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ full_name: fullName || null }).eq('user_id', userId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/users');
  return { ok: true as const };
}
