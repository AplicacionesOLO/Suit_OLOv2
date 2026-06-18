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

export async function fetchClients(): Promise<{ data: ClientWithDetails[]; error: string | null }> {
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

    const [{ data: warehouses }, { data: tenants }] = await Promise.all([
      supabase.from('warehouses').select('id, name, country_id, tenant_id').in('id', warehouseIds),
      supabase.from('tenants').select('id, name, country_id'),
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
        tenant_name: wh ? (tenantMap.get(wh.tenant_id) || 'Desconocido') : 'Desconocido',
      };
    });

    return { data: result, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar clientes' };
  }
}

export async function fetchWarehousesForSelect(): Promise<{ data: { id: string; name: string; country_id: string; tenant_id: string }[]; error: string | null }> {
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
  data: { name?: string; code?: string; contact_email?: string; warehouse_id?: string; tenant_id?: string }
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('clients')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al actualizar cliente' };
  }
}

export async function toggleClientStatus(
  id: string,
  currentStatus: string
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