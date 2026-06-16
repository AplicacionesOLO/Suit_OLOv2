import { useState, useMemo, useRef, useEffect } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useCountries } from '@/hooks/useCountries';
import { useWorldCountries } from '@/hooks/useWorldCountries';
import type { CountryWithCounts } from '@/services/operations/countriesService';
import type { WorldCountry } from '@/services/external/countriesApiService';

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
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [iso, setIso] = useState('');
  const [currency, setCurrency] = useState('');
  const [timezone, setTimezone] = useState('');
  const [flagUrl, setFlagUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (world.error) setApiFailed(true);
  }, [world.error]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setTenantId('');
    setName('');
    setCode('');
    setIso('');
    setCurrency('');
    setTimezone('');
    setFlagUrl('');
    setFormError('');
    world.clearSelection();
    setApiFailed(false);
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
    setName(country.name);
    setCode(country.code);
    setIso(country.iso_code);
    setCurrency(country.currency || '');
    setTimezone(country.timezone || '');
    setFlagUrl('');
    setEditing(country);
    setShowModal(true);
  };

  const handleSelectCountry = (country: WorldCountry) => {
    setName(country.name);
    setCode(country.code);
    setIso(country.iso_code);
    setCurrency(country.currency);
    setTimezone(country.timezone);
    setFlagUrl(country.flag);
    world.selectCountry(country);
    setDropdownOpen(false);
    setFormError('');
  };

  const handleSave = async () => {
    if (!tenantId) { setFormError('Selecciona un tenant'); return; }
    if (!name.trim() || !code.trim() || !iso.trim()) { setFormError('Selecciona un pais del buscador'); return; }

    setSaving(true);
    setFormError('');
    const result = editing
      ? await editCountry(editing.id, { name: name.trim(), code: code.trim().toUpperCase(), iso_code: iso.trim().toUpperCase(), tenant_id: tenantId, currency: currency || undefined, timezone: timezone || undefined })
      : await addCountry({ name: name.trim(), code: code.trim().toUpperCase(), iso_code: iso.trim().toUpperCase(), tenant_id: tenantId, currency: currency || undefined, timezone: timezone || undefined });
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

  const canSave = !!tenantId && !!name.trim() && !!code.trim() && !!iso.trim();

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
            <p className="text-sm text-foreground-500 mt-1">Administra los paises de cada tenant. Cada pais agrupa almacenes, clientes y usuarios.</p>
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
                        <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                          <i className="ri-global-line text-primary-400 text-base"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground-200">{country.name}</p>
                          <p className="text-2xs text-foreground-600 mt-0.5">{country.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">{country.iso_code}</code></td>
                    <td className="px-5 py-3.5"><span className="text-sm text-foreground-300">{country.currency || '—'}</span></td>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">{editing ? 'Editar pais' : 'Nuevo pais'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tenant <span className="text-red-400">*</span></label>
                {isLoadingTenants ? (
                  <div className="h-10 bg-background-100 border border-secondary-500/20 rounded-lg animate-pulse" />
                ) : tenants.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-error-warning-line"></i></span>
                    No se encontraron tenants. Verifica tu conexion o permisos.
                  </div>
                ) : (
                  <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 transition-all">
                    <option value="">Seleccionar tenant</option>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>

              {editing && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-information-line"></i></span>
                  Modo edicion: puedes buscar un pais nuevo o mantener los datos actuales.
                </div>
              )}

              <div ref={dropdownRef}>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                  {editing ? 'Buscar pais (opcional para cambiar)' : 'Buscar pais'} <span className="text-red-400">*</span>
                </label>
                {apiFailed && !editing ? (
                  <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm mb-3">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-cloud-off-line"></i></span>
                    API de paises no disponible. Usa el modo manual como fallback.
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
                        {world.loading ? <i className="ri-loader-4-line animate-spin text-sm"></i> : <i className="ri-search-line text-sm"></i>}
                      </span>
                      <input
                        type="text"
                        value={world.searchQuery}
                        onChange={(e) => { world.setSearchQuery(e.target.value); setDropdownOpen(true); }}
                        onFocus={() => { if (world.searchResults.length > 0) setDropdownOpen(true); }}
                        placeholder="Escribe el nombre de un pais..."
                        className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-200 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
                      />
                    </div>
                    {dropdownOpen && world.searchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-background-50 border border-secondary-500/20 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {world.searchResults.map((c) => (
                          <button
                            key={c.iso_code}
                            type="button"
                            onClick={() => handleSelectCountry(c)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-background-100 transition-colors text-left"
                          >
                            <img src={c.flag} alt={c.name} className="w-6 h-4 rounded shadow-sm object-cover" loading="lazy" />
                            <span className="text-sm text-foreground-300">{c.name}</span>
                            <span className="text-2xs text-foreground-600 ml-auto font-mono">{c.iso_code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {world.selectedCountry && (
                <div className="glass-panel rounded-xl p-4 border border-primary-500/20 bg-primary-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={world.selectedCountry.flag} alt={world.selectedCountry.name} className="w-10 h-7 rounded shadow-sm object-cover border border-foreground-200/10" loading="lazy" />
                    <div>
                      <p className="text-sm font-semibold text-foreground-200">{world.selectedCountry.name}</p>
                      <p className="text-2xs text-foreground-500">{world.selectedCountry.subregion || world.selectedCountry.region}</p>
                    </div>
                    <span className="ml-auto text-2xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Autocompletado</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-foreground-600">Codigo</span>
                      <p className="text-foreground-300 font-mono font-medium mt-0.5">{world.selectedCountry.code}</p>
                    </div>
                    <div>
                      <span className="text-foreground-600">ISO</span>
                      <p className="text-foreground-300 font-mono font-medium mt-0.5">{world.selectedCountry.iso_code}</p>
                    </div>
                    <div>
                      <span className="text-foreground-600">Moneda</span>
                      <p className="text-foreground-300 font-medium mt-0.5">{world.selectedCountry.currency}</p>
                    </div>
                    <div>
                      <span className="text-foreground-600">Zona horaria</span>
                      <p className="text-foreground-300 font-medium mt-0.5">{world.selectedCountry.timezone}</p>
                    </div>
                  </div>
                </div>
              )}

              {(!world.selectedCountry || editing) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Costa Rica" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Codigo (2 letras)</label>
                      <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="CR" maxLength={2} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Codigo ISO (3 letras)</label>
                      <input type="text" value={iso} onChange={(e) => setIso(e.target.value.toUpperCase())} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="CRI" maxLength={3} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Moneda</label>
                      <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="CRC" maxLength={3} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Zona horaria</label>
                      <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="America/Costa_Rica" />
                    </div>
                  </div>
                </>
              )}

              {flagUrl && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-background-100 border border-secondary-500/10">
                  <img src={flagUrl} alt="Bandera" className="w-12 h-8 rounded shadow-sm object-cover border border-foreground-200/10" />
                  <div>
                    <p className="text-sm font-medium text-foreground-300">{name}</p>
                    <p className="text-2xs text-foreground-500">{code} / {iso}</p>
                  </div>
                </div>
              )}

              {apiFailed && !editing && !world.selectedCountry && (
                <div className="px-4 py-3 rounded-lg bg-secondary-500/10 border border-secondary-500/20">
                  <p className="text-sm text-foreground-400 mb-2">Modo manual: completa los campos del pais manualmente</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Costa Rica" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Codigo (2 letras)</label>
                      <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="CR" maxLength={2} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Codigo ISO</label>
                      <input type="text" value={iso} onChange={(e) => setIso(e.target.value.toUpperCase())} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="CRI" maxLength={3} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Moneda</label>
                      <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="CRC" maxLength={3} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !canSave} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear pais'}
              </button>
            </div>
          </div>
        </div>
      )}

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