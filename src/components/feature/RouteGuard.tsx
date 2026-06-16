import { type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuitePermissions } from '@/hooks/useSuitePermissions';

const ALWAYS_ACCESSIBLE = ['/dashboard', '/my-access', '/profile', '/workspace'];

const ROUTE_MODULE_MAP: Record<string, string> = {
  '/tenants': 'tenants',
  '/countries': 'countries',
  '/warehouses': 'warehouses',
  '/clients': 'clients',
  '/users': 'users',
  '/categories': 'categories',
  '/applications': 'applications',
  '/instances': 'instances',
  '/assignments': 'assignments',
  '/roles': 'roles',
  '/app-access': 'app-access',
  '/catalog': 'categories',
  '/integration': 'applications',
  '/audit': 'tenants',
  '/security-settings': 'roles',
  '/sessions': 'users',
  '/security-alerts': 'users',
  '/rls-test': 'roles',
  '/modules': 'applications',
};

interface RouteGuardProps {
  children: ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const { can, isSuperAdmin } = useSuitePermissions();
  const navigate = useNavigate();

  const pathname = window.location.pathname;

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    // Always accessible routes
    if (ALWAYS_ACCESSIBLE.some((r) => pathname.startsWith(r))) return;

    // Super admin bypass
    if (isSuperAdmin) return;

    // Check dynamic tenant detail route
    if (pathname.startsWith('/tenants/')) {
      if (!can('tenants', 'view')) {
        navigate(`/access-denied?from=${encodeURIComponent(pathname)}&module=tenants`, { replace: true });
      }
      return;
    }

    // Find module for route
    const module = ROUTE_MODULE_MAP[pathname] || findModuleForPath(pathname);

    if (module && !can(module, 'view')) {
      navigate(`/access-denied?from=${encodeURIComponent(pathname)}&module=${module}`, { replace: true });
    }
  }, [loading, isAuthenticated, pathname, can, isSuperAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center mx-auto">
            <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
          </div>
          <p className="text-sm text-foreground-500 animate-pulse">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function findModuleForPath(pathname: string): string | null {
  for (const [route, module] of Object.entries(ROUTE_MODULE_MAP)) {
    if (pathname.startsWith(route)) return module;
  }
  return null;
}