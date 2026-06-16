import { useState, useEffect, useCallback } from 'react';
import {
  fetchClients,
  fetchWarehousesForSelect,
  createClient,
  updateClient,
  toggleClientStatus,
  type ClientWithDetails,
} from '@/services/operations/clientsService';

interface UseClientsReturn {
  clients: ClientWithDetails[];
  warehouses: { id: string; name: string; country_id: string; tenant_id: string }[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  addClient: (data: { name: string; code: string; contact_email: string; warehouse_id: string; tenant_id: string }) => Promise<{ error: string | null }>;
  editClient: (id: string, data: { name?: string; code?: string; contact_email?: string; warehouse_id?: string; tenant_id?: string }) => Promise<{ error: string | null }>;
  toggleStatus: (id: string, currentStatus: string) => Promise<{ error: string | null }>;
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; country_id: string; tenant_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [clResult, whResult] = await Promise.all([fetchClients(), fetchWarehousesForSelect()]);
      if (clResult.error) setError(clResult.error);
      setClients(clResult.data);
      if (!whResult.error) setWarehouses(whResult.data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  return { clients, warehouses, loading, error, refresh: load, addClient, editClient, toggleStatus };
}