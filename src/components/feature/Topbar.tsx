import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/hooks/useTenantContext';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/services/supabase/client';

interface TopbarProps { sidebarCollapsed: boolean; }

interface Notification {
  id: string; type: string; title: string; message: string; status: string;
  severity: string; entity_type: string | null; created_at: string; read_at: string | null;
}

const severityIcons: Record<string, { icon: string; color: string; bg: string }> = {
  info: { icon: 'ri-information-line', color: 'text-primary-400', bg: 'bg-primary-500/10' },
  success: { icon: 'ri-check-line', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  warning: { icon: 'ri-error-warning-line', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  critical: { icon: 'ri-alert-fill', color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function Topbar({ sidebarCollapsed }: TopbarProps) {
  const navigate = useNavigate();
  const ctx = useTenantContext();
  const { user, platformUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const contextPanelRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!platformUser?.id) return;
    setNotifLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, status, severity, entity_type, created_at, read_at')
        .eq('user_id', platformUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n) => n.status === 'unread').length);
      }
    } catch { /* */ } finally { setNotifLoading(false); }
  }, [platformUser?.id]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const refs = [
        { ref: contextPanelRef, set: setShowContextPanel },
        { ref: notifRef, set: setShowNotifications },
        { ref: userRef, set: setShowUserMenu },
      ];
      refs.forEach(({ ref, set }) => {
        if (ref.current && !ref.current.contains(e.target as Node)) set(false);
      });
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ status: 'read', read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: 'read', read_at: new Date().toISOString() } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!platformUser?.id) return;
    await supabase.from('notifications').update({ status: 'read', read_at: new Date().toISOString() }).eq('user_id', platformUser.id).eq('status', 'unread');
    setNotifications((prev) => prev.map((n) => n.status === 'unread' ? { ...n, status: 'read', read_at: new Date().toISOString() } : n));
    setUnreadCount(0);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  // ─── Cascade option builders ──────────────────────────────────────────

  const countryOptions = useMemo(() =>
    ctx.accessibleCountries.map((c) => ({ id: c.id, label: c.name })),
  [ctx.accessibleCountries]);

  const tenantOptions = useMemo(() => {
    if (!ctx.currentCountryId || ctx.currentCountryId === 'all') {
      return ctx.accessibleTenants.map((t) => ({ id: t.tenant_id, label: t.tenant_name }));
    }
    const whForCountry = ctx.accessibleWarehouses.filter((w) => w.country_id === ctx.currentCountryId);
    const tenantIds = new Set(whForCountry.map((w) => w.tenant_id));
    return ctx.accessibleTenants.filter((t) => tenantIds.has(t.tenant_id)).map((t) => ({ id: t.tenant_id, label: t.tenant_name }));
  }, [ctx.currentCountryId, ctx.accessibleTenants, ctx.accessibleWarehouses]);

  const warehouseOptions = useMemo(() => {
    let whs = ctx.accessibleWarehouses;
    if (ctx.currentCountryId && ctx.currentCountryId !== 'all') {
      whs = whs.filter((w) => w.country_id === ctx.currentCountryId);
    }
    if (ctx.currentTenantId && ctx.currentTenantId !== 'all') {
      whs = whs.filter((w) => w.tenant_id === ctx.currentTenantId);
    }
    return whs.map((w) => ({ id: w.id, label: w.name }));
  }, [ctx.currentCountryId, ctx.currentTenantId, ctx.accessibleWarehouses]);

  const clientOptions = useMemo(() => {
    let cls = ctx.accessibleClients;
    if (ctx.currentTenantId && ctx.currentTenantId !== 'all') {
      cls = cls.filter((c) => c.tenant_id === ctx.currentTenantId);
    }
    if (ctx.currentWarehouseId && ctx.currentWarehouseId !== 'all') {
      cls = cls.filter((c) => c.warehouse_id === ctx.currentWarehouseId);
    }
    return cls.map((c) => ({ id: c.id, label: c.name }));
  }, [ctx.currentTenantId, ctx.currentWarehouseId, ctx.accessibleClients]);

  // ─── Context path for the enterprise button ───────────────────────────

  const contextPath = useMemo(() =>
    [
      ctx.currentCountryName,
      ctx.currentTenantName,
      ctx.currentWarehouseName,
      ctx.currentClientName,
    ].filter(Boolean).join(' / ') || 'Sin contexto',
    [ctx.currentCountryName, ctx.currentTenantName, ctx.currentWarehouseName, ctx.currentClientName]
  );

  const hasContext = ctx.currentCountryName || ctx.currentTenantName || ctx.currentWarehouseName || ctx.currentClientName;
  const showContextButton = ctx.accessibleCountries.length > 0;

  // ─── Select helpers ───────────────────────────────────────────────────

  const selectClass = "w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-2.5 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40 cursor-pointer";

  return (
    <>
      <header
        className={`
          fixed top-0 right-0 h-[60px] z-30
          bg-background-50/80 backdrop-blur-md border-b border-secondary-500/10
          flex items-center justify-between px-3 md:px-6
          transition-all duration-300 ease-out
          ${sidebarCollapsed ? 'left-[68px]' : 'left-[260px]'}
        `}
      >
        {/* Left: empty — context is now on the right */}
        <div />

        {/* Right: Context + Search + Notifications + User */}
        <div className="flex items-center gap-1.5">
          {/* Search (desktop) */}
          <div className="hidden sm:block relative max-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-xs"></i>
            </span>
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..." className="w-full h-8 bg-background-100 border border-secondary-500/20 rounded-lg pl-8 pr-2 text-xs text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
            />
          </div>

          {/* ─── Enterprise Context Button ─── */}
          {showContextButton && (
            <div className="relative" ref={contextPanelRef}>
              <button
                onClick={() => setShowContextPanel(!showContextPanel)}
                className={`flex items-center gap-2 h-8 px-2.5 rounded-lg border transition-all text-xs whitespace-nowrap cursor-pointer ${
                  ctx.showAll
                    ? 'border-accent-500/40 bg-accent-500/5 hover:border-accent-500/60'
                    : 'border-secondary-500/20 bg-background-100 hover:border-secondary-500/40'
                }`}
                title="Contexto organizacional"
              >
                <span className={`w-3.5 h-3.5 flex items-center justify-center ${
                  ctx.showAll ? 'text-accent-400' : 'text-foreground-500'
                }`}>
                  <i className={ctx.showAll ? 'ri-eye-fill' : 'ri-stack-line'}></i>
                </span>
                <span className={`max-w-[140px] truncate ${hasContext ? 'text-foreground-300 font-medium' : 'text-foreground-600'}`}>
                  {contextPath}
                </span>
                <span className={`w-3 h-3 flex items-center justify-center ${
                  ctx.showAll ? 'text-accent-400' : 'text-foreground-500'
                }`}>
                  <i className="ri-arrow-down-s-line text-xs"></i>
                </span>
              </button>

              {/* Context Panel Dropdown — like AWS/Azure org selector */}
              {showContextPanel && (
                <div className="absolute right-0 top-full mt-2 w-72 glass-panel-strong rounded-xl animate-scale-in overflow-hidden z-50 shadow-2xl">
                  {/* Header: mode-sensitive */}
                  <div className={`px-4 py-3 border-b ${
                    ctx.showAll ? 'border-accent-500/20 bg-accent-500/5' : 'border-secondary-500/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-4 h-4 flex items-center justify-center ${
                        ctx.showAll ? 'text-accent-400' : 'text-foreground-500'
                      }`}>
                        <i className={ctx.showAll ? 'ri-eye-fill' : 'ri-stack-line'}></i>
                      </span>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${
                        ctx.showAll ? 'text-accent-400' : 'text-foreground-400'
                      }`}>
                        {ctx.showAll ? 'Modo Auditoría' : 'Modo Operativo'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground-200 truncate">
                      {ctx.showAll ? 'Contexto de trabajo: ' : ''}{contextPath}
                    </p>
                    {ctx.showAll && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse"></span>
                        <p className="text-2xs text-accent-400/80 font-medium">
                          Mostrando toda la organización
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto py-1 space-y-1">
                    {/* País */}
                    <div className="px-4 py-2">
                      <label className="block text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                        <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-emerald-400"><i className="ri-global-line text-xs"></i></span>
                        País
                      </label>
                      <select
                        value={ctx.currentCountryId || ''}
                        onChange={(e) => { ctx.switchCountry(e.target.value); }}
                        className={selectClass}
                      >
                        <option value="">Todos los países</option>
                        {countryOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tenant */}
                    <div className="px-4 py-2">
                      <label className="block text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                        <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-primary-400"><i className="ri-building-line text-xs"></i></span>
                        Tenant
                      </label>
                      <select
                        value={ctx.currentTenantId || ''}
                        onChange={(e) => { ctx.switchTenant(e.target.value); }}
                        disabled={!ctx.currentCountryId || tenantOptions.length === 0}
                        className={selectClass}
                      >
                        <option value="">Todos los tenants</option>
                        {tenantOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Almacén */}
                    <div className="px-4 py-2">
                      <label className="block text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                        <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-amber-400"><i className="ri-store-2-line text-xs"></i></span>
                        Almacén
                      </label>
                      <select
                        value={ctx.currentWarehouseId || ''}
                        onChange={(e) => { ctx.switchWarehouse(e.target.value); }}
                        disabled={!ctx.currentTenantId || warehouseOptions.length === 0}
                        className={selectClass}
                      >
                        <option value="">Todos los almacenes</option>
                        {warehouseOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Cliente */}
                    <div className="px-4 py-2">
                      <label className="block text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                        <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-violet-400"><i className="ri-building-2-line text-xs"></i></span>
                        Cliente
                      </label>
                      <select
                        value={ctx.currentClientId || ''}
                        onChange={(e) => { ctx.switchClient(e.target.value); }}
                        disabled={!ctx.currentTenantId || clientOptions.length === 0}
                        className={selectClass}
                      >
                        <option value="">Todos los clientes</option>
                        {clientOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Super Admin: Mode toggle (Operativo / Auditoría) */}
                  {ctx.isSuperAdmin && (
                    <div className={`border-t pt-2 mt-1 px-4 py-2 ${
                      ctx.showAll ? 'border-accent-500/20 bg-accent-500/3' : 'border-accent-500/10'
                    }`}>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={ctx.showAll}
                            onChange={ctx.toggleShowAll}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 rounded-full bg-secondary-400/30 peer-checked:bg-accent-500 transition-colors duration-200"></div>
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform duration-200"></div>
                        </div>
                        <span className={`text-sm font-medium transition-colors ${
                          ctx.showAll ? 'text-accent-400' : 'text-foreground-400 group-hover:text-foreground-200'
                        }`}>
                          <span className="w-3.5 h-3.5 inline-flex items-center justify-center mr-1.5">
                            <i className={`${ctx.showAll ? 'ri-eye-fill text-accent-400' : 'ri-eye-off-line'} text-xs`}></i>
                          </span>
                          {ctx.showAll ? 'Modo Auditoría' : 'Modo Operativo'}
                        </span>
                      </label>
                      {ctx.showAll && (
                        <p className="text-2xs text-accent-400/60 mt-1.5 ml-10">
                          Viendo todos los registros. El contexto solo aplica en formularios.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Clear context / Reset mode */}
                  {hasContext && (
                    <div className="border-t border-secondary-500/10 p-2">
                      <button
                        onClick={() => {
                          if (ctx.showAll) ctx.toggleShowAll();
                          ctx.clearFullContext();
                          setShowContextPanel(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors cursor-pointer"
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-arrow-go-back-line"></i></span>
                        Volver a modo operativo
                      </button>
                    </div>
                  )}
                  {!hasContext && ctx.showAll && (
                    <div className="border-t border-secondary-500/10 p-2">
                      <button
                        onClick={() => { ctx.toggleShowAll(); setShowContextPanel(false); }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors cursor-pointer"
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-arrow-go-back-line"></i></span>
                        Volver a modo operativo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) loadNotifications(); }}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer"
            >
              <i className="ri-notification-3-line text-base"></i>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-red-400 text-background-50 dark:text-foreground-950 text-2xs font-bold flex items-center justify-center ring-2 ring-background-50">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 glass-panel-strong rounded-xl animate-scale-in overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-500/10">
                  <p className="text-sm font-medium text-foreground-200">Notificaciones</p>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-2xs text-primary-400 hover:text-primary-300 font-medium whitespace-nowrap cursor-pointer">Marcar todas</button>
                  )}
                </div>
                {notifLoading ? (
                  <div className="p-6 text-center"><span className="w-5 h-5 flex items-center justify-center mx-auto"><i className="ri-loader-4-line animate-spin text-foreground-500"></i></span></div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center"><p className="text-xs text-foreground-500">Sin notificaciones</p></div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((n) => {
                      const sev = severityIcons[n.severity] || severityIcons.info;
                      return (
                        <button key={n.id} onClick={() => { if (n.status === 'unread') markAsRead(n.id); }}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-background-200/50 transition-colors border-b border-secondary-500/5 ${n.status === 'unread' ? 'bg-primary-500/3' : ''}`}>
                          <div className={`w-7 h-7 rounded-lg ${sev.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <i className={`${sev.icon} ${sev.color} text-xs`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground-300">{n.title}</p>
                            <p className="text-2xs text-foreground-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-2xs text-foreground-600 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          {n.status === 'unread' && <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0 mt-2"></span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-1.5 h-8 px-1.5 rounded-lg hover:bg-background-200/50 transition-all cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-accent-500/20 border border-accent-500/25 flex items-center justify-center">
                <span className="text-accent-400 text-2xs font-semibold">
                  {platformUser?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  {platformUser?.last_name?.[0] || ''}
                </span>
              </div>
              <span className="w-3 h-3 flex items-center justify-center text-foreground-500"><i className="ri-arrow-down-s-line text-xs"></i></span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 glass-panel-strong rounded-xl animate-scale-in overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-secondary-500/10">
                  <p className="text-sm font-medium text-foreground-200">
                    {platformUser?.first_name ? `${platformUser.first_name} ${platformUser.last_name || ''}` : user?.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-xs text-foreground-500 mt-0.5">{user?.email || ''}</p>
                </div>
                <div className="py-1">
                  {[
                    { label: 'Mi perfil', icon: 'ri-user-settings-line', path: '/profile' },
                    { label: 'Mis Accesos', icon: 'ri-user-received-line', path: '/my-access' },
                    { label: 'Seguridad', icon: 'ri-shield-keyhole-line', path: '/security-settings' },
                  ].map((item) => (
                    <button key={item.path} onClick={() => { navigate(item.path); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors">
                      <span className="w-4 h-4 flex items-center justify-center"><i className={item.icon}></i></span>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-secondary-500/10 pt-1 pb-1">
                  <p className="px-4 py-1.5 text-2xs font-semibold text-foreground-600 uppercase tracking-wider">Tema</p>
                  {([{ key: 'light', icon: 'ri-sun-line', label: 'Claro' }, { key: 'dark', icon: 'ri-moon-line', label: 'Oscuro' }, { key: 'system', icon: 'ri-computer-line', label: 'Sistema' }] as const).map(({ key, icon, label }) => (
                    <button key={key} onClick={() => setTheme(key)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${theme === key ? 'text-primary-400 bg-primary-500/5 font-medium' : 'text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50'}`}>
                      <span className="w-4 h-4 flex items-center justify-center"><i className={icon}></i></span>
                      {label}
                      {theme === key && <span className="ml-auto w-4 h-4 flex items-center justify-center"><i className="ri-check-line text-xs"></i></span>}
                    </button>
                  ))}
                </div>
                <div className="border-t border-secondary-500/10 py-1">
                  <button onClick={async () => { setShowUserMenu(false); await logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors">
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-logout-box-r-line"></i></span>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}