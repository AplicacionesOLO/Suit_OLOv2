import { supabase } from '@/services/supabase/client';

export interface UserContextFull {
  tenant_context_override: string | null;
  country_context_override: string | null;
  warehouse_context_override: string | null;
  client_context_override: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  country_id: string | null;
  country_name: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  client_id: string | null;
  client_name: string | null;
  role_level: number;
  is_super_admin: boolean;
  scope_all_tenants: boolean;
  scope_all_countries: boolean;
  scope_all_warehouses: boolean;
  scope_all_clients: boolean;
}

const CACHE_KEY = 'suiteolo.userContext';
const CACHE_TTL = 30000; // 30 seconds

let cachedContext: { ctx: UserContextFull; ts: number } | null = null;

export async function getUserContextFull(): Promise<UserContextFull | null> {
  // Memory cache
  if (cachedContext && Date.now() - cachedContext.ts < CACHE_TTL) {
    return cachedContext.ctx;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pu } = await supabase
    .from('platform_users')
    .select('id, tenant_id, tenant_context_override, country_context_override, warehouse_context_override, client_context_override, country_id, client_id, warehouse_id, role_id, scope_all_tenants, scope_all_countries, scope_all_warehouses, scope_all_clients')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!pu) return null;

  let roleLevel = 0;
  if (pu.role_id) {
    const { data: role } = await supabase.from('roles').select('level').eq('id', pu.role_id).maybeSingle();
    if (role) roleLevel = role.level;
  }
  const isSA = roleLevel >= 100;

  const effectiveTenant = pu.tenant_context_override || pu.tenant_id;
  const effectiveCountry = pu.country_context_override || pu.country_id;
  const effectiveWarehouse = pu.warehouse_context_override || pu.warehouse_id;
  const effectiveClient = pu.client_context_override || pu.client_id;

  // Fetch names in parallel
  const [tenantRes, countryRes, warehouseRes, clientRes] = await Promise.all([
    effectiveTenant ? supabase.from('tenants').select('name').eq('id', effectiveTenant).maybeSingle() : Promise.resolve({ data: null }),
    effectiveCountry ? supabase.from('countries').select('name').eq('id', effectiveCountry).maybeSingle() : Promise.resolve({ data: null }),
    effectiveWarehouse ? supabase.from('warehouses').select('name').eq('id', effectiveWarehouse).maybeSingle() : Promise.resolve({ data: null }),
    effectiveClient ? supabase.from('clients').select('name').eq('id', effectiveClient).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const ctx: UserContextFull = {
    tenant_context_override: pu.tenant_context_override,
    country_context_override: pu.country_context_override,
    warehouse_context_override: pu.warehouse_context_override,
    client_context_override: pu.client_context_override,
    tenant_id: effectiveTenant,
    tenant_name: tenantRes.data?.name || null,
    country_id: effectiveCountry,
    country_name: countryRes.data?.name || null,
    warehouse_id: effectiveWarehouse,
    warehouse_name: warehouseRes.data?.name || null,
    client_id: effectiveClient,
    client_name: clientRes.data?.name || null,
    role_level: roleLevel,
    is_super_admin: isSA,
    scope_all_tenants: pu.scope_all_tenants || false,
    scope_all_countries: pu.scope_all_countries || false,
    scope_all_warehouses: pu.scope_all_warehouses || false,
    scope_all_clients: pu.scope_all_clients || false,
  };

  cachedContext = { ctx, ts: Date.now() };
  return ctx;
}

export function clearUserContextCache() {
  cachedContext = null;
}

// Keep backward compat alias
export { getUserContextFull as getUserContext };