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

const userStatusCfg: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Activo', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  pending_review: { label: 'Revision', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  inactive: { label: 'Inactivo', bg: 'bg-red-500/10', text: 'text-red-400' },
  suspended: { label: 'Suspendido', bg: 'bg-red-500/10', text: 'text-red-400' },
};

export default function AssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [users, setUsers] = useState<PlatformUserBrief[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected user detail panel
  const [selectedUser, setSelectedUser] = useState<PlatformUserBrief | null>(null);
  const [userAccesses, setUserAccesses] = useState<AccessWithDetails[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Assign form
  const [applications, setApplications] = useState<Application[]>([]);
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [assignForm, setAssignForm] = useState({ application_id: '', instance_id: '', access_status: 'assigned', expires_at: '' });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, tenantsRes, rolesRes] = await Promise.all([
        fetchPlatformUsers(),
        supabase.from('tenants').select('id, name').order('name'),
        supabase.from('roles').select('id, name').order('name'),
      ]);
      setUsers(usersRes.data);
      if (tenantsRes.data) setTenants(tenantsRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openUserDetail = async (user: PlatformUserBrief) => {
    setSelectedUser(user);
    setAccessLoading(true);
    setAssignForm({ application_id: '', instance_id: '', access_status: 'assigned', expires_at: '' });
    setAssignError('');
    setAssignSuccess('');

    try {
      const [accResult, appsRes, instRes] = await Promise.all([
        fetchUserAccesses(),
        fetchApplications(),
        fetchInstances(),
      ]);

      const userAccs = accResult.data.filter((a: AccessWithDetails) => a.user_id === user.id);
      setUserAccesses(userAccs);
      setApplications(appsRes.data.filter((a) => a.deleted_at === null && a.status === 'active'));
      setInstances(instRes.data.filter((i) => i.deleted_at === null && i.status === 'active'));
    } catch {
      // silent
    }
    setAccessLoading(false);
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
    setUserAccesses([]);
  };

  const filteredInstances = useMemo(() => {
    if (!assignForm.application_id) return [];
    return instances.filter((i) => i.application_id === assignForm.application_id);
  }, [instances, assignForm.application_id]);

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    const result = await revokeUserAccess(id);
    if (!result.error) {
      setUserAccesses((prev) => prev.map((a) => a.id === id ? { ...a, access_status: 'revoked', revoked_at: new Date().toISOString() } : a));
    }
    setActionLoading(null);
  };

  const handleReactivate = async (id: string) => {
    setActionLoading(id);
    const result = await reactivateUserAccess(id);
    if (!result.error) {
      setUserAccesses((prev) => prev.map((a) => a.id === id ? { ...a, access_status: 'assigned', revoked_at: null } : a));
    }
    setActionLoading(null);
  };

  const handleAssign = async () => {
    if (!assignForm.application_id) {
      setAssignError('Selecciona una aplicacion');
      return;
    }
    setAssignError('');
    setAssignSaving(true);

    const result = await createUserAccess({
      user_id: selectedUser!.id,
      application_id: assignForm.application_id,
      instance_id: assignForm.instance_id || null,
      access_status: assignForm.access_status,
      expires_at: assignForm.expires_at || null,
    });

    setAssignSaving(false);

    if (result.error) {
      setAssignError(result.error);
      return;
    }

    setAssignSuccess('Asignacion creada');
    setAssignForm({ application_id: '', instance_id: '', access_status: 'assigned', expires_at: '' });

    // Refresh accesses
    try {
      const accResult = await fetchUserAccesses();
      const userAccs = accResult.data.filter((a: AccessWithDetails) => a.user_id === selectedUser!.id);
      setUserAccesses(userAccs);
    } catch { /* */ }

    setTimeout(() => setAssignSuccess(''), 2000);
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.last_name || '').toLowerCase().includes(q)
      );
    }
    if (filterRole) result = result.filter((u) => u.role_id === filterRole);
    if (filterStatus) result = result.filter((u) => u.status === filterStatus);
    if (filterTenant) result = result.filter((u) => u.tenant_id === filterTenant);
    return result;
  }, [users, searchQuery, filterRole, filterStatus, filterTenant]);

  const getRoleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name || '—';
  const getTenantName = (tenantId: string) => tenants.find((t) => t.id === tenantId)?.name || '—';
  const getAppName = (appId: string) => applications.find((a) => a.id === appId)?.name || '—';
  const getAppIcon = (appId: string) => applications.find((a) => a.id === appId)?.icon || 'ri-apps-line';

  const appCountsByUser = useMemo(() => {
    const map: Record<string, number> = {};
    // We'll count from the accesses loaded per user - but for the main table, we show a placeholder
    // Actually, let's keep it simple since we can't load all accesses just for counts
    return map;
  }, []);

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
            <p className="text-sm text-foreground-500 mt-1">Selecciona un usuario para gestionar sus aplicaciones e instancias asignadas.</p>
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
            { label: 'Total usuarios', value: users.length, icon: 'ri-team-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Activos', value: users.filter((u) => u.status === 'active').length, icon: 'ri-checkbox-circle-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Pendientes', value: users.filter((u) => u.status === 'pending_review').length, icon: 'ri-time-line', bg: 'bg-amber-500/10', text: 'text-amber-400' },
            { label: 'Inactivos', value: users.filter((u) => u.status === 'inactive' || u.status === 'suspended').length, icon: 'ri-close-circle-line', bg: 'bg-red-500/10', text: 'text-red-400' },
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

        {/* User list with filters */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por nombre o email..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los tenants</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los roles</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="pending_review">Revision</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-user-line text-foreground-500 text-xl"></i>
              </span>
              <p className="text-sm text-foreground-500">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-500/10">
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Usuario</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tenant</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const ust = userStatusCfg[user.status] || userStatusCfg.active;
                    return (
                      <tr key={user.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                              <span className="text-accent-400 text-xs font-semibold">
                                {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                                {user.last_name?.[0]?.toUpperCase() || ''}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-foreground-200">
                              {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sin nombre'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><span className="text-xs text-foreground-400">{user.email || '—'}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm text-foreground-300">{getTenantName(user.tenant_id || '')}</span></td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">
                            {getRoleName(user.role_id || '')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium border ${ust.bg} ${ust.text}`}>
                            {ust.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => openUserDetail(user)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20 transition-all text-xs font-medium whitespace-nowrap"
                            >
                              <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-link-m"></i></span>
                              Asignar apps
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
                <span className="text-xs text-foreground-600">{filteredUsers.length} usuarios</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Side Panel */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeUserDetail} />
          <div className="relative ml-auto w-full max-w-2xl bg-background-50 border-l border-secondary-500/10 overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-background-50/95 backdrop-blur-sm border-b border-secondary-500/10 px-6 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                  <span className="text-accent-400 text-lg font-semibold">
                    {(selectedUser.first_name?.[0] || selectedUser.email?.[0] || '?').toUpperCase()}
                    {selectedUser.last_name?.[0]?.toUpperCase() || ''}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground-200">
                    {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || 'Usuario'}
                  </h2>
                  <p className="text-xs text-foreground-500">{selectedUser.email || 'Sin email'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-2xs text-primary-400">
                      <span className="w-3 h-3 flex items-center justify-center"><i className="ri-shield-user-line"></i></span>
                      {getRoleName(selectedUser.role_id || '')}
                    </span>
                    <span className="text-2xs text-foreground-600">{getTenantName(selectedUser.tenant_id || '')}</span>
                  </div>
                </div>
              </div>
              <button onClick={closeUserDetail} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Assign New Application */}
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground-200 mb-4 flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center text-primary-400"><i className="ri-add-circle-line"></i></span>
                  Asignar nueva aplicacion
                </h3>

                {assignError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-3">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
                    {assignError}
                  </div>
                )}
                {assignSuccess && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-3">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-check-line"></i></span>
                    {assignSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1">Aplicacion *</label>
                    <select
                      value={assignForm.application_id}
                      onChange={(e) => setAssignForm({ ...assignForm, application_id: e.target.value, instance_id: '' })}
                      className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                    >
                      <option value="">Seleccionar...</option>
                      {applications.map((app) => (
                        <option key={app.id} value={app.id}>{app.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1">Instancia</label>
                    <select
                      value={assignForm.instance_id}
                      onChange={(e) => setAssignForm({ ...assignForm, instance_id: e.target.value })}
                      className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                      disabled={!assignForm.application_id}
                    >
                      <option value="">Sin instancia</option>
                      {filteredInstances.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.instance_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <select
                      value={assignForm.access_status}
                      onChange={(e) => setAssignForm({ ...assignForm, access_status: e.target.value })}
                      className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-xs text-foreground-300 outline-none focus:border-primary-500/40"
                    >
                      <option value="assigned">Asignada</option>
                      <option value="pending">Pendiente</option>
                    </select>
                    <input
                      type="date"
                      value={assignForm.expires_at}
                      onChange={(e) => setAssignForm({ ...assignForm, expires_at: e.target.value })}
                      className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-xs text-foreground-300 outline-none focus:border-primary-500/40"
                      placeholder="Expira (opcional)"
                    />
                  </div>
                  <button
                    onClick={handleAssign}
                    disabled={assignSaving}
                    className="h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50"
                  >
                    {assignSaving ? 'Asignando...' : 'Asignar'}
                  </button>
                </div>
              </div>

              {/* Current Assignments */}
              <div>
                <h3 className="text-sm font-semibold text-foreground-200 mb-3">
                  Aplicaciones asignadas ({userAccesses.length})
                </h3>

                {accessLoading ? (
                  <div className="p-8 text-center">
                    <span className="w-6 h-6 flex items-center justify-center mx-auto"><i className="ri-loader-4-line animate-spin text-foreground-500"></i></span>
                  </div>
                ) : userAccesses.length === 0 ? (
                  <div className="glass-panel rounded-xl p-8 text-center">
                    <span className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center mx-auto mb-2">
                      <i className="ri-apps-line text-foreground-500 text-lg"></i>
                    </span>
                    <p className="text-sm text-foreground-500">Sin aplicaciones asignadas</p>
                    <p className="text-xs text-foreground-600 mt-0.5">Usa el formulario superior para asignar la primer aplicacion.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userAccesses.map((acc) => {
                      const st = statusCfg[acc.access_status] || statusCfg.assigned;
                      return (
                        <div key={acc.id} className="glass-panel rounded-xl p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                            <i className={`${acc.application_icon || 'ri-apps-line'} text-primary-400 text-lg`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-foreground-200">{acc.application_name || '—'}</h4>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-medium ${st.bg} ${st.text}`}>
                                <span className={`w-1 h-1 rounded-full ${st.dot}`}></span>
                                {st.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {acc.instance_name && <span className="text-xs text-foreground-500">Instancia: {acc.instance_name}</span>}
                              {acc.granted_at && <span className="text-2xs text-foreground-600">Desde {new Date(acc.granted_at).toLocaleDateString()}</span>}
                              {acc.expires_at && <span className="text-2xs text-amber-400">Expira {new Date(acc.expires_at).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {acc.access_status === 'assigned' && (
                              <button
                                onClick={() => handleRevoke(acc.id)}
                                disabled={actionLoading === acc.id}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Revocar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span>
                              </button>
                            )}
                            {acc.access_status === 'revoked' && (
                              <button
                                onClick={() => handleReactivate(acc.id)}
                                disabled={actionLoading === acc.id}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                title="Reactivar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line text-sm"></i></span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}