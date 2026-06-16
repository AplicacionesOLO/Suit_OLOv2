import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import {
  fetchApplications,
  fetchCategories,
  createApplication,
  updateApplication,
  softDeleteApplication,
  restoreApplication,
  type Application as SupaApplication,
  type AppCategory as SupaCategory,
  type CreateApplicationPayload,
  type UpdateApplicationPayload,
} from '@/services/applications/applicationsService';
import { getUserContext } from '@/services/auth/usersService';

const statusConfig: Record<string, { label: string; dot: string; badgeBg: string; badgeText: string }> = {
  active: { label: 'Activo', dot: 'bg-emerald-400', badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400' },
  maintenance: { label: 'Mantenimiento', dot: 'bg-amber-400', badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400' },
  offline: { label: 'Offline', dot: 'bg-red-400', badgeBg: 'bg-red-500/10', badgeText: 'text-red-400' },
  beta: { label: 'Beta', dot: 'bg-violet-400', badgeBg: 'bg-violet-500/10', badgeText: 'text-violet-400' },
  inactive: { label: 'Inactivo', dot: 'bg-slate-400', badgeBg: 'bg-slate-500/10', badgeText: 'text-slate-400' },
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
  status: 'active' | 'maintenance' | 'offline' | 'beta' | 'inactive';
  version: string;
  integrationType: 'internal' | 'external' | 'embedded' | 'sso' | 'api';
  integrationLabel: string;
  isFavorite: boolean;
  lastUsed: string;
  tags: string[];
  deletedAt: string | null;
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

interface FormData {
  name: string;
  code: string;
  description: string;
  categoryId: string;
  icon: string;
  color: string;
  baseUrl: string;
  version: string;
  integrationType: string;
  tags: string;
}

const emptyForm: FormData = {
  name: '', code: '', description: '', categoryId: '', icon: 'ri-apps-2-line',
  color: 'emerald', baseUrl: '', version: '1.0.0', integrationType: 'internal', tags: '',
};

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

const colorOptions = ['emerald', 'cyan', 'amber', 'violet', 'rose', 'indigo', 'slate', 'red'];
const iconOptions = ['ri-apps-2-line', 'ri-store-2-line', 'ri-truck-line', 'ri-bar-chart-2-line', 'ri-bank-line', 'ri-team-line', 'ri-customer-service-2-line', 'ri-shield-check-line', 'ri-global-line', 'ri-database-2-line'];

function getColors(c: string) { return colorMap[c] || colorMap.emerald; }

function parseTags(raw: string): string[] {
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

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
    integrationLabel: labels[a.integration_type] || 'Interna', isFavorite: false,
    lastUsed: a.created_at, tags: a.tags || [], deletedAt: a.deleted_at,
  };
}

export default function ApplicationsPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [appList, setAppList] = useState<AppItem[]>([]);
  const [allApps, setAllApps] = useState<AppItem[]>([]);
  const [appCategories, setAppCategories] = useState<AppCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const selectedAppId = searchParams.get('app');

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

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
        const mapped = appResult.data.map((a) => mapSupaApp(a, catMap));
        setAllApps(mapped);
      } else {
        setAllApps([]);
      }
    } catch {
      // silently handle errors
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const visibleApps = useMemo(() => {
    let result = showDeleted ? allApps : allApps.filter((a) => !a.deletedAt);
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)); }
    if (filterCat) result = result.filter((a) => a.categoryId === filterCat);
    if (filterStatus) result = result.filter((a) => a.status === filterStatus);
    return result;
  }, [searchQuery, filterCat, filterStatus, allApps, showDeleted]);

  const selectedApp = selectedAppId ? allApps.find((a) => a.id === selectedAppId && !a.deletedAt) : null;

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (app: AppItem) => {
    setEditingId(app.id);
    setForm({
      name: app.name,
      code: app.code,
      description: app.description,
      categoryId: app.categoryId,
      icon: app.icon,
      color: app.color,
      baseUrl: app.baseUrl,
      version: app.version,
      integrationType: app.integrationType,
      tags: app.tags.join(', '),
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio';
    if (!form.code.trim()) errors.code = 'El código es obligatorio';
    if (!form.categoryId) errors.categoryId = 'La categoría es obligatoria';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const tagsArr = parseTags(form.tags);
      const basePayload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        category_id: form.categoryId || null,
        icon: form.icon,
        color: form.color,
        base_url: form.baseUrl.trim() || null,
        version: form.version.trim() || '1.0.0',
        integration_type: form.integrationType,
        tags: tagsArr.length > 0 ? tagsArr : null,
      };

      if (editingId) {
        const { error } = await updateApplication(editingId, basePayload as UpdateApplicationPayload);
        if (error) { showToast(error, 'error'); return; }
        showToast('Aplicación actualizada correctamente', 'success');
      } else {
        const ctx = await getUserContext();
        const tenantId = ctx?.tenant_id || '00000000-0000-0000-0000-000000000001';
        const { error } = await createApplication({ ...basePayload, tenant_id: tenantId } as CreateApplicationPayload);
        if (error) { showToast(error, 'error'); return; }
        showToast('Aplicación creada correctamente', 'success');
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error inesperado', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (app: AppItem) => {
    if (app.deletedAt) {
      const { error } = await restoreApplication(app.id);
      if (error) { showToast(error, 'error'); return; }
      showToast('Aplicación restaurada', 'success');
    } else {
      const { error } = await softDeleteApplication(app.id);
      if (error) { showToast(error, 'error'); return; }
      showToast('Aplicación desactivada', 'success');
    }
    await loadData();
  };

  const handleToggleStatus = async (app: AppItem) => {
    const newStatus = app.status === 'active' ? 'inactive' : 'active';
    const { error } = await updateApplication(app.id, { status: newStatus });
    if (error) { showToast(error, 'error'); return; }
    showToast(`Aplicación ${newStatus === 'active' ? 'activada' : 'desactivada'}`, 'success');
    await loadData();
  };

  if (loading) {
    return <AppLayout><div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-background-100 rounded-lg" /><div className="glass-panel rounded-2xl p-8 h-96 bg-background-100/50" /></div></AppLayout>;
  }

  const activeCount = allApps.filter((a) => !a.deletedAt).length;
  const deletedCount = allApps.filter((a) => a.deletedAt).length;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {toast && (
          <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-up flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-500/95 text-white' : 'bg-red-500/95 text-white'
          }`}>
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-base`}></i>
            </span>
            {toast.message}
            <button onClick={() => setToast(null)} className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors ml-1">
              <i className="ri-close-line text-xs"></i>
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Aplicaciones</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona el catálogo de aplicaciones de la plataforma Suite OLO.</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Nueva aplicación
          </button>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3 items-center">
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
              <option value="active">Activo</option><option value="maintenance">Mantenimiento</option><option value="offline">Offline</option><option value="beta">Beta</option><option value="inactive">Inactivo</option>
            </select>
            {deletedCount > 0 && (
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500 cursor-pointer" />
                <span className="text-xs text-foreground-500">Eliminados ({deletedCount})</span>
              </label>
            )}
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
                {visibleApps.map((app) => {
                  const cat = appCategories.find((c) => c.id === app.categoryId);
                  const status = statusConfig[app.status];
                  const isDeleted = !!app.deletedAt;
                  return (
                    <tr key={app.id} className={`border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors ${selectedAppId === app.id ? 'bg-primary-500/5' : ''} ${isDeleted ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${app.bgColor} border ${app.borderColor} flex items-center justify-center`}>
                            <i className={`${app.icon} ${app.textColor} text-base`}></i>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground-200">{app.name}</p>
                            <code className="text-2xs text-foreground-600 font-mono">{app.code}</code>
                          </div>
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
                          {!isDeleted && (
                            <>
                              <button onClick={() => openEditModal(app)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer" title="Editar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span></button>
                              <button onClick={() => handleToggleStatus(app)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer" title={app.status === 'active' ? 'Desactivar' : 'Activar'}><span className="w-4 h-4 flex items-center justify-center"><i className={app.status === 'active' ? 'ri-pause-circle-line' : 'ri-play-circle-line text-sm'}></i></span></button>
                              <button onClick={() => handleDelete(app)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" title="Eliminar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span></button>
                            </>
                          )}
                          {isDeleted && (
                            <button onClick={() => handleDelete(app)} className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-2xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer whitespace-nowrap">
                              <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-refresh-line text-xs"></i></span> Restaurar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleApps.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-foreground-500">{showDeleted ? 'No hay aplicaciones eliminadas.' : 'No se encontraron aplicaciones.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{visibleApps.length} aplicaciones{showDeleted ? ' (incluye eliminadas)' : ''} — {activeCount} activas</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer" disabled><span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-s-line text-sm"></i></span></button>
              <button className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 text-xs font-medium">1</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-s-line text-sm"></i></span></button>
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

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground-200">{editingId ? 'Editar aplicación' : 'Nueva aplicación'}</h2>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`w-full h-10 bg-background-100 border rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all ${formErrors.name ? 'border-red-400' : 'border-secondary-500/20'}`} placeholder="Nombre de la app" />
                    {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Código *</label>
                    <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`w-full h-10 bg-background-100 border rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono ${formErrors.code ? 'border-red-400' : 'border-secondary-500/20'}`} placeholder="APP_CODE" />
                    {formErrors.code && <p className="text-xs text-red-400 mt-1">{formErrors.code}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Descripción</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-background-100 border border-secondary-500/20 rounded-lg px-3 py-2 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all resize-none" placeholder="Descripción de la aplicación..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Categoría *</label>
                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={`w-full h-10 bg-background-100 border rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 ${formErrors.categoryId ? 'border-red-400' : 'border-secondary-500/20'}`}>
                      <option value="">Seleccionar...</option>
                      {appCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {formErrors.categoryId && <p className="text-xs text-red-400 mt-1">{formErrors.categoryId}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tipo de integración</label>
                    <select value={form.integrationType} onChange={(e) => setForm({ ...form, integrationType: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                      <option value="internal">Interna</option><option value="external">Externa</option><option value="embedded">Embebida</option><option value="sso">SSO</option><option value="api">API</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">URL Base</label>
                  <input type="text" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="https://app.suiteolo.io" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Versión</label>
                    <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="1.0.0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Ícono</label>
                    <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                      {iconOptions.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {colorOptions.map((c) => (
                        <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${form.color === c ? 'border-foreground-300 scale-110' : 'border-transparent'}`} style={{ backgroundColor: ({ emerald: '#10b981', cyan: '#06b6d4', amber: '#f59e0b', violet: '#8b5cf6', rose: '#f43f5e', indigo: '#6366f1', slate: '#64748b', red: '#ef4444' } as Record<string, string>)[c] }} title={c} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Etiquetas</label>
                    <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="web, mobile, cloud" />
                    <p className="text-2xs text-foreground-600 mt-1">Separadas por coma</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap cursor-pointer">Cancelar</button>
                <button onClick={handleSubmit} disabled={saving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {saving && <span className="w-4 h-4 flex items-center justify-center"><i className="ri-loader-4-line animate-spin text-sm"></i></span>}
                  {editingId ? 'Guardar cambios' : 'Crear aplicación'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}