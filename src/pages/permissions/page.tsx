import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { useProfiles } from '@/hooks/useProfiles';
import { SUITE_MODULES, ALL_ACTIONS } from '@/hooks/useSuitePermissions';

const MODULE_LABELS: Record<string, { label: string; icon: string; group: string }> = {
  dashboard: { label: 'Dashboard', icon: 'ri-dashboard-line', group: 'Principal' },
  catalog: { label: 'Catalogo', icon: 'ri-store-2-line', group: 'Principal' },
  tenants: { label: 'Tenants', icon: 'ri-building-4-line', group: 'Plataforma' },
  countries: { label: 'Paises', icon: 'ri-global-line', group: 'Administracion' },
  warehouses: { label: 'Almacenes', icon: 'ri-store-2-line', group: 'Administracion' },
  clients: { label: 'Clientes', icon: 'ri-building-2-line', group: 'Administracion' },
  users: { label: 'Usuarios', icon: 'ri-team-line', group: 'Administracion' },
  categories: { label: 'Categorias', icon: 'ri-folder-2-line', group: 'Aplicaciones' },
  applications: { label: 'Aplicaciones', icon: 'ri-apps-2-line', group: 'Aplicaciones' },
  instances: { label: 'Instancias', icon: 'ri-server-line', group: 'Aplicaciones' },
  assignments: { label: 'Asignaciones', icon: 'ri-link-m', group: 'Aplicaciones' },
  roles: { label: 'Roles', icon: 'ri-shield-user-line', group: 'Seguridad' },
  profiles: { label: 'Perfiles', icon: 'ri-user-settings-line', group: 'Seguridad' },
  permissions: { label: 'Matriz de Permisos', icon: 'ri-key-2-line', group: 'Seguridad' },
  'app-access': { label: 'Accesos', icon: 'ri-shield-keyhole-line', group: 'Seguridad' },
  'my-access': { label: 'Mis Accesos', icon: 'ri-user-received-line', group: 'Seguridad' },
  audit: { label: 'Auditoria', icon: 'ri-file-search-line', group: 'Seguridad' },
  'security-settings': { label: 'Config. Seguridad', icon: 'ri-shield-check-line', group: 'Seguridad' },
  profile: { label: 'Perfil', icon: 'ri-user-line', group: 'Sistema' },
  sessions: { label: 'Sesiones', icon: 'ri-user-follow-line', group: 'Sistema' },
  alerts: { label: 'Alertas', icon: 'ri-alert-fill', group: 'Sistema' },
  integration: { label: 'Integracion', icon: 'ri-plug-line', group: 'Sistema' },
};

const ACTION_COLORS: Record<string, string> = {
  view: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  create: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  update: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  delete: 'bg-red-500/10 text-red-400 border-red-500/20',
  export: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  approve: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
  revoke: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  configure: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const ACTION_ICONS: Record<string, string> = {
  view: 'ri-eye-line',
  create: 'ri-add-circle-line',
  update: 'ri-edit-line',
  delete: 'ri-delete-bin-line',
  export: 'ri-download-line',
  approve: 'ri-check-double-line',
  revoke: 'ri-close-circle-line',
  configure: 'ri-settings-3-line',
};

const groupOrder = ['Principal', 'Plataforma', 'Administracion', 'Aplicaciones', 'Seguridad', 'Sistema'];

export default function PermissionsPage() {
  const { profiles } = useProfiles();
  const {
    perms, loading, saving, error, stats,
    selectedProfileId, selectedProfileName,
    loadForProfile, toggleAction, toggleMenu, toggleAllActions, save,
  } = usePermissions();

  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(searchParams.get('profile') || '');
  const [searchMod, setSearchMod] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(groupOrder));
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const pid = searchParams.get('profile');
    if (pid && pid !== selectedId) {
      setSelectedId(pid);
      const profile = profiles.find((p) => p.id === pid);
      loadForProfile(pid, profile?.name);
    }
  }, [searchParams, profiles]);

  const handleProfileChange = (id: string) => {
    setSelectedId(id);
    if (id) {
      const profile = profiles.find((p) => p.id === id);
      loadForProfile(id, profile?.name);
    }
  };

  const toggleGroup = (g: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  };

  const groupedModules = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    const filtered = searchMod
      ? SUITE_MODULES.filter((m) => {
          const info = MODULE_LABELS[m];
          return info?.label.toLowerCase().includes(searchMod.toLowerCase());
        })
      : [...SUITE_MODULES];

    filtered.forEach((m) => {
      const group = MODULE_LABELS[m]?.group || 'Sistema';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(m);
    });
    return grouped;
  }, [searchMod]);

  const moduleGranted = (modKey: string) => {
    const mod = perms.modules[modKey];
    if (!mod) return { total: ALL_ACTIONS.length, granted: 0 };
    return { total: ALL_ACTIONS.length, granted: mod.actions.length };
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
            <h1 className="text-xl font-bold text-foreground-100">Matriz de Permisos SuiteOLO</h1>
            <p className="text-sm text-foreground-500 mt-1">Controla menus, modulos y acciones CRUD para cada perfil de la plataforma.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total acciones', value: stats.total, icon: 'ri-key-2-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Concedidas', value: stats.granted, icon: 'ri-check-double-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Menus visibles', value: stats.menus, icon: 'ri-menu-line', bg: 'bg-accent-500/10', text: 'text-accent-400' },
            { label: 'Criticos', value: stats.critical, icon: 'ri-alert-line', bg: 'bg-red-500/10', text: 'text-red-400' },
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

        {/* Controls */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
              <select
                value={selectedId}
                onChange={(e) => handleProfileChange(e.target.value)}
                className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 min-w-[220px]"
              >
                <option value="">Seleccionar perfil...</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.is_default ? '(Default)' : ''}</option>
                ))}
              </select>

              <div className="relative flex-1 max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
                <input type="text" value={searchMod} onChange={(e) => setSearchMod(e.target.value)} placeholder="Buscar modulo..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
              </div>
            </div>

            {selectedId && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={saving}
                className="flex items-center gap-2 h-9 px-5 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 shrink-0"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-loader-4-line animate-spin"></i></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-save-line"></i></span>
                    Guardar permisos
                  </>
                )}
              </button>
            )}
          </div>
          {selectedId && selectedProfileName && (
            <p className="text-xs text-foreground-600 mt-3">
              Modificando perfil: <span className="text-foreground-300 font-medium">{selectedProfileName}</span>
              {' '}· Los cambios no se aplican hasta guardar.
            </p>
          )}
          {!selectedId && (
            <p className="text-xs text-foreground-600 mt-3">
              Selecciona un perfil para comenzar a configurar sus permisos internos de SuiteOLO.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
            {error}
          </div>
        )}

        {/* Module Grid */}
        {!selectedId ? (
          <div className="glass-panel rounded-2xl p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-5">
              <i className="ri-key-2-line text-foreground-500 text-2xl"></i>
            </div>
            <h3 className="text-sm font-semibold text-foreground-300 mb-2">Selecciona un perfil</h3>
            <p className="text-xs text-foreground-500 max-w-sm mx-auto">Elige un perfil del selector superior para configurar sus permisos de acceso a los modulos de SuiteOLO.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedModules).length === 0 ? (
              <div className="glass-panel rounded-2xl p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-5">
                  <i className="ri-search-line text-foreground-500 text-2xl"></i>
                </div>
                <h3 className="text-sm font-semibold text-foreground-300 mb-2">Sin resultados</h3>
                <p className="text-xs text-foreground-500">No se encontraron modulos con ese filtro.</p>
              </div>
            ) : (
              groupOrder.filter((g) => groupedModules[g]?.length > 0).map((group) => {
                const isExpanded = expandedGroups.has(group);
                const modules = groupedModules[group];
                if (!modules || modules.length === 0) return null;

                return (
                  <div key={group} className="glass-panel rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between p-4 hover:bg-background-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <i className="ri-arrow-right-s-line text-foreground-500 text-base"></i>
                        </span>
                        <span className="text-sm font-semibold text-foreground-200">{group}</span>
                        <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-secondary-500/10 text-secondary-400">
                          {modules.length} modulos
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-secondary-500/10 p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {modules.map((modKey) => {
                            const mod = perms.modules[modKey];
                            const info = MODULE_LABELS[modKey];
                            const mg = moduleGranted(modKey);
                            const hasMenu = mod?.menu || false;
                            const hasActions = (mod?.actions.length || 0) > 0;

                            return (
                              <div key={modKey} className={`glass-panel rounded-xl p-4 border transition-all ${hasMenu ? 'border-primary-500/20' : 'border-secondary-500/10'}`}>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-8 h-8 rounded-lg ${hasMenu ? 'bg-primary-500/10 border-primary-500/20' : 'bg-secondary-500/10 border-secondary-500/15'} border flex items-center justify-center`}>
                                      <i className={`${info?.icon || 'ri-apps-line'} ${hasMenu ? 'text-primary-400' : 'text-foreground-500'} text-sm`}></i>
                                    </span>
                                    <div>
                                      <h4 className="text-sm font-medium text-foreground-200">{info?.label || modKey}</h4>
                                      <span className="text-2xs text-foreground-600">{mg.granted} de {mg.total} acciones</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => toggleMenu(modKey)}
                                      className={`px-2 py-1 rounded text-2xs font-medium transition-all whitespace-nowrap border ${
                                        hasMenu
                                          ? 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                                          : 'bg-secondary-500/10 text-foreground-600 border-secondary-500/15 hover:border-secondary-500/30'
                                      }`}
                                    >
                                      {hasMenu ? 'Menu ON' : 'Menu OFF'}
                                    </button>
                                    <button
                                      onClick={() => toggleAllActions(modKey)}
                                      className="px-2 py-1 rounded text-2xs font-medium text-foreground-500 hover:text-foreground-300 bg-secondary-500/10 border border-secondary-500/15 hover:border-secondary-500/30 transition-all whitespace-nowrap"
                                    >
                                      {mg.granted === mg.total ? 'Ninguna' : 'Todas'}
                                    </button>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-1.5">
                                  {ALL_ACTIONS.map((action) => {
                                    const isGranted = mod?.actions.includes(action) || false;
                                    const ac = ACTION_COLORS[action] || 'bg-secondary-500/10 text-foreground-600 border-secondary-500/15';
                                    return (
                                      <button
                                        key={action}
                                        onClick={() => toggleAction(modKey, action)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-medium transition-all whitespace-nowrap border ${
                                          isGranted ? ac : 'bg-background-100 text-foreground-600 border-secondary-500/15 hover:border-secondary-500/30'
                                        } cursor-pointer`}
                                      >
                                        <span className="w-3 h-3 flex items-center justify-center">
                                          <i className={`${ACTION_ICONS[action] || 'ri-check-line'} text-2xs`}></i>
                                        </span>
                                        {action}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Save confirmation */}
      {showConfirm && selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-save-line text-primary-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 text-center mb-2">Guardar cambios</h3>
            <p className="text-sm text-foreground-500 text-center mb-2">
              Se actualizaran los permisos SuiteOLO del perfil <span className="text-foreground-300 font-medium">{selectedProfileName}</span>.
            </p>
            <div className="glass-panel rounded-xl p-3 mb-6">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-emerald-400">{stats.granted}</div>
                  <div className="text-2xs text-foreground-600">Acciones concedidas</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary-400">{stats.menus}</div>
                  <div className="text-2xs text-foreground-600">Menus visibles</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowConfirm(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button
                onClick={async () => {
                  await save(selectedId);
                  setShowConfirm(false);
                }}
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Confirmar y guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}