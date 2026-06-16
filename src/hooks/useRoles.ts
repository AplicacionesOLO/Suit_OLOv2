import { useState, useEffect, useCallback } from 'react';
import { fetchRolesWithCounts, createRole, updateRole, type CreateRoleInput, type UpdateRoleInput, type RoleWithCounts } from '@/services/security/rolesService';

export function useRoles() {
  const [roles, setRoles] = useState<RoleWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRolesWithCounts();
      if (result.error) throw result.error;
      setRoles(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addRole = useCallback(async (input: CreateRoleInput) => {
    const result = await createRole(input);
    if (result.error) return { error: result.error.message };
    await load();
    return { error: null };
  }, [load]);

  const editRole = useCallback(async (id: string, updates: UpdateRoleInput) => {
    const result = await updateRole(id, updates);
    if (result.error) return { error: result.error.message };
    await load();
    return { error: null };
  }, [load]);

  return { roles, loading, error, reload: load, addRole, editRole };
}