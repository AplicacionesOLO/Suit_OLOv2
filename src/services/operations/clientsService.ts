import { supabase } from '@/services/supabase/client';
import { getEffectiveTenantId } from '@/utils/tenant';

export interface Client {
  id: string;
  warehouse_id: string;
  tenant_id: string;
  name: string;
  code: string;
  contact_email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ClientWithDetails extends Client {
  warehouse_name: string;
  country_name: string;
  country_code: string;
  tenant_name: string;
}

// ========== CASCADE FETCH HELPERS ==========

export interface CountrySelectOption {
  id: string;
  name: string;
  code: string;
}

export interface TenantSelectOption {
  id: string;
  name: string;
}

export interface WarehouseSelectOption {
  id: string;
  name: string;
  tenant_id: string;
  country_id: string;
}

/**
 * Obtiene todos los países activos para el selector cascada.
 */
export async function fetchCountriesForClientSelect(): Promise<{
  data: CountrySelectOption[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name, code')
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return { data: (data || []) as CountrySelectOption[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar países' };
  }
}

/**
 * Obtiene los tenants de un país vía tenant_countries (N:M).
 * NO usa tenants.country_id.
 */
export async function fetchTenantsByCountry(
  countryId: string,
): Promise<{ data: TenantSelectOption[]; error: string | null }> {
  try {
    if (!countryId) return { data: [], error: null };
    const { data: tcData, error } = await supabase
      .from('tenant_countries')
      .select('tenant_id')
      .eq('country_id', countryId);
    if (error) throw error;
    if (!tcData || tcData.length === 0) return { data: [], error: null };

    const tenantIds = tcData.map((tc) => tc.tenant_id);
    const { data: tenants, error: tErr } = await supabase
      .from('tenants')
      .select('id, name')
      .in('id', tenantIds)
      .order('name');
    if (tErr) throw tErr;
    return { data: (tenants || []) as TenantSelectOption[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar tenants' };
  }
}

/**
 * Obtiene los almacenes de un tenant específico para el selector cascada.
 */
export async function fetchWarehousesByTenant(
  tenantId: string,
): Promise<{ data: WarehouseSelectOption[]; error: string | null }> {
  try {
    if (!tenantId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('warehouses')
      .select('id, name, tenant_id, country_id')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) throw error;
    return { data: (data || []) as WarehouseSelectOption[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar almacenes' };
  }
}

/**
 * Obtiene los almacenes de un país + tenant específicos.
 */
export async function fetchWarehousesByCountryTenant(
  countryId: string,
  tenantId: string,
): Promise<{ data: WarehouseSelectOption[]; error: string | null }> {
  try {
    if (!countryId || !tenantId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('warehouses')
      .select('id, name, tenant_id, country_id')
      .eq('country_id', countryId)
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) throw error;
    return { data: (data || []) as WarehouseSelectOption[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar almacenes' };
  }
}

export async function fetchClients(): Promise<{
  data: ClientWithDetails[];
  error: string | null;
}> {
  try {
    let query = supabase.from('clients').select('*').order('name');

    const tenantId = await getEffectiveTenantId();
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: clients, error } = await query;
    if (error) throw error;
    if (!clients || clients.length === 0) return { data: [], error: null };

    const warehouseIds = [...new Set(clients.map((c) => c.warehouse_id))];
    const tenantIds = [...new Set(clients.map((c) => c.tenant_id))];

    const [{ data: warehouses }, { data: tenants }] = await Promise.all([
      supabase.from('warehouses').select('id, name, country_id, tenant_id').in('id', warehouseIds),
      supabase.from('tenants').select('id, name').in('id', tenantIds),
    ]);

    const whMap = new Map((warehouses || []).map((w) => [w.id, w]));
    const whCountryIds = [...new Set((warehouses || []).map((w) => w.country_id))];

    let countryMap = new Map<string, { name: string; code: string }>();
    if (whCountryIds.length > 0) {
      const { data: countries } = await supabase
        .from('countries')
        .select('id, name, code')
        .in('id', whCountryIds);
      countryMap = new Map((countries || []).map((c) => [c.id, c]));
    }

    const tenantMap = new Map((tenants || []).map((t) => [t.id, t.name]));

    const result: ClientWithDetails[] = clients.map((cl) => {
      const wh = whMap.get(cl.warehouse_id);
      const country = wh ? countryMap.get(wh.country_id) : undefined;
      return {
        ...cl,
        warehouse_name: wh?.name || 'Desconocido',
        country_name: country?.name || 'Desconocido',
        country_code: country?.code || '--',
        tenant_name: tenantMap.get(cl.tenant_id) || 'Desconocido',
      };
    });

    return { data: result, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar clientes' };
  }
}

export async function fetchWarehousesForSelect(): Promise<{
  data: { id: string; name: string; country_id: string; tenant_id: string }[];
  error: string | null;
}> {
  try {
    let query = supabase
      .from('warehouses')
      .select('id, name, country_id, tenant_id')
      .order('name');

    const tenantId = await getEffectiveTenantId();
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar almacenes' };
  }
}

export async function createClient(data: {
  name: string;
  code: string;
  contact_email: string;
  warehouse_id: string;
  tenant_id: string;
  country_id: string;
}): Promise<{ data: Client | null; error: string | null }> {
  try {
    const { data: result, error } = await supabase
      .from('clients')
      .insert({
        name: data.name,
        code: data.code,
        contact_email: data.contact_email,
        warehouse_id: data.warehouse_id,
        tenant_id: data.tenant_id,
        country_id: data.country_id,
        status: 'active',
      })
      .select()
      .single();
    if (error) throw error;
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al crear cliente' };
  }
}

export async function updateClient(
  id: string,
  data: {
    name?: string;
    code?: string;
    contact_email?: string;
    warehouse_id?: string;
    tenant_id?: string;
    country_id?: string;
  },
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('clients').update(data).eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al actualizar cliente' };
  }
}

export async function toggleClientStatus(
  id: string,
  currentStatus: string,
): Promise<{ error: string | null }> {
  try {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('clients')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al cambiar estado' };
  }
}