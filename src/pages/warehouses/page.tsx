import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useWarehouses } from '@/hooks/useWarehouses';
import type { WarehouseWithDetails } from '@/services/operations/warehousesService';

export default function WarehousesPage() {
  const { warehouses, countries, loading, addWarehouse, editWarehouse, toggleStatus } = useWarehouses();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WarehouseWithDetails | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<WarehouseWithDetails | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', address: '', country_id: '', tenant_id: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const countryMap = useMemo(() => new Map(countries.map((c) => [c.id, c])), [countries]);

  const filtered = useMemo(() => {
    let result = warehouses;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q) || (w.address || '').toLowerCase().includes(q) || w.country_name.toLowerCase().includes(q));
    }
    if (filterCountry) result = result.filter((w) => w.country_id === filterCountry);
    if (filterStatus) result = result.filter((w) => w.status === filterStatus);
    return result;
  }, [warehouses, searchQuery, filterCountry, filterStatus]);

  const openCreate = () => {
    const first = countries[0];
    setFormData({ name: '', code: '', address: '', country_id: first?.id || '', tenant_id: first?.tenant_id || '' });
    setFormError('');
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (w: WarehouseWithDetails) => {
    setFormData({ name: w.name, code: w.code, address: w.address || '', country_id: w.country_id, tenant_id: w.tenant_id });
    setFormError('');
    setEditing(w);
    setShowModal(true);
  };

  const handleCountryChange = (countryId: string) => {
    const country = countryMap.get(countryId);
    setFormData({ ...formData, country_id: countryId, tenant_id: country?.tenant_id || '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim() || !formData.country_id) {
      setFormError('Nombre, codigo y pais son requeridos');
      return;
    }
    setSaving(true);
    setFormError('');
    const result = editing
      ? await editWarehouse(editing.id, { name: formData.name.trim(), code: formData.code.trim().toUpperCase(), address: formData.address.trim(), country_id: formData.country_id, tenant_id: formData.tenant_id })
      : await addWarehouse({ name: formData.name.trim(), code: formData.code.trim().toUpperCase(), address: formData.address.trim(), country_id: formData.country_id, tenant_id: formData.tenant_id });
    setSaving(false);
    if (result.error) { setFormError(result.error); return; }
    setShowModal(false);
  };

  const handleToggle = async () => {
    if (!confirmToggle) return;
    await toggleStatus(confirmToggle.id, confirmToggle.status);
    setConfirmToggle(null);
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
            <h1 className="text-xl font-bold text-foreground-100">Almacenes</h1>
            <p className="text-sm text-foreground-500 mt-1">Gestiona los almacenes por pais. Cada almacen agrupa clientes y operaciones logisticas.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Nuevo almacen
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total almacenes', value: warehouses.length, icon: 'ri-store-2-line', bg: 'bg-accent-500/10', text: 'text-accent-400' },
            { label: 'Almacenes activos', value: warehouses.filter((w) => w.status === 'active').length, icon: 'ri-checkbox-circle-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Paises cubiertos', value: new Set(warehouses.map((w) => w.country_id)).size, icon: 'ri-global-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Clientes asociados', value: warehouses.reduce((s, w) => s + w.client_count, 0), icon: 'ri-building-2-line', bg: 'bg-violet-500/10', text: 'text-violet-400' },
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
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar almacenes..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los paises</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Almacen</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Codigo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Pais</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Direccion</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Clientes</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Creado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                          <i className="ri-store-2-line text-accent-400 text-base"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground-200">{w.name}</p>
                          <p className="text-2xs text-foreground-600 mt-0.5">{w.tenant_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">{w.code}</code></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-foreground-300">{w.country_name}</span>
                        <span className="text-2xs text-foreground-600">({w.country_code})</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-xs text-foreground-400 max-w-[200px] line-clamp-1">{w.address || '—'}</span></td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${w.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                        {w.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center"><span className="text-sm font-medium text-foreground-300">{w.client_count}</span></td>
                    <td className="px-5 py-3.5"><span className="text-xs text-foreground-500">{new Date(w.created_at).toLocaleDateString()}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(w)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" title="Editar"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line text-sm"></i></span></button>
                        <button onClick={() => setConfirmToggle(w)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${w.status === 'active' ? 'text-foreground-500 hover:text-amber-400 hover:bg-amber-500/10' : 'text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`} title={w.status === 'active' ? 'Desactivar' : 'Activar'}>
                          <span className="w-4 h-4 flex items-center justify-center"><i className={`${w.status === 'active' ? 'ri-toggle-line' : 'ri-toggle-fill'} text-sm`}></i></span>
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
                  <i className="ri-store-2-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">No se encontraron almacenes</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {warehouses.length} almacenes</span>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">{editing ? 'Editar almacen' : 'Nuevo almacen'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"><span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span></button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Pais</label>
                <select value={formData.country_id} onChange={(e) => handleCountryChange(e.target.value)} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                  <option value="">Seleccionar pais</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Centro de Distribucion Central" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Codigo</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" placeholder="CDC-CR" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Direccion</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Ej: Autopista General Canas, Alajuela 20101" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50">
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear almacen'}
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
            <h3 className="text-base font-semibold text-foreground-200 mb-2">{confirmToggle.status === 'active' ? 'Desactivar almacen' : 'Activar almacen'}</h3>
            <p className="text-sm text-foreground-500 mb-6">
              {confirmToggle.status === 'active'
                ? `Al desactivar este almacen, todos sus clientes asociados quedaran inaccesibles.`
                : `Se reactivara el almacen y todos sus recursos asociados.`}
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