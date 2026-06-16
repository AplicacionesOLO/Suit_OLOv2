import { useState, useEffect, useCallback } from 'react';
import { fetchAlerts, resolveAlert, type SecurityAlert } from '@/services/security/alertsService';

export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAlerts();
    setAlerts(result.data);
    if (result.error) setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = useCallback(async (alertId: string) => {
    const result = await resolveAlert(alertId);
    if (!result.error) {
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status: 'resolved' } : a));
    }
    return result;
  }, []);

  const filtered = alerts.filter((a) => {
    if (filterSeverity && a.severity !== filterSeverity) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  return {
    alerts, filtered, loading, error,
    filterSeverity, setFilterSeverity,
    filterStatus, setFilterStatus,
    selectedAlert, setSelectedAlert,
    resolve, load,
  };
}