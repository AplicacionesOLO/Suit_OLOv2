import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  getUserContextFull,
  clearUserContextCache,
  type UserContextFull,
} from '@/services/auth/contextService';
import {
  setTenantContextOverride,
  clearTenantContextOverride,
  setCountryContextOverride,
  clearCountryContextOverride,
} from '@/services/auth/usersService';
import { supabase } from '@/services/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────

interface TenantInfo { tenant_id: string; tenant_name: string; }
interface CountryInfo { id: string; name: string; }
interface WarehouseInfo { id: string; name: string; tenant_id: string; country_id: string; }
interface ClientInfo { id: string; name: string; tenant_id: string; warehouse_id: string; }

export interface TenantContextValue {
  // Active context
  currentCountryId: string | null;
  currentCountryName: string | null;
  currentTenantId: string | null;
  currentTenantName: string | null;
  currentWarehouseId: string | null;
  currentWarehouseName: string | null;
  currentClientId: string | null;
  currentClientName: string | null;

  // Override flags
  tenantOverrideActive: boolean;
  countryOverrideActive: boolean;
  warehouseOverrideActive: boolean;
  clientOverrideActive: boolean;

  // Permissions
  roleLevel: number;
  isSuperAdmin: boolean;
  scopeAllTenants: boolean;
  scopeAllCountries: boolean;
  scopeAllWarehouses: boolean;
  scopeAllClients: boolean;

  // Accessible lists
  accessibleCountries: CountryInfo[];
  accessibleTenants: TenantInfo[];
  accessibleWarehouses: WarehouseInfo[];
  accessibleClients: ClientInfo[];

  // tenant_countries mapping: country_id → Set<tenant_id>
  tenantCountriesMap: Map<string, Set<string>>;

  // Loading
  loading: boolean;

  // Cascade switching
  switchCountry: (countryId: string) => Promise<boolean>;
  clearCountry: () => Promise<boolean>;
  switchTenant: (tenantId: string) => Promise<boolean>;
  clearTenant: () => Promise<boolean>;
  switchWarehouse: (warehouseId: string) => Promise<boolean>;
  clearWarehouse: () => Promise<boolean>;
  switchClient: (clientId: string) => Promise<boolean>;
  clearClient: () => Promise<boolean>;

  // Full clear
  clearFullContext: () => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;

  // Show all (Super Admin only)
  showAll: boolean;
  toggleShowAll: () => void;

  // Legacy aliases (backward compat)
  effectiveTenantId: string | null;
  effectiveTenantName: string | null;
  effectiveCountryId: string | null;
  effectiveCountryName: string | null;
  effectiveClientId: string | null;
  effectiveClientName: string | null;
  accessibleTenantsLegacy: { tenant_id: string; tenant_name: string }[];
}

// ─── localStorage keys ──────────────────────────────────────────────────

const LS_KEYS = {
  countryId: 'suiteolo.currentCountryId',
  tenantId: 'suiteolo.currentTenantId',
  warehouseId: 'suiteolo.currentWarehouseId',
  clientId: 'suiteolo.currentClientId',
  showAll: 'suiteolo.showAll',
};

function readLS(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLS(key: string, val: string | null) {
  try { if (val) localStorage.setItem(key, val); else localStorage.removeItem(key); } catch { /* */ }
}
function clearAllLS() {
  Object.values(LS_KEYS).forEach((k) => { try { localStorage.removeItem(k); } catch { /* */ } });
}

// ─── Context ────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantContextProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<UserContextFull | null>(null);
  const [accessibleCountries, setAccessibleCountries] = useState<CountryInfo[]>([]);
  const [accessibleTenants, setAccessibleTenants] = useState<TenantInfo[]>([]);
  const [accessibleWarehouses, setAccessibleWarehouses] = useState<WarehouseInfo[]>([]);
  const [accessibleClients, setAccessibleClients] = useState<ClientInfo[]>([]);
  const [tenantCountriesMap, setTenantCountriesMap] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(() => {
    try { return localStorage.getItem(LS_KEYS.showAll) === 'true'; } catch { return false; }
  });
  const initialLoad = useRef(true);

  // ─── build accessible lists ───────────────────────────────────────────

  const loadAccessibleLists = useCallback(async (context: UserContextFull) => {
    const isSAOrAll = context.is_super_admin || context.scope_all_tenants || context.scope_all_countries;

    // Countries
    const { data: countriesRaw } = isSAOrAll
      ? await supabase.from('countries').select('id, name').eq('status', 'active').order('name')
      : await supabase.rpc('get_accessible_countries');
    const countries: CountryInfo[] = (countriesRaw || []).map((c: any) => ({ id: c.id, name: c.name }));
    setAccessibleCountries(countries);

    // Tenants
    const { data: tenantsRaw } = await supabase.rpc('get_accessible_tenants');
    const tenants: TenantInfo[] = (tenantsRaw || []).map((t: any) => ({ tenant_id: t.id || t.tenant_id, tenant_name: t.name || t.tenant_name }));
    setAccessibleTenants(tenants);

    // tenant_countries mapping: country_id → Set<tenant_id>
    const { data: tcData } = await supabase.from('tenant_countries').select('tenant_id, country_id');
    const tcMap = new Map<string, Set<string>>();
    (tcData || []).forEach((tc: any) => {
      if (!tcMap.has(tc.country_id)) tcMap.set(tc.country_id, new Set());
      tcMap.get(tc.country_id)!.add(tc.tenant_id);
    });
    setTenantCountriesMap(tcMap);

    // Warehouses — accessible per user's tenants/countries
    if (tenants.length > 0) {
      const tenantIds = tenants.map((t) => t.tenant_id);
      let whQuery = supabase.from('warehouses').select('id, name, tenant_id, country_id').eq('status', 'active');
      if (!isSAOrAll) whQuery = whQuery.in('tenant_id', tenantIds);
      const { data: whRaw } = await whQuery.order('name');
      setAccessibleWarehouses((whRaw || []) as WarehouseInfo[]);
    }

    // Clients — accessible per user
    if (tenants.length > 0) {
      const tenantIds = tenants.map((t) => t.tenant_id);
      let clQuery = supabase.from('clients').select('id, name, tenant_id, warehouse_id').eq('status', 'active');
      if (!isSAOrAll) clQuery = clQuery.in('tenant_id', tenantIds);
      const { data: clRaw } = await clQuery.order('name');
      setAccessibleClients((clRaw || []) as ClientInfo[]);
    }
  }, []);

  // ─── load and validate context ────────────────────────────────────────

  const loadContext = useCallback(async () => {
    const fullCtx = await getUserContextFull();
    if (!fullCtx) { setLoading(false); return; }

    // Try to restore from localStorage if no overrides are active
    if (!fullCtx.country_context_override && !fullCtx.tenant_context_override &&
        !fullCtx.warehouse_context_override && !fullCtx.client_context_override) {
      const lsCountry = readLS(LS_KEYS.countryId);
      const lsTenant = readLS(LS_KEYS.tenantId);
      const lsWarehouse = readLS(LS_KEYS.warehouseId);
      const lsClient = readLS(LS_KEYS.clientId);

      if (lsCountry || lsTenant || lsWarehouse || lsClient) {
        // Validate and apply localStorage context
        let appliedCountry = false;
        let appliedTenant = false;
        let appliedWarehouse = false;
        let appliedClient = false;

        if (lsCountry && lsCountry !== fullCtx.country_id) {
          const ok = await setCountryContextOverride(lsCountry);
          if (ok) appliedCountry = true;
        }
        if (lsTenant && lsTenant !== fullCtx.tenant_id) {
          const ok = await setTenantContextOverride(lsTenant);
          if (ok) appliedTenant = true;
        }
        if (lsWarehouse && lsWarehouse !== fullCtx.warehouse_id) {
          const { data } = await supabase.rpc('set_warehouse_context', { p_warehouse_id: lsWarehouse });
          if (data) appliedWarehouse = true;
        }
        if (lsClient && lsClient !== fullCtx.client_id) {
          const { data } = await supabase.rpc('set_client_context', { p_client_id: lsClient });
          if (data) appliedClient = true;
        }

        if (appliedCountry || appliedTenant || appliedWarehouse || appliedClient) {
          clearUserContextCache();
          const refreshed = await getUserContextFull();
          if (refreshed) {
            setCtx(refreshed);
            await loadAccessibleLists(refreshed);
            setLoading(false);
            return;
          }
        }
      }
    }

    setCtx(fullCtx);
    await loadAccessibleLists(fullCtx);
    setLoading(false);
  }, [loadAccessibleLists]);

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      loadContext();
    }
  }, [loadContext]);

  // ─── cascade: get tenant_countries for validation ─────────────────────

  const getTenantCountriesMap = useCallback(async (): Promise<Map<string, Set<string>>> => {
    const { data } = await supabase.from('tenant_countries').select('tenant_id, country_id');
    const map = new Map<string, Set<string>>();
    (data || []).forEach((tc: any) => {
      if (!map.has(tc.country_id)) map.set(tc.country_id, new Set());
      map.get(tc.country_id)!.add(tc.tenant_id);
    });
    return map;
  }, []);

  // ─── switchCountry ────────────────────────────────────────────────────

  const switchCountry = useCallback(async (countryId: string): Promise<boolean> => {
    const ok = await setCountryContextOverride(countryId);
    if (!ok) return false;
    writeLS(LS_KEYS.countryId, countryId);
    // Cascade: clear downstream overrides
    writeLS(LS_KEYS.tenantId, null);
    writeLS(LS_KEYS.warehouseId, null);
    writeLS(LS_KEYS.clientId, null);
    await clearTenantContextOverride();
    await supabase.rpc('clear_warehouse_context');
    await supabase.rpc('clear_client_context');

    try {
      await supabase.from('audit_logs').insert({
        action: 'COUNTRY_CONTEXT_SWITCHED',
        entity_type: 'countries',
        entity_id: countryId,
        details: { switched_to: countryId },
        severity: 'low',
      });
    } catch { /* */ }

    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
      await loadAccessibleLists(refreshed);
    }
    return true;
  }, [loadAccessibleLists]);

  const clearCountry = useCallback(async (): Promise<boolean> => {
    const ok = await clearCountryContextOverride();
    if (!ok) return false;
    clearAllLS();
    await clearTenantContextOverride();
    await supabase.rpc('clear_warehouse_context');
    await supabase.rpc('clear_client_context');

    try {
      await supabase.from('audit_logs').insert({
        action: 'COUNTRY_CONTEXT_CLEARED',
        entity_type: 'countries',
        severity: 'low',
      });
    } catch { /* */ }

    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
      await loadAccessibleLists(refreshed);
    }
    return true;
  }, [loadAccessibleLists]);

  // ─── switchTenant ─────────────────────────────────────────────────────

  const switchTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    // Validate tenant belongs to current country via tenant_countries
    if (ctx?.country_id && ctx.country_id !== 'all') {
      const tcMap = await getTenantCountriesMap();
      const allowedTenants = tcMap.get(ctx.country_id);
      if (allowedTenants && !allowedTenants.has(tenantId) && !ctx.is_super_admin) {
        console.warn('[switchTenant] Tenant not associated with current country');
        return false;
      }
    }

    const ok = await setTenantContextOverride(tenantId);
    if (!ok) return false;
    writeLS(LS_KEYS.tenantId, tenantId);
    writeLS(LS_KEYS.warehouseId, null);
    writeLS(LS_KEYS.clientId, null);
    await supabase.rpc('clear_warehouse_context');
    await supabase.rpc('clear_client_context');

    try {
      await supabase.from('audit_logs').insert({
        action: 'TENANT_CONTEXT_SWITCHED',
        entity_type: 'tenants',
        entity_id: tenantId,
        details: { switched_to: tenantId },
        severity: 'low',
      });
    } catch { /* */ }

    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
      await loadAccessibleLists(refreshed);
    }
    return true;
  }, [ctx?.country_id, ctx?.is_super_admin, loadAccessibleLists, getTenantCountriesMap]);

  const clearTenant = useCallback(async (): Promise<boolean> => {
    const ok = await clearTenantContextOverride();
    if (!ok) return false;
    writeLS(LS_KEYS.tenantId, null);
    writeLS(LS_KEYS.warehouseId, null);
    writeLS(LS_KEYS.clientId, null);
    await supabase.rpc('clear_warehouse_context');
    await supabase.rpc('clear_client_context');

    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
      await loadAccessibleLists(refreshed);
    }
    return true;
  }, [loadAccessibleLists]);

  // ─── switchWarehouse ──────────────────────────────────────────────────

  const switchWarehouse = useCallback(async (warehouseId: string): Promise<boolean> => {
    // Validate warehouse belongs to current country + tenant
    const wh = accessibleWarehouses.find((w) => w.id === warehouseId);
    if (!wh) return false;
    if (ctx?.country_id && ctx.country_id !== 'all' && wh.country_id !== ctx.country_id && !ctx?.is_super_admin) return false;
    if (ctx?.tenant_id && ctx.tenant_id !== 'all' && wh.tenant_id !== ctx.tenant_id && !ctx?.is_super_admin) return false;

    const { data, error } = await supabase.rpc('set_warehouse_context', { p_warehouse_id: warehouseId });
    if (error || !data) return false;
    writeLS(LS_KEYS.warehouseId, warehouseId);
    writeLS(LS_KEYS.clientId, null);
    await supabase.rpc('clear_client_context');

    try {
      await supabase.from('audit_logs').insert({
        action: 'WAREHOUSE_CONTEXT_SWITCHED',
        entity_type: 'warehouses',
        entity_id: warehouseId,
        severity: 'low',
      });
    } catch { /* */ }

    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
    }
    return true;
  }, [ctx?.country_id, ctx?.tenant_id, ctx?.is_super_admin, accessibleWarehouses]);

  const clearWarehouse = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.rpc('clear_warehouse_context');
    if (!data) return false;
    writeLS(LS_KEYS.warehouseId, null);
    writeLS(LS_KEYS.clientId, null);
    await supabase.rpc('clear_client_context');

    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
    }
    return true;
  }, []);

  // ─── switchClient ─────────────────────────────────────────────────────

  const switchClient = useCallback(async (clientId: string): Promise<boolean> => {
    // Validate client belongs to current country + tenant + warehouse
    const cl = accessibleClients.find((c) => c.id === clientId);
    if (!cl) return false;
    if (ctx?.tenant_id && ctx.tenant_id !== 'all' && cl.tenant_id !== ctx.tenant_id && !ctx?.is_super_admin) return false;
    if (ctx?.warehouse_id && ctx.warehouse_id !== 'all' && cl.warehouse_id !== ctx.warehouse_id && !ctx?.is_super_admin) return false;

    const { data, error } = await supabase.rpc('set_client_context', { p_client_id: clientId });
    if (error || !data) return false;
    writeLS(LS_KEYS.clientId, clientId);

    try {
      await supabase.from('audit_logs').insert({
        action: 'CLIENT_CONTEXT_SWITCHED',
        entity_type: 'clients',
        entity_id: clientId,
        severity: 'low',
      });
    } catch { /* */ }

    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
    }
    return true;
  }, [ctx?.tenant_id, ctx?.warehouse_id, ctx?.is_super_admin, accessibleClients]);

  const clearClient = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.rpc('clear_client_context');
    if (!data) return false;
    writeLS(LS_KEYS.clientId, null);

    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
    }
    return true;
  }, []);

  // ─── clearFullContext ─────────────────────────────────────────────────

  const clearFullContext = useCallback(async () => {
    clearAllLS();
    setShowAll(false);
    try { localStorage.removeItem(LS_KEYS.showAll); } catch { /* */ }
    await clearCountryContextOverride();
    await clearTenantContextOverride();
    await supabase.rpc('clear_warehouse_context');
    await supabase.rpc('clear_client_context');
    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
      await loadAccessibleLists(refreshed);
    }
  }, [loadAccessibleLists]);

  // ─── refresh ──────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setLoading(true);
    clearUserContextCache();
    const refreshed = await getUserContextFull();
    if (refreshed) {
      setCtx(refreshed);
      await loadAccessibleLists(refreshed);
    }
    setLoading(false);
  }, [loadAccessibleLists]);

  const toggleShowAll = useCallback(() => {
    setShowAll((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_KEYS.showAll, String(next)); } catch { /* */ }
      return next;
    });
  }, []);

  // ─── derive context value ─────────────────────────────────────────────

  const value: TenantContextValue = {
    currentCountryId: ctx?.country_id || null,
    currentCountryName: ctx?.country_name || null,
    currentTenantId: ctx?.tenant_id || null,
    currentTenantName: ctx?.tenant_name || null,
    currentWarehouseId: ctx?.warehouse_id || null,
    currentWarehouseName: ctx?.warehouse_name || null,
    currentClientId: ctx?.client_id || null,
    currentClientName: ctx?.client_name || null,

    tenantOverrideActive: !!ctx?.tenant_context_override,
    countryOverrideActive: !!ctx?.country_context_override,
    warehouseOverrideActive: !!ctx?.warehouse_context_override,
    clientOverrideActive: !!ctx?.client_context_override,

    roleLevel: ctx?.role_level || 0,
    isSuperAdmin: ctx?.is_super_admin || false,
    scopeAllTenants: ctx?.scope_all_tenants || false,
    scopeAllCountries: ctx?.scope_all_countries || false,
    scopeAllWarehouses: ctx?.scope_all_warehouses || false,
    scopeAllClients: ctx?.scope_all_clients || false,

    accessibleCountries,
    accessibleTenants,
    accessibleWarehouses,
    accessibleClients,
    tenantCountriesMap,

    loading,

    switchCountry,
    clearCountry,
    switchTenant,
    clearTenant,
    switchWarehouse,
    clearWarehouse,
    switchClient,
    clearClient,
    clearFullContext,
    refresh,
    showAll,
    toggleShowAll,

    // Legacy backward-compat aliases
    effectiveTenantId: ctx?.tenant_id || null,
    effectiveTenantName: ctx?.tenant_name || null,
    effectiveCountryId: ctx?.country_id || null,
    effectiveCountryName: ctx?.country_name || null,
    effectiveClientId: ctx?.client_id || null,
    effectiveClientName: ctx?.client_name || null,
    accessibleTenantsLegacy: accessibleTenants,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within a TenantContextProvider');
  }
  return context;
}