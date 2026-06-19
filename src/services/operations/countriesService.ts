import { supabase } from '@/services/supabase/client';
import type { TenantCountryRelation } from '@/types/organization';

export interface Country {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  iso_code: string;
  currency?: string;
  currency_name?: string;
  timezone?: string;
  language?: string;
  phone_prefix?: string;
  continent?: string;
  flag_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CountryWithCounts extends Country {
  tenant_count: number;
  warehouse_count: number;
  client_count: number;
  user_count: number;
  tenant_names: string[];
}

/**
 * Carga centralizada de tenant_countries con nombres resueltos.
 * Esta es la fuente oficial para la relación País ↔ Tenant.
 */
export async function fetchTenantCountries(): Promise<{
  data: TenantCountryRelation[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('tenant_countries')
      .select('id, tenant_id, country_id');
    if (error) throw error;
    if (!data || data.length === 0) return { data: [], error: null };

    const tenantIds = [...new Set(data.map((tc) => tc.tenant_id))];
    const countryIds = [...new Set(data.map((tc) => tc.country_id))];

    const [{ data: tenants }, { data: countries }] = await Promise.all([
      supabase.from('tenants').select('id, name').in('id', tenantIds),
      supabase.from('countries').select('id, name').in('id', countryIds),
    ]);

    const tenantMap = new Map((tenants || []).map((t) => [t.id, t.name]));
    const countryMap = new Map((countries || []).map((c) => [c.id, c.name]));

    const result: TenantCountryRelation[] = data.map((tc) => ({
      id: tc.id,
      tenant_id: tc.tenant_id,
      country_id: tc.country_id,
      tenant_name: tenantMap.get(tc.tenant_id),
      country_name: countryMap.get(tc.country_id),
    }));

    return { data: result, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar tenant_countries' };
  }
}

/**
 * Guarda (reemplaza) las relaciones tenant_countries para un país.
 */
export async function syncCountryTenants(
  countryId: string,
  tenantIds: string[],
): Promise<{ error: string | null }> {
  try {
    await supabase.from('tenant_countries').delete().eq('country_id', countryId);
    if (tenantIds.length > 0) {
      const rows = tenantIds.map((tid) => ({ country_id: countryId, tenant_id: tid }));
      const { error } = await supabase.from('tenant_countries').insert(rows);
      if (error) throw error;
    }
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al sincronizar tenant_countries' };
  }
}

/**
 * Guarda (reemplaza) las relaciones tenant_countries para un tenant.
 */
export async function syncTenantCountries(
  tenantId: string,
  countryIds: string[],
): Promise<{ error: string | null }> {
  try {
    await supabase.from('tenant_countries').delete().eq('tenant_id', tenantId);
    if (countryIds.length > 0) {
      const rows = countryIds.map((cid) => ({ tenant_id: tenantId, country_id: cid }));
      const { error } = await supabase.from('tenant_countries').insert(rows);
      if (error) throw error;
    }
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al sincronizar tenant_countries' };
  }
}

export async function fetchCountries(): Promise<{
  data: CountryWithCounts[];
  error: string | null;
}> {
  try {
    const { data: countries, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');
    if (error) throw error;
    if (!countries || countries.length === 0) return { data: [], error: null };

    const countryIds = countries.map((c) => c.id);

    const [
      { data: tcData },
      { data: warehouses },
      { data: clients },
      { data: platformUsers },
    ] = await Promise.all([
      supabase.from('tenant_countries').select('tenant_id, country_id').in('country_id', countryIds),
      supabase.from('warehouses').select('id, country_id').in('country_id', countryIds),
      supabase.from('clients').select('id, country_id').in('country_id', countryIds),
      supabase.from('platform_users').select('id, country_id').in('country_id', countryIds),
    ]);

    const tcCountMap = new Map<string, number>();
    const tcTenantIdsByCountry = new Map<string, Set<string>>();
    (tcData || []).forEach((tc) => {
      tcCountMap.set(tc.country_id, (tcCountMap.get(tc.country_id) || 0) + 1);
      if (!tcTenantIdsByCountry.has(tc.country_id)) {
        tcTenantIdsByCountry.set(tc.country_id, new Set());
      }
      tcTenantIdsByCountry.get(tc.country_id)!.add(tc.tenant_id);
    });

    const whCountMap = new Map<string, number>();
    (warehouses || []).forEach((w) => {
      whCountMap.set(w.country_id, (whCountMap.get(w.country_id) || 0) + 1);
    });

    const clientCountMap = new Map<string, number>();
    (clients || []).forEach((c) => {
      clientCountMap.set(c.country_id, (clientCountMap.get(c.country_id) || 0) + 1);
    });

    const userCountMap = new Map<string, number>();
    (platformUsers || []).forEach((u) => {
      userCountMap.set(u.country_id, (userCountMap.get(u.country_id) || 0) + 1);
    });

    // Cargar nombres de tenants para cada país
    const allTenantIds = [...new Set(
      Array.from(tcTenantIdsByCountry.values()).flatMap((s) => [...s]),
    )];
    let tenantNameMap = new Map<string, string>();
    if (allTenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', allTenantIds);
      (tenants || []).forEach((t) => tenantNameMap.set(t.id, t.name));
    }

    const result: CountryWithCounts[] = countries.map((c) => ({
      ...c,
      tenant_count: tcCountMap.get(c.id) || 0,
      warehouse_count: whCountMap.get(c.id) || 0,
      client_count: clientCountMap.get(c.id) || 0,
      user_count: userCountMap.get(c.id) || 0,
      tenant_names: [...(tcTenantIdsByCountry.get(c.id) || new Set())]
        .map((tid) => tenantNameMap.get(tid) || 'Desconocido')
        .sort(),
    }));

    return { data: result, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar paises' };
  }
}

export async function createCountry(data: {
  name: string;
  code: string;
  iso_code: string;
  tenant_id: string;
  currency?: string;
  currency_name?: string;
  timezone?: string;
  language?: string;
  phone_prefix?: string;
  continent?: string;
  flag_url?: string;
}): Promise<{ data: Country | null; error: string | null }> {
  try {
    const existing = await supabase
      .from('countries')
      .select('id')
      .eq('iso_code', data.iso_code)
      .maybeSingle();

    if (existing.data) {
      return { data: null, error: 'Ya existe un pais con ese codigo ISO' };
    }

    const { data: result, error } = await supabase
      .from('countries')
      .insert({
        name: data.name,
        code: data.code,
        iso_code: data.iso_code,
        tenant_id: data.tenant_id,
        currency: data.currency || null,
        currency_name: data.currency_name || null,
        timezone: data.timezone || null,
        language: data.language || null,
        phone_prefix: data.phone_prefix || null,
        continent: data.continent || null,
        flag_url: data.flag_url || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al crear pais' };
  }
}

export async function updateCountry(
  id: string,
  data: {
    name?: string;
    code?: string;
    iso_code?: string;
    tenant_id?: string;
    currency?: string;
    currency_name?: string;
    timezone?: string;
    language?: string;
    phone_prefix?: string;
    continent?: string;
    flag_url?: string;
    status?: string;
  },
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('countries').update(data).eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al actualizar pais' };
  }
}

export async function toggleCountryStatus(
  id: string,
  currentStatus: string,
): Promise<{ error: string | null }> {
  try {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('countries')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al cambiar estado' };
  }
}

export async function fetchAllTenants(): Promise<{
  data: { id: string; name: string }[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .order('name');
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar tenants' };
  }
}