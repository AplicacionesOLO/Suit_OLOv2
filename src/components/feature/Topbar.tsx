import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/hooks/useTenantContext';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/services/supabase/client';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  severity: string;
  entity_type: string | null;
  created_at: string;
  read_at: string | null;
}

const severityIcons: Record<string, { icon: string; color: string; bg: string }> = {
  info: { icon: 'ri-information-line', color: 'text-primary-400', bg: 'bg-primary-500/10' },
  success: { icon: 'ri-check-line', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  warning: { icon: 'ri-error-warning-line', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  critical: { icon: 'ri-alert-fill', color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function Topbar({ sidebarCollapsed }: TopbarProps) {
  const navigate = useNavigate();
  const tenantCtx = useTenantContext();
  const { user, platformUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const tenantRef = useRef<HTMLDivElement>(null);

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
    } catch {
      // silently handle
    } finally {
      setNotifLoading(false);
    }
  }, [platformUser?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) {
        setShowTenantMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleSwitchTenant = async (tenantId: string) => {
    setSwitchingTenant(tenantId);
    setShowTenantMenu(false);
    await tenantCtx.switchTenant(tenantId);
    setSwitchingTenant(null);
  };

  const handleClearOverride = async () => {
    setShowTenantMenu(false);
    await tenantCtx.clearTenant();
  };

  const canSwitchTenant = (platformUser?.role_level ?? 0) >= 100 && tenantCtx.accessibleTenants.length > 1;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <header
      className={`
        fixed top-0 right-0 h-[60px] z-30
        bg-background-50/80 backdrop-blur-md border-b border-secondary-500/10
        flex items-center justify-between px-4 md:px-6
        transition-all duration-300 ease-out
        ${sidebarCollapsed ? 'left-[68px]' : 'left-[260px]'}
      `}
    >
      {/* Left: Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/15 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-500 hover:text-foreground-300 w-4 h-4 flex items-center justify-center"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Tenant context */}
        {canSwitchTenant && (
          <div className="relative" ref={tenantRef}>
            <button
              onClick={() => setShowTenantMenu(!showTenantMenu)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-secondary-500/20 bg-background-100 hover:border-secondary-500/40 transition-all text-sm"
            >
              {tenantCtx.tenantOverrideActive ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-glow shrink-0"></span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0"></span>
              )}
              <span className="text-foreground-300 text-xs max-w-[130px] truncate hidden md:block">
                {tenantCtx.effectiveTenantName || 'Sin tenant'}
              </span>
              {switchingTenant ? (
                <span className="w-3.5 h-3.5 flex items-center justify-center text-foreground-500">
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                </span>
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center text-foreground-500">
                  <i className="ri-arrow-down-s-line text-xs"></i>
                </span>
              )}
            </button>

            {showTenantMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 glass-panel-strong rounded-xl animate-scale-in overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-secondary-500/10">
                  <p className="text-xs font-medium text-foreground-400 mb-1">
                    {tenantCtx.tenantOverrideActive ? 'Contexto anulado' : 'Tenant actual'}
                  </p>
                  <p className="text-sm font-semibold text-foreground-200">{tenantCtx.effectiveTenantName}</p>
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {tenantCtx.accessibleTenants.map((t) => {
                    const isCurrent = t.tenant_id === tenantCtx.effectiveTenantId && !tenantCtx.tenantOverrideActive;
                    const isOverride = t.tenant_id === tenantCtx.effectiveTenantId && tenantCtx.tenantOverrideActive;
                    return (
                      <button
                        key={t.tenant_id}
                        onClick={() => handleSwitchTenant(t.tenant_id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-background-200/50 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-primary-400' : isOverride ? 'bg-amber-400' : 'bg-secondary-500/40'}`}></span>
                        <span className={`flex-1 ${isCurrent || isOverride ? 'text-foreground-200 font-medium' : 'text-foreground-500'}`}>
                          {t.tenant_name}
                        </span>
                        {isCurrent && <span className="text-2xs text-primary-400 font-medium">Actual</span>}
                        {isOverride && <span className="text-2xs text-amber-400 font-medium">Anulado</span>}
                      </button>
                    );
                  })}
                </div>
                {tenantCtx.tenantOverrideActive && (
                  <div className="border-t border-secondary-500/10 p-2">
                    <button onClick={handleClearOverride} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors">
                      <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-arrow-go-back-line"></i></span>
                      Volver a mi tenant original
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!canSwitchTenant && tenantCtx.effectiveTenantName && (
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-secondary-500/20 bg-background-100 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0"></span>
            <span className="text-foreground-300 text-xs max-w-[130px] truncate hidden md:block">
              {tenantCtx.effectiveTenantName}
            </span>
          </div>
        )}

        {/* Real Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) loadNotifications(); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
          >
            <i className="ri-notification-3-line text-lg"></i>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-400 text-background-50 dark:text-foreground-950 text-2xs font-bold flex items-center justify-center ring-2 ring-background-50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 glass-panel-strong rounded-xl animate-scale-in overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-500/10">
                <p className="text-sm font-medium text-foreground-200">Notificaciones</p>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <>
                      <button onClick={markAllAsRead} className="text-2xs text-primary-400 hover:text-primary-300 font-medium whitespace-nowrap">Marcar todas</button>
                      <span className="px-2 py-0.5 text-2xs font-medium bg-primary-500/15 text-primary-400 rounded-full">{unreadCount} nuevas</span>
                    </>
                  )}
                </div>
              </div>

              {notifLoading ? (
                <div className="p-6 text-center">
                  <span className="w-6 h-6 flex items-center justify-center mx-auto"><i className="ri-loader-4-line animate-spin text-foreground-500"></i></span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-notification-off-line text-foreground-500 text-lg"></i>
                  </span>
                  <p className="text-xs text-foreground-500">No hay notificaciones</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((notif) => {
                    const sev = severityIcons[notif.severity] || severityIcons.info;
                    const isUnread = notif.status === 'unread';
                    return (
                      <button
                        key={notif.id}
                        onClick={() => { if (isUnread) markAsRead(notif.id); }}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-background-200/50 transition-colors border-b border-secondary-500/5 ${isUnread ? 'bg-primary-500/3' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${sev.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <i className={`${sev.icon} ${sev.color} text-sm`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground-300 leading-relaxed">{notif.title}</p>
                          <p className="text-xs text-foreground-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-2xs text-foreground-600 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary-400 shrink-0 mt-2"></span>
                        )}
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
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-background-200/50 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-accent-500/20 border border-accent-500/25 flex items-center justify-center">
              <span className="text-accent-400 text-xs font-semibold">
                {platformUser?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                {platformUser?.last_name?.[0] || ''}
              </span>
            </div>
            <span className="w-3.5 h-3.5 flex items-center justify-center text-foreground-500">
              <i className="ri-arrow-down-s-line text-xs"></i>
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 glass-panel-strong rounded-xl animate-scale-in overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-secondary-500/10">
                <p className="text-sm font-medium text-foreground-200">
                  {platformUser?.first_name ? `${platformUser.first_name} ${platformUser.last_name || ''}` : user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-foreground-500 mt-0.5">{user?.email || ''}</p>
              </div>
              <div className="py-1">
                <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors">
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-user-settings-line"></i></span>
                  Mi perfil
                </button>
                <button onClick={() => { navigate('/my-access'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors">
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-user-received-line"></i></span>
                  Mis Accesos
                </button>
                <button onClick={() => { navigate('/security-settings'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors">
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-shield-keyhole-line"></i></span>
                  Seguridad
                </button>
              </div>
              <div className="border-t border-secondary-500/10 pt-1 pb-1">
                <p className="px-4 py-1.5 text-2xs font-semibold text-foreground-600 uppercase tracking-wider">Tema</p>
                {([{ key: 'light', icon: 'ri-sun-line', label: 'Claro' }, { key: 'dark', icon: 'ri-moon-line', label: 'Oscuro' }, { key: 'system', icon: 'ri-computer-line', label: 'Sistema' }] as const).map(({ key, icon, label }) => {
                  const isActive = theme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setTheme(key); }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        isActive
                          ? 'text-primary-400 bg-primary-500/5 font-medium'
                          : 'text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50'
                      }`}
                    >
                      <span className="w-4 h-4 flex items-center justify-center"><i className={icon}></i></span>
                      {label}
                      {isActive && (
                        <span className="ml-auto w-4 h-4 flex items-center justify-center"><i className="ri-check-line text-xs"></i></span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-secondary-500/10 py-1">
                <button onClick={async () => { setShowUserMenu(false); await logout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors">
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-logout-box-r-line"></i></span>
                  Cerrar sesion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}