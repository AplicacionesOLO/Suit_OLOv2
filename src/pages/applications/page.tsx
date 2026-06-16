import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { fetchApplications, fetchCategories, type Application as SupaApplication, type AppCategory as SupaCategory } from '@/services/applications/applicationsService';

const statusConfig: Record<string, { label: string; dot: string; badgeBg: string; badgeText: string }> = {
  active: { label: 'Activo', dot: 'bg-emerald-400', badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400' },
  maintenance: { label: 'Mantenimiento', dot: 'bg-amber-400', badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400' },
  offline: { label: 'Offline', dot: 'bg-red-400', badgeBg: 'bg-red-500/10', badgeText: 'text-red-400' },
  beta: { label: 'Beta', dot: 'bg-violet-400', badgeBg: 'bg-violet-500/10', badgeText: 'text-violet-400' },
};

interface AppItem {
  id: string;
  name: string;
  code: string;
  description: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  baseUrl: string;
  status: 'active' | 'maintenance' | 'offline' | 'beta';
  version: string;
  integrationType: 'internal' | 'external' | 'embedded' | 'sso' | 'api';
  integrationLabel: string;
  isFavorite: boolean;
  lastUsed: string;
  tags: string[];
}

interface AppCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  isActive: boolean;
  appCount: number;
}


const colorMap: Record<string, { bgColor: string; textColor: string; borderColor: string }> = {
  emerald: { bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  cyan: { bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-400', borderColor: 'border-cyan-500/20' },
  amber: { bgColor: 'bg-amber-500/10', textColor: 'text-amber-400', borderColor: 'border-amber-500/20' },
  slate: { bgColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-slate-500/20' },
  rose: { bgColor: 'bg-rose-500/10', textColor: 'text-rose-400', borderColor: 'border-rose-500/20' },
  violet: { bgColor: 'bg-violet-500/10', textColor: 'text-violet-400', borderColor: 'border-violet-500/20' },
  indigo: { bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-400', borderColor: 'border-indigo-500/20' },
  red: { bgColor: 'bg-red-500/10', textColor: 'text-red-400', borderColor: 'border-red-500/20' },
};

function getColors(c: string) { return colorMap[c] || colorMap.emerald; }

function mapSupaApp(a: SupaApplication, catMap: Map<string, SupaCategory>): AppItem {
  const cat = a.category_id ? catMap.get(a.category_id) : undefined;
  const colors = getColors(a.color);
  const labels: Record<string, string> = { internal: 'Interna', external: 'Externa', embedded: 'Embebida', sso: 'SSO', api: 'API' };
  return {
    id: a.id, name: a.name, code: a.code, description: a.description || '',
    categoryId: a.category_id || '', categoryName: cat?.name || 'Sin categoría',
    icon: a.icon, color: a.color, bgColor: colors.bgColor, textColor: colors.textColor, borderColor: colors.borderColor,
    baseUrl: a.base_url || '', status: (a.status as AppItem['status']) || 'active', version: a.version,
    integrationType: (a.integration_type as AppItem['integrationType']) || 'internal',
    integrationLabel: labels[a.integration_type] || 'Interna', isFavorite: false, lastUsed: a.created_at, tags: a.tags || [],
  };
}

export default function ApplicationsPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [appList, setAppList] = useState<AppItem[]>([]);
  const [appCategories, setAppCategories] = useState<AppCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedAppId = searchParams.get('app');

  const loadData = useCallback(async () => {
    try {
      const [catResult, appResult] = await Promise.all([fetchCategories(), fetchApplications()]);
      if (catResult.data.length > 0) {
        setAppCategories(catResult.data.map((c) => {
          const colors = getColors(c.color);
          return { id: c.id, name: c.name, code: c.code, description: c.description || '', icon: c.icon, color: c.color, bgColor: colors.bgColor, textColor: colors.textColor, borderColor: colors.borderColor, isActive: c.is_active, appCount: 0 };
        }));
      }
      if (appResult.data.length > 0) {
        const catMap = new Map(catResult.data.map((c) => [c.id, c]));
        setAppList(appResult.data.map((a) => mapSupaApp(a, catMap)));
      }
    } catch {
      // silently handle errors
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let result = appList;
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)); }
    if (filterCat) result = result.filter((a) => a.categoryId === filterCat);
    if (filterStatus) result = result.filter((a) => a.status === filterStatus);
    return result;
  }, [searchQuery, filterCat, filterStatus, appList]);

  const selectedApp = selectedAppId ? appList.find((a) => a.id === selectedAppId) : null;

  if (loading) {
    return <AppLayout><div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-background-100 rounded-lg" /><div className="glass-panel rounded-2xl p-8 h-96 bg-background-100/50" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Aplicaciones</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona el catálogo de aplicaciones de la plataforma Suite OLO.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Nueva aplicación
          </button>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar aplicaciones..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todas las categorías</option>
              {appCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option><option value="maintenance">Mantenimiento</option><option value="offline">Offline</option><option value="beta">Beta</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Aplicación</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Versión</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">URL Base</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const cat = appCategories.find((c) => c.id === app.categoryId);
                  const status = statusConfig[app.status];
                  return (
                    <tr key={app.id} className={`border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors ${selectedAppId === app.id ? 'bg-primary-500/5' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${app.bgColor} border ${app.borderColor} flex items-center justify-center`}>
                            <i className={`${app.icon} ${app.textColor} text-base`}></i>
                          </div>
                          <div><p className="text-sm font-medium text-foreground-200">{app.name}</p><code className="text-2xs text-foreground-600 font-mono">{app.code}</code></div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {cat && (<div className="flex items-center gap-1.5"><span className={`w-4 h-4 rounded flex items-center justify-center ${cat.bgColor}`}><i className={`${cat.icon} ${cat.textColor} text-xs`}></i></span><span className="text-sm text-foreground-400">{cat.name}</span></div>)}
                      </td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded text-2xs font-medium bg-secondary-500/10 text-secondary-400 border border-secondary-500/15">{app.integrationLabel}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-400 font-mono">v{app.version}</span></td>
                      <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${status.badgeBg} ${status.badgeText}`}><span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>{status.label}</span></td>
                      <td className="px-5 py-3.5"><code className="text-xs text-foreground-500 font-mono">{app.baseUrl}</code></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span></button>
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all" title="Abrir"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-external-link-line text-sm"></i></span></button>
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Eliminar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {appList.length} aplicaciones</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" disabled><span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-s-line text-sm"></i></span></button>
              <button className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 text-xs font-medium">1</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-s-line text-sm"></i></span></button>
            </div>
          </div>
        </div>

        {selectedApp && (
          <div className="glass-panel rounded-2xl p-6 animate-slide-up">
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl ${selectedApp.bgColor} border ${selectedApp.borderColor} flex items-center justify-center`}>
                <i className={`${selectedApp.icon} ${selectedApp.textColor} text-2xl`}></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-foreground-100">{selectedApp.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-2xs font-medium ${statusConfig[selectedApp.status].badgeBg} ${statusConfig[selectedApp.status].badgeText}`}>{statusConfig[selectedApp.status].label}</span>
                </div>
                <p className="text-sm text-foreground-500">{selectedApp.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[{ label: 'Categoría', value: selectedApp.categoryName },{ label: 'Versión', value: `v${selectedApp.version}` },{ label: 'Tipo de integración', value: selectedApp.integrationLabel },{ label: 'URL Base', value: selectedApp.baseUrl }].map((f) => (<div key={f.label}><p className="text-2xs text-foreground-600 uppercase tracking-wider mb-1">{f.label}</p><p className="text-sm text-foreground-300 font-mono">{f.value}</p></div>))}
            </div>
            <div className="mt-4"><p className="text-2xs text-foreground-600 uppercase tracking-wider mb-2">Etiquetas</p><div className="flex items-center gap-1.5 flex-wrap">{selectedApp.tags.map((t) => (<span key={t} className="px-2 py-0.5 rounded text-2xs bg-secondary-500/10 text-secondary-400 border border-secondary-500/15">{t}</span>))}</div></div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">Nueva aplicación</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label><input type="text" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Nombre de la app" /></div>
                <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Código</label><input type="text" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="APP_CODE" /></div>
              </div>
              <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Descripción</label><textarea rows={2} className="w-full bg-background-100 border border-secondary-500/20 rounded-lg px-3 py-2 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all resize-none" placeholder="Descripción de la aplicación..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Categoría</label><select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">{appCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Tipo de integración</label><select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"><option value="internal">Interna</option><option value="external">Externa</option><option value="embedded">Embebida</option><option value="sso">SSO</option><option value="api">API</option></select></div>
              </div>
              <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">URL Base</label><input type="text" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="https://app.suiteolo.io" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Crear aplicación</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}