import { useState, useEffect, useCallback } from 'react';
import {
  fetchUsers,
  fetchInvitations,
  createUserInvitation,
  revokeInvitation,
  updatePlatformUser,
  deletePlatformUser,
  type PlatformUserFull,
  type UserInvitation,
  type CreateInvitationInput,
  type UpdateUserInput,
} from '@/services/auth/usersService';
import { supabase } from '@/services/supabase/client';
import { auditCascadeData } from '@/utils/organizationCascade';

interface UseUsersReturn {
  users: PlatformUserFull[];
  invitations: UserInvitation[];
  tenants: { id: string; name: string; country_id: string | null }[];
  roles: { id: string; name: string; level: number }[];
  countries: { id: string; name: string; tenant_id: string }[];
  warehouses: { id: string; name: string; country_id: string }[];
  clients: { id: string; name: string; warehouse_id: string; tenant_id: string }[];
  loading: boolean;
  error: string | null;
  sendInvitation: (input: CreateInvitationInput) => Promise<{ error: string | null }>;
  cancelInvitation: (invitationId: string) => Promise<{ error: string | null }>;
  editUser: (userId: string, input: UpdateUserInput) => Promise<{ error: string | null }>;
  removeUser: (userId: string) => Promise<{ error: string | null }>;
  refresh: () => void;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<PlatformUserFull[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string; country_id: string | null }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; level: number }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string; tenant_id: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; country_id: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; warehouse_id: string; tenant_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResult, invitationsResult, tenantsResult, rolesResult, countriesResult, warehousesResult, clientsResult] = await Promise.all([
        fetchUsers(),
        fetchInvitations(),
        supabase.from('tenants').select('id, name, country_id').order('name'),
        supabase.from('roles').select('id, name, level').order('level'),
        supabase.from('countries').select('id, name, tenant_id').order('name'),
        supabase.from('warehouses').select('id, name, country_id').order('name'),
        supabase.from('clients').select('id, name, warehouse_id, tenant_id').order('name'),
      ]);

      if (usersResult.error) { setError(usersResult.error); }
      else { setUsers(usersResult.users); }

      if (invitationsResult.error) { /* non-blocking */ }
      else { setInvitations(invitationsResult.invitations); }

      if (tenantsResult.data) setTenants(tenantsResult.data);
      if (rolesResult.data) setRoles(rolesResult.data);
      if (countriesResult.data) setCountries(countriesResult.data);
      if (warehousesResult.data) setWarehouses(warehousesResult.data);
      if (clientsResult.data) setClients(clientsResult.data);

      // Auditar integridad de cascada en desarrollo
      if (tenantsResult.data && clientsResult.data) {
        auditCascadeData(tenantsResult.data, clientsResult.data);
      }
    } catch (e) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendInvitation = useCallback(async (input: CreateInvitationInput) => {
    const result = await createUserInvitation(input);
    if (!result.error) await load();
    return result;
  }, [load]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    const result = await revokeInvitation(invitationId);
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
    users, invitations, tenants, roles, countries, warehouses, clients,
    loading, error,
    sendInvitation, cancelInvitation, editUser, removeUser,
    refresh: load,
  };
}