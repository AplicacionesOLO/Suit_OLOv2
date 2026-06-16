import { useState, useMemo, useEffect, useCallback } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { fetchUserAccesses, updateAccessStatus, type AccessWithDetails } from '@/services/security/accessService';

const statusCfg: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  active: { label: 'Asignada', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  pending: { label: 'Pendiente', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  revoked: { label: 'Revocada', dot: 'bg-red-400', bg: 'bg-red-500/10', text: 'text-red-400' },
};

export default function AssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [accesses, setAccesses] = useState<AccessWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchUserAccesses();
    if (result.error) {
      setError(result.error.message);
    } else {
      setAccesses(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    const result = await updateAccessStatus(id, 'revoked');
    if (!result.error) {
      setAccesses((prev) => prev.map((a) => a.id === id ? { ...a, access_status: 'revoked' } : a));
    }
    setActionLoading(null);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const result = await updateAccessStatus(id, 'active');
    if (!result.error) {
      setAccesses((prev) => prev.map((a) => a.id === id ? { ...a, access_status: 'active' } : a));
    }
    setActionLoading(null);
  };

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
    return result;
  }, [searchQuery, filterStatus, accesses]);

  const stats = useMemo(() => ({
    assigned: accesses.filter((a) => a.access_status === 'active').length,
    pending: accesses.filter((a) => a.access_status === 'pending').length,
    revoked: accesses.filter((a) => a.access_status === 'revoked').length,
    total: accesses.length,
  }), [accesses]);

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
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
            <h1 className="text-xl font-bold text-foreground-100">Asignacion de Aplicaciones</h1>
            <p className="text-sm text-foreground-500 mt-1">Administra que aplicaciones estan autorizadas para cada usuario.</p>
          </div>
          {error && (
            <button onClick={loadData} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line text-sm"></i></span>
              Reintentar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Asignadas', value: stats.assigned, color: 'emerald' },
            { label: 'Pendientes', value: stats.pending, color: 'amber' },
            { label: 'Revocadas', value: stats.revoked, color: 'red' },
            { label: 'Total', value: stats.total, color: 'accent' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-4">
              <div className="text-lg font-bold text-foreground-100">{stat.value}</div>
              <div className={`text-2xs text-${stat.color}-400 mt-0.5`}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar asignaciones..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="active">Asignada</option>
              <option value="pending">Pendiente</option>
              <option value="revoked">Revocada</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-link-unlink text-foreground-500 text-xl"></i>
              </span>
              <p className="text-sm text-foreground-500">Sin datos disponibles</p>
              <p className="text-xs text-foreground-600 mt-1">No se encontraron asignaciones de aplicaciones.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-500/10">
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Usuario</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Aplicacion</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Instancia</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const st = statusCfg[a.access_status] || statusCfg.active;
                    return (
                      <tr key={a.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-foreground-200">{a.user_name || '—'}</p>
                            <p className="text-2xs text-foreground-600">{a.user_email || '—'}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {a.application_icon && (
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center`}>
                                <i className={`${a.application_icon} text-sm`}></i>
                              </span>
                            )}
                            <div>
                              <p className="text-sm text-foreground-300">{a.application_name || '—'}</p>
                              {a.application_code && <p className="text-2xs text-foreground-600 font-mono">{a.application_code}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-2xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/15">{a.role_name || 'Usuario'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-foreground-400">{a.instance_name || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {a.access_status === 'pending' && (
                              <button
                                onClick={() => handleApprove(a.id)}
                                disabled={actionLoading === a.id}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                title="Aprobar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-check-line text-sm"></i></span>
                              </button>
                            )}
                            {a.access_status === 'active' && (
                              <button
                                onClick={() => handleRevoke(a.id)}
                                disabled={actionLoading === a.id}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Revocar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span>
                              </button>
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
            <span className="text-xs text-foreground-600">{filtered.length} asignaciones</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}