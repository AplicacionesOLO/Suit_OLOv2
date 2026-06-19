import { supabase } from '@/services/supabase/client';
import { cleanDate } from '@/utils/sanitize';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  domain: string | null;
  /** @deprecated Usar tenant_countries para relación N:M */
  country_id: string | null;
  status: string;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TenantWithCounts extends Tenant {
  country_names: string[];
  country_count: number;
  warehouse_count: number;
  client_count: number;
  user_count: number;
  instance_count: number;
}

export interface TenantSettings {
  logo_url?: string;
  primary_email?: string;
  phone?: string;
  website?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  plan?: string;
}

export interface CreateTenantInput {
  name: string;
  code: string;
  country_id?: string;
  status?: string;
  settings?: TenantSettings;
}

export interface UpdateTenantInput {
  name?: string;
  status?: string;
  settings?: TenantSettings;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  severity: string;
  created_at: string;
  user_email?: string;
}

/**
 * Carga la relación tenant_countries para un tenant.
 */
async function loadTenantCountriesData(tenantIds: string[]): Promise<{
  tcByTenant: Map<string, { country_id: string; country_name: string }[]>;
  countByTenant: Map<string, number>;
}> {
  const tcByTenant = new Map<string, { country_id: string; country_name: string }[]>();
  const countByTenant = new Map<string, number>();

  if (tenantIds.length === 0) return { tcByTenant, countByTenant };

  const { data: tcData } = await supabase
    .from('tenant_countries')
    .select('tenant_id, country_id')
    .in('tenant_id', tenantIds);

  if (!tcData || tcData.length === 0) return { tcByTenant, countByTenant };

  const countryIds = [...new Set(tcData.map((tc) => tc.country_id))];
  let countryMap = new Map<string, string>();
  if (countryIds.length > 0) {
    const { data: countries } = await supabase
      .from('countries')
      .select('id, name')
      .in('id', countryIds);
    (countries || []).forEach((c) => countryMap.set(c.id, c.name));
  }

  tcData.forEach((tc) => {
    if (!tcByTenant.has(tc.tenant_id)) tcByTenant.set(tc.tenant_id, []);
    tcByTenant.get(tc.tenant_id)!.push({
      country_id: tc.country_id,
      country_name: countryMap.get(tc.country_id) || 'Desconocido',
    });
    countByTenant.set(tc.tenant_id, (countByTenant.get(tc.tenant_id) || 0) + 1);
  });

  return { tcByTenant, countByTenant };
}

export async function fetchTenants(): Promise<{
  data: TenantWithCounts[];
  error: string | null;
}> {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('name');
    if (error) throw error;
    if (!tenants || tenants.length === 0) return { data: [], error: null };

    const tenantIds = tenants.map((t) => t.id);

    const [
      { tcByTenant, countByTenant: tcCountByTenant },
      { data: warehouses },
      { data: clients },
      { data: users },
      { data: instances },
    ] = await Promise.all([
      loadTenantCountriesData(tenantIds),
      supabase.from('warehouses').select('id, tenant_id').in('tenant_id', tenantIds),
      supabase.from('clients').select('id, tenant_id').in('tenant_id', tenantIds),
      supabase.from('platform_users').select('id, tenant_id').in('tenant_id', tenantIds),
      supabase.from('application_instances').select('id, tenant_id').in('tenant_id', tenantIds),
    ]);

    const whCountMap = new Map<string, number>();
    (warehouses || []).forEach((w) => {
      whCountMap.set(w.tenant_id, (whCountMap.get(w.tenant_id) || 0) + 1);
    });

    const clCountMap = new Map<string, number>();
    (clients || []).forEach((c) => {
      clCountMap.set(c.tenant_id, (clCountMap.get(c.tenant_id) || 0) + 1);
    });

    const usCountMap = new Map<string, number>();
    (users || []).forEach((u) => {
      usCountMap.set(u.tenant_id, (usCountMap.get(u.tenant_id) || 0) + 1);
    });

    const instCountMap = new Map<string, number>();
    (instances || []).forEach((i) => {
      instCountMap.set(i.tenant_id, (instCountMap.get(i.tenant_id) || 0) + 1);
    });

    const result: TenantWithCounts[] = tenants.map((t) => {
      const tcEntries = tcByTenant.get(t.id) || [];
      return {
        ...t,
        country_names: tcEntries.map((e) => e.country_name).sort(),
        country_count: tcCountByTenant.get(t.id) || 0,
        warehouse_count: whCountMap.get(t.id) || 0,
        client_count: clCountMap.get(t.id) || 0,
        user_count: usCountMap.get(t.id) || 0,
        instance_count: instCountMap.get(t.id) || 0,
      };
    });

    return { data: result, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar tenants' };
  }
}

export async function fetchTenantById(
  id: string,
): Promise<{ data: TenantWithCounts | null; error: string | null }> {
  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!tenant) return { data: null, error: 'Tenant no encontrado' };

    const { tcByTenant, countByTenant: tcCountByTenant } =
      await loadTenantCountriesData([id]);

    const [
      { count: warehouseCount },
      { count: clientCount },
      { count: userCount },
      { count: instanceCount },
    ] = await Promise.all([
      supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('platform_users').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('application_instances').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    ]);

    const tcEntries = tcByTenant.get(id) || [];
    const result: TenantWithCounts = {
      ...tenant,
      country_names: tcEntries.map((e) => e.country_name).sort(),
      country_count: tcCountByTenant.get(id) || 0,
      warehouse_count: warehouseCount || 0,
      client_count: clientCount || 0,
      user_count: userCount || 0,
      instance_count: instanceCount || 0,
    };

    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al cargar tenant' };
  }
}

export async function createTenant(
  input: CreateTenantInput,
): Promise<{ data: Tenant | null; error: string | null }> {
  try {
    const { data: existing, error: checkErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('code', input.code)
      .maybeSingle();
    if (checkErr) throw checkErr;
    if (existing) return { data: null, error: 'Ya existe un tenant con ese codigo' };

    // Si se especifica country_id, guardar en tenant_countries también
    const { data: result, error } = await supabase
      .from('tenants')
      .insert({
        name: input.name,
        code: input.code,
        country_id: input.country_id || null,
        status: input.status || 'active',
        settings: input.settings || null,
      })
      .select()
      .single();
    if (error) throw error;

    if (input.country_id && result) {
      await supabase.from('tenant_countries').insert({
        tenant_id: result.id,
        country_id: input.country_id,
      });
    }

    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al crear tenant' };
  }
}

export async function updateTenant(
  id: string,
  input: UpdateTenantInput,
): Promise<{ error: string | null }> {
  try {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.status !== undefined) payload.status = input.status;
    if (input.settings !== undefined) payload.settings = input.settings;

    const { error } = await supabase
      .from('tenants')
      .update({ ...payload, updated_at: cleanDate(new Date()) })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al actualizar tenant' };
  }
}

export async function changeTenantStatus(
  id: string,
  newStatus: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('tenants')
      .update({ status: newStatus, updated_at: cleanDate(new Date()) })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al cambiar estado' };
  }
}

export async function fetchTenantAuditLogs(
  tenantId: string,
  limit: number = 20,
): Promise<{ data: AuditLogEntry[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, details, severity, created_at, user_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const userIds = [...new Set((data || []).map((l) => l.user_id).filter(Boolean))];
    let userEmails: Map<string, string> = new Map();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('platform_users')
        .select('auth_user_id, email')
        .in('auth_user_id', userIds as string[]);
      (users || []).forEach((u) => userEmails.set(u.auth_user_id, u.email || ''));
    }

    const result: AuditLogEntry[] = (data || []).map((l) => ({
      id: l.id,
      action: l.action,
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      details: l.details,
      severity: l.severity,
      created_at: l.created_at,
      user_email: l.user_id ? userEmails.get(l.user_id) || 'Sistema' : 'Sistema',
    }));

    return { data: result, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar auditoria' };
  }
}