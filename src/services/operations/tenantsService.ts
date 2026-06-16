import { supabase } from '@/services/supabase/client';
import { cleanDate } from '@/utils/sanitize';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  domain: string | null;
  status: string;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TenantWithCounts extends Tenant {
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

export async function fetchTenants(): Promise<{ data: TenantWithCounts[]; error: string | null }> {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('name');

    if (error) throw error;
    if (!tenants || tenants.length === 0) return { data: [], error: null };

    const tenantIds = tenants.map((t) => t.id);

    const [
      { data: countries },
      { data: warehouses },
      { data: clients },
      { data: users },
      { data: instances },
    ] = await Promise.all([
      supabase.from('countries').select('id, tenant_id').in('tenant_id', tenantIds),
      supabase.from('warehouses').select('id, tenant_id').in('tenant_id', tenantIds),
      supabase.from('clients').select('id, tenant_id').in('tenant_id', tenantIds),
      supabase.from('platform_users').select('id, tenant_id').in('tenant_id', tenantIds),
      supabase.from('application_instances').select('id, tenant_id').in('tenant_id', tenantIds),
    ]);

    const countsMap = new Map<string, { countries: number; warehouses: number; clients: number; users: number; instances: number }>();
    tenantIds.forEach((id) => countsMap.set(id, { countries: 0, warehouses: 0, clients: 0, users: 0, instances: 0 }));

    (countries || []).forEach((c) => { const m = countsMap.get(c.tenant_id); if (m) m.countries++; });
    (warehouses || []).forEach((w) => { const m = countsMap.get(w.tenant_id); if (m) m.warehouses++; });
    (clients || []).forEach((c) => { const m = countsMap.get(c.tenant_id); if (m) m.clients++; });
    (users || []).forEach((u) => { const m = countsMap.get(u.tenant_id); if (m) m.users++; });
    (instances || []).forEach((i) => { const m = countsMap.get(i.tenant_id); if (m) m.instances++; });

    const result: TenantWithCounts[] = tenants.map((t) => {
      const c = countsMap.get(t.id) || { countries: 0, warehouses: 0, clients: 0, users: 0, instances: 0 };
      return {
        ...t,
        country_count: c.countries,
        warehouse_count: c.warehouses,
        client_count: c.clients,
        user_count: c.users,
        instance_count: c.instances,
      };
    });

    return { data: result, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar tenants' };
  }
}

export async function fetchTenantById(id: string): Promise<{ data: TenantWithCounts | null; error: string | null }> {
  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!tenant) return { data: null, error: 'Tenant no encontrado' };

    const [
      { count: countryCount },
      { count: warehouseCount },
      { count: clientCount },
      { count: userCount },
      { count: instanceCount },
    ] = await Promise.all([
      supabase.from('countries').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('platform_users').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('application_instances').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    ]);

    const result: TenantWithCounts = {
      ...tenant,
      country_count: countryCount || 0,
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

export async function createTenant(input: CreateTenantInput): Promise<{ data: Tenant | null; error: string | null }> {
  try {
    const { data: existing, error: checkErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('code', input.code)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existing) return { data: null, error: 'Ya existe un tenant con ese codigo' };

    const { data: result, error } = await supabase
      .from('tenants')
      .insert({
        name: input.name,
        code: input.code,
        status: input.status || 'active',
        settings: input.settings || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al crear tenant' };
  }
}

export async function updateTenant(id: string, input: UpdateTenantInput): Promise<{ error: string | null }> {
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
  newStatus: string
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
  limit: number = 20
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