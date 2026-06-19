import { supabase } from '@/services/supabase/client';
import { getEffectiveTenantId } from '@/utils/tenant';

export interface Warehouse {
  id: string;
  country_id: string;
  tenant_id: string;
  name: string;
  code: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseWithDetails extends Warehouse {
  country_name: string;
  country_code: string;
  tenant_name: string;
  client_count: number;
}

export async function fetchWarehouses(): Promise<{
  data: WarehouseWithDetails[];
  error: string | null;
}> {
  try {
    let query = supabase.from('warehouses').select('*').order('name');

    const tenantId = await getEffectiveTenantId();
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: warehouses, error } = await query;
    if (error) throw error;
    if (!warehouses || warehouses.length === 0) return { data: [], error: null };

    const countryIds = [...new Set(warehouses.map((w) => w.country_id))];
    const tenantIds = [...new Set(warehouses.map((w) => w.tenant_id))];
    const warehouseIds = warehouses.map((w) => w.id);

    const [{ data: countries }, { data: clients }, { data: tenants }] = await Promise.all([
      supabase.from('countries').select('id, name, code').in('id', countryIds),
      supabase.from('clients').select('id, warehouse_id').in('warehouse_id', warehouseIds),
      supabase.from('tenants').select('id, name').in('id', tenantIds),
    ]);

    const countryMap = new Map((countries || []).map((c) => [c.id, c]));
    const tenantMap = new Map((tenants || []).map((t) => [t.id, t.name]));
    const clientCountMap = new Map<string, number>();
    (clients || []).forEach((cl) => {
      clientCountMap.set(cl.warehouse_id, (clientCountMap.get(cl.warehouse_id) || 0) + 1);
    });

    const result: WarehouseWithDetails[] = warehouses.map((w) => {
      const country = countryMap.get(w.country_id);
      return {
        ...w,
        country_name: country?.name || 'Desconocido',
        country_code: country?.code || '--',
        tenant_name: tenantMap.get(w.tenant_id) || 'Desconocido',
        client_count: clientCountMap.get(w.id) || 0,
      };
    });

    return { data: result, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar almacenes' };
  }
}

/**
 * Carga todos los países activos (sin filtrar por tenant).
 * Para usar en selectores donde se necesita cascada País → Tenant → Almacén.
 */
export async function fetchCountriesForSelect(): Promise<{
  data: { id: string; name: string }[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar paises' };
  }
}

/**
 * Carga tenants asociados a un país vía tenant_countries.
 */
export async function fetchTenantsByCountryForWarehouse(
  countryId: string,
): Promise<{
  data: { id: string; name: string }[];
  error: string | null;
}> {
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
    return { data: tenants || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar tenants' };
  }
}

export async function createWarehouse(data: {
  name: string;
  code: string;
  address: string;
  country_id: string;
  tenant_id: string;
}): Promise<{ data: Warehouse | null; error: string | null }> {
  try {
    const { data: result, error } = await supabase
      .from('warehouses')
      .insert({
        name: data.name,
        code: data.code,
        address: data.address,
        country_id: data.country_id,
        tenant_id: data.tenant_id,
        status: 'active',
      })
      .select()
      .single();
    if (error) throw error;
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al crear almacen' };
  }
}

export async function updateWarehouse(
  id: string,
  data: {
    name?: string;
    code?: string;
    address?: string;
    country_id?: string;
    tenant_id?: string;
  },
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('warehouses').update(data).eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al actualizar almacen' };
  }
}

export async function toggleWarehouseStatus(
  id: string,
  currentStatus: string,
): Promise<{ error: string | null }> {
  try {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('warehouses')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al cambiar estado' };
  }
}