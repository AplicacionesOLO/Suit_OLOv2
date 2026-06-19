import { useState, useEffect, useCallback } from 'react';
import {
  fetchClients,
  fetchCountriesForClientSelect,
  fetchTenantsByCountry,
  fetchWarehousesByTenant,
  createClient,
  updateClient,
  toggleClientStatus,
  type ClientWithDetails,
  type CountrySelectOption,
  type TenantSelectOption,
  type WarehouseSelectOption,
} from '@/services/operations/clientsService';
import type { WarehouseOption } from '@/types/organization';

interface UseClientsReturn {
  clients: ClientWithDetails[];
  countries: CountrySelectOption[];
  tenants: TenantSelectOption[];
  warehouses: WarehouseSelectOption[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  loadTenantsByCountry: (countryId: string) => Promise<TenantSelectOption[]>;
  loadWarehousesByTenant: (tenantId: string) => Promise<WarehouseSelectOption[]>;
  addClient: (data: { name: string; code: string; contact_email: string; warehouse_id: string; tenant_id: string }) => Promise<{ error: string | null }>;
  editClient: (id: string, data: { name?: string; code?: string; contact_email?: string; warehouse_id?: string; tenant_id?: string }) => Promise<{ error: string | null }>;
  toggleStatus: (id: string, currentStatus: string) => Promise<{ error: string | null }>;
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [countries, setCountries] = useState<CountrySelectOption[]>([]);
  const [tenants, setTenants] = useState<TenantSelectOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseSelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [clResult, coResult] = await Promise.all([
        fetchClients(),
        fetchCountriesForClientSelect(),
      ]);
      if (clResult.error) setError(clResult.error);
      setClients(clResult.data);
      if (!coResult.error) setCountries(coResult.data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadTenantsByCountry = useCallback(async (countryId: string): Promise<TenantSelectOption[]> => {
    if (!countryId) { setTenants([]); return []; }
    const { data } = await fetchTenantsByCountry(countryId);
    setTenants(data);
    return data;
  }, []);

  const loadWarehousesByTenant = useCallback(async (tenantId: string): Promise<WarehouseSelectOption[]> => {
    if (!tenantId) { setWarehouses([]); return []; }
    const { data } = await fetchWarehousesByTenant(tenantId);
    setWarehouses(data);
    return data;
  }, []);

  const addClient = useCallback(async (data: { name: string; code: string; contact_email: string; warehouse_id: string; tenant_id: string }) => {
    const result = await createClient(data);
    if (!result.error) await load();
    return result;
  }, [load]);

  const editClient = useCallback(async (id: string, data: { name?: string; code?: string; contact_email?: string; warehouse_id?: string; tenant_id?: string }) => {
    const result = await updateClient(id, data);
    if (!result.error) await load();
    return result;
  }, [load]);

  const toggleStatus = useCallback(async (id: string, currentStatus: string) => {
    const result = await toggleClientStatus(id, currentStatus);
    if (!result.error) await load();
    return result;
  }, [load]);

  return { clients, countries, tenants, warehouses, loading, error, refresh: load, loadTenantsByCountry, loadWarehousesByTenant, addClient, editClient, toggleStatus };
}