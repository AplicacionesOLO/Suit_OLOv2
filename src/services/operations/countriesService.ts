import { supabase } from '@/services/supabase/client';
import { getEffectiveTenantId } from '@/utils/tenant';

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
  warehouse_count: number;
  client_count: number;
  tenant_name?: string;
}

export async function fetchCountries(): Promise<{ data: CountryWithCounts[]; error: string | null }> {
  try {
    let query = supabase.from('countries').select('*').order('name');

    const tenantId = await getEffectiveTenantId();
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: countries, error } = await query;
    if (error) throw error;
    if (!countries || countries.length === 0) return { data: [], error: null };

    const countryIds = countries.map((c) => c.id);

    const [{ data: warehouses }, { data: clients }, { data: tenants }] = await Promise.all([
      supabase.from('warehouses').select('id, country_id').in('country_id', countryIds),
      supabase.from('clients').select('id, warehouse_id').in('warehouse_id', countryIds),
      supabase.from('tenants').select('id, name'),
    ]);

    const warehouseCountMap = new Map<string, number>();
    (warehouses || []).forEach((w) => {
      warehouseCountMap.set(w.country_id, (warehouseCountMap.get(w.country_id) || 0) + 1);
    });

    const whIds = (warehouses || []).map((w) => w.id);
    const clientCountByCountry = new Map<string, number>();
    (clients || []).forEach((cl) => {
      const wh = (warehouses || []).find((w) => w.id === cl.warehouse_id);
      if (wh) {
        clientCountByCountry.set(wh.country_id, (clientCountByCountry.get(wh.country_id) || 0) + 1);
      }
    });

    const tenantMap = new Map((tenants || []).map((t) => [t.id, t.name]));

    const result: CountryWithCounts[] = countries.map((c) => ({
      ...c,
      warehouse_count: warehouseCountMap.get(c.id) || 0,
      client_count: clientCountByCountry.get(c.id) || 0,
      tenant_name: tenantMap.get(c.tenant_id) || 'Desconocido',
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
      .eq('tenant_id', data.tenant_id)
      .eq('iso_code', data.iso_code)
      .maybeSingle();

    if (existing.data) {
      return { data: null, error: 'Ya existe un pais con ese codigo ISO en este tenant' };
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
  data: { name?: string; code?: string; iso_code?: string; tenant_id?: string; currency?: string; currency_name?: string; timezone?: string; language?: string; phone_prefix?: string; continent?: string; flag_url?: string; status?: string }
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('countries')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al actualizar pais' };
  }
}

export async function toggleCountryStatus(
  id: string,
  currentStatus: string
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

export async function fetchTenants(): Promise<{ data: { id: string; name: string }[]; error: string | null }> {
  try {
    const { data, error } = await supabase.from('tenants').select('id, name').order('name');
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar tenants' };
  }
}