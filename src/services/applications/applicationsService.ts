import { supabase } from '@/services/supabase/client';
import { cleanDate } from '@/utils/sanitize';
import { getEffectiveTenantId } from '@/utils/tenant';

export interface AppCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Application {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  base_url: string | null;
  status: string;
  version: string;
  integration_type: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CreateApplicationPayload {
  tenant_id: string;
  category_id?: string | null;
  name: string;
  code: string;
  description?: string | null;
  icon?: string;
  color?: string;
  base_url?: string | null;
  version?: string;
  integration_type?: string;
  tags?: string[] | null;
}

export interface UpdateApplicationPayload {
  category_id?: string | null;
  name?: string;
  code?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  base_url?: string | null;
  status?: string;
  version?: string;
  integration_type?: string;
  tags?: string[] | null;
}

export interface AppInstance {
  id: string;
  tenant_id: string;
  application_id: string;
  instance_name: string;
  url: string | null;
  status: string;
  open_in_olo: boolean;
  open_in_new_tab: boolean;
  allows_iframe: boolean;
  open_mode: string;
  sso_enabled: boolean;
  jwt_federated: boolean;
  allowed_domains: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CreateInstancePayload {
  tenant_id: string;
  application_id: string;
  instance_name: string;
  url?: string | null;
  open_mode?: string;
  open_in_olo?: boolean;
  open_in_new_tab?: boolean;
  allows_iframe?: boolean;
  sso_enabled?: boolean;
  jwt_federated?: boolean;
  allowed_domains?: string[] | null;
}

export interface UpdateInstancePayload {
  instance_name?: string;
  url?: string | null;
  status?: string;
  open_mode?: string;
  open_in_olo?: boolean;
  open_in_new_tab?: boolean;
  allows_iframe?: boolean;
  sso_enabled?: boolean;
  jwt_federated?: boolean;
  allowed_domains?: string[] | null;
}

export interface TenantBrief {
  id: string;
  name: string;
  code: string;
}

export async function fetchCategories(): Promise<{ data: AppCategory[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('application_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return { data: (data || []) as AppCategory[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar categorías' };
  }
}

export async function fetchApplications(): Promise<{ data: Application[]; error: string | null }> {
  try {
    let query = supabase
      .from('applications')
      .select('*')
      .order('name', { ascending: true });

    const tenantId = await getEffectiveTenantId();
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []) as Application[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar aplicaciones' };
  }
}

export async function fetchInstances(): Promise<{ data: AppInstance[]; error: string | null }> {
  try {
    let query = supabase
      .from('application_instances')
      .select('*')
      .order('created_at', { ascending: false });

    const tenantId = await getEffectiveTenantId();
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []) as AppInstance[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar instancias' };
  }
}

export async function fetchInstanceById(instanceId: string): Promise<{ data: (AppInstance & { application_name?: string; application_icon?: string; application_color?: string; tenant_name?: string }) | null; error: string | null }> {
  try {
    // Step 1: Fetch instance without inner joins (inner joins + RLS can fail silently in PostgREST)
    const { data: instance, error: instError } = await supabase
      .from('application_instances')
      .select('*')
      .eq('id', instanceId)
      .is('deleted_at', null)
      .maybeSingle();

    if (instError) {
      console.error('[fetchInstanceById] Supabase error on instance query:', instError);
      throw instError;
    }
    if (!instance) {
      console.warn('[fetchInstanceById] Instance not found for id:', instanceId);
      return { data: null, error: 'Instancia no encontrada' };
    }

    // Step 2: Fetch application name (separate query, no inner join)
    const { data: app } = await supabase
      .from('applications')
      .select('name, icon, color')
      .eq('id', instance.application_id)
      .maybeSingle();

    // Step 3: Fetch tenant name (separate query, no inner join)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', instance.tenant_id)
      .maybeSingle();

    console.log('[fetchInstanceById] SUCCESS — instance:', instance.instance_name, '| app:', app?.name || 'N/A', '| tenant:', tenant?.name || 'N/A');

    return {
      data: {
        ...instance,
        application_name: app?.name,
        application_icon: app?.icon,
        application_color: app?.color,
        tenant_name: tenant?.name,
      } as any,
      error: null,
    };
  } catch (err: any) {
    console.error('[fetchInstanceById] Unexpected error:', err);
    return { data: null, error: err.message || 'Error al cargar instancia' };
  }
}

export async function fetchTenants(): Promise<{ data: TenantBrief[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, code')
      .order('name', { ascending: true });
    if (error) throw error;
    return { data: (data || []) as TenantBrief[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar tenants' };
  }
}

export async function createApplication(payload: CreateApplicationPayload): Promise<{ data: Application | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        tenant_id: payload.tenant_id,
        category_id: payload.category_id || null,
        name: payload.name,
        code: payload.code,
        description: payload.description || null,
        icon: payload.icon || 'ri-apps-2-line',
        color: payload.color || 'emerald',
        base_url: payload.base_url || null,
        version: payload.version || '1.0.0',
        integration_type: payload.integration_type || 'internal',
        tags: payload.tags || null,
      })
      .select()
      .single();
    if (error) throw error;
    return { data: data as Application, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al crear aplicación' };
  }
}

export async function updateApplication(id: string, payload: UpdateApplicationPayload): Promise<{ data: Application | null; error: string | null }> {
  try {
    const updateData: Record<string, unknown> = { updated_at: cleanDate(new Date()) };
    if (payload.category_id !== undefined) updateData.category_id = payload.category_id;
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.code !== undefined) updateData.code = payload.code;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.icon !== undefined) updateData.icon = payload.icon;
    if (payload.color !== undefined) updateData.color = payload.color;
    if (payload.base_url !== undefined) updateData.base_url = payload.base_url;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.version !== undefined) updateData.version = payload.version;
    if (payload.integration_type !== undefined) updateData.integration_type = payload.integration_type;
    if (payload.tags !== undefined) updateData.tags = payload.tags;

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data: data as Application, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al actualizar aplicación' };
  }
}

export async function softDeleteApplication(id: string): Promise<{ error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: pu } = user ? await supabase.from('platform_users').select('id').eq('auth_user_id', user.id).maybeSingle() : { data: null };

    const { error } = await supabase
      .from('applications')
      .update({ deleted_at: cleanDate(new Date()), deleted_by: pu?.id || null, updated_at: cleanDate(new Date()) })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al eliminar aplicación' };
  }
}

export async function restoreApplication(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('applications')
      .update({ deleted_at: cleanDate(null), deleted_by: null, updated_at: cleanDate(new Date()) })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al restaurar aplicación' };
  }
}

export async function createInstance(payload: CreateInstancePayload): Promise<{ data: AppInstance | null; error: string | null }> {
  try {
    // Enforce open_mode rule: if allows_iframe is false, open_mode must be external
    const effectiveOpenMode = payload.open_mode || (payload.allows_iframe ? 'embedded' : 'external');
    const { data, error } = await supabase
      .from('application_instances')
      .insert({
        tenant_id: payload.tenant_id,
        application_id: payload.application_id,
        instance_name: payload.instance_name,
        url: payload.url || null,
        open_mode: effectiveOpenMode,
        open_in_olo: payload.open_in_olo ?? false,
        open_in_new_tab: payload.open_in_new_tab ?? false,
        allows_iframe: payload.allows_iframe ?? false,
        sso_enabled: payload.sso_enabled ?? false,
        jwt_federated: payload.jwt_federated ?? false,
        allowed_domains: payload.allowed_domains || null,
      })
      .select()
      .single();
    if (error) throw error;
    return { data: data as AppInstance, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al crear instancia' };
  }
}

export async function updateInstance(id: string, payload: UpdateInstancePayload): Promise<{ data: AppInstance | null; error: string | null }> {
  try {
    const updateData: Record<string, unknown> = { updated_at: cleanDate(new Date()) };
    if (payload.instance_name !== undefined) updateData.instance_name = payload.instance_name;
    if (payload.url !== undefined) updateData.url = payload.url;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.open_mode !== undefined) updateData.open_mode = payload.open_mode;
    if (payload.open_in_olo !== undefined) updateData.open_in_olo = payload.open_in_olo;
    if (payload.open_in_new_tab !== undefined) updateData.open_in_new_tab = payload.open_in_new_tab;
    if (payload.allows_iframe !== undefined) {
      updateData.allows_iframe = payload.allows_iframe;
      // Enforce: if allows_iframe is false and open_mode was embedded, force to external
      if (!payload.allows_iframe && payload.open_mode === 'embedded') {
        updateData.open_mode = 'external';
      }
    }
    if (payload.sso_enabled !== undefined) updateData.sso_enabled = payload.sso_enabled;
    if (payload.jwt_federated !== undefined) updateData.jwt_federated = payload.jwt_federated;
    if (payload.allowed_domains !== undefined) updateData.allowed_domains = payload.allowed_domains;

    const { data, error } = await supabase
      .from('application_instances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data: data as AppInstance, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al actualizar instancia' };
  }
}

export async function softDeleteInstance(id: string): Promise<{ error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: pu } = user ? await supabase.from('platform_users').select('id').eq('auth_user_id', user.id).maybeSingle() : { data: null };

    const { error } = await supabase
      .from('application_instances')
      .update({ deleted_at: cleanDate(new Date()), deleted_by: pu?.id || null, updated_at: cleanDate(new Date()) })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al eliminar instancia' };
  }
}

export async function restoreInstance(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('application_instances')
      .update({ deleted_at: cleanDate(null), deleted_by: null, updated_at: cleanDate(new Date()) })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al restaurar instancia' };
  }
}