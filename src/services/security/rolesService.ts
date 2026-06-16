import { supabase } from '@/services/supabase/client';

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

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description: string | null;
  level: number;
  is_system: boolean;
  created_at: string;
}

export interface RoleWithCounts extends Role {
  user_count: number;
  profile_count: number;
}

export async function fetchRoles(): Promise<{ data: Role[]; error: Error | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: [], error: new Error('No se pudo determinar el tenant') };

    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('level', { ascending: false });

    if (error) throw error;
    return { data: (data || []) as Role[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function fetchRolesWithCounts(): Promise<{ data: RoleWithCounts[]; error: Error | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: [], error: new Error('No se pudo determinar el tenant') };

    const { data: roles, error: rolesErr } = await supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('level', { ascending: false });

    if (rolesErr) throw rolesErr;
    if (!roles || roles.length === 0) return { data: [], error: null };

    const roleIds = roles.map((r) => r.id);
    const [{ data: users }, { data: profiles }] = await Promise.all([
      supabase.from('platform_users').select('role_id').in('role_id', roleIds),
      supabase.from('profiles').select('role_id').in('role_id', roleIds),
    ]);

    const userCounts: Record<string, number> = {};
    const profileCounts: Record<string, number> = {};
    (users || []).forEach((u) => { userCounts[u.role_id] = (userCounts[u.role_id] || 0) + 1; });
    (profiles || []).forEach((p) => { profileCounts[p.role_id] = (profileCounts[p.role_id] || 0) + 1; });

    const result: RoleWithCounts[] = roles.map((r) => ({
      ...r,
      user_count: userCounts[r.id] || 0,
      profile_count: profileCounts[r.id] || 0,
    }));

    return { data: result, error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function createRole(role: Partial<Role>): Promise<{ data: Role | null; error: Error | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: null, error: new Error('No se pudo determinar el tenant') };

    const { data, error } = await supabase
      .from('roles')
      .insert({
        tenant_id: tenantId,
        name: role.name,
        code: role.code,
        description: role.description || null,
        level: role.level || 10,
        is_system: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as Role, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateRole(id: string, updates: Partial<Role>): Promise<{ data: Role | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .update({
        name: updates.name,
        code: updates.code,
        description: updates.description,
        level: updates.level,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Role, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function toggleRoleStatus(id: string, isActive: boolean): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('roles')
      .update({ level: isActive ? 20 : 0 })
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}