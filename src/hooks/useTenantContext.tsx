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
  tenant_id: string;
}

interface TenantContextValue {
  effectiveTenantId: string | null;
  effectiveTenantName: string | null;
  tenantOverrideActive: boolean;
  roleLevel: number;
  accessibleTenants: TenantInfo[];
  accessibleCountries: CountryInfo[];
  loading: boolean;
  switchTenant: (tenantId: string) => Promise<boolean>;
  clearTenant: () => Promise<boolean>;
  switchCountry: (countryId: string) => Promise<boolean>;
  clearCountry: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantContextProvider({ children }: { children: ReactNode }) {
  const [effectiveTenantId, setEffectiveTenantId] = useState<string | null>(null);
  const [effectiveTenantName, setEffectiveTenantName] = useState<string | null>(null);
  const [tenantOverrideActive, setTenantOverrideActive] = useState(false);
  const [roleLevel, setRoleLevel] = useState(0);
  const [accessibleTenants, setAccessibleTenants] = useState<TenantInfo[]>([]);
  const [accessibleCountries, setAccessibleCountries] = useState<CountryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoad = useRef(true);

  const loadContext = useCallback(async () => {
    const ctx = await getUserContext();
    if (ctx) {
      setEffectiveTenantId(ctx.tenant_id);
      setEffectiveTenantName(ctx.tenant_name);
      setTenantOverrideActive(!!ctx.tenant_context_override);
      setRoleLevel(ctx.role_level);
    }

    const { tenants } = await fetchAccessibleTenants();
    setAccessibleTenants(tenants);

    const effectiveTid = ctx?.tenant_id;
    if (effectiveTid) {
      const { data: countries } = await supabase
        .from('countries')
        .select('id, name, tenant_id')
        .eq('tenant_id', effectiveTid)
        .eq('status', 'active')
        .order('name');
      if (countries) setAccessibleCountries(countries);
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

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadContext();
  }, [loadContext]);

  const ctxValue: TenantContextValue = {
    effectiveTenantId,
    effectiveTenantName,
    tenantOverrideActive,
    roleLevel,
    accessibleTenants,
    accessibleCountries,
    loading,
    switchTenant,
    clearTenant,
    switchCountry,
    clearCountry,
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