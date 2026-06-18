import { supabase } from '@/services/supabase/client';

/**
 * Returns the effective tenant ID for the current authenticated user.
 * Priority: tenant_context_override (explicit switch) → tenant_id (default).
 * Returns null if user is not authenticated or has no platform_user record.
 */
export async function getEffectiveTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pu } = await supabase
    .from('platform_users')
    .select('tenant_id, tenant_context_override')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!pu) return null;
  return pu.tenant_context_override || pu.tenant_id;
}

/**
 * Returns the effective tenant ID synchronously from a platform_users record.
 * Use this when you already have the platform_user data loaded.
 */
export function getEffectiveTenantIdFromUser(pu: { tenant_id: string | null; tenant_context_override: string | null }): string | null {
  return pu.tenant_context_override || pu.tenant_id;
}