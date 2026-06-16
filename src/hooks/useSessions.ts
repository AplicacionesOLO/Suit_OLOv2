import { useState, useEffect, useCallback } from 'react';
import { fetchSessions, revokeSession, markSessionSuspicious, type ActiveSession } from '@/services/security/sessionsService';

export function useSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchSessions();
    setSessions(result.data);
    if (result.error) setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = useCallback(async (sessionId: string) => {
    const result = await revokeSession(sessionId);
    if (!result.error) {
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status: 'revoked' } : s));
    }
    return result;
  }, []);

  const markSuspicious = useCallback(async (sessionId: string) => {
    const result = await markSessionSuspicious(sessionId);
    if (!result.error) {
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, risk: 'high' } : s));
    }
    return result;
  }, []);

  return { sessions, loading, error, revoke, markSuspicious, load };
}