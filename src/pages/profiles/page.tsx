import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useProfiles } from '@/hooks/useProfiles';
import { useRoles } from '@/hooks/useRoles';

export default function ProfilesPage() {
  const { profiles, loading, addProfile, editProfile, duplicateProfile } = useProfiles();
  const { roles } = useRoles();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', description: '', role_id: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    let result = profiles;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (filterRole) result = result.filter((p) => p.role_id === filterRole);
    return result;
  }, [profiles, searchQuery, filterRole]);

  const openCreate = () => {
    setFormData({ id: '', name: '', code: '', description: '', role_id: '' });
    setFormError('');
    setEditing(false);
    setShowModal(true);
  };

  const openEdit = (profile: typeof profiles[0]) => {
    setFormData({ id: profile.id, name: profile.name, code: profile.code, description: profile.description || '', role_id: profile.role_id || '' });
    setFormError('');
    setEditing(true);
    setShowModal(true);
  };

  const handleCopy = async (profile: typeof profiles[0]) => {
    const newName = `${profile.name} (Copia)`;
    const newCode = `${profile.code}_COPY`;
    await duplicateProfile(profile.id, newName, newCode);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Nombre y codigo son requeridos');
      return;
    }
    setSaving(true);
    setFormError('');
    const result = editing
      ? await editProfile(formData.id, { name: formData.name.trim(), code: formData.code.trim().toUpperCase(), description: formData.description.trim(), role_id: formData.role_id || null })
      : await addProfile({ name: formData.name.trim(), code: formData.code.trim().toUpperCase(), description: formData.description.trim(), role_id: formData.role_id || null });
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
            <h1 className="text-xl font-bold text-foreground-100">Perfiles</h1>
            <p className="text-sm text-foreground-500 mt-1">Configura perfiles con permisos granulares. Cada perfil hereda de un rol y puede personalizar sus accesos.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Nuevo perfil
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total perfiles', value: profiles.length, icon: 'ri-user-settings-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Por defecto', value: profiles.filter((p) => p.is_default).length, icon: 'ri-check-double-line', bg: 'bg-accent-500/10', text: 'text-accent-400' },
            { label: 'Usuarios asignados', value: profiles.reduce((s, p) => s + p.user_count, 0), icon: 'ri-team-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
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
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar perfiles..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los roles</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Perfil</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Codigo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol base</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Usuarios</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Default</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Creado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((profile) => (
                  <tr key={profile.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-foreground-200">{profile.name}</p>
                        <p className="text-2xs text-foreground-600 mt-0.5 line-clamp-1">{profile.description}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">{profile.code}</code></td>
                    <td className="px-5 py-3.5">
                      {profile.role_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                          {profile.role_name}
                        </span>
                      ) : <span className="text-xs text-foreground-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5"><span className="text-sm font-medium text-foreground-300">{profile.user_count}</span></td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium ${profile.is_default ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-secondary-500/10 text-secondary-400 border border-secondary-500/15'}`}>
                        {profile.is_default ? 'Default' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-xs text-foreground-500">{new Date(profile.created_at).toLocaleDateString()}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(profile)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span></button>
                        <button onClick={() => handleCopy(profile)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-accent-400 hover:bg-accent-500/10 transition-all" title="Copiar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-file-copy-line text-sm"></i></span></button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Eliminar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-user-settings-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">No se encontraron perfiles</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {profiles.length} perfiles</span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">{editing ? 'Editar perfil' : 'Nuevo perfil'}</h2>
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
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Admin Operaciones" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Codigo</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="ADMIN_OPS" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Descripcion</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full bg-background-100 border border-secondary-500/20 rounded-lg px-3 py-2 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all resize-none" placeholder="Describe el proposito de este perfil..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Rol base</label>
                <select value={formData.role_id} onChange={(e) => setFormData({ ...formData, role_id: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                  <option value="">Sin rol (personalizado)</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name} {r.is_system ? '(Sistema)' : ''}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50">
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear perfil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}