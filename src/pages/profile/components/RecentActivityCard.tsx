import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserActivity, type AuditLog } from '@/services/security/auditService';
import { humanizeAuditAction } from '@/utils/permissionLabels';

const SEVERITY_STYLE: Record<string, string> = {
  info: 'text-secondary-500',
  medium: 'text-amber-500',
  warning: 'text-amber-500',
  critical: 'text-red-500',
};

const SEVERITY_ICON: Record<string, string> = {
  info: 'ri-information-line',
  medium: 'ri-alert-line',
  warning: 'ri-alert-line',
  critical: 'ri-error-warning-line',
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecentActivityCard() {
  const { platformUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!platformUser?.id) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchUserActivity(platformUser.id).then((res) => {
      if (!mounted) return;
      setLogs(res.data);
      setError(res.error);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [platformUser?.id, reloadKey]);

  const severityOf = (l: AuditLog) => l.severity || 'info';

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-foreground-200 mb-4">Actividad reciente</h2>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-background-100/50 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 rounded bg-background-100/50 animate-pulse" />
                <div className="h-2 w-1/3 rounded bg-background-100/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-6 text-center">
          <p className="text-xs text-red-400 mb-3">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="h-8 px-3 rounded-lg border border-secondary-500/20 text-xs text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-6 text-center">
          <span className="w-10 h-10 rounded-lg bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-2">
            <i className="ri-history-line text-foreground-500 text-lg"></i>
          </span>
          <p className="text-sm text-foreground-500">Sin actividad reciente</p>
        </div>
      ) : (
        <ol className="relative space-y-4">
          {logs.map((l) => (
            <li key={l.id} className="flex items-start gap-3">
              <span
                className={`w-8 h-8 rounded-lg bg-secondary-500/10 border border-secondary-500/15 flex items-center justify-center shrink-0 ${
                  SEVERITY_STYLE[severityOf(l)] || 'text-secondary-500'
                }`}
              >
                <i className={`${SEVERITY_ICON[severityOf(l)] || 'ri-information-line'} text-sm`}></i>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium text-foreground-200">{humanizeAuditAction(l.action)}</p>
                  <span className="text-2xs text-foreground-600 whitespace-nowrap">{formatWhen(l.created_at)}</span>
                </div>
                {l.entity_type && (
                  <p className="text-2xs text-foreground-500 mt-0.5 capitalize">{l.entity_type.replace(/_/g, ' ')}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}