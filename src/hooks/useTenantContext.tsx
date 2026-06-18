import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  getUserContext,
  fetchAccessibleTenants,
  setTenantContextOverride,
  clearTenantContextOverride,
  setCountryContextOverride,
  clearCountryContextOverride,
} from '@/services/auth/usersService';
import { supabase } from '@/services/supabase/client';

interface TenantInfo {
  tenant_id: string;
  tenant_name: string;
}

interface CountryInfo {
  id: string;
  name: string;
}

interface ClientInfo {
  id: string;
  name: string;
  tenant_id: string;
}

interface TenantContextValue {
  effectiveTenantId: string | null;
  effectiveTenantName: string | null;
  effectiveCountryId: string | null;
  effectiveCountryName: string | null;
  effectiveClientId: string | null;
  effectiveClientName: string | null;
  tenantOverrideActive: boolean;
  roleLevel: number;
  accessibleTenants: TenantInfo[];
  accessibleCountries: CountryInfo[];
  accessibleClients: ClientInfo[];
  loading: boolean;
  switchTenant: (tenantId: string) => Promise<boolean>;
  clearTenant: () => Promise<boolean>;
  switchCountry: (countryId: string) => Promise<boolean>;
  clearCountry: () => Promise<boolean>;
  switchClient: (clientId: string) => Promise<boolean>;
  clearClient: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantContextProvider({ children }: { children: ReactNode }) {
  const [effectiveTenantId, setEffectiveTenantId] = useState<string | null>(null);
  const [effectiveTenantName, setEffectiveTenantName] = useState<string | null>(null);
  const [effectiveCountryId, setEffectiveCountryId] = useState<string | null>(null);
  const [effectiveCountryName, setEffectiveCountryName] = useState<string | null>(null);
  const [effectiveClientId, setEffectiveClientId] = useState<string | null>(null);
  const [effectiveClientName, setEffectiveClientName] = useState<string | null>(null);
  const [tenantOverrideActive, setTenantOverrideActive] = useState(false);
  const [roleLevel, setRoleLevel] = useState(0);
  const [accessibleTenants, setAccessibleTenants] = useState<TenantInfo[]>([]);
  const [accessibleCountries, setAccessibleCountries] = useState<CountryInfo[]>([]);
  const [accessibleClients, setAccessibleClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoad = useRef(true);

  const loadContext = useCallback(async () => {
    const ctx = await getUserContext();
    if (ctx) {
      setEffectiveTenantId(ctx.tenant_id);
      setEffectiveTenantName(ctx.tenant_name);
      setEffectiveCountryId(ctx.country_id || null);
      setEffectiveCountryName(ctx.country_name || null);
      setTenantOverrideActive(!!ctx.tenant_context_override);
      setRoleLevel(ctx.role_level);
    }

    // Load accessible tenants
    const { tenants } = await fetchAccessibleTenants();
    setAccessibleTenants(tenants);

    // Load accessible countries via RPC
    const { data: countries, error: countriesErr } = await supabase
      .rpc('get_accessible_countries');
    if (!countriesErr && countries) {
      setAccessibleCountries(countries);
    }

    // Load accessible clients - for all accessible tenants
    if (tenants.length > 0) {
      const tenantIds = tenants.map((t) => t.tenant_id);
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, tenant_id')
        .in('tenant_id', tenantIds)
        .eq('status', 'active')
        .order('name');
      if (clients) setAccessibleClients(clients);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      loadContext();
    }
  }, [loadContext]);

  const switchTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    const ok = await setTenantContextOverride(tenantId);
    if (ok) {
      try {
        await supabase.from('audit_logs').insert({
          tenant_id: tenantId,
          user_id: null,
          action: 'TENANT_CONTEXT_SWITCHED',
          entity_type: 'tenants',
          entity_id: tenantId,
          details: { switched_to: tenantId },
          severity: 'medium',
        });
      } catch { /* non-critical */ }
      await loadContext();
    }
    return ok;
  }, [loadContext]);

  const clearTenant = useCallback(async (): Promise<boolean> => {
    const ok = await clearTenantContextOverride();
    if (ok) {
      try {
        await supabase.from('audit_logs').insert({
          tenant_id: effectiveTenantId,
          user_id: null,
          action: 'TENANT_CONTEXT_CLEARED',
          entity_type: 'tenants',
          entity_id: effectiveTenantId,
          details: { previous_context: effectiveTenantId },
          severity: 'low',
        });
      } catch { /* non-critical */ }
      await loadContext();
    }
    return ok;
  }, [loadContext, effectiveTenantId]);

  const switchCountry = useCallback(async (countryId: string): Promise<boolean> => {
    const ok = await setCountryContextOverride(countryId);
    if (ok) await loadContext();
    return ok;
  }, [loadContext]);

  const clearCountry = useCallback(async (): Promise<boolean> => {
    const ok = await clearCountryContextOverride();
    if (ok) await loadContext();
    return ok;
  }, [loadContext]);

  const switchClient = useCallback(async (clientId: string): Promise<boolean> => {
    // Use set_client_context RPC
    const { data, error } = await supabase.rpc('set_client_context', { p_client_id: clientId });
    if (error) return false;
    if (data) await loadContext();
    return !!data;
  }, [loadContext]);

  const clearClient = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc('clear_client_context');
    if (error) return false;
    if (data) await loadContext();
    return !!data;
  }, [loadContext]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadContext();
  }, [loadContext]);

  const ctxValue: TenantContextValue = {
    effectiveTenantId,
    effectiveTenantName,
    effectiveCountryId,
    effectiveCountryName,
    effectiveClientId,
    effectiveClientName,
    tenantOverrideActive,
    roleLevel,
    accessibleTenants,
    accessibleCountries,
    accessibleClients,
    loading,
    switchTenant,
    clearTenant,
    switchCountry,
    clearCountry,
    switchClient,
    clearClient,
    refresh,
  };

  return <TenantContext.Provider value={ctxValue}>{children}</TenantContext.Provider>;
}

export function useTenantContext(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within a TenantContextProvider');
  }
  return context;
}