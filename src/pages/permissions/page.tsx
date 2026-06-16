import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { useProfiles } from '@/hooks/useProfiles';
import { useRoles } from '@/hooks/useRoles';
import { fetchAllPermissions, buildPermissionTree, type PermissionNode, type ActionNode } from '@/services/security/permissionsService';

const allActions = ['Ver', 'Crear', 'Editar', 'Eliminar', 'Exportar', 'Aprobar', 'Auditar', 'Configurar'];

const criticalActions = ['Aprobar', 'Eliminar', 'Configurar', 'Auditar'];

const actionColors: Record<string, { bg: string; text: string }> = {
  Ver: { bg: 'bg-secondary-500/10', text: 'text-secondary-400' },
  Crear: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  Editar: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  Eliminar: { bg: 'bg-red-500/10', text: 'text-red-400' },
  Exportar: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
  Aprobar: { bg: 'bg-primary-500/10', text: 'text-primary-400' },
  Auditar: { bg: 'bg-accent-500/10', text: 'text-accent-400' },
  Configurar: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
};

export default function PermissionsPage() {
  const { profiles } = useProfiles();
  const { roles } = useRoles();
  const { tree, grantedIds, loading, saving, error, loadAll, loadForProfile, togglePermission, toggleAllFeature, toggleAllModule, toggleAllApplication, save, stats } = usePermissions();

  const [searchParams] = useSearchParams();
  const [selectedProfileId, setSelectedProfileId] = useState(searchParams.get('profile') || '');
  const [selectedAppFilter, setSelectedAppFilter] = useState('');
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchPerm, setSearchPerm] = useState('');

  useEffect(() => {
    if (selectedProfileId) {
      loadForProfile(selectedProfileId);
    } else {
      loadAll();
    }
  }, [selectedProfileId, loadForProfile, loadAll]);

  const filteredTree = useMemo(() => {
    let result = tree;
    if (selectedAppFilter) {
      result = result.filter((n) => n.application === selectedAppFilter);
    }
    if (searchPerm) {
      const q = searchPerm.toLowerCase();
      result = result.map((app) => ({
        ...app,
        modules: app.modules.map((mod) => ({
          ...mod,
          features: mod.features.map((feat) => ({
            ...feat,
            actions: feat.actions.filter((a) =>
              a.action.toLowerCase().includes(q) ||
              feat.feature.toLowerCase().includes(q) ||
              mod.module.toLowerCase().includes(q)
            ),
          })).filter((feat) => feat.actions.length > 0),
        })).filter((mod) => mod.features.length > 0),
      })).filter((app) => app.modules.length > 0);
    }
    return result;
  }, [tree, selectedAppFilter, searchPerm]);

  const appNames = [...new Set(tree.map((n) => n.application))].sort();

  const toggleApp = (app: string) => {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      next.has(app) ? next.delete(app) : next.add(app);
      return next;
    });
  };

  const toggleMod = (modKey: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(modKey) ? next.delete(modKey) : next.add(modKey);
      return next;
    });
  };

  const collectActions = (node: PermissionNode): ActionNode[] => {
    const actions: ActionNode[] = [];
    node.modules.forEach((mod) => {
      mod.features.forEach((feat) => {
        actions.push(...feat.actions);
      });
    });
    return actions;
  };

  const collectFeatureActions = (feat: { actions: ActionNode[] }): ActionNode[] => feat.actions;
  const collectModuleActions = (mod: { features: { actions: ActionNode[] }[] }): ActionNode[] => {
    const actions: ActionNode[] = [];
    mod.features.forEach((feat) => { actions.push(...feat.actions); });
    return actions;
  };

  const applicationGranted = (node: PermissionNode): { total: number; granted: number } => {
    const all = collectActions(node);
    return { total: all.length, granted: all.filter((a) => a.granted).length };
  };

  const modGranted = (mod: { features: { actions: ActionNode[] }[] }): { total: number; granted: number } => {
    const all = collectModuleActions(mod);
    return { total: all.length, granted: all.filter((a) => a.granted).length };
  };

  const featGranted = (feat: { actions: ActionNode[] }): { total: number; granted: number } => {
    const all = collectFeatureActions(feat);
    return { total: all.length, granted: all.filter((a) => a.granted).length };
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Matriz de Permisos</h1>
            <p className="text-sm text-foreground-500 mt-1">Configura permisos granulares por Aplicacion → Modulo → Funcionalidad → Accion.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total permisos', value: stats.total, icon: 'ri-key-2-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Concedidos', value: stats.granted, icon: 'ri-check-double-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Criticos', value: stats.critical, icon: 'ri-alert-line', bg: 'bg-red-500/10', text: 'text-red-400' },
            { label: 'Apps cubiertas', value: stats.apps, icon: 'ri-apps-2-line', bg: 'bg-accent-500/10', text: 'text-accent-400' },
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
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 min-w-[200px]"
              >
                <option value="">Sin perfil (vista global)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.is_default ? '(Default)' : ''}</option>
                ))}
              </select>

              <select
                value={selectedAppFilter}
                onChange={(e) => setSelectedAppFilter(e.target.value)}
                className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
              >
                <option value="">Todas las aplicaciones</option>
                {appNames.map((app) => <option key={app} value={app}>{app}</option>)}
              </select>

              <div className="relative flex-1 max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
                <input type="text" value={searchPerm} onChange={(e) => setSearchPerm(e.target.value)} placeholder="Buscar permisos..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
              </div>
            </div>

            {selectedProfileId && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={saving}
                className="flex items-center gap-2 h-9 px-5 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 shrink-0"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-loader-4-line animate-spin"></i></span>
                    Guardando...
                  </>
                ) : 'Guardar permisos'}
              </button>
            )}
          </div>
          {selectedProfileId && (
            <p className="text-xs text-foreground-600 mt-3">
              Modificando perfil: <span className="text-foreground-300 font-medium">{profiles.find((p) => p.id === selectedProfileId)?.name}</span>
              {' '}· Los cambios no se aplican hasta guardar.
            </p>
          )}
        </div>

        {/* Tree */}
        {loading ? (
          <div className="glass-panel rounded-2xl p-8 h-96 animate-pulse bg-background-100/50" />
        ) : error ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-red-400 text-2xl"></i>
            </div>
            <p className="text-sm text-foreground-400">{error}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTree.length === 0 ? (
              <div className="glass-panel rounded-2xl p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-5">
                  <i className="ri-key-2-line text-foreground-500 text-2xl"></i>
                </div>
                <h3 className="text-sm font-semibold text-foreground-300 mb-2">Sin resultados</h3>
                <p className="text-xs text-foreground-500 max-w-sm mx-auto">No se encontraron permisos con esos filtros.</p>
              </div>
            ) : (
              filteredTree.map((appNode) => {
                const appStats = applicationGranted(appNode);
                const isAppExp = expandedApps.has(appNode.application);

                return (
                  <div key={appNode.application} className="glass-panel rounded-2xl overflow-hidden">
                    {/* App header */}
                    <button
                      onClick={() => toggleApp(appNode.application)}
                      className="w-full flex items-center justify-between p-4 hover:bg-background-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 flex items-center justify-center transition-transform duration-200 ${isAppExp ? 'rotate-90' : ''}`}>
                          <i className="ri-arrow-right-s-line text-foreground-500 text-base"></i>
                        </span>
                        <span className="text-sm font-semibold text-foreground-200">{appNode.application}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-primary-500/10 text-primary-400">
                            {appStats.granted}/{appStats.total}
                          </span>
                          {selectedProfileId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const allGood = appStats.granted === appStats.total;
                                toggleAllApplication(collectActions(appNode), !allGood);
                              }}
                              className="text-2xs text-foreground-500 hover:text-foreground-300 transition-colors"
                            >
                              {appStats.granted === appStats.total ? 'Deseleccionar todo' : 'Seleccionar todo'}
                            </button>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Modules */}
                    {isAppExp && (
                      <div className="border-t border-secondary-500/10">
                        {appNode.modules.map((modNode) => {
                          const mStats = modGranted(modNode);
                          const modKey = `${appNode.application}::${modNode.module}`;
                          const isModExp = expandedModules.has(modKey);

                          return (
                            <div key={modKey} className="border-b border-secondary-500/5 last:border-0">
                              <button
                                onClick={() => toggleMod(modKey)}
                                className="w-full flex items-center justify-between px-8 py-3 hover:bg-background-100/30 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-4 h-4 flex items-center justify-center transition-transform duration-200 ${isModExp ? 'rotate-90' : ''}`}>
                                    <i className="ri-arrow-right-s-line text-foreground-600 text-sm"></i>
                                  </span>
                                  <span className="text-sm font-medium text-foreground-300">{modNode.module}</span>
                                  <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-accent-500/10 text-accent-400">
                                    {mStats.granted}/{mStats.total}
                                  </span>
                                </div>
                                {selectedProfileId && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const allGood = mStats.granted === mStats.total;
                                      toggleAllModule(collectModuleActions(modNode), !allGood);
                                    }}
                                    className="text-2xs text-foreground-500 hover:text-foreground-300 transition-colors"
                                  >
                                    {mStats.granted === mStats.total ? 'Desmarcar' : 'Marcar todo'}
                                  </button>
                                )}
                              </button>

                              {isModExp && (
                                <div className="px-8 pb-3">
                                  {modNode.features.map((featNode) => {
                                    const fStats = featGranted(featNode);
                                    return (
                                      <div key={`${modKey}::${featNode.feature}`} className="ml-6 mb-2 last:mb-0">
                                        <div className="flex items-center justify-between py-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-foreground-400">{featNode.feature}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-2xs font-medium bg-secondary-500/10 text-secondary-400`}>
                                              {fStats.granted}/{fStats.total}
                                            </span>
                                          </div>
                                          {selectedProfileId && (
                                            <button
                                              onClick={() => {
                                                const allGood = fStats.granted === fStats.total;
                                                toggleAllFeature(collectFeatureActions(featNode), !allGood);
                                              }}
                                              className="text-2xs text-foreground-500 hover:text-foreground-300 transition-colors"
                                            >
                                              {fStats.granted === fStats.total ? 'Desmarcar todas' : 'Marcar todas'}
                                            </button>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {featNode.actions.map((action) => {
                                            const ac = actionColors[action.action] || actionColors.Ver;
                                            const isCritical = criticalActions.includes(action.action);
                                            return (
                                              <button
                                                key={action.id}
                                                onClick={() => {
                                                  if (!selectedProfileId) return;
                                                  togglePermission(action.id);
                                                }}
                                                disabled={!selectedProfileId}
                                                className={`px-2.5 py-1 rounded-md text-2xs font-medium transition-all whitespace-nowrap border ${
                                                  action.granted
                                                    ? `${ac.bg} ${ac.text} border-current/20`
                                                    : 'bg-background-100 text-foreground-600 border-secondary-500/15 hover:border-secondary-500/30'
                                                } ${isCritical && action.granted ? 'ring-1 ring-current/20' : ''} ${!selectedProfileId ? 'cursor-default' : 'cursor-pointer'}`}
                                              >
                                                {action.action}
                                                {isCritical && action.granted && (
                                                  <span className="ml-1 text-2xs opacity-70">!</span>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-save-line text-primary-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 text-center mb-2">Guardar cambios de permisos</h3>
            <p className="text-sm text-foreground-500 text-center mb-2">
              Se actualizaran los permisos del perfil <span className="text-foreground-300 font-medium">{profiles.find((p) => p.id === selectedProfileId)?.name}</span>.
            </p>
            <div className="glass-panel rounded-xl p-3 mb-6">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-emerald-400">{stats.granted}</div>
                  <div className="text-2xs text-foreground-600">Concedidos</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-400">{stats.critical}</div>
                  <div className="text-2xs text-foreground-600">Criticos</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowConfirm(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button
                onClick={async () => {
                  await save(selectedProfileId);
                  setShowConfirm(false);
                }}
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50"
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