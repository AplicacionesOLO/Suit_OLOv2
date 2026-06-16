import { useState, useMemo, useEffect, useCallback } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { fetchInstances, fetchTenants, updateInstance, type AppInstance as SupaInstance } from '@/services/applications/applicationsService';
import { useSuitePermissions } from '@/hooks/useSuitePermissions';

interface AppInstance {
  id: string;
  tenantId: string;
  tenantName: string;
  applicationId: string;
  applicationName: string;
  instanceName: string;
  url: string;
  status: 'active' | 'inactive' | 'deploying';
  openInOLO: boolean;
  openInNewTab: boolean;
  allowsIframe: boolean;
  ssoEnabled: boolean;
  jwtFederated: boolean;
  allowedDomains: string[];
  createdAt: string;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  active: { label: 'Activa', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  inactive: { label: 'Inactiva', dot: 'bg-red-400', bg: 'bg-red-500/10', text: 'text-red-400' },
  deploying: { label: 'Desplegando', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
};

export default function InstancesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<AppInstance | null>(null);
  const [instanceList, setInstanceList] = useState<AppInstance[]>([]);
  const [tenantList, setTenantList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { can } = useSuitePermissions();

  // Modal form state — always declared at top-level (rules of hooks)
  const [modalTenant, setModalTenant] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalUrl, setModalUrl] = useState('');
  const [modalSso, setModalSso] = useState(true);
  const [modalJwt, setModalJwt] = useState(true);
  const [modalIframe, setModalIframe] = useState(true);
  const [modalNewTab, setModalNewTab] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  const isEditing = editingInstance !== null;

  const initModalForCreate = useCallback(() => {
    setEditingInstance(null);
    setModalTenant('');
    setModalName('');
    setModalUrl('');
    setModalSso(true);
    setModalJwt(true);
    setModalIframe(true);
    setModalNewTab(false);
    setShowModal(true);
  }, []);

  const initModalForEdit = useCallback((inst: AppInstance) => {
    setEditingInstance(inst);
    setModalTenant(inst.tenantName);
    setModalName(inst.instanceName);
    setModalUrl(inst.url);
    setModalSso(inst.ssoEnabled);
    setModalJwt(inst.jwtFederated);
    setModalIframe(inst.allowsIframe);
    setModalNewTab(inst.openInNewTab);
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    setModalSaving(true);
    if (editingInstance) {
      await updateInstance(editingInstance.id, {
        instance_name: modalName,
        url: modalUrl,
        allows_iframe: modalIframe,
        open_mode: modalIframe ? 'embedded' : 'external',
        sso_enabled: modalSso,
        jwt_federated: modalJwt,
        open_in_new_tab: modalNewTab,
      });
    }
    setModalSaving(false);
    setShowModal(false);
    setEditingInstance(null);
  }, [editingInstance, modalName, modalUrl, modalIframe, modalSso, modalJwt, modalNewTab]);

  // Refresh list after save
  useEffect(() => {
    if (!showModal && !loading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  const loadData = useCallback(async () => {
    try {
      const [instResult, tenantResult] = await Promise.all([fetchInstances(), fetchTenants()]);
      if (tenantResult.data.length > 0) {
        setTenantList(tenantResult.data.map((t) => t.name));
      }
      if (instResult.data.length > 0) {
        const mapped = instResult.data.map((inst: SupaInstance): AppInstance => {
          const tenantName = tenantResult.data.find((t) => t.id === inst.tenant_id)?.name || inst.tenant_id;
          return {
            id: inst.id, tenantId: inst.tenant_id, tenantName,
            applicationId: inst.application_id, applicationName: inst.instance_name,
            instanceName: inst.instance_name, url: inst.url || '',
            status: (inst.status as AppInstance['status']) || 'active',
            openInOLO: inst.open_in_olo, openInNewTab: inst.open_in_new_tab,
            allowsIframe: inst.allows_iframe, ssoEnabled: inst.sso_enabled,
            jwtFederated: inst.jwt_federated,
            allowedDomains: inst.allowed_domains || [], createdAt: inst.created_at,
          };
        });
        setInstanceList(mapped);
      }
    } catch {
      // silently handle errors
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let result = instanceList;
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((i) => i.instanceName.toLowerCase().includes(q) || i.applicationName.toLowerCase().includes(q)); }
    if (filterTenant) result = result.filter((i) => i.tenantName === filterTenant);
    if (filterStatus) result = result.filter((i) => i.status === filterStatus);
    return result;
  }, [searchQuery, filterTenant, filterStatus, instanceList]);

  if (loading) {
    return <AppLayout><div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-background-100 rounded-lg" /><div className="glass-panel rounded-2xl p-8 h-96 bg-background-100/50" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Instancias de Aplicación</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona las instancias de aplicaciones por tenant, con SSO y dominios.</p>
          </div>
          {can('instances', 'create') && (
            <button onClick={initModalForCreate} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span> Nueva instancia
            </button>
          )}
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar instancias..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los tenants</option>
              {tenantList.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="active">Activa</option><option value="inactive">Inactiva</option><option value="deploying">Desplegando</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Instancia</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tenant</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Aplicación</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">URL</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">SSO</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Iframe</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => {
                  const st = statusConfig[inst.status];
                  return (
                    <tr key={inst.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                      <td className="px-5 py-3.5"><span className="text-sm font-medium text-foreground-200">{inst.instanceName}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-400">{inst.tenantName}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-400">{inst.applicationName}</span></td>
                      <td className="px-5 py-3.5"><code className="text-xs text-foreground-500 font-mono">{inst.url}</code></td>
                      <td className="px-5 py-3.5">{inst.ssoEnabled ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-primary-500/10 text-primary-400"><i className="ri-shield-check-line text-xs"></i> SSO</span> : <span className="text-2xs text-foreground-600">—</span>}</td>
                      <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium ${inst.allowsIframe ? 'bg-accent-500/10 text-accent-400' : 'bg-secondary-500/10 text-secondary-400'}`}>{inst.allowsIframe ? 'Sí' : 'No'}</span></td>
                      <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{st.label}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {can('instances', 'update') && (
                            <button onClick={() => initModalForEdit(inst)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer" title="Editar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span></button>
                          )}
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all cursor-pointer" title="Abrir"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-external-link-line text-sm"></i></span></button>
                          {can('instances', 'delete') && (
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" title="Eliminar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {instanceList.length} instancias</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" disabled><span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-s-line text-sm"></i></span></button>
              <button className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 text-xs font-medium">1</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-s-line text-sm"></i></span></button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">{isEditing ? 'Editar instancia' : 'Nueva instancia'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Tenant</label><select value={modalTenant} onChange={(e) => setModalTenant(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">{tenantList.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre de instancia</label><input type="text" value={modalName} onChange={(e) => setModalName(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="WMS Costa Rica" /></div>
              </div>
              <div><label className="block text-xs font-medium text-foreground-400 mb-1.5">URL</label><input type="text" value={modalUrl} onChange={(e) => setModalUrl(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="https://app.tenant.suiteolo.io" /></div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalSso} onChange={(e) => setModalSso(e.target.checked)} className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500" /><span className="text-sm text-foreground-400">SSO habilitado</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalJwt} onChange={(e) => setModalJwt(e.target.checked)} className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500" /><span className="text-sm text-foreground-400">JWT federado</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalIframe} onChange={(e) => setModalIframe(e.target.checked)} className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500" /><span className="text-sm text-foreground-400">Permite iframe</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalNewTab} onChange={(e) => setModalNewTab(e.target.checked)} className="w-4 h-4 rounded border-secondary-500/40 bg-background-100" /><span className="text-sm text-foreground-400">Abrir en nueva pestaña</span></label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap cursor-pointer">Cancelar</button>
              <button onClick={handleSave} disabled={modalSaving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-60 cursor-pointer">{modalSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear instancia'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}