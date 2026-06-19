import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useClients } from '@/hooks/useClients';
import { useSuitePermissions } from '@/hooks/useSuitePermissions';
import { useTenantContext } from '@/hooks/useTenantContext';
import type { ClientWithDetails } from '@/services/operations/clientsService';

export default function ClientsPage() {
  const {
    clients,
    countries,
    tenants,
    warehouses,
    loading,
    loadTenantsByCountry,
    loadWarehousesByTenant,
    addClient,
    editClient,
    toggleStatus,
  } = useClients();
  const { can } = useSuitePermissions();
  const ctx = useTenantContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClientWithDetails | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<ClientWithDetails | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_email: '',
    country_id: '',
    tenant_id: '',
    warehouse_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Filter dropdown options
  const filterCountryOptions = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; code: string }>();
    clients.forEach((c) => {
      const k = c.country_code;
      if (!unique.has(k))
        unique.set(k, { id: c.country_code, name: c.country_name, code: c.country_code });
    });
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const filterTenantOptions = useMemo(() => {
    const unique = new Map<string, { id: string; name: string }>();
    clients
      .filter((c) => !filterCountry || c.country_code === filterCountry)
      .forEach((c) => {
        if (!unique.has(c.tenant_id))
          unique.set(c.tenant_id, { id: c.tenant_id, name: c.tenant_name });
      });
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, filterCountry]);

  const filterWarehouseOptions = useMemo(() => {
    const unique = new Map<string, { id: string; name: string }>();
    clients
      .filter((c) => !filterTenant || c.tenant_id === filterTenant)
      .forEach((c) => {
        if (!unique.has(c.warehouse_id))
          unique.set(c.warehouse_id, { id: c.warehouse_id, name: c.warehouse_name });
      });
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, filterTenant]);

  const filtered = useMemo(() => {
    let result = clients;
    // Apply context filter: Client → Warehouse → Tenant → Country (BY ID)
    if (ctx.currentClientId && ctx.currentClientId !== 'all') {
      result = result.filter((c) => c.id === ctx.currentClientId);
    } else if (ctx.currentWarehouseId && ctx.currentWarehouseId !== 'all') {
      result = result.filter((c) => c.warehouse_id === ctx.currentWarehouseId);
    } else if (ctx.currentTenantId && ctx.currentTenantId !== 'all') {
      result = result.filter((c) => c.tenant_id === ctx.currentTenantId);
    } else if (ctx.currentCountryId && ctx.currentCountryId !== 'all') {
      result = result.filter((c) => c.country_id === ctx.currentCountryId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.contact_email || '').toLowerCase().includes(q) ||
          c.country_name.toLowerCase().includes(q) ||
          c.tenant_name.toLowerCase().includes(q) ||
          c.warehouse_name.toLowerCase().includes(q),
      );
    }
    if (filterCountry) result = result.filter((c) => c.country_code === filterCountry);
    if (filterTenant) result = result.filter((c) => c.tenant_id === filterTenant);
    if (filterWarehouse) result = result.filter((c) => c.warehouse_id === filterWarehouse);
    if (filterStatus) result = result.filter((c) => c.status === filterStatus);
    return result;
  }, [clients, searchQuery, filterCountry, filterTenant, filterWarehouse, filterStatus, ctx.currentClientId, ctx.currentWarehouseId, ctx.currentTenantId, ctx.currentCountryId]);

  const openCreate = () => {
    setFormData({
      name: '',
      code: '',
      contact_email: '',
      country_id: ctx.currentCountryId || '',
      tenant_id: ctx.currentTenantId || '',
      warehouse_id: ctx.currentWarehouseId || '',
    });
    setFormError('');
    setEditing(null);
    setShowModal(true);
    if (ctx.currentCountryId) loadTenantsByCountry(ctx.currentCountryId);
    if (ctx.currentTenantId) loadWarehousesByTenant(ctx.currentTenantId);
  };

  const openEdit = async (c: ClientWithDetails) => {
    const country = countries.find((co) => co.code === c.country_code);
    setFormData({
      name: c.name,
      code: c.code,
      contact_email: c.contact_email || '',
      country_id: country?.id || '',
      tenant_id: c.tenant_id,
      warehouse_id: c.warehouse_id,
    });
    if (country) await loadTenantsByCountry(country.id);
    await loadWarehousesByTenant(c.tenant_id);
    setFormError('');
    setEditing(c);
    setShowModal(true);
  };

  const handleCountryChange = async (countryId: string) => {
    setFormData({ ...formData, country_id: countryId, tenant_id: '', warehouse_id: '' });
    if (countryId) await loadTenantsByCountry(countryId);
  };

  const handleTenantChange = async (tenantId: string) => {
    setFormData({ ...formData, tenant_id: tenantId, warehouse_id: '' });
    if (tenantId) await loadWarehousesByTenant(tenantId);
  };

  const handleSave = async () => {
    if (
      !formData.name.trim() ||
      !formData.code.trim() ||
      !formData.warehouse_id ||
      !formData.tenant_id ||
      !formData.country_id
    ) {
      setFormError('Todos los campos de cascada (Pais, Tenant, Almacen) son requeridos');
      return;
    }
    setSaving(true);
    setFormError('');

    const result = editing
      ? await editClient(editing.id, {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          contact_email: formData.contact_email.trim(),
          warehouse_id: formData.warehouse_id,
          tenant_id: formData.tenant_id,
          country_id: formData.country_id,
        })
      : await addClient({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          contact_email: formData.contact_email.trim(),
          warehouse_id: formData.warehouse_id,
          tenant_id: formData.tenant_id,
          country_id: formData.country_id,
        });

    setSaving(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setShowModal(false);
  };

  const handleToggle = async () => {
    if (!confirmToggle) return;
    await toggleStatus(confirmToggle.id, confirmToggle.status);
    setConfirmToggle(null);
  };

  const handleFilterCountryChange = (val: string) => {
    setFilterCountry(val);
    setFilterTenant('');
    setFilterWarehouse('');
  };

  const handleFilterTenantChange = (val: string) => {
    setFilterTenant(val);
    setFilterWarehouse('');
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
            <h1 className="text-xl font-bold text-foreground-100">Clientes</h1>
            <p className="text-sm text-foreground-500 mt-1">
              Administra los clientes en cascada: Pais → Tenant → Almacen → Cliente.

            </p>
          </div>
          {can('clients', 'create') && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-add-line text-base"></i>
              </span>
              Nuevo cliente
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              label: 'Total clientes',
              value: clients.length,
              icon: 'ri-building-2-line',
              bg: 'bg-violet-500/10',
              text: 'text-violet-400',
            },
            {
              label: 'Activos',
              value: clients.filter((c) => c.status === 'active').length,
              icon: 'ri-checkbox-circle-line',
              bg: 'bg-emerald-500/10',
              text: 'text-emerald-400',
            },
            {
              label: 'Paises',
              value: new Set(clients.map((c) => c.country_code)).size,
              icon: 'ri-global-line',
              bg: 'bg-primary-500/10',
              text: 'text-primary-400',
            },
            {
              label: 'Tenants',
              value: new Set(clients.map((c) => c.tenant_id)).size,
              icon: 'ri-building-line',
              bg: 'bg-accent-500/10',
              text: 'text-accent-400',
            },
            {
              label: 'Almacenes',
              value: new Set(clients.map((c) => c.warehouse_id)).size,
              icon: 'ri-store-2-line',
              bg: 'bg-amber-500/10',
              text: 'text-amber-400',
            },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}
                >
                  <i className={`${stat.icon} ${stat.text} text-base`}></i>
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground-100">
                    {stat.value}
                  </div>
                  <div className="text-2xs text-foreground-600 whitespace-nowrap">
                    {stat.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar clientes..."
                className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
              />
            </div>
            <select
              value={filterCountry}
              onChange={(e) => handleFilterCountryChange(e.target.value)}
              className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 max-w-[170px]"
            >
              <option value="">Todos los paises</option>
              {filterCountryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filterTenant}
              onChange={(e) => handleFilterTenantChange(e.target.value)}
              className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 max-w-[170px]"
            >
              <option value="">Todos los tenants</option>
              {filterTenantOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 max-w-[180px]"
            >
              <option value="">Todos los almacenes</option>
              {filterWarehouseOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Codigo
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Pais
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Almacen
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                          <i className="ri-building-2-line text-violet-400 text-base"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground-200">
                            {c.name}
                          </p>
                          <p className="text-2xs text-foreground-600 mt-0.5">
                            {c.tenant_name} · {c.warehouse_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">
                        {c.code}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-foreground-300">
                          {c.country_name}
                        </span>
                        <span className="text-2xs text-foreground-600">
                          ({c.country_code})
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-foreground-400">
                        {c.tenant_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-foreground-400 max-w-[160px] line-clamp-1">
                        {c.warehouse_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-foreground-400">
                        {c.contact_email || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${
                          c.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            c.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        ></span>
                        {c.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-foreground-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {can('clients', 'update') && (
                          <button
                            onClick={() => openEdit(c)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
                            title="Editar"
                          >
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-edit-line text-sm"></i>
                            </span>
                          </button>
                        )}
                        {can('clients', 'update') && (
                          <button
                            onClick={() => setConfirmToggle(c)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              c.status === 'active'
                                ? 'text-foreground-500 hover:text-amber-400 hover:bg-amber-500/10'
                                : 'text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title={c.status === 'active' ? 'Desactivar' : 'Activar'}
                          >
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i
                                className={`${
                                  c.status === 'active'
                                    ? 'ri-toggle-line'
                                    : 'ri-toggle-fill'
                                } text-sm`}
                              ></i>
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-building-2-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">
                  No se encontraron clientes
                </p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">
              {filtered.length} de {clients.length} clientes
            </span>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal — Cascada: País → Tenant → Almacén */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">
                {editing ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-close-line text-lg"></i>
                </span>
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-error-warning-line"></i>
                </span>
                {formError}
              </div>
            )}

            <div className="space-y-4">
              {/* CASCADE: País → Tenant → Almacén */}
              <div className="p-4 rounded-xl bg-background-100/70 border border-secondary-500/10 space-y-3">
                <p className="text-xs font-medium text-foreground-500 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-emerald-400">
                    <i className="ri-stack-line text-xs"></i>
                  </span>
                  Cascada: Pais → Tenant → Almacen
                </p>

                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-emerald-400">
                      <i className="ri-global-line text-xs"></i>
                    </span>
                    Pais
                  </label>
                  <select
                    value={formData.country_id}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                  >
                    <option value="">Seleccionar pais</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-primary-400">
                      <i className="ri-building-line text-xs"></i>
                    </span>
                    Tenant
                  </label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    disabled={!formData.country_id}
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40"
                  >
                    <option value="">Seleccionar tenant</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {formData.country_id && tenants.length === 0 && (
                    <p className="text-2xs text-amber-400 mt-1">
                      No hay tenants en este pais
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-amber-400">
                      <i className="ri-store-2-line text-xs"></i>
                    </span>
                    Almacen
                  </label>
                  <select
                    value={formData.warehouse_id}
                    onChange={(e) =>
                      setFormData({ ...formData, warehouse_id: e.target.value })
                    }
                    disabled={!formData.tenant_id}
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40"
                  >
                    <option value="">Seleccionar almacen</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {formData.tenant_id && warehouses.length === 0 && (
                    <p className="text-2xs text-amber-400 mt-1">
                      No hay almacenes en este tenant
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    Nombre comercial
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all"
                    placeholder="Ej: COFERSA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    Codigo
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono"
                    placeholder="COFERSA-CR"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                  Email de contacto
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all"
                  placeholder="Ej: contacto@empresa.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50"
              >
                {saving
                  ? 'Guardando...'
                  : editing
                    ? 'Guardar cambios'
                    : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle confirmation */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmToggle(null)}
          />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                confirmToggle.status === 'active'
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-emerald-500/10 border border-emerald-500/20'
              }`}
            >
              <i
                className={`${
                  confirmToggle.status === 'active'
                    ? 'ri-toggle-line text-amber-400'
                    : 'ri-toggle-fill text-emerald-400'
                } text-2xl`}
              ></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">
              {confirmToggle.status === 'active'
                ? 'Desactivar cliente'
                : 'Activar cliente'}
            </h3>
            <p className="text-sm text-foreground-500 mb-6">
              {confirmToggle.status === 'active'
                ? `Al desactivar este cliente, sus usuarios no podran acceder al sistema.`
                : `Se reactivara el cliente y todos sus recursos asociados.`}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmToggle(null)}
                className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggle}
                className={`h-9 px-4 rounded-lg text-white transition-colors text-sm font-medium whitespace-nowrap ${
                  confirmToggle.status === 'active'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmToggle.status === 'active' ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}