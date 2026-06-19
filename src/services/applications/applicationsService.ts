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
  client_id: string | null;
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

export interface ApplicationEnriched extends Application {
  client_name?: string;
  client_code?: string;
  country_id?: string;
  country_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  tenant_name?: string;
  tenant_code?: string;
}

export interface CreateApplicationPayload {
  tenant_id: string;
  client_id?: string | null;
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
  client_id?: string | null;
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
  client_id: string | null;
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

export interface AppInstanceEnriched extends AppInstance {
  application_name?: string;
  application_icon?: string;
  application_color?: string;
  tenant_name?: string;
  client_name?: string;
  client_code?: string;
  country_id?: string;
  country_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
}

export interface CreateInstancePayload {
  tenant_id: string;
  client_id?: string | null;
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
  client_id?: string | null;
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

export interface ClientBrief {
  id: string;
  name: string;
  code: string;
  tenant_id: string;
  country_id: string;
  warehouse_id: string;
}

export interface CountryBrief {
  id: string;
  name: string;
  code: string;
}

export interface WarehouseBrief {
  id: string;
  name: string;
  code: string;
  tenant_id: string;
  country_id: string;
}

export interface TenantCountryBrief {
  id: string;
  tenant_id: string;
  country_id: string;
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

export async function fetchApplications(): Promise<{ data: ApplicationEnriched[]; error: string | null }> {
  try {
    let query = supabase
      .from('applications')
      .select('*, clients!applications_client_id_fkey(id, name, code, tenant_id, country_id, warehouse_id), tenants!applications_tenant_id_fkey(name, code)')
      .order('name', { ascending: true });

    const tenantId = await getEffectiveTenantId();
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) {
      // Fallback: try without the FK join if columns don't exist yet
      const fallbackQuery = supabase
        .from('applications')
        .select('*')
        .order('name', { ascending: true });
      if (tenantId) fallbackQuery.eq('tenant_id', tenantId);
      const fb = await fallbackQuery;
      if (fb.error) throw fb.error;
      return { data: (fb.data || []).map((a: any) => ({ ...a, client_name: undefined, tenant_name: undefined })) as ApplicationEnriched[], error: null };
    }

    // Enrich with joined data
    const enriched = await enrichApplications(data || []);
    return { data: enriched, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar aplicaciones' };
  }
}

async function enrichApplications(rawApps: any[]): Promise<ApplicationEnriched[]> {
  if (!rawApps || rawApps.length === 0) return [];

  // Collect IDs for bulk lookups
  const clientIds = [...new Set(rawApps.map((a) => a.client_id).filter(Boolean))] as string[];
  const tenantIds = [...new Set(rawApps.map((a) => a.tenant_id).filter(Boolean))] as string[];

  const [clientsRes, tenantsRes] = await Promise.all([
    clientIds.length > 0
      ? supabase.from('clients').select('id, name, code, tenant_id, country_id, warehouse_id').in('id', clientIds)
      : Promise.resolve({ data: [] }),
    tenantIds.length > 0
      ? supabase.from('tenants').select('id, name, code').in('id', tenantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientMap: Record<string, any> = {};
  (clientsRes.data || []).forEach((c: any) => { clientMap[c.id] = c; });
  const tenantMap: Record<string, any> = {};
  (tenantsRes.data || []).forEach((t: any) => { tenantMap[t.id] = t; });

  // Get country + warehouse for clients
  const warehouseIds = [...new Set(Object.values(clientMap).map((c: any) => c.warehouse_id).filter(Boolean))] as string[];
  const countryIdsFromClients = [...new Set(Object.values(clientMap).map((c: any) => c.country_id).filter(Boolean))] as string[];

  const [whRes, coRes] = await Promise.all([
    warehouseIds.length > 0
      ? supabase.from('warehouses').select('id, name').in('id', warehouseIds)
      : Promise.resolve({ data: [] }),
    countryIdsFromClients.length > 0
      ? supabase.from('countries').select('id, name').in('id', countryIdsFromClients)
      : Promise.resolve({ data: [] }),
  ]);

  const whMap: Record<string, string> = {};
  (whRes.data || []).forEach((w: any) => { whMap[w.id] = w.name; });
  const coMap: Record<string, string> = {};
  (coRes.data || []).forEach((c: any) => { coMap[c.id] = c.name; });

  return rawApps.map((a: any) => {
    const client = a.client_id ? clientMap[a.client_id] : null;
    const tenant = tenantMap[a.tenant_id];
    return {
      ...a,
      client_name: client?.name,
      client_code: client?.code,
      country_id: client?.country_id,
      country_name: client?.country_id ? coMap[client.country_id] : undefined,
      warehouse_id: client?.warehouse_id,
      warehouse_name: client?.warehouse_id ? whMap[client.warehouse_id] : undefined,
      tenant_name: tenant?.name,
      tenant_code: tenant?.code,
    };
  });
}

export async function fetchInstances(): Promise<{ data: AppInstanceEnriched[]; error: string | null }> {
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
    if (!data || data.length === 0) return { data: [], error: null };

    const appIds = [...new Set(data.map((i: any) => i.application_id))] as string[];
    const clientIds = [...new Set(data.map((i: any) => i.client_id).filter(Boolean))] as string[];
    const tenantIds = [...new Set(data.map((i: any) => i.tenant_id).filter(Boolean))] as string[];

    const [appsRes, clientsRes, tenantsRes] = await Promise.all([
      supabase.from('applications').select('id, name, icon, color').in('id', appIds),
      clientIds.length > 0 ? supabase.from('clients').select('id, name, code, tenant_id, country_id, warehouse_id').in('id', clientIds) : Promise.resolve({ data: [] }),
      tenantIds.length > 0 ? supabase.from('tenants').select('id, name').in('id', tenantIds) : Promise.resolve({ data: [] }),
    ]);

    const appMap: Record<string, any> = {};
    (appsRes.data || []).forEach((a: any) => { appMap[a.id] = a; });
    const clientMap: Record<string, any> = {};
    (clientsRes.data || []).forEach((c: any) => { clientMap[c.id] = c; });
    const tenantMap: Record<string, any> = {};
    (tenantsRes.data || []).forEach((t: any) => { tenantMap[t.id] = t; });

    // Enrich with country and warehouse
    const warehouseIds = [...new Set(Object.values(clientMap).map((c: any) => c.warehouse_id).filter(Boolean))] as string[];
    const countryIds = [...new Set(Object.values(clientMap).map((c: any) => c.country_id).filter(Boolean))] as string[];
    const [whRes, coRes] = await Promise.all([
      warehouseIds.length > 0 ? supabase.from('warehouses').select('id, name').in('id', warehouseIds) : Promise.resolve({ data: [] }),
      countryIds.length > 0 ? supabase.from('countries').select('id, name').in('id', countryIds) : Promise.resolve({ data: [] }),
    ]);
    const whMap: Record<string, string> = {};
    (whRes.data || []).forEach((w: any) => { whMap[w.id] = w.name; });
    const coMap: Record<string, string> = {};
    (coRes.data || []).forEach((c: any) => { coMap[c.id] = c.name; });

    return {
      data: data.map((inst: any) => {
        const app = appMap[inst.application_id];
        const client = inst.client_id ? clientMap[inst.client_id] : null;
        const tenant = tenantMap[inst.tenant_id];
        return {
          ...inst,
          application_name: app?.name,
          application_icon: app?.icon,
          application_color: app?.color,
          tenant_name: tenant?.name,
          client_name: client?.name,
          client_code: client?.code,
          country_id: client?.country_id,
          country_name: client?.country_id ? coMap[client.country_id] : undefined,
          warehouse_id: client?.warehouse_id,
          warehouse_name: client?.warehouse_id ? whMap[client.warehouse_id] : undefined,
        };
      }),
      error: null,
    };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar instancias' };
  }
}

export async function fetchInstanceById(instanceId: string): Promise<{ data: (AppInstance & { application_name?: string; application_icon?: string; application_color?: string; tenant_name?: string; client_name?: string; client_id?: string; country_name?: string; warehouse_name?: string }) | null; error: string | null }> {
  try {
    const { data: instance, error: instError } = await supabase
      .from('application_instances')
      .select('*')
      .eq('id', instanceId)
      .is('deleted_at', null)
      .maybeSingle();

    if (instError) throw instError;
    if (!instance) return { data: null, error: 'Instancia no encontrada' };

    const [appRes, tenantRes, clientRes] = await Promise.all([
      supabase.from('applications').select('name, icon, color').eq('id', instance.application_id).maybeSingle(),
      supabase.from('tenants').select('name').eq('id', instance.tenant_id).maybeSingle(),
      instance.client_id
        ? supabase.from('clients').select('id, name, country_id, warehouse_id').eq('id', instance.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    let countryName: string | undefined;
    let warehouseName: string | undefined;

    if (clientRes.data) {
      const [coRes, whRes] = await Promise.all([
        clientRes.data.country_id
          ? supabase.from('countries').select('name').eq('id', clientRes.data.country_id).maybeSingle()
          : Promise.resolve({ data: null }),
        clientRes.data.warehouse_id
          ? supabase.from('warehouses').select('name').eq('id', clientRes.data.warehouse_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      countryName = coRes.data?.name;
      warehouseName = whRes.data?.name;
    }

    return {
      data: {
        ...instance,
        application_name: appRes.data?.name,
        application_icon: appRes.data?.icon,
        application_color: appRes.data?.color,
        tenant_name: tenantRes.data?.name,
        client_name: clientRes.data?.name,
        country_name: countryName,
        warehouse_name: warehouseName,
      } as any,
      error: null,
    };
  } catch (err: any) {
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

export async function fetchCountries(): Promise<{ data: CountryBrief[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name, code')
      .order('name', { ascending: true });
    if (error) throw error;
    return { data: (data || []) as CountryBrief[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar países' };
  }
}

export async function fetchWarehouses(): Promise<{ data: WarehouseBrief[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('id, name, code, tenant_id, country_id')
      .order('name', { ascending: true });
    if (error) throw error;
    return { data: (data || []) as WarehouseBrief[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar almacenes' };
  }
}

export async function fetchClients(): Promise<{ data: ClientBrief[]; error: string | null }> {
  try {
    let query = supabase
      .from('clients')
      .select('id, name, code, tenant_id, country_id, warehouse_id')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    const tenantId = await getEffectiveTenantId();
    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []) as ClientBrief[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar clientes' };
  }
}

export async function fetchTenantCountries(): Promise<{ data: TenantCountryBrief[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tenant_countries')
      .select('id, tenant_id, country_id');
    if (error) throw error;
    return { data: (data || []) as TenantCountryBrief[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar relaciones' };
  }
}

export async function createApplication(payload: CreateApplicationPayload): Promise<{ data: Application | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        tenant_id: payload.tenant_id,
        client_id: payload.client_id || null,
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
    if (payload.client_id !== undefined) updateData.client_id = payload.client_id;
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
    const effectiveOpenMode = payload.open_mode || (payload.allows_iframe ? 'embedded' : 'external');
    const { data, error } = await supabase
      .from('application_instances')
      .insert({
        tenant_id: payload.tenant_id,
        client_id: payload.client_id || null,
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
    if (payload.client_id !== undefined) updateData.client_id = payload.client_id;
    if (payload.instance_name !== undefined) updateData.instance_name = payload.instance_name;
    if (payload.url !== undefined) updateData.url = payload.url;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.open_mode !== undefined) updateData.open_mode = payload.open_mode;
    if (payload.open_in_olo !== undefined) updateData.open_in_olo = payload.open_in_olo;
    if (payload.open_in_new_tab !== undefined) updateData.open_in_new_tab = payload.open_in_new_tab;
    if (payload.allows_iframe !== undefined) {
      updateData.allows_iframe = payload.allows_iframe;
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