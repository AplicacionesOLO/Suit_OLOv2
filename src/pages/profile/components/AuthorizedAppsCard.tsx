import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchApplications, type ApplicationEnriched } from '@/services/applications/applicationsService';
import { fetchMyAccesses, type AccessWithDetails } from '@/services/security/accessService';

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  assigned: { text: 'Activo', cls: 'bg-primary-500/10 text-primary-400 border-primary-500/20' },
  pending: { text: 'Pendiente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  revoked: { text: 'Revocado', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="py-6 text-center">
      <span className="w-10 h-10 rounded-lg bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-2">
        <i className={`${icon} text-foreground-500 text-lg`}></i>
      </span>
      <p className="text-sm text-foreground-500">{text}</p>
    </div>
  );
}

export default function AuthorizedAppsCard() {
  const { platformUser } = useAuth();
  const [myAccesses, setMyAccesses] = useState<AccessWithDetails[]>([]);
  const [allApps, setAllApps] = useState<ApplicationEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const isSuperAdmin = (platformUser?.role_level ?? 0) >= 100;

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!platformUser?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      if (isSuperAdmin) {
        const res = await fetchApplications();
        if (!mounted) return;
        if (res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        setAllApps(res.data.filter((a) => !a.deleted_at && a.status === 'active'));
        setLoading(false);
      } else {
        const res = await fetchMyAccesses(platformUser.id);
        if (!mounted) return;
        if (res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        setMyAccesses(res.data);
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [platformUser?.id, isSuperAdmin, reloadKey]);

  const activeCount = isSuperAdmin
    ? allApps.length
    : myAccesses.filter((a) => a.access_status === 'assigned').length;

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground-200">Mis aplicaciones autorizadas</h2>
        {!loading && !error && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">
            <i className="ri-check-double-line"></i> {activeCount}
          </span>
        )}
      </div>

      {isSuperAdmin && !loading && !error && (
        <p className="text-xs text-foreground-500 mb-4">
          Como {platformUser?.role_name || 'Super Admin'} tienes acceso a todas las aplicaciones del tenant.
        </p>
      )}

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-32 rounded-lg bg-background-100/50 animate-pulse" />
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
      ) : isSuperAdmin ? (
        allApps.length === 0 ? (
          <EmptyState icon="ri-apps-2-line" text="No hay aplicaciones activas en tu tenant" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {allApps.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg bg-background-100/70 border border-secondary-500/15"
              >
                <span className="w-6 h-6 rounded-md bg-secondary-500/10 border border-secondary-500/15 flex items-center justify-center">
                  <i className={`${a.icon || 'ri-apps-line'} text-secondary-500 text-xs`}></i>
                </span>
                <span className="text-xs text-foreground-300 whitespace-nowrap">{a.name}</span>
              </span>
            ))}
          </div>
        )
      ) : myAccesses.length === 0 ? (
        <EmptyState icon="ri-apps-2-line" text="No tienes aplicaciones asignadas" />
      ) : (
        <div className="space-y-2">
          {myAccesses.map((acc) => {
            const st = STATUS_LABELS[acc.access_status] || {
              text: acc.access_status,
              cls: 'bg-secondary-500/10 text-foreground-500 border-secondary-500/20',
            };
            return (
              <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl bg-background-100/70 border border-secondary-500/15">
                <span className="w-9 h-9 rounded-lg bg-secondary-500/10 border border-secondary-500/15 flex items-center justify-center shrink-0">
                  <i className={`${acc.application_icon || 'ri-apps-line'} text-secondary-500 text-base`}></i>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground-200 truncate">{acc.application_name}</p>
                  {acc.instance_name && (
                    <p className="text-2xs text-foreground-500 truncate">Instancia: {acc.instance_name}</p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium border whitespace-nowrap ${st.cls}`}>
                  {st.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}