import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useRoles } from '@/hooks/useRoles';

const levelLabels: Record<number, string> = {
  100: 'Super Admin', 80: 'Tenant Admin', 60: 'Country Admin',
  50: 'Auditor', 40: 'Warehouse Admin', 30: 'Client Admin',
  10: 'User',
};

const levelColors: Record<number, { bg: string; text: string; border: string }> = {
  100: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
  80: { bg: 'bg-accent-500/10', text: 'text-accent-400', border: 'border-accent-500/20' },
  60: { bg: 'bg-secondary-500/10', text: 'text-secondary-400', border: 'border-secondary-500/20' },
  50: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  40: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  30: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  10: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export default function RolesPage() {
  const { roles, loading, addRole, editRole } = useRoles();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', description: '', level: 10 });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
    setFormData({ id: '', name: '', code: '', description: '', level: 10 });
    setFormError('');
    setEditing(false);
    setShowModal(true);
  };

  const openEdit = (role: typeof roles[0]) => {
    setFormData({ id: role.id, name: role.name, code: role.code, description: role.description || '', level: role.level });
    setFormError('');
    setEditing(true);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Nombre y codigo son requeridos');
      return;
    }
    setSaving(true);
    setFormError('');
    const result = editing
      ? await editRole(formData.id, { name: formData.name.trim(), code: formData.code.trim().toUpperCase(), description: formData.description.trim(), level: formData.level })
      : await addRole({ name: formData.name.trim(), code: formData.code.trim().toUpperCase(), description: formData.description.trim(), level: formData.level });
    setSaving(false);
    if (result.error) { setFormError(result.error); return; }
    setShowModal(false);
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
            <h1 className="text-xl font-bold text-foreground-100">Roles</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona los roles del sistema. Los roles definen el nivel jerarquico de acceso.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Nuevo rol
          </button>
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Codigo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Nivel</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Usuarios</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Perfiles</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Creado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((role) => {
                  const lc = levelColors[role.level] || levelColors[10];
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
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-400">{role.profile_count}</span></td>
                      <td className="px-5 py-3.5"><span className="text-xs text-foreground-500">{new Date(role.created_at).toLocaleDateString()}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(role)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span></button>
                          {!role.is_system && (
                            <button onClick={() => setConfirmDelete(role.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Eliminar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span></button>
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
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">{editing ? 'Editar rol' : 'Nuevo rol'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Manager Regional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Codigo</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="MANAGER_REG" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Descripcion</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full bg-background-100 border border-secondary-500/20 rounded-lg px-3 py-2 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all resize-none" placeholder="Describe el proposito de este rol..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nivel jerarquico</label>
                <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                  {Object.entries(levelLabels).map(([k, v]) => <option key={k} value={k}>{v} (Nivel {k})</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
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
            <h3 className="text-base font-semibold text-foreground-200 mb-2">Confirmar eliminacion</h3>
            <p className="text-sm text-foreground-500 mb-6">Esta accion desactivara el rol y no podra ser usado. Los usuarios asociados perderan sus permisos.</p>
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