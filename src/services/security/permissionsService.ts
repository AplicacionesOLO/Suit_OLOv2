import { supabase } from '@/services/supabase/client';

export interface SuitePermissionsModule {
  menu: boolean;
  actions: string[];
}

export interface SuitePermissionsData {
  modules: Record<string, SuitePermissionsModule>;
}

async function getEffectiveTenantId(): Promise<string | null> {
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

export async function fetchRolePermissions(roleId: string): Promise<{ data: SuitePermissionsData | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('permissions')
      .eq('id', roleId)
      .single();

    if (error) throw error;
    const perms = data?.permissions as SuitePermissionsData | null;
    return { data: perms || null, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function saveRolePermissions(roleId: string, permissions: SuitePermissionsData): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('roles')
      .update({ permissions: permissions as unknown as Record<string, unknown> })
      .eq('id', roleId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}