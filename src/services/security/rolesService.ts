import { supabase } from '@/services/supabase/client';
import { getEffectiveTenantId } from '@/utils/tenant';

export interface RolePermissions {
  modules: Record<string, { menu: boolean; actions: string[] }>;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description: string | null;
  level: number;
  is_system: boolean;
  permissions: RolePermissions | null;
  created_at: string;
}

export interface RoleWithCounts extends Role {
  user_count: number;
}

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  level?: number;
  permissions?: RolePermissions | null;
}

export interface UpdateRoleInput {
  name?: string;
  code?: string;
  description?: string;
  level?: number;
  permissions?: RolePermissions | null;
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
    const { data: users } = await supabase
      .from('platform_users')
      .select('role_id')
      .in('role_id', roleIds);

    const userCounts: Record<string, number> = {};
    (users || []).forEach((u) => { userCounts[u.role_id] = (userCounts[u.role_id] || 0) + 1; });

    const result: RoleWithCounts[] = roles.map((r) => ({
      ...r,
      user_count: userCounts[r.id] || 0,
    }));

    return { data: result, error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function createRole(input: CreateRoleInput): Promise<{ data: Role | null; error: Error | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: null, error: new Error('No se pudo determinar el tenant') };

    const { data, error } = await supabase
      .from('roles')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        code: input.code,
        description: input.description || null,
        level: input.level || 10,
        is_system: false,
        permissions: input.permissions || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as Role, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateRole(id: string, updates: UpdateRoleInput): Promise<{ data: Role | null; error: Error | null }> {
  try {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.code !== undefined) updateData.code = updates.code;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions;

    const { data, error } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pu } = await supabase.from('platform_users').select('tenant_id').eq('auth_user_id', user.id).maybeSingle();
        await supabase.from('audit_logs').insert({
          tenant_id: pu?.tenant_id || null,
          user_id: null,
          action: 'ROLE_PERMISSIONS_UPDATED',
          entity_type: 'roles',
          entity_id: id,
          details: { name: (data as Role).name, updated_fields: Object.keys(updateData) },
          severity: 'medium',
        });
      }
    } catch {
      // Non-critical
    }

    return { data: data as Role, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}