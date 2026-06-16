import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { exportAuditCSV } from '@/services/security/auditService';

const severityConfig: Record<string, { badgeBg: string; badgeText: string; dot: string }> = {
  info: { badgeBg: 'bg-secondary-500/10', badgeText: 'text-secondary-400', dot: 'bg-secondary-400' },
  low: { badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400', dot: 'bg-emerald-400' },
  medium: { badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400', dot: 'bg-amber-400' },
  high: { badgeBg: 'bg-red-500/10', badgeText: 'text-red-400', dot: 'bg-red-400' },
  critical: { badgeBg: 'bg-red-500/20', badgeText: 'text-red-300', dot: 'bg-red-500' },
};

const actionDisplay: Record<string, string> = {
  LOGIN: 'Inicio de sesion',
  LOGOUT: 'Cierre de sesion',
  LOGIN_FAILED: 'Login fallido',
  ACCESS_GRANTED: 'Acceso concedido',
  ACCESS_DENIED: 'Acceso denegado',
  ACCESS_REVOKED: 'Acceso revocado',
  APP_ACCESS_APPROVED: 'Acceso aprobado',
  APP_ACCESS_DENIED: 'Acceso denegado',
  APP_ACCESS_EXPIRED: 'Acceso expirado',
  ROLE_CREATED: 'Rol creado',
  ROLE_UPDATED: 'Rol actualizado',
  ROLE_DEACTIVATED: 'Rol desactivado',
  PERMISSION_CHANGED: 'Permiso modificado',
  PROFILE_CREATED: 'Perfil creado',
  PROFILE_UPDATED: 'Perfil editado',
  PROFILE_COPIED: 'Perfil copiado',
  SECURITY_SETTING_CHANGED: 'Setting cambiado',
  NEW_IP_ACCESS: 'Acceso desde IP nueva',
  OUTSIDE_TENANT_ATTEMPT: 'Intento cross-tenant',
  SESSION_REVOKED: 'Sesion revocada',
  MFA_ENABLED: 'MFA activado',
  APP_CREATED: 'App creada',
  APP_UPDATED: 'App actualizada',
  INSTANCE_DEPLOYED: 'Instancia desplegada',
  INSTANCE_OFFLINE: 'Instancia offline',
  AUDIT_EXPORT: 'Auditoria exportada',
  AUDIT_RETENTION_CHANGED: 'Retencion cambiada',
};

function actionLabel(action: string): string {
  return actionDisplay[action] || action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditPage() {
  const {
    logs, loading, error, totalCount, filters, stats, actions,
    selectedLog, setSelectedLog,
    updateFilters, setPage, load,
  } = useAuditLogs();

  const [dateMode, setDateMode] = useState<'all' | 'today' | 'week' | 'custom'>('all');

  const handleDateChange = (mode: string) => {
    setDateMode(mode as typeof dateMode);
    const now = new Date();
    if (mode === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      updateFilters({ date_from: today.toISOString(), date_to: now.toISOString() });
    } else if (mode === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      updateFilters({ date_from: weekAgo.toISOString(), date_to: now.toISOString() });
    } else if (mode === 'all') {
      const newFilters = { ...filters };
      delete newFilters.date_from;
      delete newFilters.date_to;
      updateFilters(newFilters);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / (filters.pageSize || 25)));

  if (loading && logs.length === 0) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 h-20 bg-background-100/50" />
            ))}
          </div>
          <div className="glass-panel rounded-2xl p-8 h-96 bg-background-100/50" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Auditoria</h1>
            <p className="text-sm text-foreground-500 mt-1">Registro completo de actividad del sistema con trazabilidad enterprise.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(filters)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line text-sm"></i></span>
              Actualizar
            </button>
            <button
              onClick={() => exportAuditCSV(logs)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-download-line text-sm"></i></span>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Eventos hoy', value: stats.total_today, icon: 'ri-calendar-event-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Eventos criticos', value: stats.critical, icon: 'ri-alert-line', bg: 'bg-red-500/10', text: 'text-red-400' },
            { label: 'Accesos denegados', value: stats.access_denied, icon: 'ri-shield-flash-line', bg: 'bg-amber-500/10', text: 'text-amber-400' },
            { label: 'Cambios de permisos', value: stats.permission_changes, icon: 'ri-key-2-line', bg: 'bg-accent-500/10', text: 'text-accent-400' },
            { label: 'Logins recientes', value: stats.recent_logins, icon: 'ri-login-box-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
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
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => updateFilters({ search: e.target.value || undefined })}
                placeholder="Buscar en auditoria..."
                className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
              />
            </div>

            <select
              value={filters.action || ''}
              onChange={(e) => updateFilters({ action: e.target.value || undefined })}
              className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
            >
              <option value="">Todas las acciones</option>
              {actions.map((a) => (
                <option key={a} value={a}>{actionLabel(a)}</option>
              ))}
            </select>

            <select
              value={filters.severity || ''}
              onChange={(e) => updateFilters({ severity: e.target.value || undefined })}
              className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
            >
              <option value="">Todas las severidades</option>
              <option value="info">Info</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background-100 border border-secondary-500/15">
              {['all', 'today', 'week'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleDateChange(mode)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    dateMode === mode ? 'bg-primary-500 text-foreground-50' : 'text-foreground-500 hover:text-foreground-300'
                  }`}
                >
                  {mode === 'all' ? 'Todos' : mode === 'today' ? 'Hoy' : '7 dias'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          {error && !loading && (
            <div className="flex items-center gap-2 px-5 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
              {error}
              <button onClick={() => load(filters)} className="ml-auto text-xs underline hover:text-red-300">Reintentar</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider whitespace-nowrap">Fecha/Hora</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider whitespace-nowrap">Accion</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider whitespace-nowrap">Entidad</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider whitespace-nowrap">Severidad</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider whitespace-nowrap">IP</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const sev = severityConfig[log.severity] || severityConfig.info;
                  return (
                    <tr key={log.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-sm text-foreground-300 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-2xs text-foreground-600">{new Date(log.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-foreground-300 whitespace-nowrap">{actionLabel(log.action)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">{log.entity_type}</code>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${sev.badgeBg} ${sev.badgeText} border border-current/10`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`}></span>
                          {log.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-xs text-foreground-500 font-mono">{log.ip_address || '—'}</code>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
                        >
                          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-line text-sm"></i></span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {logs.length === 0 && !loading && (
              <div className="py-16 text-center">
                <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-file-search-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">No se encontraron eventos de auditoria</p>
                <p className="text-xs text-foreground-600 mt-1">Ajusta los filtros para ver mas resultados</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
              <span className="text-xs text-foreground-600">
                Mostrando {(filters.page || 1) * (filters.pageSize || 25) - (filters.pageSize || 25) + 1} - {Math.min((filters.page || 1) * (filters.pageSize || 25), totalCount)} de {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, (filters.page || 1) - 1))}
                  disabled={(filters.page || 1) <= 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-s-line text-sm"></i></span>
                </button>
                <span className="text-xs text-foreground-500 px-2">{filters.page || 1} / {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, (filters.page || 1) + 1))}
                  disabled={(filters.page || 1) >= totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-s-line text-sm"></i></span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative w-full max-w-lg bg-background-50 border-l border-secondary-500/10 h-full overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 z-10 bg-background-50 border-b border-secondary-500/10 p-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground-200">Detalle del evento</h2>
              <button onClick={() => setSelectedLog(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const sev = severityConfig[selectedLog.severity] || severityConfig.info;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sev.badgeBg} ${sev.badgeText} border border-current/10`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`}></span>
                      {selectedLog.severity.toUpperCase()}
                    </span>
                  );
                })()}
                <code className="text-sm font-mono bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded">{selectedLog.action}</code>
              </div>

              <div className="glass-panel rounded-xl p-4 space-y-3">
                {[
                  { label: 'Fecha y hora', value: new Date(selectedLog.created_at).toLocaleString('es') },
                  { label: 'Accion', value: actionLabel(selectedLog.action) },
                  { label: 'Entidad', value: selectedLog.entity_type },
                  { label: 'ID Entidad', value: selectedLog.entity_id || 'N/A' },
                  { label: 'Direccion IP', value: selectedLog.ip_address || 'N/A' },
                  { label: 'User Agent', value: selectedLog.user_agent || 'N/A' },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-foreground-500 shrink-0">{row.label}</span>
                    <span className="text-xs text-foreground-300 text-right font-mono">{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedLog.details && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">Detalles</h3>
                  <div className="glass-panel rounded-xl p-4">
                    <pre className="text-xs text-foreground-300 font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Timeline context */}
              <div>
                <h3 className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-3">Timeline de actividad</h3>
                <div className="space-y-3">
                  {logs.slice(0, 5).map((l, i) => {
                    const isSelected = l.id === selectedLog.id;
                    return (
                      <div key={l.id} className={`flex gap-3 items-start ${isSelected ? 'opacity-100' : 'opacity-60'}`}>
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${isSelected ? 'bg-primary-400 ring-4 ring-primary-400/20' : 'bg-secondary-500'}`}></div>
                          {i < 4 && <div className="w-px h-6 bg-secondary-500/20 mt-0.5"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground-300">{actionLabel(l.action)}</p>
                          <p className="text-2xs text-foreground-600">{new Date(l.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}