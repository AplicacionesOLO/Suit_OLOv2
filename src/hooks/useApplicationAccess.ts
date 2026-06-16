import { useState, useEffect, useCallback } from 'react';
import { fetchUserAccesses, fetchMyAccesses, grantAccess, updateAccessStatus, type AccessWithDetails } from '@/services/security/accessService';

export function useApplicationAccess() {
  const [accesses, setAccesses] = useState<AccessWithDetails[]>([]);
  const [myAccesses, setMyAccesses] = useState<AccessWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserAccesses();
      if (result.error) throw result.error;
      setAccesses(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadMyAccesses = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyAccesses(userId);
      if (result.error) throw result.error;
      setMyAccesses(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const assignAccess = useCallback(async (userId: string, applicationId: string, instanceId?: string) => {
    const result = await grantAccess({
      user_id: userId,
      application_id: applicationId,
      instance_id: instanceId || null,
    });
    if (result.error) return { error: result.error.message };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  const revokeAccess = useCallback(async (id: string) => {
    const result = await updateAccessStatus(id, 'revoked');
    if (result.error) return { error: result.error.message };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  const approveAccess = useCallback(async (id: string) => {
    const result = await updateAccessStatus(id, 'active');
    if (result.error) return { error: result.error.message };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  const denyAccess = useCallback(async (id: string) => {
    const result = await updateAccessStatus(id, 'denied');
    if (result.error) return { error: result.error.message };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  return {
    accesses, myAccesses, loading, error,
    reload: loadAll, loadMyAccesses,
    assignAccess, revokeAccess, approveAccess, denyAccess,
  };
}