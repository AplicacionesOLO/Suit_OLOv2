import { useState, useMemo, useCallback } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useUsers } from '@/hooks/useUsers';
import { useSuitePermissions } from '@/hooks/useSuitePermissions';
import type { PlatformUserFull, CreateInvitationInput } from '@/services/auth/usersService';
import MultiSelect from '@/components/base/MultiSelect';
import EditUserModal from './components/EditUserModal';

type Tab = 'active' | 'invitations';

export default function UsersPage() {
  const { users, invitations, tenants, roles, countries, warehouses, clients, loading, error, sendInvitation, cancelInvitation, editUser, removeUser, refresh } = useUsers();
  const { can } = useSuitePermissions();
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUserFull | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlatformUserFull | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [inviteForm, setInviteForm] = useState<CreateInvitationInput>({
    email: '', tenant_id: '', role_id: '',
    country_id: '', warehouse_id: '', client_id: '',
    first_name: '', last_name: '',
    scope_tenants: [], scope_countries: [], scope_warehouses: [], scope_clients: [],
    scope_all_tenants: false, scope_all_countries: false,
    scope_all_warehouses: false, scope_all_clients: false,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const filteredCountries = useMemo(() => {
    if (!inviteForm.tenant_id) return [];
    const tenant = tenants.find((t) => t.id === inviteForm.tenant_id);
    const tenantCountryId = tenant?.country_id;
    if (!tenantCountryId) return [];
    return countries.filter((c) => c.id === tenantCountryId);
  }, [countries, tenants, inviteForm.tenant_id]);

  const filteredWarehouses = useMemo(() => {
    if (!inviteForm.tenant_id) return [];
    return warehouses.filter((w) => w.tenant_id === inviteForm.tenant_id);
  }, [warehouses, inviteForm.tenant_id]);

  const filteredClients = useMemo(() => {
    if (!inviteForm.warehouse_id) return [];
    return clients.filter((c) => c.warehouse_id === inviteForm.warehouse_id);
  }, [clients, inviteForm.warehouse_id]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) => (u.email || '').toLowerCase().includes(q) || (u.first_name || '').toLowerCase().includes(q) || (u.last_name || '').toLowerCase().includes(q));
    }
    if (filterRole) result = result.filter((u) => u.role_id === filterRole);
    if (filterStatus) result = result.filter((u) => u.status === filterStatus);
    return result;
  }, [users, searchQuery, filterRole, filterStatus]);

  const filteredInvitations = useMemo(() => {
    if (!searchQuery) return invitations;
    const q = searchQuery.toLowerCase();
    return invitations.filter((i) => i.email.toLowerCase().includes(q));
  }, [invitations, searchQuery]);

  const resetInviteForm = () => {
    setInviteForm({
      email: '', tenant_id: '', role_id: '',
      country_id: '', warehouse_id: '', client_id: '',
      first_name: '', last_name: '',
      scope_tenants: [], scope_countries: [], scope_warehouses: [], scope_clients: [],
      scope_all_tenants: false, scope_all_countries: false,
      scope_all_warehouses: false, scope_all_clients: false,
    });
    setFormError('');
  };

  const openInvite = () => {
    resetInviteForm();
    setShowInviteModal(true);
  };

  const openEdit = (user: PlatformUserFull) => {
    setEditingUser(user);
  };

  const handleInviteTenantChange = (tid: string) => {
    setInviteForm({ ...inviteForm, tenant_id: tid, country_id: '', warehouse_id: '', client_id: '' });
  };
  const handleInviteCountryChange = (cid: string) => {
    setInviteForm({ ...inviteForm, country_id: cid, warehouse_id: '', client_id: '' });
  };
  const handleInviteWarehouseChange = (wid: string) => {
    setInviteForm({ ...inviteForm, warehouse_id: wid, client_id: '' });
  };

  // Helpers for multi-select options
  const tenantOptions = tenants.map((t) => ({ id: t.id, label: t.name }));
  const countryOptions = useMemo(() => {
    if (!inviteForm.tenant_id) return [];
    return countries.filter((c) => c.tenant_id === inviteForm.tenant_id).map((c) => ({ id: c.id, label: c.name }));
  }, [countries, inviteForm.tenant_id]);
  const warehouseOptions = useMemo(() => {
    if (!inviteForm.tenant_id) return [];
    const countrySet = new Set<string>([inviteForm.country_id, ...(inviteForm.scope_countries || [])].filter(Boolean));
    return warehouses.filter((w) => countrySet.has(w.country_id)).map((w) => ({ id: w.id, label: w.name }));
  }, [warehouses, inviteForm.tenant_id, inviteForm.country_id, inviteForm.scope_countries]);
  const clientOptions = useMemo(() => {
    if (!inviteForm.tenant_id) return [];
    const warehouseSet = new Set<string>([inviteForm.warehouse_id, ...(inviteForm.scope_warehouses || [])].filter(Boolean));
    return clients.filter((c) => warehouseSet.has(c.warehouse_id)).map((c) => ({ id: c.id, label: c.name }));
  }, [clients, inviteForm.tenant_id, inviteForm.warehouse_id, inviteForm.scope_warehouses]);

  const handleSendInvitation = async () => {
    if (!inviteForm.email.trim()) { setFormError('El email es requerido'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteForm.email.trim())) { setFormError('Ingresa un email valido'); return; }
    if (!inviteForm.tenant_id) { setFormError('Selecciona un tenant'); return; }
    if (!inviteForm.role_id) { setFormError('Selecciona un rol'); return; }

    setSaving(true);
    setFormError('');
    const result = await sendInvitation(inviteForm);
    setSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setShowInviteModal(false);
    resetInviteForm();
    setActiveTab('invitations');
    showToast('success', 'Invitacion creada correctamente. El usuario podra activarse al iniciar sesion.');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await removeUser(confirmDelete.id);
    setConfirmDelete(null);
    showToast('success', 'Usuario eliminado');
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    await cancelInvitation(confirmRevoke);
    setConfirmRevoke(null);
    showToast('success', 'Invitacion revocada');
  };

  const roleLevelBadge = (level: number) => {
    if (level >= 100) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (level >= 80) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (level >= 60) return 'bg-primary-500/10 text-primary-400 border-primary-500/20';
    if (level >= 40) return 'bg-accent-500/10 text-accent-400 border-accent-500/20';
    return 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20';
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'pending_review': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'inactive': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'suspended': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'pending': return 'Pendiente';
      case 'pending_review': return 'Revision';
      case 'suspended': return 'Suspendido';
      case 'inactive': return 'Inactivo';
      default: return status;
    }
  };

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
        {toast && (
          <div className={`fixed top-20 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl animate-slide-in-right shadow-lg border ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <i className={toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}></i>
            </span>
            <span className="text-sm">{toast.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Usuarios</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona usuarios activos e invitaciones pendientes.</p>
          </div>
          {can('users', 'create') && (
            <button onClick={openInvite} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-user-add-line text-base"></i></span>
              Enviar invitacion
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-error-warning-line"></i></span>
            {error}
            <button onClick={refresh} className="ml-auto text-xs font-medium text-red-400 hover:text-red-300 underline whitespace-nowrap">Reintentar</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Usuarios activos', value: users.filter((u) => u.status === 'active').length, icon: 'ri-checkbox-circle-line', bg: 'bg-emerald-500/10', textColor: 'text-emerald-400' },
            { label: 'Pendientes revision', value: users.filter((u) => u.status === 'pending_review').length, icon: 'ri-time-line', bg: 'bg-amber-500/10', textColor: 'text-amber-400' },
            { label: 'Invitaciones enviadas', value: invitations.length, icon: 'ri-mail-send-line', bg: 'bg-accent-500/10', textColor: 'text-accent-400' },
            { label: 'Super Admins', value: users.filter((u) => (u.role_level || 0) >= 100).length, icon: 'ri-shield-star-line', bg: 'bg-red-500/10', textColor: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <i className={`${stat.icon} ${stat.textColor} text-base`}></i>
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
          {/* Tabs */}
          <div className="px-4 pt-4 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'active'
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-foreground-500 hover:text-foreground-300 hover:bg-background-200/50'
              }`}
            >
              <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5"><i className="ri-user-line text-sm"></i></span>
              Usuarios activos
              <span className="ml-1.5 text-2xs opacity-60">{users.filter((u) => u.status === 'active').length}</span>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'invitations'
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-foreground-500 hover:text-foreground-300 hover:bg-background-200/50'
              }`}
            >
              <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5"><i className="ri-mail-send-line text-sm"></i></span>
              Invitaciones pendientes
              {invitations.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-2xs font-medium">{invitations.length}</span>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={activeTab === 'active' ? 'Buscar por email o nombre...' : 'Buscar invitaciones por email...'} className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            {activeTab === 'active' && (
              <>
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
              </>
            )}
          </div>

          {/* Tab: Active Users */}
          {activeTab === 'active' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-500/10">
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Usuario</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tenant</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Jerarquia</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Ultimo acceso</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${roleLevelBadge(user.role_level || 0)}`}>
                            <span className="text-xs font-semibold">{user.first_name ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}` : (user.email || '?')[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground-200">{user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : (user.email || 'Usuario')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs text-foreground-400">{user.email || '—'}</span></td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${roleLevelBadge(user.role_level || 0)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                          {user.role_name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-300">{user.tenant_name}</span></td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-foreground-500">
                          {[user.country_name, user.warehouse_name, user.client_name].filter(Boolean).join(' › ') || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${statusBadge(user.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                          {statusLabel(user.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-foreground-500">{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {can('users', 'update') && (
                            <button onClick={() => openEdit(user)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar">
                              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span>
                            </button>
                          )}
                          {can('users', 'delete') && (
                            <button onClick={() => setConfirmDelete(user)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Eliminar">
                              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="py-16 text-center">
                  <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-user-line text-foreground-500 text-xl"></i>
                  </span>
                  <p className="text-sm text-foreground-500">No se encontraron usuarios activos</p>
                  {users.length === 0 && (
                    <p className="text-xs text-foreground-600 mt-1">Envia una invitacion para que los usuarios se registren.</p>
                  )}
                </div>
              )}
              <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
                <span className="text-xs text-foreground-600">{filteredUsers.length} de {users.length} usuarios</span>
              </div>
            </div>
          )}

          {/* Tab: Pending Invitations */}
          {activeTab === 'invitations' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-500/10">
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tenant</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Jerarquia</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Invitado por</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Expira</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <i className="ri-mail-send-line text-amber-400 text-sm"></i>
                          </div>
                          <span className="text-sm text-foreground-300">{inv.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${roleLevelBadge(inv.role_level || 0)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                          {inv.role_name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-300">{inv.tenant_name}</span></td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-foreground-500">
                          {[inv.country_name, inv.warehouse_name, inv.client_name].filter(Boolean).join(' › ') || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs text-foreground-500">{inv.invited_by_name || 'Sistema'}</span></td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-foreground-500">{new Date(inv.expires_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {can('users', 'revoke') && (
                            <button onClick={() => setConfirmRevoke(inv.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Revocar invitacion">
                              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInvitations.length === 0 && (
                <div className="py-16 text-center">
                  <span className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-mail-send-line text-amber-400 text-xl"></i>
                  </span>
                  <p className="text-sm text-foreground-500">No hay invitaciones pendientes</p>
                  <p className="text-xs text-foreground-600 mt-1">Envia una invitacion para que nuevos usuarios se unan a la plataforma.</p>
                </div>
              )}
              <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
                <span className="text-xs text-foreground-600">{filteredInvitations.length} invitaciones pendientes</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowInviteModal(false); resetInviteForm(); }} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">Enviar invitacion</h2>
              <button onClick={() => { setShowInviteModal(false); resetInviteForm(); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Email <span className="text-red-400">*</span></label>
                <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="usuario@empresa.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                  <input type="text" value={inviteForm.first_name} onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Alejandro" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Apellido</label>
                  <input type="text" value={inviteForm.last_name} onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Rojas" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tenant <span className="text-red-400">*</span></label>
                  <select value={inviteForm.tenant_id} onChange={(e) => handleInviteTenantChange(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                    <option value="">Seleccionar tenant</option>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Rol <span className="text-red-400">*</span></label>
                  <select value={inviteForm.role_id} onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                    <option value="">Seleccionar rol</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name} (Nivel {r.level})</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-secondary-500/10 pt-4">
                <p className="text-xs font-medium text-foreground-400 mb-3">Jerarquia operativa (opcional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Pais principal</label>
                    <select value={inviteForm.country_id} onChange={(e) => handleInviteCountryChange(e.target.value)} disabled={!inviteForm.tenant_id} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40">
                      <option value="">Sin asignar</option>
                      {filteredCountries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Almacen principal</label>
                    <select value={inviteForm.warehouse_id} onChange={(e) => handleInviteWarehouseChange(e.target.value)} disabled={!inviteForm.country_id} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40">
                      <option value="">Sin asignar</option>
                      {filteredWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Cliente principal</label>
                    <select value={inviteForm.client_id} onChange={(e) => setInviteForm({ ...inviteForm, client_id: e.target.value })} disabled={!inviteForm.warehouse_id} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40">
                      <option value="">Sin asignar</option>
                      {filteredClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Multi-scope section */}
              {inviteForm.tenant_id && (
                <>
                  <div className="border-t border-secondary-500/10 pt-4">
                    <p className="text-xs font-medium text-foreground-400 mb-3">Alcances adicionales</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tenants adicionales</label>
                        <MultiSelect
                          options={tenantOptions.filter((t) => t.id !== inviteForm.tenant_id)}
                          selected={inviteForm.scope_tenants || []}
                          onChange={(vals) => setInviteForm({ ...inviteForm, scope_tenants: vals })}
                          placeholder="Ninguno"
                          searchPlaceholder="Buscar tenant..."
                          emptyMessage="Sin tenants disponibles"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground-400 mb-1.5">Paises adicionales</label>
                        <MultiSelect
                          options={countryOptions.filter((c) => c.id !== inviteForm.country_id)}
                          selected={inviteForm.scope_countries || []}
                          onChange={(vals) => {
                            setInviteForm({ ...inviteForm, scope_countries: vals });
                          }}
                          placeholder="Ninguno"
                          searchPlaceholder="Buscar pais..."
                          emptyMessage={!inviteForm.tenant_id ? 'Selecciona un tenant' : 'Sin paises disponibles'}
                          disabled={!inviteForm.tenant_id}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground-400 mb-1.5">Almacenes adicionales</label>
                        <MultiSelect
                          options={warehouseOptions.filter((w) => w.id !== inviteForm.warehouse_id)}
                          selected={inviteForm.scope_warehouses || []}
                          onChange={(vals) => setInviteForm({ ...inviteForm, scope_warehouses: vals })}
                          placeholder="Ninguno"
                          searchPlaceholder="Buscar almacen..."
                          emptyMessage="Selecciona un pais para ver almacenes"
                          disabled={countryOptions.length === 0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground-400 mb-1.5">Clientes adicionales</label>
                        <MultiSelect
                          options={clientOptions.filter((c) => c.id !== inviteForm.client_id)}
                          selected={inviteForm.scope_clients || []}
                          onChange={(vals) => setInviteForm({ ...inviteForm, scope_clients: vals })}
                          placeholder="Ninguno"
                          searchPlaceholder="Buscar cliente..."
                          emptyMessage="Selecciona un almacen para ver clientes"
                          disabled={warehouseOptions.length === 0}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-secondary-500/10 pt-4">
                    <p className="text-xs font-medium text-foreground-400 mb-3">Acceso Global</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inviteForm.scope_all_tenants || false}
                          onChange={(e) => setInviteForm({ ...inviteForm, scope_all_tenants: e.target.checked })}
                          className="w-4 h-4 rounded border-secondary-500/30 bg-background-100 text-primary-500 focus:ring-primary-500/20"
                        />
                        <span className="text-sm text-foreground-400">Todos los tenants</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inviteForm.scope_all_countries || false}
                          onChange={(e) => setInviteForm({ ...inviteForm, scope_all_countries: e.target.checked })}
                          className="w-4 h-4 rounded border-secondary-500/30 bg-background-100 text-primary-500 focus:ring-primary-500/20"
                        />
                        <span className="text-sm text-foreground-400">Todos los paises</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inviteForm.scope_all_warehouses || false}
                          onChange={(e) => setInviteForm({ ...inviteForm, scope_all_warehouses: e.target.checked })}
                          className="w-4 h-4 rounded border-secondary-500/30 bg-background-100 text-primary-500 focus:ring-primary-500/20"
                        />
                        <span className="text-sm text-foreground-400">Todos los almacenes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inviteForm.scope_all_clients || false}
                          onChange={(e) => setInviteForm({ ...inviteForm, scope_all_clients: e.target.checked })}
                          className="w-4 h-4 rounded border-secondary-500/30 bg-background-100 text-primary-500 focus:ring-primary-500/20"
                        />
                        <span className="text-sm text-foreground-400">Todos los clientes</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm">
                <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-information-line"></i></span>
                Se enviara una invitacion al email ingresado. El usuario recibira sus permisos al iniciar sesion en la plataforma.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowInviteModal(false); resetInviteForm(); }} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleSendInvitation} disabled={saving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Enviando...' : 'Enviar invitacion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => { refresh(); }}
        onEditUser={editUser}
        tenants={tenants}
        roles={roles}
        countries={countries}
        warehouses={warehouses}
        clients={clients}
      />

      {/* Delete User Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-delete-bin-line text-red-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">Eliminar usuario</h3>
            <p className="text-sm text-foreground-500 mb-1">
              Estas seguro de eliminar a <strong>{confirmDelete.email || 'este usuario'}</strong>?
            </p>
            <p className="text-xs text-red-400 mb-6">Esta accion no se puede deshacer.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleDelete} className="h-9 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Invitation Modal */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmRevoke(null)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-close-circle-line text-amber-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">Revocar invitacion</h3>
            <p className="text-sm text-foreground-500 mb-6">El usuario ya no podra activarse con esta invitacion. Esta accion no se puede deshacer.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmRevoke(null)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleRevoke} className="h-9 px-4 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-sm font-medium whitespace-nowrap">Revocar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}