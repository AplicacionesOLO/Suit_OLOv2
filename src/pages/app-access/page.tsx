import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useApplicationAccess } from '@/hooks/useApplicationAccess';
import { useRoles } from '@/hooks/useRoles';

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  active: { label: 'Activo', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  pending: { label: 'Pendiente', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  revoked: { label: 'Revocado', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  expired: { label: 'Expirado', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  denied: { label: 'Denegado', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
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

export default function AppAccessPage() {
  const { accesses, loading, assignAccess, revokeAccess, approveAccess, denyAccess } = useApplicationAccess();
  const { roles } = useRoles();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ id: string; action: string } | null>(null);

  const filtered = useMemo(() => {
    let result = accesses;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) =>
        (a.user_name || '').toLowerCase().includes(q) ||
        (a.user_email || '').toLowerCase().includes(q) ||
        (a.application_name || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus) result = result.filter((a) => a.access_status === filterStatus);
    if (filterRole) result = result.filter((a) => a.role_name === filterRole);
    return result;
  }, [accesses, searchQuery, filterStatus, filterRole]);

  const handleAction = async () => {
    if (!actionConfirm) return;
    const { id, action } = actionConfirm;
    if (action === 'approve') await approveAccess(id);
    else if (action === 'revoke') await revokeAccess(id);
    else if (action === 'deny') await denyAccess(id);
    setActionConfirm(null);
  };

  const roleNames = [...new Set(accesses.map((a) => a.role_name).filter(Boolean))] as string[];

  const stats = {
    total: accesses.length,
    active: accesses.filter((a) => a.access_status === 'active').length,
    pending: accesses.filter((a) => a.access_status === 'pending').length,
    revoked: accesses.filter((a) => a.access_status === 'revoked').length,
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Aplicaciones Asignadas</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona qué usuarios pueden acceder a cada aplicación e instancia. Aprueba, revoca o deniega solicitudes.</p>
          </div>
          <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Asignar acceso
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total accesos', value: stats.total, icon: 'ri-key-2-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Activos', value: stats.active, icon: 'ri-check-double-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Pendientes', value: stats.pending, icon: 'ri-time-line', bg: 'bg-amber-500/10', text: 'text-amber-400' },
            { label: 'Revocados', value: stats.revoked, icon: 'ri-close-circle-line', bg: 'bg-red-500/10', text: 'text-red-400' },
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

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por usuario, email o app..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los roles</option>
              {roleNames.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="p-8 h-64 animate-pulse bg-background-100/50" />
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-key-2-line text-foreground-500 text-xl"></i>
              </span>
              <p className="text-sm text-foreground-500">No hay accesos registrados</p>
              <p className="text-xs text-foreground-600 mt-1">Los accesos se sincronizaran cuando se creen usuarios y asignaciones.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-500/10">
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Usuario</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Aplicacion</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Asignado</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((acc) => {
                    const st = statusConfig[acc.access_status] || statusConfig.pending;
                    const colors = getColors(acc.application_color || 'emerald');
                    return (
                      <tr key={acc.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-foreground-200">{acc.user_name || '—'}</p>
                            <p className="text-2xs text-foreground-600">{acc.user_email || '—'}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-md ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                              <i className={`${acc.application_icon || 'ri-apps-line'} ${colors.text} text-xs`}></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground-200">{acc.application_name || '—'}</p>
                              {acc.instance_name && <p className="text-2xs text-foreground-600">{acc.instance_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {acc.role_name ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">{acc.role_name}</span>
                          ) : <span className="text-xs text-foreground-600">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${st.bg} ${st.text} border ${st.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.text.replace('text-', 'bg-').replace('-400', '-400')}`}></span>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5"><span className="text-xs text-foreground-500">{acc.granted_at ? new Date(acc.granted_at).toLocaleDateString() : '—'}</span></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {acc.access_status === 'pending' && (
                              <>
                                <button onClick={() => setActionConfirm({ id: acc.id, action: 'approve' })} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Aprobar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-check-line text-sm"></i></span></button>
                                <button onClick={() => setActionConfirm({ id: acc.id, action: 'deny' })} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Denegar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-sm"></i></span></button>
                              </>
                            )}
                            {acc.access_status === 'active' && (
                              <button onClick={() => setActionConfirm({ id: acc.id, action: 'revoke' })} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Revocar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {accesses.length} accesos</span>
          </div>
        </div>
      </div>

      {/* Assign modal - placeholder */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">Asignar acceso</h2>
              <button onClick={() => setShowAssignModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Usuario</label><select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"><option value="">Seleccionar usuario...</option></select></div>
              <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Aplicacion</label><select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"><option value="">Seleccionar aplicacion...</option></select></div>
              <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Instancia (opcional)</label><select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"><option value="">Sin instancia</option></select></div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowAssignModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Asignar</button>
            </div>
          </div>
        </div>
      )}

      {/* Action confirmation */}
      {actionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActionConfirm(null)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${actionConfirm.action === 'approve' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <i className={`${actionConfirm.action === 'approve' ? 'ri-check-line text-emerald-400' : actionConfirm.action === 'revoke' ? 'ri-close-circle-line text-red-400' : 'ri-close-line text-red-400'} text-2xl`}></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">
              {actionConfirm.action === 'approve' ? 'Aprobar acceso' : actionConfirm.action === 'revoke' ? 'Revocar acceso' : 'Denegar acceso'}
            </h3>
            <p className="text-sm text-foreground-500 mb-6">
              {actionConfirm.action === 'approve' ? 'El usuario podra acceder a la aplicacion inmediatamente.' : actionConfirm.action === 'revoke' ? 'El usuario perdera el acceso a esta aplicacion.' : 'La solicitud de acceso sera rechazada.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setActionConfirm(null)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleAction} className={`h-9 px-4 rounded-lg text-sm font-medium whitespace-nowrap ${actionConfirm.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} text-white transition-colors`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}