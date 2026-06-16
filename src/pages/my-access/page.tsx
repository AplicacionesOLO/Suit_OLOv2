import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useApplicationAccess } from '@/hooks/useApplicationAccess';
import { logAuditEvent } from '@/services/security/accessService';

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  assigned: { label: 'Activo', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  pending: { label: 'Pendiente', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  revoked: { label: 'Revocado', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  expired: { label: 'Expirado', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

function getColors(c: string) { return colorMap[c] || colorMap.emerald; }

export default function MyAccessPage() {
  const navigate = useNavigate();
  const { platformUser, user } = useAuth();
  const { myAccesses, myLoading, loadMyAccesses } = useApplicationAccess();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (platformUser?.id) {
      loadMyAccesses(platformUser.id);
    }
  }, [platformUser, loadMyAccesses]);

  const handleOpenApp = (acc: any) => {
    const openMode = acc.instance_open_mode || 'external';
    const instanceId = acc.instance_id;
    const instanceUrl = acc.instance_url || acc.application_base_url;

    console.log('[MyAccess] handleOpenApp — acc.id:', acc.id, '| app:', acc.application_name, '| instanceId:', instanceId, '| openMode:', openMode, '| instanceUrl:', instanceUrl);

    if (openMode === 'embedded' && instanceId) {
      // Navigate to workspace for embedded apps
      console.log('[MyAccess] Navigating to workspace:', `/workspace/${instanceId}`);
      navigate(`/workspace/${instanceId}`);
    } else if (instanceUrl) {
      // Open in new tab for external apps
      console.log('[MyAccess] Opening in new tab:', instanceUrl);
      window.open(instanceUrl, '_blank', 'noopener,noreferrer');
      logAuditEvent({
        action: 'USER_OPENED_EXTERNAL_APPLICATION',
        entity_type: 'user_application_access',
        entity_id: acc.id,
        details: {
          application_name: acc.application_name,
          instance_name: acc.instance_name,
          url: instanceUrl,
          open_mode: 'external_direct',
        },
        severity: 'info',
      });
    } else {
      // Fallback: try workspace if instance exists
      console.warn('[MyAccess] No instanceUrl and openMode is not embedded — fallback to workspace');
      if (instanceId) {
        navigate(`/workspace/${instanceId}`);
      }
    }
  };

  const filtered = myAccesses.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (a.application_name || '').toLowerCase().includes(q) || (a.application_code || '').toLowerCase().includes(q);
  });

  const activeAccesses = myAccesses.filter((a) => a.access_status === 'assigned');
  const pendingAccesses = myAccesses.filter((a) => a.access_status === 'pending');

  if (myLoading) {
    return (
      <AppLayout>
        <div className="animate-fade-in space-y-6">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Mis Accesos</h1>
            <p className="text-sm text-foreground-500 mt-1">Cargando tus aplicaciones asignadas...</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-2xl p-5 h-40 animate-pulse bg-background-100/50" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Mis Accesos</h1>
            <p className="text-sm text-foreground-500 mt-1">
              Aplicaciones e instancias autorizadas para tu usuario.
              {platformUser && <span className="text-foreground-400"> Conectado como <span className="text-primary-400 font-medium">{platformUser.first_name || platformUser.last_name ? `${platformUser.first_name || ''} ${platformUser.last_name || ''}`.trim() : (platformUser.email || user?.email || 'Usuario')}</span></span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Apps autorizadas', value: activeAccesses.length, icon: 'ri-check-double-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Pendientes', value: pendingAccesses.length, icon: 'ri-time-line', bg: 'bg-amber-500/10', text: 'text-amber-400' },
            { label: 'Total accesos', value: myAccesses.length, icon: 'ri-key-2-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <i className={`${stat.icon} ${stat.text} text-base`}></i>
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground-100">{stat.value}</div>
                  <div className="text-2xs text-foreground-600">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por nombre de aplicacion..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
        </div>

        {myAccesses.length === 0 ? (
          <div className="glass-panel rounded-2xl p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-5">
              <i className="ri-shield-keyhole-line text-foreground-500 text-2xl"></i>
            </div>
            <h3 className="text-sm font-semibold text-foreground-300 mb-2">Sin accesos asignados</h3>
            <p className="text-xs text-foreground-500 max-w-sm mx-auto mb-6">
              No tienes aplicaciones autorizadas. Contacta a tu administrador o solicita acceso desde el catalogo.
            </p>
            <button className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
              Ir al catalogo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAccesses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground-200 mb-4 flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center text-emerald-400"><i className="ri-check-double-line"></i></span>
                  Aplicaciones autorizadas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeAccesses.map((acc) => {
                    const colors = getColors(acc.application_color || 'emerald');
                    const grantedDate = acc.granted_at ? new Date(acc.granted_at).toLocaleDateString() : null;
                    const openMode = acc.instance_open_mode || 'external';
                    const isEmbedded = openMode === 'embedded';
                    return (
                      <div key={acc.id} className="glass-panel rounded-2xl p-5 hover:border-secondary-500/20 transition-all duration-200 group">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-11 h-11 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                            <i className={`${acc.application_icon || 'ri-apps-line'} ${colors.text} text-xl`}></i>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium border ${
                            isEmbedded
                              ? 'bg-accent-500/10 text-accent-400 border-accent-500/20'
                              : 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20'
                          }`}>
                            {isEmbedded ? 'EMBEBIDA' : 'EXTERNA'}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground-200 mb-1.5">{acc.application_name}</h3>
                        {acc.instance_name && <p className="text-xs text-foreground-500 mb-2">Instancia: {acc.instance_name}</p>}
                        {grantedDate && <p className="text-2xs text-foreground-600 mb-3">Desde {grantedDate}</p>}
                        <button
                          onClick={() => handleOpenApp(acc)}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
                        >
                          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-external-link-line"></i></span>
                          Abrir aplicacion
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {pendingAccesses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground-200 mb-4 flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center text-amber-400"><i className="ri-time-line"></i></span>
                  Pendientes de aprobacion
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pendingAccesses.map((acc) => {
                    const colors = getColors(acc.application_color || 'emerald');
                    return (
                      <div key={acc.id} className="glass-panel rounded-2xl p-5 border border-amber-500/10">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-11 h-11 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center opacity-60`}>
                            <i className={`${acc.application_icon || 'ri-apps-line'} ${colors.text} text-xl`}></i>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Pendiente</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground-200 mb-1.5">{acc.application_name}</h3>
                        <p className="text-xs text-foreground-500">Esperando aprobacion del administrador</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}