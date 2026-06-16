import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogs, fetchAuditStats, fetchDistinctActions, type AuditLog, type AuditFilter, type AuditStats } from '@/services/security/auditService';

export function useAuditLogs(initialFilters: AuditFilter = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<AuditFilter>({ page: 1, pageSize: 25, ...initialFilters });
  const [stats, setStats] = useState<AuditStats>({ total_today: 0, critical: 0, access_denied: 0, permission_changes: 0, recent_logins: 0 });
  const [actions, setActions] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const load = useCallback(async (f: AuditFilter) => {
    setLoading(true);
    setError(null);
    const result = await fetchAuditLogs(f);
    setLogs(result.data);
    setTotalCount(result.count);
    if (result.error) setError(result.error);
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    const result = await fetchAuditStats();
    if (result.data) setStats(result.data);
  }, []);

  const loadActions = useCallback(async () => {
    const result = await fetchDistinctActions();
    if (result.data) setActions(result.data);
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  useEffect(() => {
    loadStats();
    loadActions();
  }, [loadStats, loadActions]);

  const updateFilters = useCallback((patch: Partial<AuditFilter>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page || 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    logs, loading, error, totalCount, filters, stats, actions,
    selectedLog, setSelectedLog,
    updateFilters, setPage, load,
  };
}