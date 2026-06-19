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

// ─── Dropdown helpers ───────────────────────────────────────────────────

function ContextDropdown({
  refEl,
  open,
  label,
  currentName,
  currentId,
  options,
  onSelect,
  onClear,
  overrideActive,
  loading,
  activeColor,
}: {
  refEl: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  label: string;
  currentName: string;
  currentId: string | null;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  onClear?: () => void;
  overrideActive?: boolean;
  loading?: string | null;
  activeColor?: string;
}) {
  return open ? (
    <div className="absolute left-0 top-full mt-2 w-56 glass-panel-strong rounded-xl animate-scale-in overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-secondary-500/10">
        <p className="text-xs font-medium text-foreground-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground-200">{currentName || '—'}</p>
      </div>
      <div className="max-h-56 overflow-y-auto py-1">
        {options.map((opt) => {
          const isCurrent = opt.id === currentId;
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-background-200/50 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isCurrent ? (activeColor || 'bg-emerald-400') : 'bg-secondary-500/40'}`}></span>
              <span className={`flex-1 ${isCurrent ? 'text-foreground-200 font-medium' : 'text-foreground-500'}`}>{opt.label}</span>
              {isCurrent && <span className="text-2xs text-emerald-400 font-medium">Activo</span>}
            </button>
          );
        })}
        {options.length === 0 && (
          <p className="px-4 py-4 text-xs text-foreground-600 italic text-center">Sin opciones disponibles</p>
        )}
      </div>
      {overrideActive && onClear && (
        <div className="border-t border-secondary-500/10 p-2">
          <button onClick={onClear} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors">
            <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-arrow-go-back-line"></i></span>
            Limpiar contexto
          </button>
        </div>
      )}
    </div>
  ) : null;
}

// ─── Main component ─────────────────────────────────────────────────────

export default function Topbar({ sidebarCollapsed }: TopbarProps) {
  const navigate = useNavigate();
  const ctx = useTenantContext();
  const { user, platformUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCountry, setShowCountry] = useState(false);
  const [showTenant, setShowTenant] = useState(false);
  const [showWarehouse, setShowWarehouse] = useState(false);
  const [showClient, setShowClient] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  const countryRef = useRef<HTMLDivElement>(null);
  const tenantRef = useRef<HTMLDivElement>(null);
  const warehouseRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

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

  // Click-outside
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const refs = [
        { ref: countryRef, set: setShowCountry },
        { ref: tenantRef, set: setShowTenant },
        { ref: warehouseRef, set: setShowWarehouse },
        { ref: clientRef, set: setShowClient },
        { ref: notifRef, set: setShowNotifications },
        { ref: userRef, set: setShowUserMenu },
        { ref: mobileRef, set: setMobileContextOpen },
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

  // ─── Cascade option builders ──────────────────────────────────────────

  const countryOptions = useMemo(() =>
    ctx.accessibleCountries.map((c) => ({ id: c.id, label: c.name })),
  [ctx.accessibleCountries]);

  const tenantOptions = useMemo(() => {
    if (!ctx.currentCountryId || ctx.currentCountryId === 'all') {
      return ctx.accessibleTenants.map((t) => ({ id: t.tenant_id, label: t.tenant_name }));
    }
    // Filter tenants associated with current country
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

  // ─── Handlers ─────────────────────────────────────────────────────────

  const wrapSwitch = (fn: (id: string) => Promise<boolean>, id: string, menuClose: () => void) => {
    setSwitching(id);
    menuClose();
    fn(id).finally(() => setSwitching(null));
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

  const showAllSelectors = ctx.accessibleCountries.length > 0;

  // ─── Dropdown contents (reusable) ─────────────────────────────────────

  const countryDropdown = (
    <ContextDropdown
      refEl={countryRef} open={showCountry} label="País activo"
      currentName={ctx.currentCountryName || 'Sin país'} currentId={ctx.currentCountryId}
      options={countryOptions}
      onSelect={(id) => wrapSwitch(ctx.switchCountry, id, () => setShowCountry(false))}
      onClear={ctx.countryOverrideActive ? () => { setShowCountry(false); ctx.clearCountry(); } : undefined}
      overrideActive={ctx.countryOverrideActive} loading={switching} activeColor="bg-emerald-400"
    />
  );

  const tenantDropdown = (
    <ContextDropdown
      refEl={tenantRef} open={showTenant} label={ctx.tenantOverrideActive ? 'Contexto anulado' : 'Tenant activo'}
      currentName={ctx.currentTenantName || 'Sin tenant'} currentId={ctx.currentTenantId}
      options={tenantOptions}
      onSelect={(id) => wrapSwitch(ctx.switchTenant, id, () => setShowTenant(false))}
      onClear={ctx.tenantOverrideActive ? () => { setShowTenant(false); ctx.clearTenant(); } : undefined}
      overrideActive={ctx.tenantOverrideActive} loading={switching} activeColor="bg-primary-400"
    />
  );

  const warehouseDropdown = (
    <ContextDropdown
      refEl={warehouseRef} open={showWarehouse} label="Almacén activo"
      currentName={ctx.currentWarehouseName || 'Sin almacén'} currentId={ctx.currentWarehouseId}
      options={warehouseOptions}
      onSelect={(id) => wrapSwitch(ctx.switchWarehouse, id, () => setShowWarehouse(false))}
      onClear={ctx.warehouseOverrideActive ? () => { setShowWarehouse(false); ctx.clearWarehouse(); } : undefined}
      overrideActive={ctx.warehouseOverrideActive} loading={switching} activeColor="bg-amber-400"
    />
  );

  const clientDropdown = (
    <ContextDropdown
      refEl={clientRef} open={showClient} label="Cliente activo"
      currentName={ctx.currentClientName || 'Sin cliente'} currentId={ctx.currentClientId}
      options={clientOptions}
      onSelect={(id) => wrapSwitch(ctx.switchClient, id, () => setShowClient(false))}
      onClear={ctx.clientOverrideActive ? () => { setShowClient(false); ctx.clearClient(); } : undefined}
      overrideActive={ctx.clientOverrideActive} loading={switching} activeColor="bg-violet-400"
    />
  );

  // ─── Mobile context drawer ────────────────────────────────────────────

  const mobileContextDrawer = mobileContextOpen ? (
    <div className="fixed inset-0 z-50 lg:hidden" ref={mobileRef}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileContextOpen(false)} />
      <div className="absolute bottom-0 left-0 right-0 bg-background-50 rounded-t-2xl p-5 animate-slide-up max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground-200">Contexto operativo</h3>
          <button onClick={() => setMobileContextOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'País', value: ctx.currentCountryName || '—', options: countryOptions, current: ctx.currentCountryId, fn: ctx.switchCountry, clr: ctx.clearCountry, active: ctx.countryOverrideActive, color: 'emerald' },
            { label: 'Tenant', value: ctx.currentTenantName || '—', options: tenantOptions, current: ctx.currentTenantId, fn: ctx.switchTenant, clr: ctx.clearTenant, active: ctx.tenantOverrideActive, color: 'primary' },
            { label: 'Almacén', value: ctx.currentWarehouseName || '—', options: warehouseOptions, current: ctx.currentWarehouseId, fn: ctx.switchWarehouse, clr: ctx.clearWarehouse, active: ctx.warehouseOverrideActive, color: 'amber' },
            { label: 'Cliente', value: ctx.currentClientName || '—', options: clientOptions, current: ctx.currentClientId, fn: ctx.switchClient, clr: ctx.clearClient, active: ctx.clientOverrideActive, color: 'violet' },
          ].map(({ label, value, options, current, fn, clr, active, color }) => (
            <div key={label}>
              <p className="text-2xs font-medium text-foreground-500 uppercase mb-1.5">{label}</p>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { fn(opt.id); setMobileContextOpen(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      opt.id === current
                        ? `bg-${color}-500/15 text-${color}-400 border border-${color}-500/20`
                        : 'bg-background-100 text-foreground-500 border border-secondary-500/10 hover:border-secondary-500/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {active && (
                <button onClick={() => { clr(); setMobileContextOpen(false); }} className="mt-1.5 text-2xs text-foreground-500 hover:text-foreground-300">
                  <i className="ri-arrow-go-back-line text-xs mr-1"></i>Limpiar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  // ─── Render ───────────────────────────────────────────────────────────

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
        {/* Left: Context selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {showAllSelectors && (
            <>
              {/* Desktop: 4 selectors in a row */}
              <div className="hidden lg:flex items-center gap-1">
                {/* País */}
                <div className="relative" ref={countryRef}>
                  <button
                    onClick={() => { setShowCountry(!showCountry); setShowTenant(false); setShowWarehouse(false); setShowClient(false); }}
                    className="flex items-center gap-1.5 h-8 px-2 rounded-lg border border-secondary-500/20 bg-background-100 hover:border-secondary-500/40 transition-all text-xs whitespace-nowrap"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="text-foreground-300 max-w-[70px] truncate">{ctx.currentCountryName || 'País'}</span>
                    <span className="w-3 h-3 flex items-center justify-center text-foreground-500"><i className="ri-arrow-down-s-line text-xs"></i></span>
                  </button>
                  {countryDropdown}
                </div>

                {/* Tenant */}
                <div className="relative" ref={tenantRef}>
                  <button
                    onClick={() => { setShowTenant(!showTenant); setShowCountry(false); setShowWarehouse(false); setShowClient(false); }}
                    className="flex items-center gap-1.5 h-8 px-2 rounded-lg border border-secondary-500/20 bg-background-100 hover:border-secondary-500/40 transition-all text-xs whitespace-nowrap"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ctx.tenantOverrideActive ? 'bg-amber-400' : 'bg-primary-400'}`}></span>
                    <span className="text-foreground-300 max-w-[70px] truncate">{ctx.currentTenantName || 'Tenant'}</span>
                    <span className="w-3 h-3 flex items-center justify-center text-foreground-500"><i className="ri-arrow-down-s-line text-xs"></i></span>
                  </button>
                  {tenantDropdown}
                </div>

                {/* Almacén */}
                <div className="relative" ref={warehouseRef}>
                  <button
                    onClick={() => { setShowWarehouse(!showWarehouse); setShowCountry(false); setShowTenant(false); setShowClient(false); }}
                    disabled={!ctx.currentTenantId || tenantOptions.length === 0}
                    className="flex items-center gap-1.5 h-8 px-2 rounded-lg border border-secondary-500/20 bg-background-100 hover:border-secondary-500/40 transition-all text-xs whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ctx.warehouseOverrideActive ? 'bg-amber-400' : 'bg-amber-400'}`}></span>
                    <span className="text-foreground-300 max-w-[70px] truncate">{ctx.currentWarehouseName || 'Almacén'}</span>
                    <span className="w-3 h-3 flex items-center justify-center text-foreground-500"><i className="ri-arrow-down-s-line text-xs"></i></span>
                  </button>
                  {warehouseDropdown}
                </div>

                {/* Cliente */}
                <div className="relative" ref={clientRef}>
                  <button
                    onClick={() => { setShowClient(!showClient); setShowCountry(false); setShowTenant(false); setShowWarehouse(false); }}
                    disabled={!ctx.currentTenantId || clientOptions.length === 0}
                    className="flex items-center gap-1.5 h-8 px-2 rounded-lg border border-secondary-500/20 bg-background-100 hover:border-secondary-500/40 transition-all text-xs whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ctx.clientOverrideActive ? 'bg-amber-400' : 'bg-violet-400'}`}></span>
                    <span className="text-foreground-300 max-w-[70px] truncate">{ctx.currentClientName || 'Cliente'}</span>
                    <span className="w-3 h-3 flex items-center justify-center text-foreground-500"><i className="ri-arrow-down-s-line text-xs"></i></span>
                  </button>
                  {clientDropdown}
                </div>
              </div>

              {/* Mobile: single context button */}
              <button
                onClick={() => setMobileContextOpen(true)}
                className="lg:hidden flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-secondary-500/20 bg-background-100 hover:border-secondary-500/40 transition-all text-xs whitespace-nowrap"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span className="text-foreground-300 max-w-[80px] truncate">{ctx.currentCountryName || ctx.currentTenantName || 'Contexto'}</span>
                <span className="text-foreground-600">▼</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Search + Notifications + User */}
        <div className="flex items-center gap-1.5 ml-2">
          {/* Search (desktop) */}
          <div className="hidden sm:block relative max-w-[180px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-xs"></i>
            </span>
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..." className="w-full h-8 bg-background-100 border border-secondary-500/20 rounded-lg pl-8 pr-2 text-xs text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
            />
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) loadNotifications(); }}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
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
                    <button onClick={markAllAsRead} className="text-2xs text-primary-400 hover:text-primary-300 font-medium whitespace-nowrap">Marcar todas</button>
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
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-1.5 h-8 px-1.5 rounded-lg hover:bg-background-200/50 transition-all">
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

      {/* Mobile context drawer */}
      {mobileContextDrawer}
    </>
  );
}