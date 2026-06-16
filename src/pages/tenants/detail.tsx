import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { fetchTenantById, fetchTenantAuditLogs, type TenantWithCounts, type TenantSettings, type AuditLogEntry } from '@/services/operations/tenantsService';

const statusConfig: Record<string, { label: string; dot: string; badgeBg: string; badgeText: string; border: string }> = {
  active: { label: 'Activo', dot: 'bg-emerald-400', badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400', border: 'border-emerald-500/20' },
  suspended: { label: 'Suspendido', dot: 'bg-amber-400', badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400', border: 'border-amber-500/20' },
  deleted: { label: 'Eliminado', dot: 'bg-red-400', badgeBg: 'bg-red-500/10', badgeText: 'text-red-400', border: 'border-red-500/20' },
};

const severityConfig: Record<string, string> = {
  info: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<TenantWithCounts | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTenantById(id);
      if (result.error) { setError(result.error); return; }
      setTenant(result.data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tenant');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAuditLogs = useCallback(async () => {
    if (!id) return;
    setLogsLoading(true);
    try {
      const result = await fetchTenantAuditLogs(id, 20);
      if (!result.error) setAuditLogs(result.data);
    } catch {
      // Non-blocking
    } finally {
      setLogsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTenant();
    loadAuditLogs();
  }, [loadTenant, loadAuditLogs]);

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="glass-panel rounded-2xl p-8 h-64 bg-background-100/50" />
        </div>
      </AppLayout>
    );
  }

  if (error || !tenant) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <i className="ri-error-warning-line text-red-400 text-2xl"></i>
          </div>
          <h2 className="text-lg font-semibold text-foreground-200 mb-2">Tenant no encontrado</h2>
          <p className="text-sm text-foreground-500 mb-6">{error || 'El tenant solicitado no existe.'}</p>
          <button onClick={() => navigate('/tenants')} className="h-9 px-5 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Volver a tenants</button>
        </div>
      </AppLayout>
    );
  }

  const sc = statusConfig[tenant.status] || statusConfig.active;
  const settings = (tenant.settings || {}) as TenantSettings;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {/* Back + Header */}
        <div>
          <button onClick={() => navigate('/tenants')} className="flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-300 transition-colors mb-3">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-line"></i></span>
            Volver a tenants
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                <i className="ri-building-4-line text-primary-400 text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground-100">{tenant.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">{tenant.code}</code>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${sc.badgeBg} ${sc.badgeText} ${sc.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                    {sc.label}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => navigate(`/tenants?edit=${tenant.id}`)} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line"></i></span>
              Editar
            </button>
          </div>
        </div>

        {/* General Information */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground-200 mb-4">Informacion General</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Nombre</span>
              <p className="text-sm text-foreground-200 mt-1 font-medium">{tenant.name}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Codigo</span>
              <p className="text-sm text-foreground-200 mt-1 font-mono">{tenant.code}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Estado</span>
              <p className="mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${sc.badgeBg} ${sc.badgeText} ${sc.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                  {sc.label}
                </span>
              </p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Plan</span>
              <p className="text-sm text-foreground-200 mt-1 font-medium">{settings.plan || 'Free'}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Dominio</span>
              <p className="text-sm text-foreground-200 mt-1">{tenant.domain || '—'}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Email</span>
              <p className="text-sm text-foreground-200 mt-1">{settings.primary_email || '—'}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Telefono</span>
              <p className="text-sm text-foreground-200 mt-1">{settings.phone || '—'}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Sitio web</span>
              <p className="text-sm text-foreground-200 mt-1">{settings.website ? <a href={settings.website} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 transition-colors">{settings.website}</a> : '—'}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Zona horaria</span>
              <p className="text-sm text-foreground-200 mt-1">{settings.timezone || '—'}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Idioma</span>
              <p className="text-sm text-foreground-200 mt-1">{settings.language ? settings.language.toUpperCase() : '—'}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Moneda</span>
              <p className="text-sm text-foreground-200 mt-1">{settings.currency || '—'}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Creado</span>
              <p className="text-sm text-foreground-200 mt-1">{formatDate(tenant.created_at)}</p>
            </div>
            <div>
              <span className="text-2xs text-foreground-600 uppercase tracking-wider">Actualizado</span>
              <p className="text-sm text-foreground-200 mt-1">{formatDate(tenant.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground-200 mb-4">Estadisticas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Paises', value: tenant.country_count, icon: 'ri-global-line', bg: 'bg-violet-500/10', text: 'text-violet-400', path: '/countries' },
              { label: 'Almacenes', value: tenant.warehouse_count, icon: 'ri-store-2-line', bg: 'bg-cyan-500/10', text: 'text-cyan-400', path: '/warehouses' },
              { label: 'Clientes', value: tenant.client_count, icon: 'ri-building-2-line', bg: 'bg-rose-500/10', text: 'text-rose-400', path: '/clients' },
              { label: 'Usuarios', value: tenant.user_count, icon: 'ri-team-line', bg: 'bg-amber-500/10', text: 'text-amber-400', path: '/users' },
              { label: 'Aplicaciones', value: tenant.instance_count, icon: 'ri-apps-2-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400', path: '/instances' },
            ].map((stat) => (
              <button key={stat.label} onClick={() => navigate(stat.path)} className="glass-panel rounded-xl p-4 hover:border-secondary-500/20 transition-all text-left cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                    <i className={`${stat.icon} ${stat.text} text-base`}></i>
                  </div>
                  <div className="text-2xl font-bold text-foreground-100">{stat.value}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-500">{stat.label}</span>
                  <span className="w-4 h-4 flex items-center justify-center text-foreground-600 group-hover:text-foreground-400 transition-colors">
                    <i className="ri-arrow-right-s-line text-sm"></i>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tenant Settings */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground-200 mb-4">Configuracion del Tenant</h2>
          {tenant.settings && Object.keys(tenant.settings).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(tenant.settings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 rounded-lg bg-background-100 border border-secondary-500/10">
                  <span className="text-xs text-foreground-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-foreground-300">{String(value || '—')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="w-10 h-10 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-settings-3-line text-foreground-500 text-lg"></i>
              </span>
              <p className="text-sm text-foreground-500">Sin configuracion adicional</p>
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground-200 mb-4">Linea de Actividad</h2>
          {logsLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-background-100 rounded-lg" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <span className="w-10 h-10 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-history-line text-foreground-500 text-lg"></i>
              </span>
              <p className="text-sm text-foreground-500">Sin actividad registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log, idx) => {
                const sev = severityConfig[log.severity] || severityConfig.info;
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-background-100 border border-secondary-500/5 hover:border-secondary-500/15 transition-all">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${log.severity === 'error' || log.severity === 'critical' ? 'bg-red-400' : log.severity === 'warning' ? 'bg-amber-400' : 'bg-accent-400'}`}></div>
                      {idx < auditLogs.length - 1 && <div className="w-px h-full bg-secondary-500/10 mt-1"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground-300">{log.action}</span>
                        <span className={`px-1.5 py-0.5 rounded text-2xs font-medium border ${sev}`}>{log.severity}</span>
                        {log.entity_type && (
                          <span className="text-2xs text-foreground-600 capitalize">{log.entity_type.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-foreground-500 mt-0.5 line-clamp-1">
                          {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-2xs text-foreground-600">{formatDate(log.created_at)}</span>
                        <span className="text-2xs text-foreground-600">{log.user_email || 'Sistema'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}