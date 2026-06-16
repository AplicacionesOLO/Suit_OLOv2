import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useSecurityAlerts } from '@/hooks/useSecurityAlerts';

const severityConfig: Record<string, { badgeBg: string; badgeText: string; icon: string; iconColor: string; borderColor: string }> = {
  critical: { badgeBg: 'bg-red-500/20', badgeText: 'text-red-300', icon: 'ri-alert-fill', iconColor: 'text-red-400', borderColor: 'border-red-500/20' },
  high: { badgeBg: 'bg-red-500/10', badgeText: 'text-red-400', icon: 'ri-error-warning-line', iconColor: 'text-red-400', borderColor: 'border-red-500/15' },
  medium: { badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400', icon: 'ri-alert-line', iconColor: 'text-amber-400', borderColor: 'border-amber-500/20' },
  low: { badgeBg: 'bg-secondary-500/10', badgeText: 'text-secondary-400', icon: 'ri-information-line', iconColor: 'text-secondary-400', borderColor: 'border-secondary-500/20' },
};

const statusConfig: Record<string, { badgeBg: string; badgeText: string; dot: string }> = {
  open: { badgeBg: 'bg-red-500/10', badgeText: 'text-red-400', dot: 'bg-red-400' },
  investigating: { badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400', dot: 'bg-amber-400' },
  resolved: { badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400', dot: 'bg-emerald-400' },
};

const typeLabels: Record<string, string> = {
  login_failed: 'Login fallido',
  access_denied: 'Acceso denegado',
  permission_change: 'Cambio de permisos',
  new_ip: 'IP no reconocida',
  outside_tenant: 'Intento cross-tenant',
  app_down: 'Aplicacion caida',
  risky_session: 'Sesion riesgosa',
};

export default function SecurityAlertsPage() {
  const {
    filtered: alerts, loading, error,
    filterSeverity, setFilterSeverity,
    filterStatus, setFilterStatus,
    selectedAlert, setSelectedAlert,
    resolve,
  } = useSecurityAlerts();

  const totalOpen = alerts.filter((a) => a.status !== 'resolved').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 h-20 bg-background-100/50" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-2xl p-5 h-40 bg-background-100/50" />
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
            <h1 className="text-xl font-bold text-foreground-100">Centro de Alertas</h1>
            <p className="text-sm text-foreground-500 mt-1">Monitoreo de alertas de seguridad en tiempo real.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background-100 border border-secondary-500/15">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-foreground-50' : 'text-foreground-500 hover:text-foreground-300'}`}
                title="Vista grid"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-layout-grid-line text-sm"></i></span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary-500 text-foreground-50' : 'text-foreground-500 hover:text-foreground-300'}`}
                title="Vista lista"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-list-check text-sm"></i></span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Alertas activas', value: totalOpen, icon: 'ri-alert-fill', bg: 'bg-red-500/10', text: 'text-red-400' },
            { label: 'Criticas', value: criticalCount, icon: 'ri-error-warning-fill', bg: 'bg-red-500/20', text: 'text-red-300' },
            { label: 'En investigacion', value: alerts.filter((a) => a.status === 'investigating').length, icon: 'ri-search-eye-line', bg: 'bg-amber-500/10', text: 'text-amber-400' },
            { label: 'Resueltas', value: alerts.filter((a) => a.status === 'resolved').length, icon: 'ri-check-double-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
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

        {/* Filters */}
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todas las severidades</option>
              <option value="critical">Critica</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="open">Abierta</option>
              <option value="investigating">Investigando</option>
              <option value="resolved">Resuelta</option>
            </select>
          </div>
        </div>

        {/* Alerts */}
        {error ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-red-400 text-2xl"></i>
            </div>
            <p className="text-sm text-foreground-400">{error}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-panel rounded-2xl p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <i className="ri-check-double-line text-emerald-400 text-2xl"></i>
            </div>
            <h3 className="text-sm font-semibold text-foreground-300 mb-2">Todo en orden</h3>
            <p className="text-xs text-foreground-500 max-w-sm mx-auto">No hay alertas que coincidan con los filtros actuales.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => {
              const sev = severityConfig[alert.severity] || severityConfig.low;
              const st = statusConfig[alert.status] || statusConfig.open;
              return (
                <div
                  key={alert.id}
                  className={`glass-panel rounded-2xl p-5 border-l-4 ${sev.borderColor} hover:border-secondary-500/20 transition-all cursor-pointer group`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-9 h-9 rounded-lg ${sev.badgeBg} border ${sev.borderColor} flex items-center justify-center`}>
                        <i className={`${sev.icon} ${sev.iconColor} text-lg`}></i>
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground-200">{alert.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${sev.badgeBg} ${sev.badgeText}`}>
                          {typeLabels[alert.type] || alert.type}
                        </span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium ${st.badgeBg} ${st.badgeText} border border-current/10 shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                      {alert.status === 'open' ? 'Abierta' : alert.status === 'investigating' ? 'Investigando' : 'Resuelta'}
                    </span>
                  </div>

                  <p className="text-xs text-foreground-500 leading-relaxed mb-3">{alert.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-2xs text-foreground-600">
                      {alert.user && <span className="flex items-center gap-1"><i className="ri-user-line"></i> {alert.user}</span>}
                      {alert.ip_address && <span className="flex items-center gap-1"><i className="ri-global-line"></i> {alert.ip_address}</span>}
                    </div>
                    <span className="text-2xs text-foreground-600">
                      {new Date(alert.created_at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-500/10">
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Alerta</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Severidad</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => {
                    const sev = severityConfig[alert.severity] || severityConfig.low;
                    const st = statusConfig[alert.status] || statusConfig.open;
                    return (
                      <tr key={alert.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors cursor-pointer" onClick={() => setSelectedAlert(alert)}>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-foreground-200">{alert.title}</p>
                          <p className="text-2xs text-foreground-600 line-clamp-1">{alert.description}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-foreground-400">{typeLabels[alert.type] || alert.type}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${sev.badgeBg} ${sev.badgeText} border border-current/10`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${st.badgeBg} ${st.badgeText} border border-current/10`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            {alert.status === 'open' ? 'Abierta' : alert.status === 'investigating' ? 'Investigando' : 'Resuelta'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-foreground-500 whitespace-nowrap">
                            {new Date(alert.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {alert.status !== 'resolved' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); resolve(alert.id); }}
                              className="h-7 px-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-2xs font-medium whitespace-nowrap"
                            >
                              Marcar resuelta
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Alert detail drawer */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAlert(null)} />
          <div className="relative w-full max-w-md bg-background-50 border-l border-secondary-500/10 h-full overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 z-10 bg-background-50 border-b border-secondary-500/10 p-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground-200">Detalle de alerta</h2>
              <button onClick={() => setSelectedAlert(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const sev = severityConfig[selectedAlert.severity] || severityConfig.low;
                const st = statusConfig[selectedAlert.status] || statusConfig.open;
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-lg ${sev.badgeBg} border ${sev.borderColor} flex items-center justify-center`}>
                        <i className={`${sev.icon} ${sev.iconColor} text-xl`}></i>
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-foreground-200">{selectedAlert.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${sev.badgeBg} ${sev.badgeText}`}>
                            {selectedAlert.severity.toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-medium ${st.badgeBg} ${st.badgeText} border border-current/10`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            {selectedAlert.status === 'open' ? 'Abierta' : selectedAlert.status === 'investigating' ? 'Investigando' : 'Resuelta'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel rounded-xl p-4">
                      <p className="text-sm text-foreground-300 leading-relaxed">{selectedAlert.description}</p>
                    </div>

                    <div className="glass-panel rounded-xl p-4 space-y-3">
                      {[
                        { label: 'Tipo', value: typeLabels[selectedAlert.type] || selectedAlert.type },
                        { label: 'Fecha', value: new Date(selectedAlert.created_at).toLocaleString('es') },
                        { label: 'Usuario', value: selectedAlert.user || 'N/A' },
                        { label: 'IP', value: selectedAlert.ip_address || 'N/A' },
                        { label: 'Aplicacion', value: selectedAlert.application || 'N/A' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-start justify-between gap-4">
                          <span className="text-xs text-foreground-500 shrink-0">{row.label}</span>
                          <span className="text-xs text-foreground-300 text-right">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {selectedAlert.status !== 'resolved' && (
                      <button
                        onClick={() => { resolve(selectedAlert.id); setSelectedAlert(null); }}
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        <span className="w-4 h-4 flex items-center justify-center"><i className="ri-check-line text-sm"></i></span>
                        Marcar como resuelta
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}