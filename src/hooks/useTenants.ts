import { useState, useEffect, useCallback } from 'react';
import {
  fetchTenants,
  createTenant,
  updateTenant,
  changeTenantStatus,
  type TenantWithCounts,
  type CreateTenantInput,
  type UpdateTenantInput,
} from '@/services/operations/tenantsService';

interface UseTenantsReturn {
  tenants: TenantWithCounts[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  addTenant: (input: CreateTenantInput) => Promise<{ error: string | null }>;
  editTenant: (id: string, input: UpdateTenantInput) => Promise<{ error: string | null }>;
  suspendTenant: (id: string) => Promise<{ error: string | null }>;
  activateTenant: (id: string) => Promise<{ error: string | null }>;
  softDeleteTenant: (id: string) => Promise<{ error: string | null }>;
}

export function useTenants(): UseTenantsReturn {
  const [tenants, setTenants] = useState<TenantWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTenants();
      if (result.error) setError(result.error);
      setTenants(result.data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addTenant = useCallback(async (input: CreateTenantInput) => {
    const result = await createTenant(input);
    if (!result.error) await load();
    return result;
  }, [load]);

  const editTenant = useCallback(async (id: string, input: UpdateTenantInput) => {
    const result = await updateTenant(id, input);
    if (!result.error) await load();
    return result;
  }, [load]);

  const suspendTenant = useCallback(async (id: string) => {
    const result = await changeTenantStatus(id, 'suspended');
    if (!result.error) await load();
    return result;
  }, [load]);

  const activateTenant = useCallback(async (id: string) => {
    const result = await changeTenantStatus(id, 'active');
    if (!result.error) await load();
    return result;
  }, [load]);

  const softDeleteTenant = useCallback(async (id: string) => {
    const result = await changeTenantStatus(id, 'deleted');
    if (!result.error) await load();
    return result;
  }, [load]);

  return {
    tenants,
    loading,
    error,
    refresh: load,
    addTenant,
    editTenant,
    suspendTenant,
    activateTenant,
    softDeleteTenant,
  };
}