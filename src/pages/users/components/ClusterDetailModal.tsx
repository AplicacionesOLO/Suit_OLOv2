import { useState, useEffect, useCallback } from 'react';
import MultiSelect from '@/components/base/MultiSelect';
import {
  fetchClusterApps,
  fetchClusterUsers,
  updateCluster,
  removeAppFromCluster,
  removeUserFromCluster,
  addAppsToCluster,
  addUsersToCluster,
  assignClusterAccess,
  deleteCluster,
  type ClusterApp,
  type ClusterUser,
} from '@/services/auth/clustersService';
import type { ApplicationOption } from '@/hooks/useClusters';
import type { PlatformUserFull } from '@/services/auth/usersService';
import type { Cluster } from '@/services/auth/clustersService';
import type { AppCategory } from '@/services/applications/applicationsService';

interface ClusterDetailModalProps {
  cluster: Cluster;
  allApps: ApplicationOption[];
  allUsers: PlatformUserFull[];
  tenants: { id: string; name: string }[];
  categories: AppCategory[];
  can: (resource: string, action: string) => boolean;
  onClose: () => void;
  onChanged: () => void;
}

type DetailTab = 'apps' | 'users';

export default function ClusterDetailModal({
  cluster,
  allApps,
  allUsers,
  tenants,
  categories,
  can,
  onClose,
  onChanged,
}: ClusterDetailModalProps) {
  const [tab, setTab] = useState<DetailTab>('apps');
  const [apps, setApps] = useState<ClusterApp[]>([]);
  const [users, setUsers] = useState<ClusterUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cluster.name);
  const [editDescription, setEditDescription] = useState(cluster.description || '');
  const [savingEdit, setSavingEdit] = useState(false);

  const [showAddApps, setShowAddApps] = useState(false);
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [savingMembers, setSavingMembers] = useState(false);

  const [confirmAssign, setConfirmAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const tenantName = tenants.find((t) => t.id === cluster.tenant_id)?.name || '—';

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const [appsRes, usersRes] = await Promise.all([
      fetchClusterApps(cluster.id),
      fetchClusterUsers(cluster.id),
    ]);
    if (appsRes.error) showToast('error', appsRes.error);
    else setApps(appsRes.apps);
    if (usersRes.error) showToast('error', usersRes.error);
    else setUsers(usersRes.users);
    setLoading(false);
  }, [cluster.id, showToast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const availableApps = allApps.filter(
    (a) => a.tenant_id === cluster.tenant_id && !apps.some((ca) => ca.application_id === a.id),
  );
  const availableUsers = allUsers.filter(
    (u) => u.tenant_id === cluster.tenant_id && !users.some((cu) => cu.user_id === u.id),
  );

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showToast('error', 'El nombre es requerido');
      return;
    }
    setSavingEdit(true);
    const result = await updateCluster(cluster.id, { name: editName, description: editDescription });
    setSavingEdit(false);
    if (result.error) {
      showToast('error', result.error);
      return;
    }
    setEditing(false);
    onChanged();
    showToast('success', 'Cluster actualizado');
  };

  const handleAddApps = async () => {
    setSavingMembers(true);
    const result = await addAppsToCluster(cluster.id, cluster.tenant_id, selectedAppIds);
    setSavingMembers(false);
    if (result.error) {
      showToast('error', result.error);
      return;
    }
    setSelectedAppIds([]);
    setShowAddApps(false);
    await loadMembers();
    onChanged();
    showToast('success', `${selectedAppIds.length} aplicacion(es) agregada(s)`);
  };

  const handleAddUsers = async () => {
    setSavingMembers(true);
    const result = await addUsersToCluster(cluster.id, cluster.tenant_id, selectedUserIds);
    setSavingMembers(false);
    if (result.error) {
      showToast('error', result.error);
      return;
    }
    setSelectedUserIds([]);
    setShowAddUsers(false);
    await loadMembers();
    onChanged();
    showToast('success', `${selectedUserIds.length} usuario(s) agregado(s)`);
  };

  const handleRemoveApp = async (clusterAppId: string) => {
    const result = await removeAppFromCluster(clusterAppId);
    if (result.error) {
      showToast('error', result.error);
      return;
    }
    await loadMembers();
    onChanged();
  };

  const handleRemoveUser = async (clusterUserId: string) => {
    const result = await removeUserFromCluster(clusterUserId);
    if (result.error) {
      showToast('error', result.error);
      return;
    }
    await loadMembers();
    onChanged();
  };

  const handleAssign = async () => {
    setAssigning(true);
    const result = await assignClusterAccess(cluster.id);
    setAssigning(false);
    if (result.error) {
      showToast('error', result.error);
      return;
    }
    setConfirmAssign(false);
    const r = result.result;
    showToast(
      'success',
      r
        ? `Acceso asignado: ${r.assigned} nuevo(s) acceso(s) (${r.users} usuarios x ${r.apps} apps)`
        : 'Acceso asignado correctamente',
    );
  };

  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteCluster(cluster.id);
    setDeleting(false);
    if (result.error) {
      showToast('error', result.error);
      return;
    }
    setConfirmDelete(false);
    onChanged();
    onClose();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary-500/10 text-primary-400 border-primary-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'pending_review': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'inactive': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'suspended': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#231E20]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-panel-strong rounded-2xl w-full max-w-3xl animate-scale-in max-h-[90vh] overflow-y-auto">
        {toast && (
          <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b ${
            toast.type === 'success' ? 'bg-primary-500/10 border-primary-500/20 text-primary-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <i className={toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}></i>
            </span>
            <span className="text-sm">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-secondary-500/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                <i className="ri-stack-line text-primary-400 text-lg"></i>
              </div>
              <div className="min-w-0">
                {editing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40"
                      placeholder="Nombre del cluster"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40"
                      placeholder="Descripcion (opcional)"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={handleSaveEdit} disabled={savingEdit} className="h-8 px-3 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 text-xs font-medium whitespace-nowrap disabled:opacity-50">
                        {savingEdit ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => { setEditing(false); setEditName(cluster.name); setEditDescription(cluster.description || ''); }} className="h-8 px-3 rounded-lg border border-secondary-500/20 text-xs text-foreground-400 hover:text-foreground-200 whitespace-nowrap">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground-100 truncate">{cluster.name}</h2>
                      {can('users', 'update') && (
                        <button onClick={() => { setEditName(cluster.name); setEditDescription(cluster.description || ''); setEditing(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar">
                          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span>
                        </button>
                      )}
                    </div>
                    {cluster.description && <p className="text-sm text-foreground-500 mt-0.5">{cluster.description}</p>}
                    <p className="text-xs text-foreground-600 mt-1">Tenant: {tenantName}</p>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all shrink-0">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary-500/10 border border-secondary-500/20">
              <span className="w-4 h-4 flex items-center justify-center text-secondary-400"><i className="ri-apps-2-line text-sm"></i></span>
              <span className="text-xs text-secondary-300">{apps.length} apps</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-500/10 border border-accent-500/20">
              <span className="w-4 h-4 flex items-center justify-center text-accent-400"><i className="ri-user-line text-sm"></i></span>
              <span className="text-xs text-accent-300">{users.length} usuarios</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex items-center gap-1">
          <button
            onClick={() => setTab('apps')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === 'apps' ? 'bg-primary-500/10 text-primary-400' : 'text-foreground-500 hover:text-foreground-300 hover:bg-background-200/50'
            }`}
          >
            <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5"><i className="ri-apps-2-line text-sm"></i></span>
            Aplicaciones
            <span className="ml-1.5 text-2xs opacity-60">{apps.length}</span>
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === 'users' ? 'bg-primary-500/10 text-primary-400' : 'text-foreground-500 hover:text-foreground-300 hover:bg-background-200/50'
            }`}
          >
            <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5"><i className="ri-user-line text-sm"></i></span>
            Usuarios
            <span className="ml-1.5 text-2xs opacity-60">{users.length}</span>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-12 bg-background-100 rounded-lg" />
              <div className="h-12 bg-background-100 rounded-lg" />
              <div className="h-12 bg-background-100 rounded-lg" />
            </div>
          ) : tab === 'apps' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-foreground-500">Aplicaciones incluidas en este cluster</p>
                {can('users', 'update') && (
                  <button onClick={() => { setSelectedAppIds([]); setShowAddApps(!showAddApps); setShowAddUsers(false); }} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-secondary-500/10 border border-secondary-500/20 text-secondary-300 hover:bg-secondary-500/20 text-xs font-medium whitespace-nowrap">
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-sm"></i></span>
                    Agregar apps
                  </button>
                )}
              </div>

              {showAddApps && (
                <div className="rounded-xl border border-secondary-500/20 bg-background-100/50 p-3 space-y-3">
                  <MultiSelect
                    options={availableApps.map((a) => ({ id: a.id, label: a.name, group: a.category_name || undefined }))}
                    groupOrder={categories.map((c) => c.name)}
                    selected={selectedAppIds}
                    onChange={setSelectedAppIds}
                    placeholder="Seleccionar aplicaciones..."
                    searchPlaceholder="Buscar app..."
                    emptyMessage="No hay apps disponibles para este tenant"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setShowAddApps(false)} className="h-8 px-3 rounded-lg border border-secondary-500/20 text-xs text-foreground-400 hover:text-foreground-200 whitespace-nowrap">Cancelar</button>
                    <button onClick={handleAddApps} disabled={savingMembers || selectedAppIds.length === 0} className="h-8 px-3 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 text-xs font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                      {savingMembers ? 'Agregando...' : `Agregar (${selectedAppIds.length})`}
                    </button>
                  </div>
                </div>
              )}

              {apps.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-secondary-500/20">
                  <span className="w-11 h-11 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-apps-2-line text-foreground-500 text-lg"></i>
                  </span>
                  <p className="text-sm text-foreground-500">Sin aplicaciones en este cluster</p>
                  <p className="text-xs text-foreground-600 mt-1">Agrega aplicaciones para poder asignarlas masivamente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {apps.map((app) => (
                    <div key={app.id} className="flex items-center gap-3 p-3 rounded-lg border border-secondary-500/10 bg-background-100/40">
                      <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                        <i className={`${app.icon || 'ri-apps-2-line'} text-primary-400 text-sm`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground-200 truncate">{app.name}</p>
                        <p className="text-2xs text-foreground-600 capitalize">{app.status || 'activo'}</p>
                      </div>
                      {can('users', 'update') && (
                        <button onClick={() => handleRemoveApp(app.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Quitar app">
                          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-foreground-500">Usuarios incluidos en este cluster</p>
                {can('users', 'update') && (
                  <button onClick={() => { setSelectedUserIds([]); setShowAddUsers(!showAddUsers); setShowAddApps(false); }} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-secondary-500/10 border border-secondary-500/20 text-secondary-300 hover:bg-secondary-500/20 text-xs font-medium whitespace-nowrap">
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-sm"></i></span>
                    Agregar usuarios
                  </button>
                )}
              </div>

              {showAddUsers && (
                <div className="rounded-xl border border-secondary-500/20 bg-background-100/50 p-3 space-y-3">
                  <MultiSelect
                    options={availableUsers.map((u) => ({
                      id: u.id,
                      label: u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.email || 'Usuario'),
                    }))}
                    selected={selectedUserIds}
                    onChange={setSelectedUserIds}
                    placeholder="Seleccionar usuarios..."
                    searchPlaceholder="Buscar usuario..."
                    emptyMessage="No hay usuarios disponibles para este tenant"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setShowAddUsers(false)} className="h-8 px-3 rounded-lg border border-secondary-500/20 text-xs text-foreground-400 hover:text-foreground-200 whitespace-nowrap">Cancelar</button>
                    <button onClick={handleAddUsers} disabled={savingMembers || selectedUserIds.length === 0} className="h-8 px-3 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 text-xs font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                      {savingMembers ? 'Agregando...' : `Agregar (${selectedUserIds.length})`}
                    </button>
                  </div>
                </div>
              )}

              {users.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-secondary-500/20">
                  <span className="w-11 h-11 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-user-line text-foreground-500 text-lg"></i>
                  </span>
                  <p className="text-sm text-foreground-500">Sin usuarios en este cluster</p>
                  <p className="text-xs text-foreground-600 mt-1">Agrega usuarios para asignarles las apps del cluster.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-secondary-500/10 bg-background-100/40">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${statusBadge(user.status)}`}>
                        <span className="text-xs font-semibold">
                          {user.first_name ? user.first_name[0] : (user.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground-200 truncate">
                          {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : (user.email || 'Usuario')}
                        </p>
                        <p className="text-2xs text-foreground-600 truncate">{user.email || '—'}</p>
                      </div>
                      {can('users', 'update') && (
                        <button onClick={() => handleRemoveUser(user.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Quitar usuario">
                          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-secondary-500/10 flex items-center justify-between gap-3">
          <button
            onClick={() => setConfirmDelete(true)}
            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-sm whitespace-nowrap transition-all"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span>
            Eliminar
          </button>
          <button
            onClick={() => setConfirmAssign(true)}
            disabled={apps.length === 0 || users.length === 0}
            className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap flex items-center gap-1.5"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-flashlight-line text-sm"></i></span>
            Asignar acceso masivo
          </button>
        </div>
      </div>

      {/* Assign confirm modal */}
      {confirmAssign && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#231E20]/60 backdrop-blur-sm" onClick={() => setConfirmAssign(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-flashlight-line text-primary-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">Asignar acceso masivo</h3>
            <p className="text-sm text-foreground-500 mb-2">
              Se asignaran <strong className="text-foreground-300">{apps.length} aplicaciones</strong> a <strong className="text-foreground-300">{users.length} usuarios</strong>.
            </p>
            <p className="text-xs text-foreground-600 mb-6">Los accesos ya existentes no se duplicaran.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmAssign(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleAssign} disabled={assigning} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                {assigning ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#231E20]/60 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-delete-bin-line text-red-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">Eliminar cluster</h3>
            <p className="text-sm text-foreground-500 mb-6">Se eliminara <strong>{cluster.name}</strong> y sus relaciones de apps y usuarios.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmDelete(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-9 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}