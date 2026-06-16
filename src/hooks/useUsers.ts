import { useState, useEffect, useCallback } from 'react';
import {
  fetchUsers,
  createPlatformUser,
  updatePlatformUser,
  deletePlatformUser,
  type PlatformUserFull,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/services/auth/usersService';
import { supabase } from '@/services/supabase/client';

interface UseUsersReturn {
  users: PlatformUserFull[];
  tenants: { id: string; name: string }[];
  roles: { id: string; name: string; level: number }[];
  countries: { id: string; name: string; tenant_id: string }[];
  warehouses: { id: string; name: string; country_id: string }[];
  clients: { id: string; name: string; warehouse_id: string }[];
  loading: boolean;
  error: string | null;
  addUser: (input: CreateUserInput) => Promise<{ error: string | null }>;
  editUser: (userId: string, input: UpdateUserInput) => Promise<{ error: string | null }>;
  removeUser: (userId: string) => Promise<{ error: string | null }>;
  refresh: () => void;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<PlatformUserFull[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; level: number }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string; tenant_id: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; country_id: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; warehouse_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResult, tenantsResult, rolesResult, countriesResult, warehousesResult, clientsResult] = await Promise.all([
        fetchUsers(),
        supabase.from('tenants').select('id, name').order('name'),
        supabase.from('roles').select('id, name, level').order('level'),
        supabase.from('countries').select('id, name, tenant_id').order('name'),
        supabase.from('warehouses').select('id, name, country_id').order('name'),
        supabase.from('clients').select('id, name, warehouse_id').order('name'),
      ]);

      if (usersResult.error) { setError(usersResult.error); }
      else { setUsers(usersResult.users); }

      if (tenantsResult.data) setTenants(tenantsResult.data);
      if (rolesResult.data) setRoles(rolesResult.data);
      if (countriesResult.data) setCountries(countriesResult.data);
      if (warehousesResult.data) setWarehouses(warehousesResult.data);
      if (clientsResult.data) setClients(clientsResult.data);
    } catch (e) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addUser = useCallback(async (input: CreateUserInput) => {
    const result = await createPlatformUser(input);
    if (!result.error) await load();
    return result;
  }, [load]);

  const editUser = useCallback(async (userId: string, input: UpdateUserInput) => {
    const result = await updatePlatformUser(userId, input);
    if (!result.error) await load();
    return result;
  }, [load]);

  const removeUser = useCallback(async (userId: string) => {
    const result = await deletePlatformUser(userId);
    if (!result.error) await load();
    return result;
  }, [load]);

  return {
    users, tenants, roles, countries, warehouses, clients,
    loading, error,
    addUser, editUser, removeUser,
    refresh: load,
  };
}