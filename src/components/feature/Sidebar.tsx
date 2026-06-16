import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'ri-dashboard-line' },
      { label: 'Catalogo', path: '/catalog', icon: 'ri-store-2-line' },
    ],
  },
  {
    title: 'Administracion',
    items: [
      { label: 'Paises', path: '/countries', icon: 'ri-global-line' },
      { label: 'Almacenes', path: '/warehouses', icon: 'ri-store-2-line' },
      { label: 'Clientes', path: '/clients', icon: 'ri-building-2-line' },
      { label: 'Usuarios', path: '/users', icon: 'ri-user-line' },
    ],
  },
  {
    title: 'Aplicaciones',
    items: [
      { label: 'Categorias', path: '/categories', icon: 'ri-folder-2-line' },
      { label: 'Aplicaciones', path: '/applications', icon: 'ri-apps-2-line' },
      { label: 'Instancias', path: '/instances', icon: 'ri-server-line' },
      { label: 'Asignacion', path: '/assignments', icon: 'ri-link-m' },
    ],
  },
  {
    title: 'Seguridad',
    items: [
      { label: 'Roles', path: '/roles', icon: 'ri-shield-user-line' },
      { label: 'Perfiles', path: '/profiles', icon: 'ri-user-settings-line' },
      { label: 'Matriz de Permisos', path: '/permissions', icon: 'ri-key-2-line' },
      { label: 'Accesos', path: '/app-access', icon: 'ri-shield-keyhole-line' },
      { label: 'Mis Accesos', path: '/my-access', icon: 'ri-user-received-line' },
      { label: 'Auditoria', path: '/audit', icon: 'ri-file-search-line' },
      { label: 'Configuracion', path: '/security-settings', icon: 'ri-shield-check-line' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Perfil', path: '/profile', icon: 'ri-user-line' },
      { label: 'Sesiones', path: '/sessions', icon: 'ri-user-follow-line' },
      { label: 'Alertas', path: '/security-alerts', icon: 'ri-alert-fill' },
      { label: 'Integracion', path: '/integration', icon: 'ri-plug-line' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map((g) => [g.title, true]))
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-40
        bg-background-50 border-r border-secondary-500/10
        flex flex-col transition-all duration-300 ease-out
        ${collapsed ? 'w-[68px]' : 'w-[260px]'}
      `}
    >
      {/* Logo area - Suite OLO */}
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
        {navGroups.map((group) => (
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
              {group.items.map((item) => (
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
        ))}
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
            <span className="text-accent-400 text-xs font-semibold">SA</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-foreground-300 truncate">Super Admin</div>
              <div className="text-2xs text-foreground-600 truncate">admin@suiteolo.io</div>
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