import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/hooks/useTenantContext';
import { useAuth } from '@/hooks/useAuth';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export default function Topbar({ sidebarCollapsed }: TopbarProps) {
  const navigate = useNavigate();
  const tenantCtx = useTenantContext();
  const { user, platformUser, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const tenantRef = useRef<HTMLDivElement>(null);

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

  const notifications = [
    { id: '1', icon: 'ri-error-warning-line', color: 'text-amber-400', bg: 'bg-amber-500/10', text: 'Intento de acceso fallido detectado en Warehouse CDMX', time: '2 min' },
    { id: '2', icon: 'ri-user-add-line', color: 'text-primary-400', bg: 'bg-primary-500/10', text: 'Nuevo usuario registrado en plataforma', time: '15 min' },
    { id: '3', icon: 'ri-shield-check-line', color: 'text-accent-400', bg: 'bg-accent-500/10', text: 'Auditoria semanal completada exitosamente', time: '1 hr' },
  ];

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

  const canSwitchTenant = tenantCtx.roleLevel >= 100 && tenantCtx.accessibleTenants.length > 1;

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
            placeholder="Buscar tenants, paises, usuarios..."
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
        {/* Tenant context indicator + switcher */}
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
                    {tenantCtx.tenantOverrideActive ? 'Contexto de tenant anulado' : 'Tenant actual'}
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
                        {isCurrent && (
                          <span className="text-2xs text-primary-400 font-medium">Actual</span>
                        )}
                        {isOverride && (
                          <span className="text-2xs text-amber-400 font-medium">Anulado</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {tenantCtx.tenantOverrideActive && (
                  <div className="border-t border-secondary-500/10 p-2">
                    <button
                      onClick={handleClearOverride}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors"
                    >
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-arrow-go-back-line"></i>
                      </span>
                      Volver a mi tenant original
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Simple tenant display for non-Super-Admin */}
        {!canSwitchTenant && tenantCtx.effectiveTenantName && (
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-secondary-500/20 bg-background-100 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0"></span>
            <span className="text-foreground-300 text-xs max-w-[130px] truncate hidden md:block">
              {tenantCtx.effectiveTenantName}
            </span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
          >
            <i className="ri-notification-3-line text-lg"></i>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400 ring-2 ring-background-50"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 glass-panel-strong rounded-xl animate-scale-in overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-500/10">
                <p className="text-sm font-medium text-foreground-200">Notificaciones</p>
                <span className="px-2 py-0.5 text-2xs font-medium bg-primary-500/15 text-primary-400 rounded-full">3 nuevas</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-background-200/50 transition-colors border-b border-secondary-500/5"
                  >
                    <div className={`w-8 h-8 rounded-lg ${notif.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <i className={`${notif.icon} ${notif.color} text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground-300 leading-relaxed">{notif.text}</p>
                      <p className="text-2xs text-foreground-600 mt-1">{notif.time}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button className="w-full px-4 py-2.5 text-xs text-primary-400 hover:text-primary-300 hover:bg-background-200/50 transition-colors font-medium text-center">
                Ver todas las notificaciones
              </button>
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
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-user-settings-line"></i>
                  </span>
                  Mi perfil
                </button>
                <button
                  onClick={() => { navigate('/security-settings'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-shield-keyhole-line"></i>
                  </span>
                  Seguridad
                </button>
              </div>
              <div className="border-t border-secondary-500/10 py-1">
                <button
                  onClick={async () => { setShowUserMenu(false); await logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-logout-box-r-line"></i>
                  </span>
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