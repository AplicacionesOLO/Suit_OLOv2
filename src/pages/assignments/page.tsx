import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { applications } from '@/mocks/applications';
import { categories } from '@/mocks/categories';

const tenants = ['Costa Rica', 'Panamá', 'México', 'Colombia'];

interface Assignment {
  id: string;
  tenantName: string;
  appName: string;
  appId: string;
  categoryName: string;
  role: string;
  status: 'assigned' | 'pending' | 'revoked';
}

const mockAssignments: Assignment[] = [
  { id: 'a-1', tenantName: 'Costa Rica', appName: 'WMS Enterprise', appId: 'app-1', categoryName: 'Logística', role: 'Tenant Admin', status: 'assigned' },
  { id: 'a-2', tenantName: 'Costa Rica', appName: 'CRM Enterprise', appId: 'app-4', categoryName: 'Comercial', role: 'Tenant Admin', status: 'assigned' },
  { id: 'a-3', tenantName: 'Costa Rica', appName: 'BI Analytics', appId: 'app-15', categoryName: 'Analítica', role: 'Tenant Admin', status: 'assigned' },
  { id: 'a-4', tenantName: 'Costa Rica', appName: 'HR Portal', appId: 'app-13', categoryName: 'RRHH', role: 'Country Admin', status: 'assigned' },
  { id: 'a-5', tenantName: 'Costa Rica', appName: 'Facturación', appId: 'app-8', categoryName: 'Finanzas', role: 'Tenant Admin', status: 'assigned' },
  { id: 'a-6', tenantName: 'Panamá', appName: 'WMS Enterprise', appId: 'app-1', categoryName: 'Logística', role: 'Tenant Admin', status: 'assigned' },
  { id: 'a-7', tenantName: 'Panamá', appName: 'CRM Enterprise', appId: 'app-4', categoryName: 'Comercial', role: 'Tenant Admin', status: 'assigned' },
  { id: 'a-8', tenantName: 'Panamá', appName: 'TMS Global', appId: 'app-2', categoryName: 'Logística', role: 'Warehouse Admin', status: 'assigned' },
  { id: 'a-9', tenantName: 'Panamá', appName: 'Facturación', appId: 'app-8', categoryName: 'Finanzas', role: 'Tenant Admin', status: 'pending' },
  { id: 'a-10', tenantName: 'México', appName: 'WMS Enterprise', appId: 'app-1', categoryName: 'Logística', role: 'Tenant Admin', status: 'pending' },
  { id: 'a-11', tenantName: 'Colombia', appName: 'CRM Enterprise', appId: 'app-4', categoryName: 'Comercial', role: 'Tenant Admin', status: 'assigned' },
  { id: 'a-12', tenantName: 'Colombia', appName: 'Facturación', appId: 'app-8', categoryName: 'Finanzas', role: 'Tenant Admin', status: 'revoked' },
];

const statusCfg: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  assigned: { label: 'Asignada', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  pending: { label: 'Pendiente', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  revoked: { label: 'Revocada', dot: 'bg-red-400', bg: 'bg-red-500/10', text: 'text-red-400' },
};

const roles = ['Super Admin', 'Tenant Admin', 'Country Admin', 'Warehouse Admin', 'Client Admin', 'User', 'Auditor'];

export default function AssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = mockAssignments.filter((a) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.appName.toLowerCase().includes(q) && !a.tenantName.toLowerCase().includes(q)) return false;
    }
    if (filterTenant && a.tenantName !== filterTenant) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Asignación de Aplicaciones</h1>
            <p className="text-sm text-foreground-500 mt-1">Administra qué aplicaciones están autorizadas para cada tenant y rol.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Nueva asignación
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Asignadas', value: mockAssignments.filter((a) => a.status === 'assigned').length, color: 'emerald' },
            { label: 'Pendientes', value: mockAssignments.filter((a) => a.status === 'pending').length, color: 'amber' },
            { label: 'Revocadas', value: mockAssignments.filter((a) => a.status === 'revoked').length, color: 'red' },
            { label: 'Total', value: mockAssignments.length, color: 'accent' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-4">
              <div className="text-lg font-bold text-foreground-100">{stat.value}</div>
              <div className={`text-2xs text-${stat.color}-400 mt-0.5`}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar asignaciones..." className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all" />
            </div>
            <select value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los tenants</option>
              {tenants.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
              <option value="">Todos los estados</option>
              <option value="assigned">Asignada</option>
              <option value="pending">Pendiente</option>
              <option value="revoked">Revocada</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Tenant</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Aplicación</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Rol mínimo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const st = statusCfg[a.status];
                  const app = applications.find((ap) => ap.id === a.appId);
                  const cat = categories.find((c) => c.name === a.categoryName);
                  return (
                    <tr key={a.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-foreground-200">{a.tenantName}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {app && (
                            <div className={`w-6 h-6 rounded-md ${app.bgColor} border ${app.borderColor} flex items-center justify-center`}>
                              <i className={`${app.icon} ${app.textColor} text-xs`}></i>
                            </div>
                          )}
                          <span className="text-sm text-foreground-300">{a.appName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {cat && (
                          <span className="text-sm text-foreground-500">{cat.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-2xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/15">{a.role}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'pending' && (
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Aprobar">
                              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-check-line text-sm"></i></span>
                            </button>
                          )}
                          {a.status === 'assigned' && (
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Revocar">
                              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span>
                            </button>
                          )}
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Eliminar">
                            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} asignaciones</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" disabled>
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-s-line text-sm"></i></span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 text-xs font-medium">1</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-s-line text-sm"></i></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">Nueva asignación</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tenant</label>
                  <select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                    {tenants.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Rol mínimo</label>
                  <select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Aplicación</label>
                <select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                  {applications.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.categoryName}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Crear asignación</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}