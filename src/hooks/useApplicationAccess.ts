import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchUserAccesses,
  fetchMyAccesses,
  createUserAccess,
  revokeUserAccess,
  reactivateUserAccess,
  type AccessWithDetails,
  type CreateAccessPayload,
} from '@/services/security/accessService';

export function useApplicationAccess() {
  const [accesses, setAccesses] = useState<AccessWithDetails[]>([]);
  const [myAccesses, setMyAccesses] = useState<AccessWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserAccesses();
      if (result.error) throw new Error(result.error);
      setAccesses(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadMyAccesses = useCallback(async (userId: string) => {
    setMyLoading(true);
    setError(null);
    try {
      const result = await fetchMyAccesses(userId);
      if (result.error) throw new Error(result.error);
      setMyAccesses(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMyLoading(false);
    }
  }, []);

  const createAccess = useCallback(async (payload: CreateAccessPayload) => {
    const result = await createUserAccess(payload);
    if (result.error) return { error: result.error };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  const revokeAccess = useCallback(async (id: string) => {
    const result = await revokeUserAccess(id);
    if (result.error) return { error: result.error };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  const reactivateAccess = useCallback(async (id: string) => {
    const result = await reactivateUserAccess(id);
    if (result.error) return { error: result.error };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  const approveAccess = useCallback(async (id: string) => {
    const result = await reactivateUserAccess(id);
    if (result.error) return { error: result.error };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  const denyAccess = useCallback(async (id: string) => {
    const result = await revokeUserAccess(id);
    if (result.error) return { error: result.error };
    await loadAll();
    return { error: null };
  }, [loadAll]);

  const stats = useMemo(() => ({
    assigned: accesses.filter((a) => a.access_status === 'assigned').length,
    pending: accesses.filter((a) => a.access_status === 'pending').length,
    revoked: accesses.filter((a) => a.access_status === 'revoked').length,
    total: accesses.length,
  }), [accesses]);

  return {
    accesses, myAccesses, loading, myLoading, error, stats,
    reload: loadAll, loadMyAccesses,
    createAccess, revokeAccess, reactivateAccess,
    approveAccess, denyAccess,
  };
}