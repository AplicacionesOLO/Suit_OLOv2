import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';

interface DashboardStats {
  activeTenants: number;
  activeCountries: number;
  activeWarehouses: number;
  activeClients: number;
  activeUsers: number;
  activeApplications: number;
  activeInstances: number;
  assignedAccesses: number;
  revokedAccesses: number;
  pendingInvitations: number;
  recentAlerts: number;
}

interface AuditEvent {
  id: string;
  action: string;
  entity_type: string;
  severity: string;
  created_at: string;
  details: Record<string, unknown> | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { platformUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeTenants: 0, activeCountries: 0, activeWarehouses: 0, activeClients: 0,
    activeUsers: 0, activeApplications: 0, activeInstances: 0,
    assignedAccesses: 0, revokedAccesses: 0, pendingInvitations: 0, recentAlerts: 0,
  });
  const [recentAudit, setRecentAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { count: tCount }, { count: cCount }, { count: wCount }, { count: clCount },
        { count: uCount }, { count: aCount }, { count: iCount },
        { count: aaCount }, { count: raCount }, { count: piCount },
        { data: alerts }, { data: audit },
      ] = await Promise.all([
        supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('countries').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('platform_users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
        supabase.from('application_instances').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
        supabase.from('user_application_access').select('*', { count: 'exact', head: true }).eq('access_status', 'assigned'),
        supabase.from('user_application_access').select('*', { count: 'exact', head: true }).eq('access_status', 'revoked'),
        supabase.from('user_invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('audit_logs').select('id, action, entity_type, severity, created_at').eq('severity', 'critical').order('created_at', { ascending: false }).limit(10),
        supabase.from('audit_logs').select('id, action, entity_type, severity, created_at, details').order('created_at', { ascending: false }).limit(10),
      ]);

      setStats({
        activeTenants: tCount || 0,
        activeCountries: cCount || 0,
        activeWarehouses: wCount || 0,
        activeClients: clCount || 0,
        activeUsers: uCount || 0,
        activeApplications: aCount || 0,
        activeInstances: iCount || 0,
        assignedAccesses: aaCount || 0,
        revokedAccesses: raCount || 0,
        pendingInvitations: piCount || 0,
        recentAlerts: (alerts || []).length,
      });
      setRecentAudit((audit || []) as AuditEvent[]);
    } catch (err) {
      setError('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const statCards = [
    { label: 'Tenants activos', value: stats.activeTenants, icon: 'ri-building-4-line', bg: 'bg-primary-500/10', text: 'text-primary-400', path: '/tenants' },
    { label: 'Paises activos', value: stats.activeCountries, icon: 'ri-global-line', bg: 'bg-violet-500/10', text: 'text-violet-400', path: '/countries' },
    { label: 'Almacenes', value: stats.activeWarehouses, icon: 'ri-store-2-line', bg: 'bg-cyan-500/10', text: 'text-cyan-400', path: '/warehouses' },
    { label: 'Clientes', value: stats.activeClients, icon: 'ri-building-2-line', bg: 'bg-rose-500/10', text: 'text-rose-400', path: '/clients' },
    { label: 'Usuarios activos', value: stats.activeUsers, icon: 'ri-team-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400', path: '/users' },
    { label: 'Aplicaciones', value: stats.activeApplications, icon: 'ri-apps-2-line', bg: 'bg-amber-500/10', text: 'text-amber-400', path: '/applications' },
    { label: 'Instancias activas', value: stats.activeInstances, icon: 'ri-server-line', bg: 'bg-accent-500/10', text: 'text-accent-400', path: '/instances' },
    { label: 'Accesos asignados', value: stats.assignedAccesses, icon: 'ri-check-double-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400', path: '/assignments' },
  ];

  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'info': return 'bg-primary-500/10 text-primary-400 border-primary-500/20';
      default: return 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20';
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)}d`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 h-20 bg-background-100/50" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Dashboard</h1>
            <p className="text-sm text-foreground-500 mt-1">
              Resumen operativo de la plataforma{' '}
              <span className="text-primary-400 font-medium">Suite OLO</span>
            </p>
          </div>
          {error && (
            <button onClick={loadData} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line"></i></span>
              Reintentar
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="glass-panel rounded-xl p-4 cursor-pointer hover:border-secondary-500/20 transition-all"
              onClick={() => navigate(stat.path)}
            >
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

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <i className="ri-close-circle-line text-red-400 text-base"></i>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground-100">{stats.revokedAccesses}</div>
              <div className="text-2xs text-foreground-600">Accesos revocados</div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <i className="ri-mail-send-line text-amber-400 text-base"></i>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground-100">{stats.pendingInvitations}</div>
              <div className="text-2xs text-foreground-600">Invitaciones pendientes</div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <i className="ri-alert-fill text-red-400 text-base"></i>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground-100">{stats.recentAlerts}</div>
              <div className="text-2xs text-foreground-600">Alertas criticas</div>
            </div>
          </div>
        </div>

        {/* Quick Actions + Recent Audit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">Acciones rapidas</h2>
              <div className="space-y-2">
                {[
                  { label: 'Usuarios', desc: 'Gestionar e invitar', icon: 'ri-user-add-line', path: '/users', color: 'text-primary-400', bg: 'bg-primary-500/10' },
                  { label: 'Aplicaciones', desc: 'Catalogo de apps', icon: 'ri-apps-2-line', path: '/applications', color: 'text-accent-400', bg: 'bg-accent-500/10' },
                  { label: 'Asignaciones', desc: 'Gestionar accesos', icon: 'ri-link-m', path: '/assignments', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Roles y Perfiles', desc: 'Configurar seguridad', icon: 'ri-shield-user-line', path: '/roles', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Matriz Permisos', desc: 'Permisos SuiteOLO', icon: 'ri-key-2-line', path: '/permissions', color: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { label: 'Auditoria', desc: 'Registros del sistema', icon: 'ri-file-search-line', path: '/audit', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                ].map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-secondary-500/10 bg-background-100 hover:border-secondary-500/20 hover:bg-background-200/40 transition-all text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center shrink-0`}>
                      <i className={`${action.icon} ${action.color} text-base`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground-200">{action.label}</p>
                      <p className="text-2xs text-foreground-600">{action.desc}</p>
                    </div>
                    <span className="ml-auto w-4 h-4 flex items-center justify-center text-foreground-500">
                      <i className="ri-arrow-right-s-line"></i>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="lg:col-span-2">
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-secondary-500/10">
                <h2 className="text-sm font-semibold text-foreground-200">Actividad reciente</h2>
                <button onClick={() => navigate('/audit')} className="text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium">
                  Ver auditoria
                </button>
              </div>

              {recentAudit.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-file-search-line text-foreground-500 text-xl"></i>
                  </div>
                  <p className="text-sm text-foreground-500">Sin actividad registrada</p>
                  <p className="text-xs text-foreground-600 mt-1">Los eventos del sistema apareceran aqui.</p>
                </div>
              ) : (
                <div className="divide-y divide-secondary-500/5">
                  {recentAudit.map((event) => (
                    <div key={event.id} className="px-5 py-3 hover:bg-background-100/30 transition-colors flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${severityBadge(event.severity)} border flex items-center justify-center shrink-0`}>
                        {event.severity === 'critical' ? (
                          <i className="ri-alert-fill text-sm"></i>
                        ) : event.severity === 'warning' ? (
                          <i className="ri-error-warning-line text-sm"></i>
                        ) : (
                          <i className="ri-information-line text-sm"></i>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground-200">{event.action}</span>
                          <span className={`px-1.5 py-0.5 rounded text-2xs font-medium border ${severityBadge(event.severity)}`}>
                            {event.severity}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-500 mt-0.5">{event.entity_type}</p>
                      </div>
                      <span className="text-2xs text-foreground-600 whitespace-nowrap">{timeAgo(event.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}