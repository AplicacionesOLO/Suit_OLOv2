import { supabase } from '@/services/supabase/client';
import { cleanDate } from '@/utils/sanitize';
import { getEffectiveTenantId } from '@/utils/tenant';

export interface UserAppAccess {
  id: string;
  tenant_id: string;
  user_id: string;
  application_id: string;
  instance_id: string | null;
  access_status: string;
  role_id: string | null;
  granted_by: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AccessWithDetails extends UserAppAccess {
  user_name?: string;
  user_email?: string;
  application_name?: string;
  application_code?: string;
  application_icon?: string;
  application_color?: string;
  application_base_url?: string;
  application_client_id?: string;
  instance_name?: string;
  instance_url?: string;
  instance_open_mode?: string;
  instance_allows_iframe?: boolean;
  instance_client_id?: string;
  client_name?: string;
  country_name?: string;
  warehouse_name?: string;
  role_name?: string;
}

export interface CreateAccessPayload {
  user_id: string;
  application_id: string;
  instance_id?: string | null;
  access_status?: string;
  role_id?: string | null;
  expires_at?: string | null;
}

export interface PlatformUserBrief {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
  status: string;
}

export async function fetchPlatformUsers(): Promise<{ data: PlatformUserBrief[]; error: string | null }> {
  try {
    let query = supabase
      .from('platform_users')
      .select('id, first_name, last_name, email, role_id, status')
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    const tenantId = await getEffectiveTenantId();
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []) as PlatformUserBrief[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar usuarios' };
  }
}

export async function fetchUserAccesses(): Promise<{ data: AccessWithDetails[]; error: string | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: [], error: 'No se pudo determinar el tenant' };

    const { data, error } = await supabase
      .from('user_application_access')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return { data: [], error: null };

    const userIds = [...new Set(data.map((a) => a.user_id))];
    const appIds = [...new Set(data.map((a) => a.application_id))];
    const instanceIds = [...new Set(data.map((a) => a.instance_id).filter(Boolean))] as string[];

    const [usersRes, appsRes, instancesRes] = await Promise.all([
      supabase.from('platform_users').select('id, first_name, last_name, email, role_id').in('id', userIds),
      supabase.from('applications').select('id, name, code, icon, color').in('id', appIds),
      instanceIds.length > 0 ? supabase.from('application_instances').select('id, instance_name').in('id', instanceIds) : Promise.resolve({ data: [] }),
    ]);

    const userMap: Record<string, { name: string; email: string; role_id: string }> = {};
    (usersRes.data || []).forEach((u) => {
      userMap[u.id] = { name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—', email: u.email || '—', role_id: u.role_id };
    });

    const appMap: Record<string, { name: string; code: string; icon: string; color: string }> = {};
    (appsRes.data || []).forEach((a) => {
      appMap[a.id] = { name: a.name, code: a.code, icon: a.icon, color: a.color };
    });

    const instMap: Record<string, string> = {};
    (instancesRes.data || []).forEach((i) => { instMap[i.id] = i.instance_name; });

    const roleIdsFromAccess = [...new Set(data.map((a) => a.role_id).filter(Boolean))] as string[];
    const roleIdsFromUsers = [...new Set(Object.values(userMap).map((u) => u.role_id).filter(Boolean))] as string[];
    const allRoleIds = [...new Set([...roleIdsFromAccess, ...roleIdsFromUsers])];
    const { data: rolesData } = allRoleIds.length > 0
      ? await supabase.from('roles').select('id, name').in('id', allRoleIds)
      : { data: [] };
    const roleMap: Record<string, string> = {};
    (rolesData || []).forEach((r) => { roleMap[r.id] = r.name; });

    return {
      data: data.map((a) => {
        const user = userMap[a.user_id];
        const app = appMap[a.application_id];
        return {
          ...a,
          user_name: user?.name,
          user_email: user?.email,
          application_name: app?.name,
          application_code: app?.code,
          application_icon: app?.icon,
          application_color: app?.color,
          instance_name: a.instance_id ? instMap[a.instance_id] : undefined,
          role_name: a.role_id ? roleMap[a.role_id] : user?.role_id ? roleMap[user.role_id] : undefined,
        };
      }),
      error: null,
    };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar asignaciones' };
  }
}

export async function fetchMyAccesses(userId: string): Promise<{ data: AccessWithDetails[]; error: string | null }> {
  try {
    // No filter by tenant_id — RLS handles visibility.
    // User may have accesses under multiple tenants; restricting to one
    // tenant would hide valid records from other tenants.
    const { data, error } = await supabase
      .from('user_application_access')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return { data: [], error: null };

    const appIds = [...new Set(data.map((a) => a.application_id))];
    const instanceIds = [...new Set(data.map((a) => a.instance_id).filter(Boolean))] as string[];

    const [appsRes, instancesRes] = await Promise.all([
      supabase.from('applications').select('id, name, code, icon, color, base_url, status, version, client_id').in('id', appIds),
      instanceIds.length > 0 ? supabase.from('application_instances').select('*').in('id', instanceIds) : Promise.resolve({ data: [] }),
    ]);

    const appMap: Record<string, any> = {};
    (appsRes.data || []).forEach((a) => { appMap[a.id] = a; });

    const instMap: Record<string, any> = {};
    (instancesRes.data || []).forEach((i) => { instMap[i.id] = i; });

    // Collect client IDs from apps and instances
    const appClientIds = [...new Set((appsRes.data || []).map((a: any) => a.client_id).filter(Boolean))] as string[];
    const instClientIds = [...new Set((instancesRes.data || []).map((i: any) => i.client_id).filter(Boolean))] as string[];
    const allClientIds = [...new Set([...appClientIds, ...instClientIds])];

    let clientMap: Record<string, any> = {};
    let coMap: Record<string, string> = {};
    let whMap: Record<string, string> = {};

    if (allClientIds.length > 0) {
      const clRes = await supabase.from('clients').select('id, name, country_id, warehouse_id').in('id', allClientIds);
      (clRes.data || []).forEach((c: any) => { clientMap[c.id] = c; });

      const countryIds = [...new Set((clRes.data || []).map((c: any) => c.country_id).filter(Boolean))] as string[];
      const whIds = [...new Set((clRes.data || []).map((c: any) => c.warehouse_id).filter(Boolean))] as string[];

      if (countryIds.length > 0) {
        const coRes = await supabase.from('countries').select('id, name').in('id', countryIds);
        (coRes.data || []).forEach((c: any) => { coMap[c.id] = c.name; });
      }
      if (whIds.length > 0) {
        const whRes = await supabase.from('warehouses').select('id, name').in('id', whIds);
        (whRes.data || []).forEach((w: any) => { whMap[w.id] = w.name; });
      }
    }

    return {
      data: data.map((a) => {
        const app = appMap[a.application_id];
        const inst = a.instance_id ? instMap[a.instance_id] : null;
        const appClient = app?.client_id ? clientMap[app.client_id] : null;
        const instClient = inst?.client_id ? clientMap[inst.client_id] : null;
        const effectiveClient = instClient || appClient;
        return {
          ...a,
          application_name: app?.name,
          application_code: app?.code,
          application_icon: app?.icon,
          application_color: app?.color,
          application_base_url: app?.base_url,
          application_client_id: app?.client_id,
          instance_name: inst?.instance_name,
          instance_url: inst?.url,
          instance_open_mode: inst?.open_mode,
          instance_allows_iframe: inst?.allows_iframe,
          instance_client_id: inst?.client_id,
          client_name: effectiveClient?.name,
          country_name: effectiveClient?.country_id ? coMap[effectiveClient.country_id] : undefined,
          warehouse_name: effectiveClient?.warehouse_id ? whMap[effectiveClient.warehouse_id] : undefined,
        };
      }),
      error: null,
    };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar mis accesos' };
  }
}

export async function createUserAccess(payload: CreateAccessPayload): Promise<{ data: UserAppAccess | null; error: string | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: null, error: 'No se pudo determinar el tenant' };

    const { data: { user } } = await supabase.auth.getUser();
    let grantedBy: string | null = null;
    if (user) {
      const { data: pu } = await supabase.from('platform_users').select('id').eq('auth_user_id', user.id).maybeSingle();
      grantedBy = pu?.id || null;
    }

    // Check for existing active assignment duplicate
    const { data: existing } = await supabase
      .from('user_application_access')
      .select('id, access_status')
      .eq('tenant_id', tenantId)
      .eq('user_id', payload.user_id)
      .eq('application_id', payload.application_id)
      .eq('instance_id', payload.instance_id || null)
      .maybeSingle();

    if (existing) {
      if (existing.access_status === 'assigned') {
        return { data: null, error: 'Ya existe una asignacion activa para este usuario, aplicacion e instancia' };
      }
      if (existing.access_status === 'revoked') {
        // Reactivate it
        const { data: reactivated, error: reactError } = await supabase
          .from('user_application_access')
          .update({
            access_status: 'assigned',
            revoked_at: cleanDate(null),
            role_id: payload.role_id || null,
            expires_at: cleanDate(payload.expires_at),
            granted_by: grantedBy,
            granted_at: cleanDate(new Date()),
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (reactError) throw reactError;
        return { data: reactivated as UserAppAccess, error: null };
      }
    }

    const { data, error } = await supabase
      .from('user_application_access')
      .insert({
        tenant_id: tenantId,
        user_id: payload.user_id,
        application_id: payload.application_id,
        instance_id: payload.instance_id || null,
        access_status: payload.access_status || 'assigned',
        role_id: payload.role_id || null,
        expires_at: cleanDate(payload.expires_at),
        granted_by: grantedBy,
        granted_at: cleanDate(new Date()),
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as UserAppAccess, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al crear asignacion' };
  }
}

export async function revokeUserAccess(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('user_application_access')
      .update({ access_status: 'revoked', revoked_at: cleanDate(new Date()) })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al revocar acceso' };
  }
}

export async function reactivateUserAccess(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('user_application_access')
      .update({ access_status: 'assigned', revoked_at: cleanDate(null), granted_at: cleanDate(new Date()) })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al reactivar acceso' };
  }
}

export async function canAccessInstance(instanceId: string): Promise<{ allowed: boolean; access: AccessWithDetails | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[canAccessInstance] No authenticated user');
      return { allowed: false, access: null, error: 'No autenticado' };
    }

    const { data: pu } = await supabase
      .from('platform_users')
      .select('id, tenant_id, tenant_context_override, role_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!pu) {
      console.warn('[canAccessInstance] No platform_user found for auth_user_id:', user.id);
      return { allowed: false, access: null, error: 'Usuario no encontrado en platform_users' };
    }

    const effectiveTenantId = pu.tenant_context_override || pu.tenant_id;
    console.log('[canAccessInstance] User:', pu.id, '| tenant:', effectiveTenantId, '| role_id:', pu.role_id, '| instanceId:', instanceId);

    // Determine if super admin early
    let isSA = false;
    const { data: roleData } = await supabase
      .from('roles')
      .select('level')
      .eq('id', pu.role_id || '')
      .maybeSingle();
    isSA = (roleData?.level || 0) >= 100;

    // Check instance exists and is active
    const { data: instance, error: instError } = await supabase
      .from('application_instances')
      .select('id, tenant_id, application_id, client_id, status, instance_name, url, open_mode, allows_iframe')
      .eq('id', instanceId)
      .is('deleted_at', null)
      .maybeSingle();

    if (instError) {
      console.error('[canAccessInstance] Supabase error on instance query:', instError);
      return { allowed: false, access: null, error: `Error de base de datos: ${instError.message || 'desconocido'}` };
    }

    if (!instance) {
      console.warn('[canAccessInstance] Instance NOT FOUND for id:', instanceId, '| RLS may have filtered it');
      return { allowed: false, access: null, error: 'Instancia no encontrada' };
    }

    console.log('[canAccessInstance] Instance found:', instance.instance_name, '| status:', instance.status, '| app_id:', instance.application_id);

    if (instance.status !== 'active') {
      console.warn('[canAccessInstance] Instance is not active:', instance.status);
      return { allowed: false, access: null, error: 'Instancia no activa' };
    }

    // Check user has active access
    const { data: access, error: accessError } = await supabase
      .from('user_application_access')
      .select('*')
      .eq('user_id', pu.id)
      .eq('application_id', instance.application_id)
      .eq('tenant_id', effectiveTenantId)
      .eq('access_status', 'assigned')
      .maybeSingle();

    if (accessError) {
      console.error('[canAccessInstance] Supabase error on access query:', accessError);
    }

    if (!access) {
      console.warn('[canAccessInstance] No active access found for user:', pu.id, 'app:', instance.application_id);
      return { allowed: false, access: null, error: 'No tienes acceso a esta instancia' };
    }

    console.log('[canAccessInstance] Access found:', access.id, '| status:', access.access_status);

    // Check instance belongs to user's tenant (or super admin bypass)
    if (instance.tenant_id !== effectiveTenantId) {
      console.log('[canAccessInstance] Tenant mismatch — instance:', instance.tenant_id, '| user:', effectiveTenantId, '| isSA:', isSA);
      if (!isSA) {
        return { allowed: false, access: null, error: 'La instancia no pertenece a tu tenant' };
      }
      console.log('[canAccessInstance] Super admin bypass enabled — allowing cross-tenant access');
    }

    console.log('[canAccessInstance] ACCESS GRANTED for instance:', instance.instance_name);

    // Additional check: client_id validation
    if (instance.client_id) {
      const { data: userClients } = await supabase
        .from('user_clients')
        .select('id')
        .eq('user_id', pu.id)
        .eq('client_id', instance.client_id);

      const hasDirectClientAccess = (userClients || []).length > 0;

      if (!hasDirectClientAccess && !isSA) {
        console.warn('[canAccessInstance] User does not have access to client:', instance.client_id);
        return { allowed: false, access: null, error: 'No tienes acceso al cliente asociado a esta instancia' };
      }
    }

    return { allowed: true, access: access as AccessWithDetails, error: null };
  } catch (err: any) {
    console.error('[canAccessInstance] Unexpected error:', err);
    return { allowed: false, access: null, error: err.message || 'Error al validar acceso' };
  }
}

export async function validateUserClientAccess(userId: string, clientId: string): Promise<{ hasAccess: boolean; error: string | null }> {
  try {
    // Check direct client access
    const { data: userClients, error: ucError } = await supabase
      .from('user_clients')
      .select('id')
      .eq('user_id', userId)
      .eq('client_id', clientId);

    if (ucError) throw ucError;

    if ((userClients || []).length > 0) {
      return { hasAccess: true, error: null };
    }

    // Check role level for scope_all_clients
    const { data: pu } = await supabase
      .from('platform_users')
      .select('role_id, tenant_context_override')
      .eq('id', userId)
      .maybeSingle();

    if (pu?.role_id) {
      const { data: role } = await supabase
        .from('roles')
        .select('level')
        .eq('id', pu.role_id)
        .maybeSingle();

      if (role && (role.level || 0) >= 100) {
        return { hasAccess: true, error: null };
      }
    }

    return { hasAccess: false, error: 'El usuario no tiene acceso al cliente asociado a esta aplicación.' };
  } catch (err: any) {
    return { hasAccess: false, error: err.message || 'Error al validar acceso al cliente' };
  }
}

export async function logAuditEvent(payload: {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  severity?: string;
}): Promise<{ error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: pu } = await supabase
      .from('platform_users')
      .select('id, tenant_id, tenant_context_override')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!pu) return { error: 'Usuario no encontrado' };

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        tenant_id: pu.tenant_context_override || pu.tenant_id,
        user_id: pu.id,
        action: payload.action,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id || null,
        details: payload.details || null,
        severity: payload.severity || 'info',
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 512) : null,
      });

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al registrar evento' };
  }
}