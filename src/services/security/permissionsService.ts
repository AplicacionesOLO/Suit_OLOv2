import { supabase } from '@/services/supabase/client';

export interface OloPermissionsModule {
  menu: boolean;
  actions: string[];
}

export interface OloPermissionsData {
  modules: Record<string, OloPermissionsModule>;
}

export async function fetchRolePermissions(roleId: string): Promise<{ data: OloPermissionsData | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('permissions')
      .eq('id', roleId)
      .single();

    if (error) throw error;
    const perms = data?.permissions as OloPermissionsData | null;
    return { data: perms || null, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function saveRolePermissions(roleId: string, permissions: OloPermissionsData): Promise<{ error: Error | null }> {
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