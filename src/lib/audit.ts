import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Append a row to the audit log. Best-effort — never throws.
 *
 * Uses the `log_audit` RPC (SECURITY DEFINER) so this works even when the
 * caller's role doesn't have direct INSERT on audit_log.
 */
export async function audit(
  supabase: SupabaseClient,
  action: string,
  opts?: { entityType?: string; entityId?: string | null; details?: Record<string, unknown> },
): Promise<void> {
  try {
    await supabase.rpc('log_audit', {
      p_action: action,
      p_entity_type: opts?.entityType ?? null,
      p_entity_id: opts?.entityId ?? null,
      p_details: opts?.details ? (opts.details as any) : null,
    });
  } catch (e) {
    // Audit failures must not break user-facing actions.
    console.warn('audit log failed:', e);
  }
}
