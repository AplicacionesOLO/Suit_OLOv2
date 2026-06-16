import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useRoles } from '@/hooks/useRoles';
import { SUITE_MODULES, ALL_ACTIONS } from '@/hooks/useSuitePermissions';
import { useAuth } from '@/hooks/useAuth';
import type { RolePermissions } from '@/services/security/rolesService';

const levelLabels: Record<number, string> = {
  100: 'Super Admin', 80: 'Tenant Admin', 60: 'Country Admin',
  55: 'Auditor', 50: 'Warehouse Admin', 40: 'Analyst',
  30: 'Client Admin', 10: 'User',
};

const levelColors: Record<number, { bg: string; text: string; border: string }> = {
  100: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  80: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  60: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
  55: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  50: { bg: 'bg-accent-500/10', text: 'text-accent-400', border: 'border-accent-500/20' },
  40: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  30: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  10: { bg: 'bg-secondary-500/10', text: 'text-secondary-400', border: 'border-secondary-500/20' },
};

const moduleLabels: Record<string, string> = {
  tenants: 'Tenants', countries: 'Países', warehouses: 'Almacenes',
  clients: 'Clientes', users: 'Usuarios', categories: 'Categorías',
  applications: 'Aplicaciones', instances: 'Instancias',
  assignments: 'Asignaciones', roles: 'Roles', 'app-access': 'Apps Asignadas',
};

const moduleIcons: Record<string, string> = {
  tenants: 'ri-building-4-line', countries: 'ri-global-line',
  warehouses: 'ri-store-2-line', clients: 'ri-building-2-line',
  users: 'ri-team-line', categories: 'ri-folder-2-line',
  applications: 'ri-apps-2-line', instances: 'ri-server-line',
  assignments: 'ri-link-m', roles: 'ri-shield-user-line',
  'app-access': 'ri-shield-keyhole-line',
};

function initPermissions(): RolePermissions {
  const modules: Record<string, { menu: boolean; actions: string[] }> = {};
  SUITE_MODULES.forEach((m) => { modules[m] = { menu: false, actions: [] }; });
  return { modules };
}

export default function RolesPage() {
  const { roles, loading, addRole, editRole } = useRoles();
  const { platformUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', description: '', level: 10, permissions: initPermissions() });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'permissions'>('info');
  const [permissionsState, setPermissionsState] = useState<RolePermissions>(initPermissions());

  const isSuperAdmin = (platformUser?.role_level ?? 0) >= 100;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    let result = roles;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
    }
    if (filterLevel) result = result.filter((r) => String(r.level) === filterLevel);
    return result;
  }, [roles, searchQuery, filterLevel]);

  const openCreate = () => {
    setFormData({ id: '', name: '', code: '', description: '', level: 10, permissions: initPermissions() });
    setPermissionsState(initPermissions());
    setFormError('');
    setEditing(false);
    setActiveTab('info');
    setShowModal(true);
  };

  const openEdit = (role: typeof roles[0]) => {
    const perms = role.permissions || initPermissions();
    setFormData({ id: role.id, name: role.name, code: role.code, description: role.description || '', level: role.level, permissions: perms });
    setPermissionsState(perms);
    setFormError('');
    setEditing(true);
    setActiveTab('info');
    setShowModal(true);
  };

  const toggleMenu = (module: string) => {
    setPermissionsState((prev) => {
      const next = { modules: { ...prev.modules } };
      next.modules[module] = { ...next.modules[module], menu: !next.modules[module].menu };
      return next;
    });
  };

  const toggleAction = (module: string, action: string) => {
    setPermissionsState((prev) => {
      const next = { modules: { ...prev.modules } };
      const current = next.modules[module];
      const has = current.actions.includes(action);
      next.modules[module] = {
        ...current,
        menu: has && current.actions.length === 1 ? false : current.menu,
        actions: has ? current.actions.filter((a) => a !== action) : [...current.actions, action],
      };
      return next;
    });
  };

  const setAllForModule = (module: string, enabled: boolean) => {
    setPermissionsState((prev) => {
      const next = { modules: { ...prev.modules } };
      next.modules[module] = { menu: enabled, actions: enabled ? [...ALL_ACTIONS] : [] };
      return next;
    });
  };

  const activeCount = Object.values(permissionsState.modules).reduce((s, m) => s + m.actions.length, 0);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Nombre y código son requeridos');
      return;
    }
    setSaving(true);
    setFormError('');

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      level: formData.level,
      permissions: permissionsState,
    };

    const result = editing
      ? await editRole(formData.id, payload)
      : await addRole(payload);

    setSaving(false);
    if (result.error) { setFormError(result.error); return; }
    setShowModal(false);
    showToast('success', editing ? 'Rol y permisos actualizados correctamente' : 'Rol creado correctamente');
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
            <h1 className="text-xl font-bold text-foreground-100">Roles y Permisos</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona los roles del sistema. Cada rol define su nivel jerárquico, visibilidad de menús y acciones permitidas.</p>
          </div>
          {isSuperAdmin && (
            <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
              Nuevo rol
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total roles', value: roles.length, icon: 'ri-shield-user-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Sistema', value: roles.filter((r) => r.is_system).length, icon: 'ri-settings-3-line', bg: 'bg-accent-500/10', text: 'text-accent-400' },
            { label: 'Personalizados', value: roles.filter((r) => !r.is_system).length, icon: 'ri-user-settings-line', bg: 'bg-violet-500/10', text: 'text-violet-400' },
            { label: 'Usuarios asignados', value: roles.reduce((s, r) => s + r.user_count, 0), icon: 'ri-team-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
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
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar roles..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los niveles</option>
              {Object.entries(levelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Código</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Nivel</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Usuarios</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Permisos</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Creado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((role) => {
                  const lc = levelColors[role.level] || levelColors[10];
                  const permCount = role.permissions?.modules ? Object.values(role.permissions.modules).reduce((s: number, m: any) => s + (m.actions?.length || 0), 0) : 0;
                  return (
                    <tr key={role.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${lc.bg} border ${lc.border} flex items-center justify-center`}>
                            <i className={`ri-shield-user-line ${lc.text} text-base`}></i>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground-200">{role.name}</p>
                            <p className="text-2xs text-foreground-600 mt-0.5 line-clamp-1">{role.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">{role.code}</code></td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${lc.bg} ${lc.text} border ${lc.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${lc.text.replace('text-', 'bg-')}`}></span>
                          {levelLabels[role.level] || `Nivel ${role.level}`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${role.is_system ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          {role.is_system ? 'Sistema' : 'Personalizado'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-sm font-medium text-foreground-300">{role.user_count}</span></td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-medium ${permCount > 0 ? 'text-accent-400' : 'text-foreground-400'}`}>{permCount} acciones</span>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs text-foreground-500">{new Date(role.created_at).toLocaleDateString()}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(role)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar rol y permisos">
                            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span>
                          </button>
                          {!role.is_system && (
                            <button onClick={() => setConfirmDelete(role.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Eliminar">
                              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span>
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
                  <i className="ri-shield-user-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">No se encontraron roles</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {roles.length} roles</span>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">{editing ? `Editar: ${formData.name}` : 'Nuevo rol'}</h2>
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

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 px-1 py-1 bg-background-100 rounded-full w-fit">
              <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'info' ? 'bg-primary-500 text-foreground-50' : 'text-foreground-500 hover:text-foreground-300'}`}>
                Información
              </button>
              <button onClick={() => setActiveTab('permissions')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'permissions' ? 'bg-primary-500 text-foreground-50' : 'text-foreground-500 hover:text-foreground-300'}`}>
                Matriz de Permisos
                {activeCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-2xs">{activeCount}</span>}
              </button>
            </div>

            {activeTab === 'info' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Manager Regional" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Código</label>
                    <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="MANAGER_REG" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Descripción</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full bg-background-100 border border-secondary-500/20 rounded-lg px-3 py-2 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all resize-none" placeholder="Describe el propósito de este rol..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nivel jerárquico</label>
                  <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                    {Object.entries(levelLabels).map(([k, v]) => <option key={k} value={k}>{v} (Nivel {k})</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-foreground-400">Define qué módulos ve este rol y qué acciones puede realizar.</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-500">{activeCount} permisos activos</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SUITE_MODULES.map((module) => {
                    const mod = permissionsState.modules[module];
                    const actionCount = mod?.actions?.length || 0;
                    const isActive = actionCount > 0;

                    return (
                      <div key={module} className={`rounded-xl border p-4 transition-all ${isActive ? 'border-accent-500/25 bg-accent-500/5' : 'border-secondary-500/15 bg-background-100'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? 'bg-accent-500/15 text-accent-400' : 'bg-secondary-500/10 text-foreground-500'}`}>
                              <i className={`${moduleIcons[module] || 'ri-apps-line'} text-sm`}></i>
                            </span>
                            <span className={`text-xs font-semibold ${isActive ? 'text-foreground-200' : 'text-foreground-500'}`}>{moduleLabels[module] || module}</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={mod?.menu || false} onChange={() => toggleMenu(module)} className="sr-only peer" />
                            <div className="w-8 h-4.5 bg-secondary-500/30 rounded-full peer-checked:bg-accent-500 peer-checked:after:translate-x-3.5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all"></div>
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {ALL_ACTIONS.map((action) => {
                            const checked = mod?.actions?.includes(action) || false;
                            return (
                              <button
                                key={action}
                                onClick={() => toggleAction(module, action)}
                                className={`px-2 py-1 rounded-md text-2xs font-medium transition-all whitespace-nowrap ${
                                  checked
                                    ? 'bg-accent-500/15 text-accent-400 border border-accent-500/25'
                                    : 'bg-background-100 text-foreground-500 border border-secondary-500/20 hover:border-secondary-500/40'
                                }`}
                              >
                                {action}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-secondary-500/10">
                          <button onClick={() => setAllForModule(module, true)} className="text-2xs text-foreground-500 hover:text-accent-400 transition-colors">Todas</button>
                          <button onClick={() => setAllForModule(module, false)} className="text-2xs text-foreground-500 hover:text-red-400 transition-colors">Ninguna</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-secondary-500/10">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50">
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear rol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-red-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">Confirmar eliminación</h3>
            <p className="text-sm text-foreground-500 mb-6">Esta acción desactivará el rol. Los usuarios asociados perderán sus permisos.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={() => setConfirmDelete(null)} className="h-9 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}