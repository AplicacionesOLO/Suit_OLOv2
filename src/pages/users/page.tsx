import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useUsers } from '@/hooks/useUsers';
import type { PlatformUserFull, CreateUserInput, UpdateUserInput } from '@/services/auth/usersService';

export default function UsersPage() {
  const { users, tenants, roles, countries, warehouses, clients, loading, error, addUser, editUser, removeUser, refresh } = useUsers();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUserFull | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlatformUserFull | null>(null);
  const [formData, setFormData] = useState({ email: '', tenant_id: '', role_id: '', country_id: '', warehouse_id: '', client_id: '', first_name: '', last_name: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filteredCountries = useMemo(() => {
    if (!formData.tenant_id) return [];
    return countries.filter((c) => c.tenant_id === formData.tenant_id);
  }, [countries, formData.tenant_id]);

  const filteredWarehouses = useMemo(() => {
    if (!formData.country_id) return [];
    return warehouses.filter((w) => w.country_id === formData.country_id);
  }, [warehouses, formData.country_id]);

  const filteredClients = useMemo(() => {
    if (!formData.warehouse_id) return [];
    return clients.filter((c) => c.warehouse_id === formData.warehouse_id);
  }, [clients, formData.warehouse_id]);

  const filtered = useMemo(() => {
    let result = users;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) => (u.email || '').toLowerCase().includes(q) || (u.first_name || '').toLowerCase().includes(q) || (u.last_name || '').toLowerCase().includes(q));
    }
    if (filterRole) result = result.filter((u) => u.role_id === filterRole);
    if (filterStatus) result = result.filter((u) => u.status === filterStatus);
    return result;
  }, [users, searchQuery, filterRole, filterStatus]);

  const resetForm = () => {
    setFormData({ email: '', tenant_id: '', role_id: '', country_id: '', warehouse_id: '', client_id: '', first_name: '', last_name: '' });
    setFormError('');
    setEditingUser(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (user: PlatformUserFull) => {
    setFormData({
      email: user.email || '',
      tenant_id: user.tenant_id || '',
      role_id: user.role_id || '',
      country_id: user.country_id || '',
      warehouse_id: user.warehouse_id || '',
      client_id: user.client_id || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
    });
    setFormError('');
    setEditingUser(user);
    setShowModal(true);
  };

  const handleTenantChange = (tid: string) => {
    setFormData({ ...formData, tenant_id: tid, country_id: '', warehouse_id: '', client_id: '' });
  };

  const handleCountryChange = (cid: string) => {
    setFormData({ ...formData, country_id: cid, warehouse_id: '', client_id: '' });
  };

  const handleWarehouseChange = (wid: string) => {
    setFormData({ ...formData, warehouse_id: wid, client_id: '' });
  };

  const handleSave = async () => {
    if (!formData.email.trim()) { setFormError('El email es requerido'); return; }
    if (!formData.tenant_id) { setFormError('Selecciona un tenant'); return; }
    if (!formData.role_id) { setFormError('Selecciona un rol'); return; }

    setSaving(true);
    setFormError('');

    if (editingUser) {
      const update: UpdateUserInput = {
        role_id: formData.role_id,
        country_id: formData.country_id || undefined,
        warehouse_id: formData.warehouse_id || undefined,
        client_id: formData.client_id || undefined,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
      };
      const result = await editUser(editingUser.id, update);
      setSaving(false);
      if (result.error) { setFormError(result.error); return; }
    } else {
      const input: CreateUserInput = {
        email: formData.email.trim(),
        tenant_id: formData.tenant_id,
        role_id: formData.role_id,
        country_id: formData.country_id || undefined,
        warehouse_id: formData.warehouse_id || undefined,
        client_id: formData.client_id || undefined,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
      };
      const result = await addUser(input);
      setSaving(false);
      if (result.error) { setFormError(result.error); return; }
    }
    setShowModal(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await removeUser(confirmDelete.id);
    setConfirmDelete(null);
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
      case 'inactive': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'suspended': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20';
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Usuarios</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona los usuarios de la plataforma. Asigna roles, tenants y jerarquia operativa.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-user-add-line text-base"></i></span>
            Nuevo usuario
          </button>
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
            { label: 'Total usuarios', value: users.length, icon: 'ri-user-line', bg: 'bg-primary-500/10', textColor: 'text-primary-400' },
            { label: 'Activos', value: users.filter((u) => u.status === 'active').length, icon: 'ri-checkbox-circle-line', bg: 'bg-emerald-500/10', textColor: 'text-emerald-400' },
            { label: 'Pendientes', value: users.filter((u) => u.status === 'pending').length, icon: 'ri-time-line', bg: 'bg-amber-500/10', textColor: 'text-amber-400' },
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
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por email o nombre..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los roles</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="pending">Pendiente</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>

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
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${roleLevelBadge(user.role_level || 0)}`}>
                          <span className="text-xs font-semibold">{user.first_name ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}` : (user.email || '?')[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground-200">{user.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Sin nombre'}</p>
                          {user.tenant_context_override && (
                            <p className="text-2xs text-amber-400 mt-0.5">Contexto: {user.tenant_name}</p>
                          )}
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
                        {user.status === 'active' ? 'Activo' : user.status === 'pending' ? 'Pendiente' : user.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-foreground-500">{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(user)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar">
                          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span>
                        </button>
                        <button onClick={() => setConfirmDelete(user)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Eliminar">
                          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-user-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">No se encontraron usuarios</p>
                {users.length === 0 && (
                  <p className="text-xs text-foreground-600 mt-1">Crea el primer usuario para comenzar.</p>
                )}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {users.length} usuarios</span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
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
              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Email <span className="text-red-400">*</span></label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="usuario@empresa.com" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                  <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Alejandro" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Apellido</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Rojas" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tenant <span className="text-red-400">*</span></label>
                  <select value={formData.tenant_id} onChange={(e) => handleTenantChange(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                    <option value="">Seleccionar tenant</option>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Rol <span className="text-red-400">*</span></label>
                  <select value={formData.role_id} onChange={(e) => setFormData({ ...formData, role_id: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                    <option value="">Seleccionar rol</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name} (Nivel {r.level})</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-secondary-500/10 pt-4">
                <p className="text-xs font-medium text-foreground-400 mb-3">Jerarquia operativa (opcional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Pais</label>
                    <select value={formData.country_id} onChange={(e) => handleCountryChange(e.target.value)} disabled={!formData.tenant_id} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40">
                      <option value="">Sin asignar</option>
                      {filteredCountries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Almacen</label>
                    <select value={formData.warehouse_id} onChange={(e) => handleWarehouseChange(e.target.value)} disabled={!formData.country_id} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40">
                      <option value="">Sin asignar</option>
                      {filteredWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Cliente</label>
                    <select value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })} disabled={!formData.warehouse_id} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40">
                      <option value="">Sin asignar</option>
                      {filteredClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {!editingUser && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-information-line"></i></span>
                  El usuario se creara con estado <strong>Pendiente</strong>. Debera registrarse en la plataforma para activarse.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </AppLayout>
  );
}