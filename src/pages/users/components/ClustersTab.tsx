import { useState, useMemo, useCallback } from 'react';
import { useClusters } from '@/hooks/useClusters';
import { useTenantContext } from '@/hooks/useTenantContext';
import type { PlatformUserFull } from '@/services/auth/usersService';
import type { Cluster } from '@/services/auth/clustersService';
import ClusterDetailModal from './ClusterDetailModal';

interface ClustersTabProps {
  users: PlatformUserFull[];
  tenants: { id: string; name: string }[];
  can: (resource: string, action: string) => boolean;
}

export default function ClustersTab({ users, tenants, can }: ClustersTabProps) {
  const { clusters, apps, categories, loading, error, createCluster, refresh } = useClusters();
  const ctx = useTenantContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  const [createForm, setCreateForm] = useState({ name: '', description: '', tenant_id: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const filteredClusters = useMemo(() => {
    if (!searchQuery) return clusters;
    const q = searchQuery.toLowerCase();
    return clusters.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q),
    );
  }, [clusters, searchQuery]);

  const defaultTenantId = useMemo(() => {
    if (ctx.currentTenantId && tenants.some((t) => t.id === ctx.currentTenantId)) {
      return ctx.currentTenantId;
    }
    return tenants[0]?.id || '';
  }, [ctx.currentTenantId, tenants]);

  const openCreate = () => {
    setCreateForm({ name: '', description: '', tenant_id: defaultTenantId });
    setFormError('');
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    if (!createForm.tenant_id) {
      setFormError('Selecciona un tenant');
      return;
    }
    setSaving(true);
    setFormError('');
    const result = await createCluster(
      { name: createForm.name, description: createForm.description },
      createForm.tenant_id,
    );
    setSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setShowCreate(false);
    showToast('success', 'Cluster creado correctamente');
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-panel rounded-xl p-5 h-36 bg-background-100/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-20 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl animate-slide-in-right shadow-lg border ${
          toast.type === 'success' ? 'bg-primary-500/10 border-primary-500/20 text-primary-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <i className={toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}></i>
          </span>
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar clusters..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
        </div>
        {can('users', 'create') && (
          <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap ml-auto">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-stack-line text-base"></i></span>
            Crear cluster
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

      {filteredClusters.length === 0 && !error ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-secondary-500/20">
          <span className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-3">
            <i className="ri-stack-line text-primary-400 text-xl"></i>
          </span>
          <p className="text-sm text-foreground-500">No hay clusters creados</p>
          <p className="text-xs text-foreground-600 mt-1">Crea un cluster para agrupar apps y usuarios y asignar accesos masivamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredClusters.map((cluster) => {
            const tenantName = tenants.find((t) => t.id === cluster.tenant_id)?.name || '—';
            return (
              <button
                key={cluster.id}
                onClick={() => setSelectedCluster(cluster)}
                className="glass-panel rounded-xl p-5 text-left hover:border-primary-500/30 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                    <i className="ri-stack-line text-primary-400 text-lg"></i>
                  </div>
                  <span className="text-2xs text-foreground-600">{tenantName}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground-100 mt-3 group-hover:text-primary-400 transition-colors truncate">
                  {cluster.name}
                </h3>
                <p className="text-xs text-foreground-500 mt-1 line-clamp-2 min-h-[2rem]">
                  {cluster.description || 'Sin descripcion'}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary-500/10 border border-secondary-500/20 text-2xs text-secondary-300">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-apps-2-line text-xs"></i></span>
                    {cluster.app_count || 0} apps
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-500/10 border border-accent-500/20 text-2xs text-accent-300">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-user-line text-xs"></i></span>
                    {cluster.user_count || 0} usuarios
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create cluster modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#231E20]/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">Crear cluster</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
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
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre <span className="text-red-400">*</span></label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Ventas Corporativo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Descripcion</label>
                <input type="text" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Apps del equipo de ventas" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tenant <span className="text-red-400">*</span></label>
                <select value={createForm.tenant_id} onChange={(e) => setCreateForm({ ...createForm, tenant_id: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                  <option value="">Seleccionar tenant</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm">
                <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-information-line"></i></span>
                Podras agregar apps y usuarios despues de crear el cluster.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Creando...' : 'Crear cluster'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedCluster && (
        <ClusterDetailModal
          cluster={selectedCluster}
          allApps={apps}
          allUsers={users}
          tenants={tenants}
          categories={categories}
          can={can}
          onClose={() => setSelectedCluster(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}