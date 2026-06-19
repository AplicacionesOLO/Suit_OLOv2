import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { useTenants } from '@/hooks/useTenants';
import { useSuitePermissions } from '@/hooks/useSuitePermissions';
import { useTenantContext } from '@/hooks/useTenantContext';
import { supabase } from '@/services/supabase/client';
import MultiSelect from '@/components/base/MultiSelect';
import type {
  TenantWithCounts,
  CreateTenantInput,
  UpdateTenantInput,
  TenantSettings,
} from '@/services/operations/tenantsService';

type FilterStatus = '' | 'active' | 'suspended' | 'deleted';

const statusConfig: Record<
  string,
  { label: string; dot: string; badgeBg: string; badgeText: string; border: string }
> = {
  active: {
    label: 'Activo',
    dot: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  suspended: {
    label: 'Suspendido',
    dot: 'bg-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  deleted: {
    label: 'Eliminado',
    dot: 'bg-red-400',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-400',
    border: 'border-red-500/20',
  },
};

const planOptions = ['Free', 'Starter', 'Professional', 'Enterprise', 'Unlimited'];
const languageOptions = ['es', 'en', 'pt', 'fr', 'de'];
const timezoneOptions = [
  'America/Costa_Rica',
  'America/Panama',
  'America/Guatemala',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
];
const currencyOptions = ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'PEN', 'CLP', 'ARS'];

const emptySettings: TenantSettings = {
  logo_url: '',
  primary_email: '',
  phone: '',
  website: '',
  timezone: 'America/Costa_Rica',
  language: 'es',
  currency: 'USD',
  plan: 'Free',
};

export default function TenantsPage() {
  const navigate = useNavigate();
  const {
    tenants,
    loading,
    error,
    addTenant,
    editTenant,
    suspendTenant,
    activateTenant,
    softDeleteTenant,
    syncTenantCountries,
    countries,
    refresh,
  } = useTenants();
  const { can } = useSuitePermissions();
  const ctx = useTenantContext();

  const contextParts = useMemo(() =>
    [ctx.currentCountryName, ctx.currentTenantName, ctx.currentWarehouseName, ctx.currentClientName].filter(Boolean),
    [ctx.currentCountryName, ctx.currentTenantName, ctx.currentWarehouseName, ctx.currentClientName]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('');

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TenantWithCounts | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCountryId, setFormCountryId] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formSettings, setFormSettings] = useState<TenantSettings>({ ...emptySettings });
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);

  // Detail modal
  const [detailTarget, setDetailTarget] = useState<TenantWithCounts | null>(null);

  // Suspend modal
  const [suspendTarget, setSuspendTarget] = useState<TenantWithCounts | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<TenantWithCounts | null>(null);

  // Cargar tenant_countries actuales al editar
  const loadTenantCountries = useCallback(async (tenantId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('tenant_countries')
      .select('country_id')
      .eq('tenant_id', tenantId);
    return (data || []).map((tc) => tc.country_id);
  }, []);

  const filtered = useMemo(() => {
    let result = tenants;
    // Apply context filter: Country → Tenant
    if (ctx.currentCountryId && ctx.currentCountryId !== 'all') {
      const countryName = ctx.currentCountryName;
      if (countryName) result = result.filter((t) => t.country_names.includes(countryName));
    }
    if (ctx.currentTenantId && ctx.currentTenantId !== 'all') {
      result = result.filter((t) => t.id === ctx.currentTenantId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q),
      );
    }
    if (filterStatus) {
      result = result.filter((t) => t.status === filterStatus);
    }
    return result;
  }, [tenants, searchQuery, filterStatus, ctx.currentCountryId, ctx.currentCountryName, ctx.currentTenantId]);

  const activeTenants = tenants.filter((t) => t.status === 'active');
  const suspendedTenants = tenants.filter((t) => t.status === 'suspended');

  const countryOptions = countries.map((c) => ({ id: c.id, label: c.name }));

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormCode('');
    setFormCountryId(ctx.currentCountryId || '');
    setSelectedCountryIds([]);
    setFormStatus('active');
    setFormSettings({ ...emptySettings });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = async (t: TenantWithCounts) => {
    setEditing(t);
    setFormName(t.name);
    setFormCode(t.code);
    setFormCountryId(t.country_id || '');
    setFormStatus(t.status);
    const s = (t.settings || {}) as TenantSettings;
    setFormSettings({
      logo_url: s.logo_url || '',
      primary_email: s.primary_email || '',
      phone: s.phone || '',
      website: s.website || '',
      timezone: s.timezone || 'America/Costa_Rica',
      language: s.language || 'es',
      currency: s.currency || 'USD',
      plan: s.plan || 'Free',
    });
    const tcIds = await loadTenantCountries(t.id);
    setSelectedCountryIds(tcIds);
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError('El nombre de la empresa es requerido');
      return;
    }
    if (!formCode.trim()) {
      setFormError('El codigo es requerido');
      return;
    }
    if (formCode.trim().length < 2) {
      setFormError('El codigo debe tener al menos 2 caracteres');
      return;
    }
    if (!editing && !formCountryId) {
      setFormError('Debe seleccionar un pais para crear el tenant');
      return;
    }
    if (
      formSettings.primary_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formSettings.primary_email)
    ) {
      setFormError('El email no es valido');
      return;
    }

    setSaving(true);
    setFormError('');

    const hasSettings = Object.values(formSettings).some(
      (v) =>
        v !== undefined && v !== '' && v !== 'Free' && v !== 'es' && v !== 'USD' && v !== 'America/Costa_Rica',
    );

    if (editing) {
      const updateInput: UpdateTenantInput = {
        name: formName.trim(),
        status: formStatus,
        settings: hasSettings ? formSettings : undefined,
      };
      const result = await editTenant(editing.id, updateInput);
      if (result.error) {
        setSaving(false);
        setFormError(result.error);
        return;
      }

      // Sincronizar tenant_countries
      const tcResult = await syncTenantCountries(editing.id, selectedCountryIds);
      setSaving(false);
      if (tcResult.error) {
        setFormError(tcResult.error);
        return;
      }
    } else {
      const createInput: CreateTenantInput = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        country_id: formCountryId || undefined,
        status: formStatus,
        settings: hasSettings ? formSettings : undefined,
      };
      const result = await addTenant(createInput);
      setSaving(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
    }
    setShowModal(false);
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    await suspendTenant(suspendTarget.id);
    setSuspendTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await softDeleteTenant(deleteTarget.id);
    setDeleteTarget(null);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

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

  if (error && tenants.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <i className="ri-error-warning-line text-red-400 text-2xl"></i>
          </div>
          <h2 className="text-lg font-semibold text-foreground-200 mb-2">
            Error al cargar tenants
          </h2>
          <p className="text-sm text-foreground-500 mb-6 max-w-md">{error}</p>
          <button
            onClick={refresh}
            className="h-9 px-5 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Reintentar
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Tenants</h1>
            <p className="text-sm text-foreground-500 mt-1">
              Administra las empresas del sistema. Cada tenant puede operar en multiples
              paises.
              {contextParts.length > 0 && (
                <span className="text-foreground-400"> · <span className="text-accent-400 font-medium">{contextParts.join(' › ')}</span></span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {can('tenants', 'create') && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-add-line text-base"></i>
                </span>
                Crear tenant
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Total tenants',
              value: tenants.length,
              icon: 'ri-building-4-line',
              bg: 'bg-primary-500/10',
              text: 'text-primary-400',
            },
            {
              label: 'Activos',
              value: activeTenants.length,
              icon: 'ri-checkbox-circle-line',
              bg: 'bg-emerald-500/10',
              text: 'text-emerald-400',
            },
            {
              label: 'Suspendidos',
              value: suspendedTenants.length,
              icon: 'ri-pause-circle-line',
              bg: 'bg-amber-500/10',
              text: 'text-amber-400',
            },
            {
              label: 'Total usuarios',
              value: tenants.reduce((s, t) => s + t.user_count, 0),
              icon: 'ri-team-line',
              bg: 'bg-accent-500/10',
              text: 'text-accent-400',
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
                  <div className="text-2xs text-foreground-600">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {tenants.length === 0 && !loading ? (
          <div className="glass-panel rounded-2xl p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-5">
              <i className="ri-building-4-line text-primary-400 text-2xl"></i>
            </div>
            <h2 className="text-lg font-semibold text-foreground-200 mb-2">
              No hay tenants creados
            </h2>
            <p className="text-sm text-foreground-500 max-w-md mx-auto mb-6">
              Crea tu primer empresa tenant para empezar a administrar paises,
              almacenes, clientes y usuarios.
            </p>
            {can('tenants', 'create') && (
              <button
                onClick={openCreate}
                className="h-9 px-5 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Crear tenant
              </button>
            )}
          </div>
        ) : (
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
                  placeholder="Buscar por nombre o codigo..."
                  className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="deleted">Eliminado</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-500/10">
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                      Codigo
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                      Paises
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                      Almacenes
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                      Clientes
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">
                      Usuarios
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
                  {filtered.map((t) => {
                    const sc = statusConfig[t.status] || statusConfig.active;
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                              <i className="ri-building-4-line text-primary-400 text-base"></i>
                            </div>
                            <div>
                              <button
                                onClick={() => setDetailTarget(t)}
                                className="text-sm font-medium text-foreground-200 hover:text-primary-400 transition-colors text-left"
                              >
                                {t.name}
                              </button>
                              <p className="text-2xs text-foreground-600 mt-0.5">
                                {t.domain || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">
                            {t.code}
                          </code>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {t.country_names.length === 0 ? (
                              <span className="text-xs text-foreground-600 italic">
                                Sin paises
                              </span>
                            ) : (
                              t.country_names.map((cn) => (
                                <span
                                  key={cn}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                >
                                  {cn}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${sc.badgeBg} ${sc.badgeText} ${sc.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-medium text-foreground-300">
                            {t.warehouse_count}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-medium text-foreground-300">
                            {t.client_count}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-medium text-foreground-300">
                            {t.user_count}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-foreground-500 whitespace-nowrap">
                            {formatDate(t.created_at)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailTarget(t)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
                              title="Ver detalles"
                            >
                              <span className="w-4 h-4 flex items-center justify-center">
                                <i className="ri-eye-line text-sm"></i>
                              </span>
                            </button>
                            {can('tenants', 'update') && (
                              <button
                                onClick={() => openEdit(t)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
                                title="Editar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center">
                                  <i className="ri-edit-line text-sm"></i>
                                </span>
                              </button>
                            )}
                            {t.status === 'active' && can('tenants', 'update') && (
                              <button
                                onClick={() => setSuspendTarget(t)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                                title="Suspender"
                              >
                                <span className="w-4 h-4 flex items-center justify-center">
                                  <i className="ri-pause-circle-line text-sm"></i>
                                </span>
                              </button>
                            )}
                            {t.status === 'suspended' && can('tenants', 'update') && (
                              <button
                                onClick={() => activateTenant(t.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                title="Activar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center">
                                  <i className="ri-play-circle-line text-sm"></i>
                                </span>
                              </button>
                            )}
                            {t.status !== 'deleted' && can('tenants', 'delete') && (
                              <button
                                onClick={() => setDeleteTarget(t)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Archivar"
                              >
                                <span className="w-4 h-4 flex items-center justify-center">
                                  <i className="ri-archive-line text-sm"></i>
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && tenants.length > 0 && (
                <div className="py-16 text-center">
                  <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-building-4-line text-foreground-500 text-xl"></i>
                  </span>
                  <p className="text-sm text-foreground-500">
                    No se encontraron tenants
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
              <span className="text-xs text-foreground-600">
                {filtered.length} de {tenants.length} tenants
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">
                {editing ? 'Editar tenant' : 'Crear tenant'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    Nombre de empresa <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all"
                    placeholder="Ej: OLO Logistics"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    Codigo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    disabled={!!editing}
                    className={`w-full h-10 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono ${
                      editing
                        ? 'bg-secondary-500/5 text-foreground-500 cursor-not-allowed'
                        : 'bg-background-100'
                    }`}
                    placeholder="OLO"
                    maxLength={10}
                  />
                  {editing && (
                    <p className="text-2xs text-foreground-600 mt-1">
                      El codigo no se puede modificar
                    </p>
                  )}
                </div>
              </div>

              {/* País principal (solo en creación) */}
              {!editing && (
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    Pais principal <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formCountryId}
                    onChange={(e) => setFormCountryId(e.target.value)}
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                  >
                    <option value="">
                      {countries.length === 0
                        ? 'Cargando paises...'
                        : 'Seleccionar pais'}
                    </option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Países asociados (solo en edición) */}
              {editing && (
                <div className="p-4 rounded-xl bg-background-100/70 border border-secondary-500/10 space-y-2">
                  <label className="block text-xs font-medium text-foreground-400">
                    Paises asociados
                  </label>
                  <MultiSelect
                    options={countryOptions}
                    selected={selectedCountryIds}
                    onChange={setSelectedCountryIds}
                    placeholder="Seleccionar paises..."
                    searchPlaceholder="Buscar pais..."
                    emptyMessage="Sin paises disponibles"
                  />
                  <p className="text-2xs text-foreground-500">
                    Los paises seleccionados se asociaran via{' '}
                    <code className="text-xs">tenant_countries</code>.
                  </p>
                  {editing && (
                    <p className="text-2xs text-foreground-600">
                      Actualmente:{' '}
                      {editing.country_names.length > 0
                        ? editing.country_names.join(', ')
                        : 'Sin paises'}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    Estado <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                  >
                    <option value="active">Activo</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    Plan
                  </label>
                  <select
                    value={formSettings.plan}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, plan: e.target.value })
                    }
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                  >
                    {planOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-secondary-500/10 pt-4 mt-2">
                <p className="text-xs font-medium text-foreground-400 mb-3">
                  Informacion adicional (opcional)
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                      Email principal
                    </label>
                    <input
                      type="email"
                      value={formSettings.primary_email || ''}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          primary_email: e.target.value,
                        })
                      }
                      className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all"
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                      Telefono
                    </label>
                    <input
                      type="text"
                      value={formSettings.phone || ''}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, phone: e.target.value })
                      }
                      className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all"
                      placeholder="+506 2222-3333"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    Sitio web
                  </label>
                  <input
                    type="text"
                    value={formSettings.website || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, website: e.target.value })
                    }
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all"
                    placeholder="https://empresa.com"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                      Idioma
                    </label>
                    <select
                      value={formSettings.language}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, language: e.target.value })
                      }
                      className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                    >
                      {languageOptions.map((l) => (
                        <option key={l} value={l}>
                          {l.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                      Zona horaria
                    </label>
                    <select
                      value={formSettings.timezone}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, timezone: e.target.value })
                      }
                      className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                    >
                      {timezoneOptions.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('America/', '')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                      Moneda
                    </label>
                    <select
                      value={formSettings.currency}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, currency: e.target.value })
                      }
                      className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                    >
                      {currencyOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                    URL del logo
                  </label>
                  <input
                    type="text"
                    value={formSettings.logo_url || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, logo_url: e.target.value })
                    }
                    className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all"
                    placeholder="https://cdn.empresa.com/logo.png"
                  />
                </div>
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
                className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? 'Guardando...'
                  : editing
                    ? 'Guardar cambios'
                    : 'Crear tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailTarget &&
        (() => {
          const dt = detailTarget;
          const dsc = statusConfig[dt.status] || statusConfig.active;
          const dsettings = (dt.settings || {}) as TenantSettings;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setDetailTarget(null)}
              />
              <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                      <i className="ri-building-4-line text-primary-400 text-lg"></i>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground-200">
                        {dt.name}
                      </h2>
                      <code className="text-xs bg-secondary-500/10 text-secondary-400 px-1.5 py-0.5 rounded font-mono">
                        {dt.code}
                      </code>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailTarget(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-close-line text-lg"></i>
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-background-100 rounded-lg p-3 border border-secondary-500/10 col-span-2">
                    <span className="text-2xs text-foreground-600 uppercase tracking-wider">
                      Paises
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dt.country_names.map((cn) => (
                        <span
                          key={cn}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        >
                          {cn}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-background-100 rounded-lg p-3 border border-secondary-500/10">
                    <span className="text-2xs text-foreground-600 uppercase tracking-wider">
                      Estado
                    </span>
                    <p className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${dsc.badgeBg} ${dsc.badgeText} ${dsc.border}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${dsc.dot}`}
                        ></span>
                        {dsc.label}
                      </span>
                    </p>
                  </div>
                  <div className="bg-background-100 rounded-lg p-3 border border-secondary-500/10">
                    <span className="text-2xs text-foreground-600 uppercase tracking-wider">
                      Dominio
                    </span>
                    <p className="text-sm text-foreground-200 mt-1">
                      {dt.domain || '—'}
                    </p>
                  </div>
                  <div className="bg-background-100 rounded-lg p-3 border border-secondary-500/10">
                    <span className="text-2xs text-foreground-600 uppercase tracking-wider">
                      Plan
                    </span>
                    <p className="text-sm text-foreground-200 mt-1 font-medium">
                      {dsettings.plan || 'Free'}
                    </p>
                  </div>
                  <div className="bg-background-100 rounded-lg p-3 border border-secondary-500/10">
                    <span className="text-2xs text-foreground-600 uppercase tracking-wider">
                      Creado
                    </span>
                    <p className="text-sm text-foreground-200 mt-1">
                      {formatDate(dt.created_at)}
                    </p>
                  </div>
                  <div className="bg-background-100 rounded-lg p-3 border border-secondary-500/10">
                    <span className="text-2xs text-foreground-600 uppercase tracking-wider">
                      Actualizado
                    </span>
                    <p className="text-sm text-foreground-200 mt-1">
                      {formatDate(dt.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-foreground-300 uppercase tracking-wider mb-3">
                    Estadisticas
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: 'Paises', value: dt.country_count },
                      { label: 'Almacenes', value: dt.warehouse_count },
                      { label: 'Clientes', value: dt.client_count },
                      { label: 'Usuarios', value: dt.user_count },
                      { label: 'Apps', value: dt.instance_count },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-background-100 rounded-lg p-3 text-center border border-secondary-500/10"
                      >
                        <div className="text-lg font-bold text-foreground-100">
                          {s.value}
                        </div>
                        <div className="text-2xs text-foreground-600">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-secondary-500/10">
                  {can('tenants', 'update') && (
                    <button
                      onClick={() => {
                        setDetailTarget(null);
                        openEdit(dt);
                      }}
                      className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap"
                    >
                      <span className="w-4 h-4 flex items-center justify-center mr-1.5">
                        <i className="ri-edit-line"></i>
                      </span>
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => setDetailTarget(null)}
                    className="h-9 px-4 rounded-lg bg-background-100 border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Suspend confirmation */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSuspendTarget(null)}
          />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-pause-circle-line text-amber-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">
              Suspender tenant
            </h3>
            <p className="text-sm text-foreground-500 mb-6">
              Suspender{' '}
              <strong className="text-foreground-300">{suspendTarget.name}</strong>{' '}
              bloqueara el acceso para todos los usuarios que pertenecen a este tenant.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setSuspendTarget(null)}
                className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={handleSuspend}
                className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors text-sm font-medium whitespace-nowrap"
              >
                Suspender
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-archive-line text-red-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">
              Archivar tenant
            </h3>
            <p className="text-sm text-foreground-500 mb-6">
              Esta accion archivara{' '}
              <strong className="text-foreground-300">{deleteTarget.name}</strong>. Los
              datos permaneceran almacenados pero seran inaccesibles.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-medium whitespace-nowrap"
              >
                Archivar tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}