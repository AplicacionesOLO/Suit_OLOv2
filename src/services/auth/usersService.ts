import { supabase } from '@/services/supabase/client';

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
}

export interface UpdateUserInput {
  role_id?: string;
  country_id?: string;
  warehouse_id?: string;
  client_id?: string;
  first_name?: string;
  last_name?: string;
  status?: string;
}

export async function fetchUsers(): Promise<{ users: PlatformUserFull[]; error: string | null }> {
  const { data: users, error } = await supabase
    .from('platform_users')
    .select('*')
    .order('created_at', { ascending: false });

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
    const { data: t } = await supabase.from('tenants').select('id, name').in('id', tenantIds);
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
    const { data: cl } = await supabase.from('clients').select('id, name').in('id', clientIds);
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
    const { data: t } = await supabase.from('tenants').select('id, name').in('id', tenantIds);
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
    const { data: cl } = await supabase.from('clients').select('id, name').in('id', clientIds);
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
  });

  if (error) return { invitation: null, error: error.message };

  if (data?.error) return { invitation: null, error: data.error };

  return { invitation: data as UserInvitation, error: null };
}

export async function revokeInvitation(invitationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_invitations')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
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
  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('platform_users')
    .update(updateData)
    .eq('id', userId);

  if (error) return { error: error.message };

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
  tenant_id: string | null;
  tenant_name: string | null;
  role_level: number;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pu } = await supabase
    .from('platform_users')
    .select('tenant_id, tenant_context_override, country_context_override, role_id')
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

  return {
    tenant_context_override: pu.tenant_context_override,
    country_context_override: pu.country_context_override,
    tenant_id: effectiveTenant,
    tenant_name: tenantName,
    role_level: roleLevel,
  };
}