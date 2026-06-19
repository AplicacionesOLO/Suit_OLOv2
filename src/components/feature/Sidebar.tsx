import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuitePermissions } from '@/hooks/useSuitePermissions';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  module: string;
  alwaysVisible?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'ri-dashboard-line', module: 'dashboard' },
      { label: 'Mis Accesos', path: '/my-access', icon: 'ri-user-received-line', module: 'my-access' },
    ],
  },
  {
    title: 'Organización',
    items: [
      { label: 'Países', path: '/countries', icon: 'ri-global-line', module: 'countries' },
      { label: 'Tenants', path: '/tenants', icon: 'ri-building-4-line', module: 'tenants' },
      { label: 'Almacenes', path: '/warehouses', icon: 'ri-store-2-line', module: 'warehouses' },
      { label: 'Clientes', path: '/clients', icon: 'ri-building-2-line', module: 'clients' },
      { label: 'Usuarios', path: '/users', icon: 'ri-team-line', module: 'users' },
    ],
  },
  {
    title: 'Aplicaciones',
    items: [
      { label: 'Categorías', path: '/categories', icon: 'ri-folder-2-line', module: 'categories' },
      { label: 'Aplicaciones', path: '/applications', icon: 'ri-apps-2-line', module: 'applications' },
      { label: 'Instancias', path: '/instances', icon: 'ri-server-line', module: 'instances' },
      { label: 'Asignaciones', path: '/assignments', icon: 'ri-link-m', module: 'assignments' },
    ],
  },
  {
    title: 'Seguridad',
    items: [
      { label: 'Roles y Permisos', path: '/roles', icon: 'ri-shield-user-line', module: 'roles' },
      { label: 'Apps Asignadas', path: '/app-access', icon: 'ri-shield-keyhole-line', module: 'app-access' },
    ],
  },
];

const alwaysVisibleItems: NavItem[] = [];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, platformUser } = useAuth();
  const { hasMenuAccess, can } = useSuitePermissions();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map((g) => [g.title, true]))
  );

  const roleLevel = platformUser?.role_level ?? 0;
  const showDashboard = roleLevel >= 50 || can('dashboard', 'view');

  const visibleGroups = navGroups.filter((g) => {
    return g.items.some((item) => hasMenuAccess(item.module));
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path: string) => location.pathname === path;

  const displayName = platformUser?.first_name || platformUser?.last_name
    ? `${platformUser?.first_name || ''} ${platformUser?.last_name || ''}`.trim()
    : (user?.email?.split('@')[0] || 'Usuario');

  const avatarLetter = platformUser?.first_name?.[0] || platformUser?.last_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-40
        bg-background-50 border-r border-secondary-500/10
        flex flex-col transition-all duration-300 ease-out
        ${collapsed ? 'w-[68px]' : 'w-[260px]'}
      `}
    >
      {/* Logo area */}
      <div className={`flex items-center h-[60px] border-b border-secondary-500/10 shrink-0 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/25 flex items-center justify-center glow-primary shrink-0">
              <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-foreground-100 font-bold text-sm tracking-tight">Suite</span>
              <span className="text-primary-400 font-bold text-sm tracking-tight">OLO</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/25 flex items-center justify-center glow-primary">
            <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-1">
        {/* Divider */}
        {visibleGroups.length > 0 && (
          <div className="px-3 py-1">
            <div className="border-t border-secondary-500/8"></div>
          </div>
        )}

        {/* Permission-based groups */}
        {visibleGroups.map((group) => {
          const visibleItems = group.items.filter((item) => hasMenuAccess(item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-foreground-600 uppercase tracking-wider hover:text-foreground-400 transition-colors"
                >
                  <span>{group.title}</span>
                  <span className={`w-3 h-3 flex items-center justify-center transition-transform duration-200 ${expandedGroups[group.title] ? 'rotate-90' : ''}`}>
                    <i className="ri-arrow-right-s-line text-xs"></i>
                  </span>
                </button>
              )}
              {collapsed && (
                <div className="px-2 py-1.5 mb-0.5">
                  <div className="border-t border-secondary-500/8"></div>
                </div>
              )}
              <div className={`space-y-0.5 overflow-hidden transition-all duration-200 ${collapsed || expandedGroups[group.title] ? 'max-h-96' : 'max-h-0'}`}>
                {visibleItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`
                      flex items-center gap-3 w-full rounded-lg transition-all duration-150 text-sm
                      ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
                      ${isActive(item.path)
                        ? 'bg-primary-500/10 text-primary-400 font-medium'
                        : 'text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50'
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className={`w-5 h-5 flex items-center justify-center shrink-0 ${isActive(item.path) ? 'text-primary-400' : ''}`}>
                      <i className={`${item.icon} text-lg`}></i>
                    </span>
                    {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                    {!collapsed && isActive(item.path) && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-secondary-500/10 p-3 ${collapsed ? 'flex flex-col items-center gap-3' : ''}`}>
        <button
          onClick={() => navigate('/profile')}
          className={`
            flex items-center gap-3 w-full rounded-lg transition-all duration-150 text-sm
            ${collapsed ? 'justify-center py-2.5' : 'px-3 py-2'}
            text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50
          `}
          title={collapsed ? 'Perfil' : undefined}
        >
          <div className="w-7 h-7 rounded-full bg-accent-500/20 border border-accent-500/25 flex items-center justify-center shrink-0">
            <span className="text-accent-400 text-xs font-semibold">{avatarLetter}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-foreground-300 truncate">{displayName}</div>
              <div className="text-2xs text-foreground-600 truncate">{user?.email || ''}</div>
            </div>
          )}
        </button>

        <button
          onClick={onToggle}
          className={`
            flex items-center justify-center w-full rounded-lg transition-all duration-150 text-sm
            text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50
            ${collapsed ? 'py-2.5' : 'px-3 py-2'}
          `}
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <i className={`text-lg ${collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'}`}></i>
          </span>
        </button>
      </div>
    </aside>
  );
}