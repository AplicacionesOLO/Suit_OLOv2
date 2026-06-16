import { useState, useMemo, useRef, useEffect } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useCountries } from '@/hooks/useCountries';
import { useWorldCountries } from '@/hooks/useWorldCountries';
import type { CountryWithCounts } from '@/services/operations/countriesService';

export default function CountriesPage() {
  const { countries, tenants, loading, error: pageError, addCountry, editCountry, toggleStatus, refresh } = useCountries();
  const world = useWorldCountries();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CountryWithCounts | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<CountryWithCounts | null>(null);
  const [tenantId, setTenantId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = world.selectedCountry;
  const hasSelection = !!selectedCountry;

  const resetForm = () => {
    setTenantId('');
    setFormError('');
    world.clearSelection();
    setDropdownOpen(false);
  };

  const filtered = useMemo(() => {
    let result = countries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.iso_code.toLowerCase().includes(q));
    }
    if (filterTenant) result = result.filter((c) => c.tenant_id === filterTenant);
    if (filterStatus) result = result.filter((c) => c.status === filterStatus);
    return result;
  }, [countries, searchQuery, filterTenant, filterStatus]);

  const openCreate = () => {
    resetForm();
    setTenantId(tenants[0]?.id || '');
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (country: CountryWithCounts) => {
    resetForm();
    setTenantId(country.tenant_id);
    setEditing(country);
    setShowModal(true);
  };

  const handleSelectCountry = () => {
    setDropdownOpen(false);
    setFormError('');
  };

  const handleSave = async () => {
    if (!tenantId) { setFormError('Selecciona un tenant'); return; }
    if (!selectedCountry) { setFormError('Selecciona un pais del catalogo'); return; }

    setSaving(true);
    setFormError('');

    const payload = {
      name: selectedCountry.name,
      code: selectedCountry.code,
      iso_code: selectedCountry.iso_code,
      tenant_id: tenantId,
      currency: selectedCountry.currency,
      currency_name: selectedCountry.currency_name,
      timezone: selectedCountry.timezone,
      language: selectedCountry.language,
      phone_prefix: selectedCountry.phone_prefix,
      continent: selectedCountry.continent,
      flag_url: selectedCountry.flag,
    };

    const result = editing
      ? await editCountry(editing.id, payload)
      : await addCountry(payload);
    setSaving(false);
    if (result.error) { setFormError(result.error); return; }
    setShowModal(false);
    resetForm();
  };

  const handleToggle = async () => {
    if (!confirmToggle) return;
    await toggleStatus(confirmToggle.id, confirmToggle.status);
    setConfirmToggle(null);
  };

  const canSave = !!tenantId && hasSelection;
  const isLoadingTenants = tenants.length === 0 && !pageError;

  if (loading && !showModal) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="glass-panel rounded-2xl p-8 h-96 bg-background-100/50" />
        </div>
      </AppLayout>
    );
  }

  if (pageError && countries.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <i className="ri-error-warning-line text-red-400 text-2xl"></i>
          </div>
          <h2 className="text-lg font-semibold text-foreground-200 mb-2">Error al cargar paises</h2>
          <p className="text-sm text-foreground-500 mb-6 max-w-md">{pageError}</p>
          <button onClick={refresh} className="h-9 px-5 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Reintentar</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Paises</h1>
            <p className="text-sm text-foreground-500 mt-1">Administra los paises de cada tenant desde el Catalogo Maestro ISO. Cada pais agrupa almacenes, clientes y usuarios.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Nuevo pais
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total paises', value: countries.length, icon: 'ri-global-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Paises activos', value: countries.filter((c) => c.status === 'active').length, icon: 'ri-checkbox-circle-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Total almacenes', value: countries.reduce((s, c) => s + c.warehouse_count, 0), icon: 'ri-store-2-line', bg: 'bg-accent-500/10', text: 'text-accent-400' },
            { label: 'Total clientes', value: countries.reduce((s, c) => s + c.client_count, 0), icon: 'ri-building-2-line', bg: 'bg-violet-500/10', text: 'text-violet-400' },
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
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por nombre o codigo..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los tenants</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Pais</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Codigo ISO</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Moneda</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tenant</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Almacenes</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Clientes</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Creado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((country) => (
                  <tr key={country.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {country.flag_url ? (
                          <img src={country.flag_url} alt={country.name} className="w-8 h-5 rounded shadow-sm object-cover border border-foreground-200/10" loading="lazy" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                            <i className="ri-global-line text-primary-400 text-base"></i>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground-200">{country.name}</p>
                          <p className="text-2xs text-foreground-600 mt-0.5">{country.code} {country.continent ? `· ${country.continent}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">{country.iso_code}</code>
                        <code className="text-2xs bg-background-200/50 text-foreground-600 px-1.5 py-0.5 rounded font-mono">{country.code}</code>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="text-sm text-foreground-300">{country.currency || '—'}</span>
                        {country.currency_name && <span className="text-2xs text-foreground-600 block">{country.currency_name}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-sm text-foreground-300">{country.tenant_name}</span></td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${country.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${country.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                        {country.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center"><span className="text-sm font-medium text-foreground-300">{country.warehouse_count}</span></td>
                    <td className="px-5 py-3.5 text-center"><span className="text-sm font-medium text-foreground-300">{country.client_count}</span></td>
                    <td className="px-5 py-3.5"><span className="text-xs text-foreground-500">{new Date(country.created_at).toLocaleDateString()}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(country)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span></button>
                        <button onClick={() => setConfirmToggle(country)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${country.status === 'active' ? 'text-foreground-500 hover:text-amber-400 hover:bg-amber-500/10' : 'text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`} title={country.status === 'active' ? 'Desactivar' : 'Activar'}>
                          <span className="w-4 h-4 flex items-center justify-center"><i className={`${country.status === 'active' ? 'ri-toggle-line' : 'ri-toggle-fill'} text-sm`}></i></span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-global-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">No se encontraron paises</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {countries.length} paises</span>
          </div>
        </div>
      </div>

      {/* ========== CREATE / EDIT MODAL ========== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground-200">{editing ? 'Editar pais' : 'Nuevo pais desde Catalogo Maestro'}</h2>
                <p className="text-xs text-foreground-500 mt-0.5">{editing ? 'Selecciona un pais del catalogo para actualizar los datos.' : 'Busca y selecciona un pais del catalogo ISO. Todos los datos se completan automaticamente.'}</p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-error-warning-line"></i></span>
                {formError}
              </div>
            )}

            {/* Step 1: Tenant */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xs font-bold text-primary-400">1</span>
                <label className="text-sm font-medium text-foreground-300">Tenant <span className="text-red-400">*</span></label>
              </div>
              {isLoadingTenants ? (
                <div className="h-10 bg-background-100 border border-secondary-500/20 rounded-lg animate-pulse ml-7" />
              ) : tenants.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm ml-7">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-error-warning-line"></i></span>
                  No se encontraron tenants. Verifica tu conexion o permisos.
                </div>
              ) : (
                <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 transition-all ml-7 max-w-[calc(100%-1.75rem)]">
                  <option value="">Seleccionar tenant</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>

            {/* Step 2: Country Search */}
            <div className="mb-5" ref={dropdownRef}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xs font-bold text-primary-400">2</span>
                <label className="text-sm font-medium text-foreground-300">
                  {editing ? 'Buscar nuevo pais (opcional)' : 'Seleccionar pais del catalogo'} <span className="text-red-400">*</span>
                </label>
                {world.loading && <span className="text-2xs text-foreground-600 flex items-center gap-1"><span className="w-3 h-3 flex items-center justify-center"><i className="ri-loader-4-line animate-spin"></i></span> Cargando catalogo...</span>}
              </div>
              {world.error && !editing ? (
                <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm ml-7">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-cloud-off-line"></i></span>
                  Catalogo local no disponible. Verifica tu conexion a Supabase.
                  <button onClick={() => world.retry()} className="ml-auto text-xs underline hover:text-amber-200 whitespace-nowrap">Reintentar</button>
                </div>
              ) : (
                <div className="relative ml-7 max-w-[calc(100%-1.75rem)]">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
                      {world.loading ? <i className="ri-loader-4-line animate-spin text-sm"></i> : <i className="ri-search-line text-sm"></i>}
                    </span>
                    <input
                      type="text"
                      value={world.searchQuery}
                      onChange={(e) => { world.setSearchQuery(e.target.value); setDropdownOpen(true); }}
                      onFocus={() => { if (world.searchResults.length > 0) setDropdownOpen(true); }}
                      placeholder="Escribe el nombre de un pais (ej: Costa Rica, Japan, Deutschland)..."
                      className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-10 text-sm text-foreground-200 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
                    />
                    {world.searchQuery && (
                      <button
                        type="button"
                        onClick={() => { world.clearSelection(); setFormError(''); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-foreground-500 hover:text-foreground-200 transition-colors"
                      >
                        <i className="ri-close-circle-line text-sm"></i>
                      </button>
                    )}
                  </div>

                  {/* Dropdown results */}
                  {dropdownOpen && world.searchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-background-50 border border-secondary-500/20 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                      <div className="sticky top-0 bg-background-50/95 backdrop-blur-sm px-4 py-1.5 border-b border-secondary-500/10 text-2xs text-foreground-600">
                        {world.searchResults.length} paises encontrados
                      </div>
                      {world.searchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            world.selectCountry(c);
                            handleSelectCountry();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-background-100 transition-colors text-left group"
                        >
                          {c.flag_url ? (
                            <img src={c.flag_url} alt={c.name} className="w-7 h-4 rounded shadow-sm object-cover border border-foreground-200/10 shrink-0" loading="lazy" />
                          ) : (
                            <span className="w-7 h-4 rounded bg-secondary-500/10 flex items-center justify-center shrink-0"><i className="ri-global-line text-foreground-600 text-2xs"></i></span>
                          )}
                          <span className="text-sm text-foreground-300 group-hover:text-foreground-200 transition-colors truncate">{c.name}</span>
                          <span className="text-2xs text-foreground-600 ml-auto font-mono shrink-0">{c.iso2}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Preview card with auto-populated data */}
            {selectedCountry && (
              <div className="ml-7 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">3</span>
                  <span className="text-sm font-medium text-foreground-300">Datos autocompletados del catalogo ISO</span>
                  <span className="text-2xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium ml-auto">Verificado</span>
                </div>

                {/* Master catalog preview card */}
                <div className="glass-panel rounded-xl border border-primary-500/20 bg-primary-500/[0.03] overflow-hidden">
                  {/* Header with flag and name */}
                  <div className="px-5 py-4 border-b border-primary-500/10 flex items-center gap-4">
                    <img
                      src={selectedCountry.flag}
                      alt={selectedCountry.name}
                      className="w-14 h-9 rounded shadow-sm object-cover border border-foreground-200/10 shrink-0"
                      loading="lazy"
                    />
                    <div>
                      <h3 className="text-base font-bold text-foreground-100">{selectedCountry.name}</h3>
                      <p className="text-xs text-foreground-500">{selectedCountry.continent}{selectedCountry.subregion ? ` · ${selectedCountry.subregion}` : ''}</p>
                    </div>
                  </div>

                  {/* Metadata grid */}
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <MetadataField label="ISO Alpha-2" value={selectedCountry.code} mono />
                    <MetadataField label="ISO Alpha-3" value={selectedCountry.iso_code} mono />
                    <MetadataField label="Codigo Moneda" value={selectedCountry.currency} mono />
                    <MetadataField label="Nombre Moneda" value={selectedCountry.currency_name} />
                    <MetadataField label="Zona Horaria" value={selectedCountry.timezone} mono />
                    <MetadataField label="Idioma" value={selectedCountry.language_name || selectedCountry.language} />
                    <MetadataField label="Cod. Idioma" value={selectedCountry.language} mono />
                    <MetadataField label="Prefijo Telefonico" value={selectedCountry.phone_prefix} />
                    <MetadataField label="Continente" value={selectedCountry.continent} />
                    <MetadataField label="Region" value={selectedCountry.region} />
                  </div>

                  {/* Duplicate check notice */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-500/5 border border-secondary-500/10">
                      <span className="w-4 h-4 flex items-center justify-center text-foreground-500 shrink-0"><i className="ri-shield-check-line text-sm"></i></span>
                      <p className="text-2xs text-foreground-500">
                        Se verificara que no exista un duplicado en el tenant seleccionado antes de crear el registro.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback for edit without selection */}
            {editing && !selectedCountry && (
              <div className="ml-7 mb-5 p-4 rounded-xl bg-accent-500/5 border border-accent-500/10">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center text-accent-400 shrink-0 mt-0.5"><i className="ri-information-line"></i></span>
                  <div>
                    <p className="text-sm text-foreground-300 mb-1">Modo edicion sin cambio de pais</p>
                    <p className="text-xs text-foreground-500">
                      Si no seleccionas un pais del catalogo, se mantendran los datos actuales: <strong className="text-foreground-400">{editing.name}</strong> ({editing.iso_code}).
                      Solo puedes cambiar el tenant.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state: no selection, no editing */}
            {!selectedCountry && !editing && (
              <div className="ml-7 mb-5 p-6 rounded-xl bg-secondary-500/5 border border-dashed border-secondary-500/20 text-center">
                <span className="w-10 h-10 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-global-line text-foreground-500 text-lg"></i>
                </span>
                <p className="text-sm text-foreground-500 mb-1">Sin pais seleccionado</p>
                <p className="text-xs text-foreground-600">Usa el buscador arriba para encontrar un pais del catalogo maestro ISO.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-secondary-500/10">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                className="h-9 px-5 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-loader-4-line animate-spin"></i></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 flex items-center justify-center"><i className={editing ? 'ri-save-line' : 'ri-add-line'}></i></span>
                    {editing ? 'Guardar cambios' : 'Crear pais'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle confirmation */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmToggle(null)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmToggle.status === 'active' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
              <i className={`${confirmToggle.status === 'active' ? 'ri-toggle-line text-amber-400' : 'ri-toggle-fill text-emerald-400'} text-2xl`}></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 mb-2">{confirmToggle.status === 'active' ? 'Desactivar pais' : 'Activar pais'}</h3>
            <p className="text-sm text-foreground-500 mb-6">
              {confirmToggle.status === 'active'
                ? `Al desactivar ${confirmToggle.name}, sus almacenes y clientes quedaran inaccesibles.`
                : `Se reactivara ${confirmToggle.name} y todos sus recursos asociados.`}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmToggle(null)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleToggle} className={`h-9 px-4 rounded-lg text-white transition-colors text-sm font-medium whitespace-nowrap ${confirmToggle.status === 'active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {confirmToggle.status === 'active' ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function MetadataField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-2xs text-foreground-600 uppercase tracking-wider">{label}</span>
      <p className={`text-sm text-foreground-300 mt-0.5 truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}