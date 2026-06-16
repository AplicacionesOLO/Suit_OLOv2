import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useSessions } from '@/hooks/useSessions';

const statusConfig: Record<string, { badgeBg: string; badgeText: string; dot: string }> = {
  active: { badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400', dot: 'bg-emerald-400' },
  inactive: { badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400', dot: 'bg-amber-400' },
  expired: { badgeBg: 'bg-secondary-500/10', badgeText: 'text-secondary-400', dot: 'bg-secondary-400' },
  revoked: { badgeBg: 'bg-red-500/10', badgeText: 'text-red-400', dot: 'bg-red-400' },
};

const riskConfig: Record<string, { badgeBg: string; badgeText: string; dot: string }> = {
  low: { badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400', dot: 'bg-emerald-400' },
  medium: { badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400', dot: 'bg-amber-400' },
  high: { badgeBg: 'bg-red-500/10', badgeText: 'text-red-400', dot: 'bg-red-400' },
  critical: { badgeBg: 'bg-red-500/20', badgeText: 'text-red-300', dot: 'bg-red-500' },
};

export default function SessionsPage() {
  const { sessions, loading, error, revoke, markSuspicious } = useSessions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [selectedSession, setSelectedSession] = useState<typeof sessions[0] | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string } | null>(null);

  const filtered = sessions.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.user_name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !s.ip_address.includes(q)) return false;
    }
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterRisk && s.risk !== filterRisk) return false;
    return true;
  });

  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const criticalCount = sessions.filter((s) => s.risk === 'critical' || s.risk === 'high').length;

  const handleAction = (type: string, session: typeof sessions[0]) => {
    setConfirmAction({ type, id: session.id });
    setShowConfirm(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'revoke') await revoke(confirmAction.id);
    if (confirmAction.type === 'suspicious') await markSuspicious(confirmAction.id);
    setShowConfirm(false);
    setConfirmAction(null);
  };

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
            <h1 className="text-xl font-bold text-foreground-100">Sesiones Activas</h1>
            <p className="text-sm text-foreground-500 mt-1">Monitoreo de sesiones activas, riesgo y control de acceso.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Sesiones activas', value: activeCount, icon: 'ri-user-follow-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Total sesiones', value: sessions.length, icon: 'ri-group-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Riesgo alto/critico', value: criticalCount, icon: 'ri-alert-line', bg: 'bg-red-500/10', text: 'text-red-400' },
            { label: 'Sesiones revocadas', value: sessions.filter((s) => s.status === 'revoked').length, icon: 'ri-shield-flash-line', bg: 'bg-amber-500/10', text: 'text-amber-400' },
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
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por usuario, email o IP..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
              <option value="expired">Expirada</option>
              <option value="revoked">Revocada</option>
            </select>
            <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los riesgos</option>
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
              <option value="critical">Critico</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          {error && (
            <div className="flex items-center gap-2 px-5 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Usuario</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">IP / Ubicacion</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Dispositivo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Ultima actividad</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Riesgo</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((session) => {
                  const st = statusConfig[session.status] || statusConfig.active;
                  const rs = riskConfig[session.risk] || riskConfig.low;
                  return (
                    <tr key={session.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-foreground-200">{session.user_name}</p>
                          <p className="text-2xs text-foreground-600">{session.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-foreground-300">{session.role}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <code className="text-xs text-foreground-400 font-mono">{session.ip_address}</code>
                          <p className="text-2xs text-foreground-600">{session.country}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-xs text-foreground-400">{session.device}</p>
                          <p className="text-2xs text-foreground-600">{session.browser}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-foreground-500 whitespace-nowrap">
                          {new Date(session.last_activity).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${st.badgeBg} ${st.badgeText} border border-current/10`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                          {session.status === 'active' ? 'Activa' : session.status === 'inactive' ? 'Inactiva' : session.status === 'expired' ? 'Expirada' : 'Revocada'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${rs.badgeBg} ${rs.badgeText} border border-current/10`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`}></span>
                          {session.risk.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedSession(session)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Ver detalle">
                            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-eye-line text-sm"></i></span>
                          </button>
                          {session.status === 'active' && (
                            <button onClick={() => handleAction('revoke', session)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Revocar sesion">
                              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-shut-down-line text-sm"></i></span>
                            </button>
                          )}
                          {session.risk !== 'critical' && session.status === 'active' && (
                            <button onClick={() => handleAction('suspicious', session)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="Marcar sospechosa">
                              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-spy-line text-sm"></i></span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-user-follow-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">No se encontraron sesiones</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-secondary-500/10">
            <span className="text-xs text-foreground-600">{filtered.length} de {sessions.length} sesiones</span>
          </div>
        </div>

        {/* Session detail drawer */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
            <div className="relative w-full max-w-md bg-background-50 border-l border-secondary-500/10 h-full overflow-y-auto animate-slide-in-right">
              <div className="sticky top-0 z-10 bg-background-50 border-b border-secondary-500/10 p-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground-200">Detalle de sesion</h2>
                <button onClick={() => setSelectedSession(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-accent-500/20 border border-accent-500/25 flex items-center justify-center">
                    <span className="text-accent-400 text-lg font-bold">{selectedSession.user_name[0]}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground-200">{selectedSession.user_name}</h3>
                    <p className="text-xs text-foreground-500">{selectedSession.email}</p>
                  </div>
                </div>

                <div className="glass-panel rounded-xl p-4 space-y-3">
                  {[
                    { label: 'Rol', value: selectedSession.role },
                    { label: 'Direccion IP', value: selectedSession.ip_address },
                    { label: 'Pais', value: selectedSession.country },
                    { label: 'Dispositivo', value: selectedSession.device },
                    { label: 'Navegador', value: selectedSession.browser },
                    { label: 'Ultima actividad', value: new Date(selectedSession.last_activity).toLocaleString('es') },
                    { label: 'Estado', value: selectedSession.status === 'active' ? 'Activa' : selectedSession.status === 'inactive' ? 'Inactiva' : selectedSession.status === 'expired' ? 'Expirada' : 'Revocada' },
                    { label: 'Riesgo', value: selectedSession.risk.toUpperCase() },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4">
                      <span className="text-xs text-foreground-500 shrink-0">{row.label}</span>
                      <span className="text-xs text-foreground-300 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>

                {selectedSession.status === 'active' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => { handleAction('revoke', selectedSession); setSelectedSession(null); }}
                      className="w-full flex items-center gap-2 h-9 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <span className="w-4 h-4 flex items-center justify-center"><i className="ri-shut-down-line text-sm"></i></span>
                      Revocar sesion
                    </button>
                    <button
                      onClick={() => { handleAction('suspicious', selectedSession); setSelectedSession(null); }}
                      className="w-full flex items-center gap-2 h-9 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <span className="w-4 h-4 flex items-center justify-center"><i className="ri-spy-line text-sm"></i></span>
                      Marcar como sospechosa
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm action modal */}
      {showConfirm && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              confirmAction.type === 'revoke' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <i className={`text-2xl ${confirmAction.type === 'revoke' ? 'ri-shut-down-line text-red-400' : 'ri-spy-line text-amber-400'}`}></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">
              {confirmAction.type === 'revoke' ? 'Revocar sesion' : 'Marcar como sospechosa'}
            </h3>
            <p className="text-sm text-foreground-500 mb-6">
              {confirmAction.type === 'revoke'
                ? 'El usuario debera iniciar sesion nuevamente.'
                : 'La sesion sera marcada para revision de seguridad.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowConfirm(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button
                onClick={executeAction}
                className={`h-9 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  confirmAction.type === 'revoke'
                    ? 'bg-red-500 text-foreground-50 hover:bg-red-600'
                    : 'bg-amber-500 text-foreground-950 hover:bg-amber-400'
                }`}
              >
                {confirmAction.type === 'revoke' ? 'Revocar' : 'Marcar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}