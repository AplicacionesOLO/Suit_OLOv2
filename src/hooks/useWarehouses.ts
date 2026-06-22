import { useState, useEffect, useCallback } from 'react';
import {
  fetchWarehouses,
  fetchCountriesForSelect,
  fetchTenantsByCountryForWarehouse,
  createWarehouse,
  updateWarehouse,
  toggleWarehouseStatus,
  type WarehouseWithDetails,
} from '@/services/operations/warehousesService';
import { useTenantContext } from '@/hooks/useTenantContext';

interface UseWarehousesReturn {
  warehouses: WarehouseWithDetails[];
  countries: { id: string; name: string }[];
  tenants: { id: string; name: string }[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  addWarehouse: (data: {
    name: string;
    code: string;
    address: string;
    country_id: string;
    tenant_id: string;
  }) => Promise<{ error: string | null }>;
  editWarehouse: (
    id: string,
    data: {
      name?: string;
      code?: string;
      address?: string;
      country_id?: string;
      tenant_id?: string;
    },
  ) => Promise<{ error: string | null }>;
  toggleStatus: (id: string, currentStatus: string) => Promise<{ error: string | null }>;
  loadTenantsByCountry: (countryId: string) => Promise<void>;
}

export function useWarehouses(): UseWarehousesReturn {
  const ctx = useTenantContext();
  const [warehouses, setWarehouses] = useState<WarehouseWithDetails[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [wResult, cResult] = await Promise.all([
        fetchWarehouses(),
        fetchCountriesForSelect(),
      ]);
      if (wResult.error) setError(wResult.error);
      setWarehouses(wResult.data);
      if (!cResult.error) setCountries(cResult.data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [ctx.currentCountryId, ctx.currentTenantId, ctx.currentWarehouseId, ctx.currentClientId, ctx.showAll]);

  useEffect(() => {
    load();
  }, [load]);

  const loadTenantsByCountry = useCallback(async (countryId: string) => {
    if (!countryId) {
      setTenants([]);
      return;
    }
    const { data } = await fetchTenantsByCountryForWarehouse(countryId);
    setTenants(data);
  }, []);

  const addWarehouse = useCallback(
    async (data: {
      name: string;
      code: string;
      address: string;
      country_id: string;
      tenant_id: string;
    }) => {
      const result = await createWarehouse(data);
      if (!result.error) await load();
      return result;
    },
    [load],
  );

  const editWarehouse = useCallback(
    async (
      id: string,
      data: {
        name?: string;
        code?: string;
        address?: string;
        country_id?: string;
        tenant_id?: string;
      },
    ) => {
      const result = await updateWarehouse(id, data);
      if (!result.error) await load();
      return result;
    },
    [load],
  );

  const toggleStatus = useCallback(
    async (id: string, currentStatus: string) => {
      const result = await toggleWarehouseStatus(id, currentStatus);
      if (!result.error) await load();
      return result;
    },
    [load],
  );

  return {
    warehouses,
    countries,
    tenants,
    loading,
    error,
    refresh: load,
    addWarehouse,
    editWarehouse,
    toggleStatus,
    loadTenantsByCountry,
  };
}