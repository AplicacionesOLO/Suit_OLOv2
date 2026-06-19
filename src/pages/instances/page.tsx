import { useState, useMemo, useEffect, useCallback } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import {
  fetchInstances,
  fetchApplications,
  fetchTenants,
  fetchCountries,
  fetchWarehouses,
  fetchClients,
  fetchTenantCountries,
  createInstance,
  updateInstance,
  softDeleteInstance,
  restoreInstance,
  type AppInstanceEnriched,
  type ApplicationEnriched,
  type TenantBrief,
  type CountryBrief,
  type WarehouseBrief,
  type ClientBrief,
  type TenantCountryBrief,
} from '@/services/applications/applicationsService';
import { useSuitePermissions } from '@/hooks/useSuitePermissions';
import { useTenantContext } from '@/hooks/useTenantContext';

interface AppInstance {
  id: string;
  tenantId: string;
  tenantName: string;
  clientId: string;
  clientName: string;
  countryId: string;
  countryName: string;
  warehouseId: string;
  warehouseName: string;
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
  deletedAt: string | null;
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
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { can } = useSuitePermissions();
  const ctx = useTenantContext();

  // Cascade data
  const [countries, setCountries] = useState<CountryBrief[]>([]);
  const [tenants, setTenants] = useState<TenantBrief[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseBrief[]>([]);
  const [clients, setClients] = useState<ClientBrief[]>([]);
  const [apps, setApps] = useState<ApplicationEnriched[]>([]);
  const [tenantCountries, setTenantCountries] = useState<TenantCountryBrief[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);

  // Modal form state
  const [modalCountry, setModalCountry] = useState('');
  const [modalTenant, setModalTenant] = useState('');
  const [modalWarehouse, setModalWarehouse] = useState('');
  const [modalClient, setModalClient] = useState('');
  const [modalApp, setModalApp] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalUrl, setModalUrl] = useState('');
  const [modalSso, setModalSso] = useState(true);
  const [modalJwt, setModalJwt] = useState(true);
  const [modalIframe, setModalIframe] = useState(true);
  const [modalNewTab, setModalNewTab] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

  const isEditing = editingInstance !== null;

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Cascade helpers
  const tenantsByCountry = useMemo(() => {
    if (!modalCountry) return [];
    const allowedTenantIds = new Set(tenantCountries.filter((tc) => tc.country_id === modalCountry).map((tc) => tc.tenant_id));
    return tenants.filter((t) => allowedTenantIds.has(t.id));
  }, [modalCountry, tenants, tenantCountries]);

  const warehousesByCountryTenant = useMemo(() => {
    if (!modalCountry || !modalTenant) return [];
    return warehouses.filter((w) => w.country_id === modalCountry && w.tenant_id === modalTenant);
  }, [modalCountry, modalTenant, warehouses]);

  const clientsByWarehouse = useMemo(() => {
    if (!modalWarehouse) return [];
    return clients.filter((c) => c.warehouse_id === modalWarehouse);
  }, [modalWarehouse, clients]);

  const appsByClient = useMemo(() => {
    if (!modalClient) return [];
    return apps.filter((a) => a.client_id === modalClient && a.deleted_at === null && a.status === 'active');
  }, [modalClient, apps]);

  const resetCascade = () => {
    setModalCountry('');
    setModalTenant('');
    setModalWarehouse('');
    setModalClient('');
    setModalApp('');
  };

  const initModalForCreate = useCallback(() => {
    setEditingInstance(null);
    resetCascade();
    setModalCountry(ctx.currentCountryId || '');
    setModalTenant(ctx.currentTenantId || '');
    setModalWarehouse(ctx.currentWarehouseId || '');
    setModalClient(ctx.currentClientId || '');
    setModalName('');
    setModalUrl('');
    setModalSso(true);
    setModalJwt(true);
    setModalIframe(true);
    setModalNewTab(false);
    setModalErrors({});
    setShowModal(true);
  }, [ctx.currentCountryId, ctx.currentTenantId, ctx.currentWarehouseId, ctx.currentClientId]);

  const initModalForEdit = useCallback((inst: AppInstance) => {
    setEditingInstance(inst);
    resetCascade();
    setModalTenant(inst.tenantId);
    setModalClient(inst.clientId);
    setModalName(inst.instanceName);
    setModalUrl(inst.url);
    setModalSso(inst.ssoEnabled);
    setModalJwt(inst.jwtFederated);
    setModalIframe(inst.allowsIframe);
    setModalNewTab(inst.openInNewTab);
    setModalErrors({});
    setShowModal(true);
  }, []);

  const validateModal = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isEditing) {
      if (!modalCountry) errs.country = 'Selecciona un país';
      if (!modalTenant) errs.tenant = 'Selecciona un tenant';
      if (!modalWarehouse) errs.warehouse = 'Selecciona un almacén';
      if (!modalClient) errs.client = 'Selecciona un cliente';
      if (!modalApp) errs.app = 'Selecciona una aplicación';
    }
    if (!modalName.trim()) errs.name = 'El nombre es obligatorio';
    setModalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = useCallback(async () => {
    if (!validateModal()) return;
    setModalSaving(true);
    try {
      if (editingInstance) {
        const { error } = await updateInstance(editingInstance.id, {
          instance_name: modalName,
          url: modalUrl,
          client_id: modalClient || null,
          allows_iframe: modalIframe,
          open_mode: modalIframe ? 'embedded' : 'external',
          sso_enabled: modalSso,
          jwt_federated: modalJwt,
          open_in_new_tab: modalNewTab,
        });
        if (error) { showToast(error, 'error'); setModalSaving(false); return; }
        showToast('Instancia actualizada', 'success');
      } else {
        const { error } = await createInstance({
          tenant_id: modalTenant,
          client_id: modalClient,
          application_id: modalApp,
          instance_name: modalName,
          url: modalUrl || null,
          allows_iframe: modalIframe,
          open_mode: modalIframe ? 'embedded' : 'external',
          sso_enabled: modalSso,
          jwt_federated: modalJwt,
          open_in_new_tab: modalNewTab,
        });
        if (error) { showToast(error, 'error'); setModalSaving(false); return; }
        showToast('Instancia creada', 'success');
      }
      setShowModal(false);
      setEditingInstance(null);
    } catch (err: any) {
      showToast(err.message || 'Error', 'error');
    } finally {
      setModalSaving(false);
    }
  }, [editingInstance, modalCountry, modalTenant, modalWarehouse, modalClient, modalApp, modalName, modalUrl, modalIframe, modalSso, modalJwt, modalNewTab, showToast]);

  useEffect(() => { if (!showModal) loadData(); }, [showModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async () => {
    try {
      const [instResult, appResult, tRes, coRes, whRes, clRes, tcRes] = await Promise.all([
        fetchInstances(),
        fetchApplications(),
        fetchTenants(),
        fetchCountries(),
        fetchWarehouses(),
        fetchClients(),
        fetchTenantCountries(),
      ]);
      setTenants(tRes.data);
      setCountries(coRes.data);
      setWarehouses(whRes.data);
      setClients(clRes.data);
      setApps(appResult.data);
      setTenantCountries(tcRes.data);

      if (instResult.data.length > 0) {
        const mapped = instResult.data.map((inst: AppInstanceEnriched): AppInstance => ({
          id: inst.id,
          tenantId: inst.tenant_id,
          tenantName: inst.tenant_name || inst.tenant_id,
          clientId: inst.client_id || '',
          clientName: inst.client_name || '',
          countryId: inst.country_id || '',
          countryName: inst.country_name || '',
          warehouseId: inst.warehouse_id || '',
          warehouseName: inst.warehouse_name || '',
          applicationId: inst.application_id,
          applicationName: inst.application_name || '',
          instanceName: inst.instance_name,
          url: inst.url || '',
          status: (inst.status as AppInstance['status']) || 'active',
          openInOLO: inst.open_in_olo,
          openInNewTab: inst.open_in_new_tab,
          allowsIframe: inst.allows_iframe,
          ssoEnabled: inst.sso_enabled,
          jwtFederated: inst.jwt_federated,
          allowedDomains: inst.allowed_domains || [],
          createdAt: inst.created_at,
          deletedAt: inst.deleted_at,
        }));
        setInstanceList(mapped);
      } else {
        setInstanceList([]);
      }
    } catch { /* silently handle */ }
    finally { setLoading(false); }
  }, [ctx.currentClientId, ctx.currentWarehouseId, ctx.currentTenantId, ctx.currentCountryId, ctx.showAll]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let result = showDeleted ? instanceList : instanceList.filter((i) => !i.deletedAt);
    // Apply context filter: Client → Warehouse → Tenant → Country (BY ID)
    if (!ctx.showAll) {
      if (ctx.currentClientId && ctx.currentClientId !== 'all') {
        result = result.filter((i) => i.clientId === ctx.currentClientId);
      } else if (ctx.currentWarehouseId && ctx.currentWarehouseId !== 'all') {
        result = result.filter((i) => i.warehouseId === ctx.currentWarehouseId);
      } else if (ctx.currentTenantId && ctx.currentTenantId !== 'all') {
        result = result.filter((i) => i.tenantId === ctx.currentTenantId);
      } else if (ctx.currentCountryId && ctx.currentCountryId !== 'all') {
        result = result.filter((i) => i.countryId === ctx.currentCountryId);
      }
    }
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((i) => i.instanceName.toLowerCase().includes(q) || i.applicationName.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q)); }
    if (filterTenant) result = result.filter((i) => i.tenantName === filterTenant);
    if (filterStatus) result = result.filter((i) => i.status === filterStatus);
    return result;
  }, [searchQuery, filterTenant, filterStatus, instanceList, showDeleted, ctx.currentClientId, ctx.currentWarehouseId, ctx.currentTenantId, ctx.currentCountryId, ctx.showAll]);

  const tenantNames = [...new Set(instanceList.map((i) => i.tenantName))];
  const deletedCount = instanceList.filter((i) => i.deletedAt).length;

  if (loading) {
    return <AppLayout><div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-background-100 rounded-lg" /><div className="glass-panel rounded-2xl p-8 h-96 bg-background-100/50" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {toast && (
          <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-up flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-500/95 text-white' : 'bg-red-500/95 text-white'}`}>
            <span className="w-4 h-4 flex items-center justify-center"><i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-base`}></i></span>
            {toast.message}
            <button onClick={() => setToast(null)} className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors ml-1"><i className="ri-close-line text-xs"></i></button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Instancias de Aplicación</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona las instancias de aplicaciones por cliente, con SSO y dominios.

            </p>
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
              {tenantNames.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="active">Activa</option><option value="inactive">Inactiva</option><option value="deploying">Desplegando</option>
            </select>
            {deletedCount > 0 && (
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500 cursor-pointer" />
                <span className="text-xs text-foreground-500">Eliminadas ({deletedCount})</span>
              </label>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Instancia</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Aplicación</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tenant</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">País</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">URL</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Modo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => {
                  const st = statusConfig[inst.status];
                  const isDeleted = !!inst.deletedAt;
                  return (
                    <tr key={inst.id} className={`border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors ${isDeleted ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3.5"><span className="text-sm font-medium text-foreground-200">{inst.instanceName}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-400">{inst.applicationName}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-300">{inst.clientName || '—'}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-400">{inst.tenantName}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm text-foreground-400">{inst.countryName || '—'}</span></td>
                      <td className="px-5 py-3.5"><code className="text-xs text-foreground-500 font-mono truncate max-w-[140px] block">{inst.url}</code></td>
                      <td className="px-5 py-3.5">
                        {inst.allowsIframe ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20 whitespace-nowrap">
                            <i className="ri-layout-line text-xs"></i> Embebida
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-secondary-500/10 text-secondary-400 border border-secondary-500/20 whitespace-nowrap">
                            <i className="ri-external-link-line text-xs"></i> Externa
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{st.label}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {!isDeleted && (
                            <>
                              {can('instances', 'update') && (
                                <button onClick={() => initModalForEdit(inst)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer" title="Editar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span></button>
                              )}
                              {can('instances', 'delete') && (
                                <button onClick={async () => { const { error } = await softDeleteInstance(inst.id); if (!error) { showToast('Instancia desactivada', 'success'); loadData(); } else showToast(error, 'error'); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" title="Eliminar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span></button>
                              )}
                            </>
                          )}
                          {isDeleted && can('instances', 'delete') && (
                            <button onClick={async () => { const { error } = await restoreInstance(inst.id); if (!error) { showToast('Instancia restaurada', 'success'); loadData(); } else showToast(error, 'error'); }} className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-2xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"><span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-refresh-line text-xs"></i></span> Restaurar</button>
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
            <span className="text-xs text-foreground-600">{filtered.length} instancias{showDeleted ? ' (incluye eliminadas)' : ''}</span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">{isEditing ? 'Editar instancia' : 'Nueva instancia'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
            </div>
            <div className="space-y-4">
              {/* Cascade for create */}
              {!isEditing && (
                <>
                  <div className="p-3 rounded-xl bg-accent-500/5 border border-accent-500/10">
                    <p className="text-xs font-medium text-accent-400 mb-3 flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-stack-line"></i></span>
                      Jerarquía organizacional
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-2xs font-medium text-foreground-500 mb-1">País *</label>
                        <select value={modalCountry} onChange={(e) => { setModalCountry(e.target.value); setModalTenant(''); setModalWarehouse(''); setModalClient(''); setModalApp(''); }} className={`w-full h-9 bg-background-100 border rounded-lg px-2.5 text-sm text-foreground-300 outline-none focus:border-primary-500/40 ${modalErrors.country ? 'border-red-400' : 'border-secondary-500/20'}`}>
                          <option value="">Seleccionar...</option>
                          {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-2xs font-medium text-foreground-500 mb-1">Tenant *</label>
                        <select value={modalTenant} onChange={(e) => { setModalTenant(e.target.value); setModalWarehouse(''); setModalClient(''); setModalApp(''); }} disabled={!modalCountry} className={`w-full h-9 bg-background-100 border rounded-lg px-2.5 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40 ${modalErrors.tenant ? 'border-red-400' : 'border-secondary-500/20'}`}>
                          <option value="">Seleccionar...</option>
                          {tenantsByCountry.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-2xs font-medium text-foreground-500 mb-1">Almacén *</label>
                        <select value={modalWarehouse} onChange={(e) => { setModalWarehouse(e.target.value); setModalClient(''); setModalApp(''); }} disabled={!modalTenant} className={`w-full h-9 bg-background-100 border rounded-lg px-2.5 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40 ${modalErrors.warehouse ? 'border-red-400' : 'border-secondary-500/20'}`}>
                          <option value="">Seleccionar...</option>
                          {warehousesByCountryTenant.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-2xs font-medium text-foreground-500 mb-1">Cliente *</label>
                        <select value={modalClient} onChange={(e) => { setModalClient(e.target.value); setModalApp(''); }} disabled={!modalWarehouse} className={`w-full h-9 bg-background-100 border rounded-lg px-2.5 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40 ${modalErrors.client ? 'border-red-400' : 'border-secondary-500/20'}`}>
                          <option value="">Seleccionar...</option>
                          {clientsByWarehouse.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Aplicación *</label>
                    <select value={modalApp} onChange={(e) => setModalApp(e.target.value)} disabled={!modalClient} className={`w-full h-10 bg-background-100 border rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40 ${modalErrors.app ? 'border-red-400' : 'border-secondary-500/20'}`}>
                      <option value="">Seleccionar aplicación...</option>
                      {appsByClient.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                    </select>
                    {modalErrors.app && <p className="text-xs text-red-400 mt-1">{modalErrors.app}</p>}
                  </div>
                  <div className="border-t border-secondary-500/10" />
                </>
              )}

              {isEditing && (
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Cliente</label>
                  <select value={modalClient} onChange={(e) => setModalClient(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                    <option value="">Sin cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre de instancia *</label>
                  <input type="text" value={modalName} onChange={(e) => setModalName(e.target.value)} className={`w-full h-10 bg-background-100 border rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all ${modalErrors.name ? 'border-red-400' : 'border-secondary-500/20'}`} placeholder="WMS Producción" />
                  {modalErrors.name && <p className="text-xs text-red-400 mt-1">{modalErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">URL</label>
                  <input type="text" value={modalUrl} onChange={(e) => setModalUrl(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="https://app.suiteolo.io" />
                </div>
              </div>

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