import { useState, useMemo, useEffect, useCallback } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import {
  fetchUserAccesses,
  fetchPlatformUsers,
  createUserAccess,
  revokeUserAccess,
  reactivateUserAccess,
  type AccessWithDetails,
  type PlatformUserBrief,
} from '@/services/security/accessService';
import { fetchApplications, fetchInstances, type Application, type AppInstance } from '@/services/applications/applicationsService';
import { supabase } from '@/services/supabase/client';

const statusCfg: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  assigned: { label: 'Asignada', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  pending: { label: 'Pendiente', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  revoked: { label: 'Revocada', dot: 'bg-red-400', bg: 'bg-red-500/10', text: 'text-red-400' },
  expired: { label: 'Expirada', dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-400' },
};

export default function AssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [accesses, setAccesses] = useState<AccessWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<PlatformUserBrief[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    user_id: '',
    application_id: '',
    instance_id: '',
    access_status: 'assigned',
    role_id: '',
    expires_at: '',
  });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserAccesses();
      if (result.error) { setError(result.error); return; }
      setAccesses(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreateModal = async () => {
    setFormData({ user_id: '', application_id: '', instance_id: '', access_status: 'assigned', role_id: '', expires_at: '' });
    setFormError('');
    setFormSuccess('');
    setFormSaving(false);

    try {
      const [usersRes, appsRes, instancesRes] = await Promise.all([
        fetchPlatformUsers(),
        fetchApplications(),
        fetchInstances(),
      ]);
      setUsers(usersRes.data.filter((u) => u.status === 'active'));
      setApplications(appsRes.data.filter((a) => a.deleted_at === null && a.status === 'active'));
      setInstances(instancesRes.data.filter((i) => i.deleted_at === null && i.status === 'active'));

      const { data: rolesData } = await supabase.from('roles').select('id, name').order('name');
      setRoles(rolesData || []);
    } catch {
      // silent
    }

    setShowModal(true);
  };

  const filteredInstances = useMemo(() => {
    if (!formData.application_id) return [];
    return instances.filter((i) => i.application_id === formData.application_id);
  }, [instances, formData.application_id]);

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    const result = await revokeUserAccess(id);
    if (!result.error) {
      setAccesses((prev) => prev.map((a) => a.id === id ? { ...a, access_status: 'revoked', revoked_at: new Date().toISOString() } : a));
    }
    setActionLoading(null);
  };

  const handleReactivate = async (id: string) => {
    setActionLoading(id);
    const result = await reactivateUserAccess(id);
    if (!result.error) {
      setAccesses((prev) => prev.map((a) => a.id === id ? { ...a, access_status: 'assigned', revoked_at: null } : a));
    }
    setActionLoading(null);
  };

  const handleSubmit = async () => {
    if (!formData.user_id) { setFormError('Selecciona un usuario'); return; }
    if (!formData.application_id) { setFormError('Selecciona una aplicacion'); return; }
    setFormError('');
    setFormSaving(true);

    const result = await createUserAccess({
      user_id: formData.user_id,
      application_id: formData.application_id,
      instance_id: formData.instance_id || null,
      access_status: formData.access_status,
      role_id: formData.role_id || null,
      expires_at: formData.expires_at || null,
    });

    setFormSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setFormSuccess('Asignacion creada correctamente');
    await loadData();

    setTimeout(() => {
      setShowModal(false);
      setFormSuccess('');
    }, 1200);
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
    assigned: accesses.filter((a) => a.access_status === 'assigned').length,
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
          <div className="flex items-center gap-2">
            {error && (
              <button onClick={loadData} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line text-sm"></i></span>
                Reintentar
              </button>
            )}
            <button onClick={openCreateModal} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
              Nueva asignacion
            </button>
          </div>
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
              <option value="assigned">Asignada</option>
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
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const st = statusCfg[a.access_status] || statusCfg.assigned;
                    const dateLabel = a.access_status === 'revoked' ? a.revoked_at : a.granted_at;
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
                              <span className="w-6 h-6 rounded-md flex items-center justify-center">
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
                          <span className="px-2 py-0.5 rounded text-2xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/15">{a.role_name || 'Sin rol'}</span>
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
                          <span className="text-xs text-foreground-500">{dateLabel ? new Date(dateLabel).toLocaleDateString() : '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {a.access_status === 'assigned' && (
                              <button
                                onClick={() => handleRevoke(a.id)}
                                disabled={actionLoading === a.id}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Revocar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span>
                              </button>
                            )}
                            {a.access_status === 'revoked' && (
                              <button
                                onClick={() => handleReactivate(a.id)}
                                disabled={actionLoading === a.id}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                title="Reactivar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line text-sm"></i></span>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">Nueva Asignacion</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-4">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-check-line"></i></span>
                {formSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Usuario *</label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'} ({u.email || 'sin email'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Aplicacion *</label>
                <select
                  value={formData.application_id}
                  onChange={(e) => setFormData({ ...formData, application_id: e.target.value, instance_id: '' })}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                >
                  <option value="">Seleccionar aplicacion...</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>{app.name} ({app.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Instancia</label>
                <select
                  value={formData.instance_id}
                  onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                  disabled={!formData.application_id}
                >
                  <option value="">Sin instancia (acceso general)</option>
                  {filteredInstances.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.instance_name}</option>
                  ))}
                </select>
                {formData.application_id && filteredInstances.length === 0 && (
                  <p className="text-2xs text-foreground-600 mt-1">No hay instancias activas para esta aplicacion.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Estado inicial</label>
                  <select
                    value={formData.access_status}
                    onChange={(e) => setFormData({ ...formData, access_status: e.target.value })}
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                  >
                    <option value="assigned">Asignada</option>
                    <option value="pending">Pendiente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Rol</label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                  >
                    <option value="">Sin rol especifico</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Fecha de expiracion (opcional)</label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={formSaving}
                className="h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50"
              >
                {formSaving ? 'Creando...' : 'Crear asignacion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}