import { useState, useEffect, useCallback } from 'react';
import {
  fetchWarehouses,
  fetchCountriesForSelect,
  createWarehouse,
  updateWarehouse,
  toggleWarehouseStatus,
  type WarehouseWithDetails,
} from '@/services/operations/warehousesService';

interface UseWarehousesReturn {
  warehouses: WarehouseWithDetails[];
  countries: { id: string; name: string; tenant_id: string }[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  addWarehouse: (data: { name: string; code: string; address: string; country_id: string; tenant_id: string }) => Promise<{ error: string | null }>;
  editWarehouse: (id: string, data: { name?: string; code?: string; address?: string; country_id?: string; tenant_id?: string }) => Promise<{ error: string | null }>;
  toggleStatus: (id: string, currentStatus: string) => Promise<{ error: string | null }>;
}

export function useWarehouses(): UseWarehousesReturn {
  const [warehouses, setWarehouses] = useState<WarehouseWithDetails[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string; tenant_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [wResult, cResult] = await Promise.all([fetchWarehouses(), fetchCountriesForSelect()]);
      if (wResult.error) setError(wResult.error);
      setWarehouses(wResult.data);
      if (!cResult.error) setCountries(cResult.data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addWarehouse = useCallback(async (data: { name: string; code: string; address: string; country_id: string; tenant_id: string }) => {
    const result = await createWarehouse(data);
    if (!result.error) await load();
    return result;
  }, [load]);

  const editWarehouse = useCallback(async (id: string, data: { name?: string; code?: string; address?: string; country_id?: string; tenant_id?: string }) => {
    const result = await updateWarehouse(id, data);
    if (!result.error) await load();
    return result;
  }, [load]);

  const toggleStatus = useCallback(async (id: string, currentStatus: string) => {
    const result = await toggleWarehouseStatus(id, currentStatus);
    if (!result.error) await load();
    return result;
  }, [load]);

  return { warehouses, countries, loading, error, refresh: load, addWarehouse, editWarehouse, toggleStatus };
}