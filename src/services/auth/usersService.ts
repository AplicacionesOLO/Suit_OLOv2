import { supabase } from '@/services/supabase/client';
import { cleanDate } from '@/utils/sanitize';
import { getEffectiveTenantId } from '@/utils/tenant';

export interface PlatformUserFull {
  id: string;
  auth_user_id: string;
  tenant_id: string | null;
  country_id: string | null;
  warehouse_id: string | null;
  client_id: string | null;
  role_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string;
  last_login: string | null;
  avatar_url: string | null;
  tenant_context_override: string | null;
  country_context_override: string | null;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  role_name?: string;
  role_level?: number;
  country_name?: string;
  warehouse_name?: string;
  client_name?: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  tenant_id: string;
  role_id: string;
  country_id: string | null;
  warehouse_id: string | null;
  client_id: string | null;
  invited_by: string | null;
  status: string;
  token: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  role_name?: string;
  role_level?: number;
  country_name?: string;
  warehouse_name?: string;
  client_name?: string;
  invited_by_name?: string;
}

export interface CreateInvitationInput {
  email: string;
  tenant_id: string;
  role_id: string;
  country_id?: string;
  warehouse_id?: string;
  client_id?: string;
  first_name?: string;
  last_name?: string;
  scope_tenants?: string[];
  scope_countries?: string[];
  scope_warehouses?: string[];
  scope_clients?: string[];
  scope_all_tenants?: boolean;
  scope_all_countries?: boolean;
  scope_all_warehouses?: boolean;
  scope_all_clients?: boolean;
}

export interface UpdateUserInput {
  role_id?: string;
  country_id?: string;
  warehouse_id?: string;
  client_id?: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  scope_countries?: string[];
  scope_tenants?: string[];
  scope_warehouses?: string[];
  scope_clients?: string[];
  scope_all_countries?: boolean;
  scope_all_tenants?: boolean;
  scope_all_warehouses?: boolean;
  scope_all_clients?: boolean;
  tenant_id?: string;
}

export interface UserBridgeScopes {
  tenant_ids: string[];
  country_ids: string[];
  warehouse_ids: string[];
  client_ids: string[];
}

export interface UserAppAccessForEdit {
  id: string;
  application_id: string;
  instance_id: string | null;
  access_status: string;
  expires_at: string | null;
  application_name: string;
  application_icon: string;
  application_color: string;
  instance_name: string | null;
  granted_at: string | null;
  role_id: string | null;
}

export async function fetchUsers(): Promise<{ users: PlatformUserFull[]; error: string | null }> {
  const tenantId = await getEffectiveTenantId();

  let query = supabase.from('platform_users').select('*').order('created_at', { ascending: false });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data: users, error } = await query;

  if (error) return { users: [], error: error.message };

  const typed = users as PlatformUserFull[];

  const tenantIds = [...new Set(typed.map((u) => u.tenant_id).filter(Boolean))] as string[];
  const roleIds = [...new Set(typed.map((u) => u.role_id).filter(Boolean))] as string[];
  const countryIds = [...new Set(typed.map((u) => u.country_id).filter(Boolean))] as string[];
  const warehouseIds = [...new Set(typed.map((u) => u.warehouse_id).filter(Boolean))] as string[];
  const clientIds = [...new Set(typed.map((u) => u.client_id).filter(Boolean))] as string[];

  const tenants: Record<string, string> = {};
  const roles: Record<string, { name: string; level: number }> = {};
  const countries: Record<string, string> = {};
  const warehouses: Record<string, string> = {};
  const clients: Record<string, string> = {};

  if (tenantIds.length > 0) {
    const { data: t } = await supabase.from('tenants').select('id, name, country_id').in('id', tenantIds);
    if (t) t.forEach((r) => { tenants[r.id] = r.name; });
  }
  if (roleIds.length > 0) {
    const { data: r } = await supabase.from('roles').select('id, name, level').in('id', roleIds);
    if (r) r.forEach((rl) => { roles[rl.id] = { name: rl.name, level: rl.level }; });
  }
  if (countryIds.length > 0) {
    const { data: c } = await supabase.from('countries').select('id, name').in('id', countryIds);
    if (c) c.forEach((ct) => { countries[ct.id] = ct.name; });
  }
  if (warehouseIds.length > 0) {
    const { data: w } = await supabase.from('warehouses').select('id, name').in('id', warehouseIds);
    if (w) w.forEach((wh) => { warehouses[wh.id] = wh.name; });
  }
  if (clientIds.length > 0) {
    const { data: cl } = await supabase.from('clients').select('id, name, tenant_id').in('id', clientIds);
    if (cl) cl.forEach((c) => { clients[c.id] = c.name; });
  }

  const enriched = typed.map((u) => ({
    ...u,
    tenant_name: u.tenant_id ? tenants[u.tenant_id] : '—',
    role_name: u.role_id ? roles[u.role_id]?.name : '—',
    role_level: u.role_id ? roles[u.role_id]?.level : 0,
    country_name: u.country_id ? countries[u.country_id] : undefined,
    warehouse_name: u.warehouse_id ? warehouses[u.warehouse_id] : undefined,
    client_name: u.client_id ? clients[u.client_id] : undefined,
  }));

  return { users: enriched, error: null };
}

export async function fetchInvitations(): Promise<{ invitations: UserInvitation[]; error: string | null }> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return { invitations: [], error: error.message };

  const typed = data as UserInvitation[];

  const tenantIds = [...new Set(typed.map((i) => i.tenant_id))];
  const roleIds = [...new Set(typed.map((i) => i.role_id))];
  const countryIds = [...new Set(typed.map((i) => i.country_id).filter(Boolean))] as string[];
  const warehouseIds = [...new Set(typed.map((i) => i.warehouse_id).filter(Boolean))] as string[];
  const clientIds = [...new Set(typed.map((i) => i.client_id).filter(Boolean))] as string[];
  const inviterIds = [...new Set(typed.map((i) => i.invited_by).filter(Boolean))] as string[];

  const tenants: Record<string, string> = {};
  const roles: Record<string, { name: string; level: number }> = {};
  const countries: Record<string, string> = {};
  const warehouses: Record<string, string> = {};
  const clients: Record<string, string> = {};
  const inviters: Record<string, string> = {};

  if (tenantIds.length > 0) {
    const { data: t } = await supabase.from('tenants').select('id, name, country_id').in('id', tenantIds);
    if (t) t.forEach((r) => { tenants[r.id] = r.name; });
  }
  if (roleIds.length > 0) {
    const { data: r } = await supabase.from('roles').select('id, name, level').in('id', roleIds);
    if (r) r.forEach((rl) => { roles[rl.id] = { name: rl.name, level: rl.level }; });
  }
  if (countryIds.length > 0) {
    const { data: c } = await supabase.from('countries').select('id, name').in('id', countryIds);
    if (c) c.forEach((ct) => { countries[ct.id] = ct.name; });
  }
  if (warehouseIds.length > 0) {
    const { data: w } = await supabase.from('warehouses').select('id, name').in('id', warehouseIds);
    if (w) w.forEach((wh) => { warehouses[wh.id] = wh.name; });
  }
  if (clientIds.length > 0) {
    const { data: cl } = await supabase.from('clients').select('id, name, tenant_id').in('id', clientIds);
    if (cl) cl.forEach((c) => { clients[c.id] = c.name; });
  }
  if (inviterIds.length > 0) {
    const { data: inv } = await supabase.from('platform_users').select('id, first_name, last_name, email').in('id', inviterIds);
    if (inv) inv.forEach((i) => { inviters[i.id] = i.first_name ? `${i.first_name} ${i.last_name || ''}` : (i.email || 'Sistema'); });
  }

  const enriched = typed.map((i) => ({
    ...i,
    tenant_name: tenants[i.tenant_id] || '—',
    role_name: roles[i.role_id]?.name || '—',
    role_level: roles[i.role_id]?.level || 0,
    country_name: i.country_id ? countries[i.country_id] : undefined,
    warehouse_name: i.warehouse_id ? warehouses[i.warehouse_id] : undefined,
    client_name: i.client_id ? clients[i.client_id] : undefined,
    invited_by_name: i.invited_by ? inviters[i.invited_by] : undefined,
  }));

  return { invitations: enriched, error: null };
}

export async function createUserInvitation(input: CreateInvitationInput): Promise<{ invitation: UserInvitation | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_user_invitation', {
    p_email: input.email.trim().toLowerCase(),
    p_tenant_id: input.tenant_id,
    p_role_id: input.role_id,
    p_profile_id: null,
    p_country_id: input.country_id || null,
    p_warehouse_id: input.warehouse_id || null,
    p_client_id: input.client_id || null,
    p_first_name: input.first_name || null,
    p_last_name: input.last_name || null,
    p_scope_tenants: input.scope_tenants || null,
    p_scope_countries: input.scope_countries || null,
    p_scope_warehouses: input.scope_warehouses || null,
    p_scope_clients: input.scope_clients || null,
    p_scope_all_tenants: input.scope_all_tenants || false,
    p_scope_all_countries: input.scope_all_countries || false,
    p_scope_all_warehouses: input.scope_all_warehouses || false,
    p_scope_all_clients: input.scope_all_clients || false,
  });

  if (error) return { invitation: null, error: error.message };

  if (data?.error) return { invitation: null, error: data.error };

  return { invitation: data as UserInvitation, error: null };
}

export async function revokeInvitation(invitationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_invitations')
    .update({ status: 'revoked', updated_at: cleanDate(new Date()) })
    .eq('id', invitationId);

  if (error) return { error: error.message };

  try {
    await supabase.from('audit_logs').insert({
      tenant_id: null,
      user_id: null,
      action: 'USER_INVITATION_REVOKED',
      entity_type: 'user_invitations',
      entity_id: invitationId,
      severity: 'medium',
    });
  } catch { /* non-critical */ }

  return { error: null };
}

export async function updatePlatformUser(userId: string, input: UpdateUserInput): Promise<{ error: string | null }> {
  const updateData: Record<string, unknown> = {};
  if (input.role_id !== undefined) updateData.role_id = input.role_id;
  if (input.country_id !== undefined) updateData.country_id = input.country_id;
  if (input.warehouse_id !== undefined) updateData.warehouse_id = input.warehouse_id;
  if (input.client_id !== undefined) updateData.client_id = input.client_id;
  if (input.first_name !== undefined) updateData.first_name = input.first_name;
  if (input.last_name !== undefined) updateData.last_name = input.last_name;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.tenant_id !== undefined) updateData.tenant_id = input.tenant_id;
  if (input.scope_all_tenants !== undefined) updateData.scope_all_tenants = input.scope_all_tenants;
  if (input.scope_all_countries !== undefined) updateData.scope_all_countries = input.scope_all_countries;
  if (input.scope_all_warehouses !== undefined) updateData.scope_all_warehouses = input.scope_all_warehouses;
  if (input.scope_all_clients !== undefined) updateData.scope_all_clients = input.scope_all_clients;
  updateData.updated_at = cleanDate(new Date());

  const { error } = await supabase
    .from('platform_users')
    .update(updateData)
    .eq('id', userId);

  if (error) return { error: error.message };

  // Sync bridge tables if scope arrays are provided
  if (input.scope_tenants !== undefined || input.scope_countries !== undefined ||
      input.scope_warehouses !== undefined || input.scope_clients !== undefined) {
    const scopeError = await syncUserBridgeScopes(userId, {
      tenant_ids: input.scope_tenants,
      country_ids: input.scope_countries,
      warehouse_ids: input.scope_warehouses,
      client_ids: input.scope_clients,
    });
    if (scopeError) {
      // Non-blocking: core update succeeded, scope sync failed
      console.warn('[updatePlatformUser] Scope sync warning:', scopeError);
    }
  }

  try {
    await supabase.from('audit_logs').insert({
      tenant_id: null,
      user_id: null,
      action: 'USER_UPDATED',
      entity_type: 'platform_users',
      entity_id: userId,
      details: input,
      severity: 'medium',
    });
  } catch { /* non-critical */ }

  return { error: null };
}

async function syncUserBridgeScopes(userId: string, scopes: {
  tenant_ids?: string[];
  country_ids?: string[];
  warehouse_ids?: string[];
  client_ids?: string[];
}): Promise<string | null> {
  try {
    const deletions: Promise<any>[] = [];
    if (scopes.tenant_ids !== undefined) deletions.push(supabase.from('user_tenants').delete().eq('user_id', userId));
    if (scopes.country_ids !== undefined) deletions.push(supabase.from('user_countries').delete().eq('user_id', userId));
    if (scopes.warehouse_ids !== undefined) deletions.push(supabase.from('user_warehouses').delete().eq('user_id', userId));
    if (scopes.client_ids !== undefined) deletions.push(supabase.from('user_clients').delete().eq('user_id', userId));

    await Promise.all(deletions);

    const insertions: Promise<any>[] = [];
    if (scopes.tenant_ids && scopes.tenant_ids.length > 0) {
      insertions.push(supabase.from('user_tenants').insert(scopes.tenant_ids.map((tid) => ({ user_id: userId, tenant_id: tid }))));
    }
    if (scopes.country_ids && scopes.country_ids.length > 0) {
      insertions.push(supabase.from('user_countries').insert(scopes.country_ids.map((cid) => ({ user_id: userId, country_id: cid }))));
    }
    if (scopes.warehouse_ids && scopes.warehouse_ids.length > 0) {
      insertions.push(supabase.from('user_warehouses').insert(scopes.warehouse_ids.map((wid) => ({ user_id: userId, warehouse_id: wid }))));
    }
    if (scopes.client_ids && scopes.client_ids.length > 0) {
      insertions.push(supabase.from('user_clients').insert(scopes.client_ids.map((clid) => ({ user_id: userId, client_id: clid }))));
    }

    if (insertions.length > 0) await Promise.all(insertions);

    return null;
  } catch (err: any) {
    return err.message || 'Error syncing scopes';
  }
}

export async function fetchUserBridgeScopes(userId: string): Promise<{ data: UserBridgeScopes; error: string | null }> {
  try {
    const [tenantsRes, countriesRes, warehousesRes, clientsRes] = await Promise.all([
      supabase.from('user_tenants').select('tenant_id').eq('user_id', userId),
      supabase.from('user_countries').select('country_id').eq('user_id', userId),
      supabase.from('user_warehouses').select('warehouse_id').eq('user_id', userId),
      supabase.from('user_clients').select('client_id').eq('user_id', userId),
    ]);

    return {
      data: {
        tenant_ids: (tenantsRes.data || []).map((r: any) => r.tenant_id),
        country_ids: (countriesRes.data || []).map((r: any) => r.country_id),
        warehouse_ids: (warehousesRes.data || []).map((r: any) => r.warehouse_id),
        client_ids: (clientsRes.data || []).map((r: any) => r.client_id),
      },
      error: null,
    };
  } catch (err: any) {
    return { data: { tenant_ids: [], country_ids: [], warehouse_ids: [], client_ids: [] }, error: err.message };
  }
}

export async function fetchUserAppAccessesForEdit(userId: string): Promise<{ data: UserAppAccessForEdit[]; error: string | null }> {
  try {
    const { data: accesses, error } = await supabase
      .from('user_application_access')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!accesses || accesses.length === 0) return { data: [], error: null };

    const appIds = [...new Set(accesses.map((a: any) => a.application_id))];
    const instanceIds = [...new Set(accesses.map((a: any) => a.instance_id).filter(Boolean))] as string[];

    const [appsRes, instancesRes] = await Promise.all([
      supabase.from('applications').select('id, name, icon, color').in('id', appIds),
      instanceIds.length > 0 ? supabase.from('application_instances').select('id, instance_name').in('id', instanceIds) : Promise.resolve({ data: [] }),
    ]);

    const appMap: Record<string, { name: string; icon: string; color: string }> = {};
    (appsRes.data || []).forEach((a: any) => { appMap[a.id] = { name: a.name, icon: a.icon, color: a.color }; });

    const instMap: Record<string, string> = {};
    (instancesRes.data || []).forEach((i: any) => { instMap[i.id] = i.instance_name; });

    return {
      data: accesses.map((a: any) => ({
        id: a.id,
        application_id: a.application_id,
        instance_id: a.instance_id,
        access_status: a.access_status,
        expires_at: a.expires_at,
        application_name: appMap[a.application_id]?.name || '—',
        application_icon: appMap[a.application_id]?.icon || 'ri-apps-2-line',
        application_color: appMap[a.application_id]?.color || 'emerald',
        instance_name: a.instance_id ? instMap[a.instance_id] : null,
        granted_at: a.granted_at,
        role_id: a.role_id,
      })),
      error: null,
    };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function fetchUserAuditEvents(userId: string): Promise<{ data: any[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return { data: (data || []) as any[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function fetchRolePermissionsForDisplay(roleId: string): Promise<{ data: Record<string, string[]> | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('permissions')
      .eq('id', roleId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.permissions) return { data: null, error: null };

    const perms = data.permissions as any;
    const modules = perms?.modules || {};

    const result: Record<string, string[]> = {};
    for (const [key, mod] of Object.entries(modules) as [string, any][]) {
      if (mod?.actions && Array.isArray(mod.actions)) {
        result[key] = mod.actions;
      }
    }
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function deletePlatformUser(userId: string): Promise<{ error: string | null }> {
  const { data: currentUser } = await supabase.auth.getUser();
  const { data: targetUser } = await supabase.from('platform_users').select('auth_user_id, tenant_id, email').eq('id', userId).maybeSingle();

  if (targetUser && currentUser?.user?.id === targetUser.auth_user_id) {
    return { error: 'No puedes eliminarte a ti mismo' };
  }

  const { error } = await supabase.from('platform_users').delete().eq('id', userId);

  if (error) return { error: error.message };

  try {
    await supabase.from('audit_logs').insert({
      tenant_id: targetUser?.tenant_id || null,
      user_id: null,
      action: 'USER_DELETED',
      entity_type: 'platform_users',
      entity_id: userId,
      details: { email: targetUser?.email },
      severity: 'high',
    });
  } catch { /* non-critical */ }

  return { error: null };
}

export async function fetchAccessibleTenants(): Promise<{ tenants: { tenant_id: string; tenant_name: string }[]; error: string | null }> {
  const { data, error } = await supabase.rpc('get_accessible_tenants');
  if (error) return { tenants: [], error: error.message };
  return { tenants: data || [], error: null };
}

export async function setTenantContextOverride(tenantId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId });
  if (error) return false;
  return !!data;
}

export async function clearTenantContextOverride(): Promise<boolean> {
  const { data, error } = await supabase.rpc('clear_tenant_context');
  if (error) return false;
  return !!data;
}

export async function setCountryContextOverride(countryId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_country_context', { p_country_id: countryId });
  if (error) return false;
  return !!data;
}

export async function clearCountryContextOverride(): Promise<boolean> {
  const { data, error } = await supabase.rpc('clear_country_context');
  if (error) return false;
  return !!data;
}

export async function getUserContext(): Promise<{
  tenant_context_override: string | null;
  country_context_override: string | null;
  client_context_override: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  country_id: string | null;
  country_name: string | null;
  role_level: number;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pu } = await supabase
    .from('platform_users')
    .select('tenant_id, tenant_context_override, country_context_override, client_context_override, country_id, client_id, role_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!pu) return null;

  let roleLevel = 0;
  if (pu.role_id) {
    const { data: role } = await supabase.from('roles').select('level').eq('id', pu.role_id).maybeSingle();
    if (role) roleLevel = role.level;
  }

  let tenantName: string | null = null;
  const effectiveTenant = pu.tenant_context_override || pu.tenant_id;
  if (effectiveTenant) {
    const { data: t } = await supabase.from('tenants').select('name').eq('id', effectiveTenant).maybeSingle();
    if (t) tenantName = t.name;
  }

  let countryName: string | null = null;
  const effectiveCountry = pu.country_context_override || pu.country_id;
  if (effectiveCountry) {
    const { data: c } = await supabase.from('countries').select('name').eq('id', effectiveCountry).maybeSingle();
    if (c) countryName = c.name;
  }

  return {
    tenant_context_override: pu.tenant_context_override,
    country_context_override: pu.country_context_override,
    client_context_override: pu.client_context_override,
    tenant_id: effectiveTenant,
    tenant_name: tenantName,
    country_id: effectiveCountry,
    country_name: countryName,
    role_level: roleLevel,
  };
}