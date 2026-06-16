import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { SuitePermissions } from '@/services/auth/authService';

const SUITE_MODULES = [
  'dashboard', 'catalog', 'tenants', 'countries', 'warehouses', 'clients',
  'users', 'categories', 'applications', 'instances', 'assignments',
  'roles', 'profiles', 'permissions', 'app-access', 'my-access',
  'audit', 'security-settings', 'profile', 'sessions', 'alerts', 'integration',
];

const ALL_ACTIONS = ['view', 'create', 'update', 'delete', 'export', 'approve', 'revoke', 'configure'];

interface UseSuitePermissionsReturn {
  can: (module: string, action: string) => boolean;
  hasMenuAccess: (module: string) => boolean;
  modules: SuitePermissions['modules'];
  isSuperAdmin: boolean;
  getModuleActions: (module: string) => string[];
}

export function useSuitePermissions(): UseSuitePermissionsReturn {
  const { platformUser, user } = useAuth();

  const isSuperAdmin = (platformUser?.role_level ?? 0) >= 100 ||
    user?.email === 'arojas@ologistics.com';

  const modules = platformUser?.suite_permissions?.modules || {};

  const can = useCallback((module: string, action: string): boolean => {
    if (isSuperAdmin) return true;
    const mod = modules[module];
    if (!mod) return false;
    return mod.actions.includes(action);
  }, [isSuperAdmin, modules]);

  const hasMenuAccess = useCallback((module: string): boolean => {
    if (isSuperAdmin) return true;
    const mod = modules[module];
    return mod?.menu === true && mod.actions.includes('view');
  }, [isSuperAdmin, modules]);

  const getModuleActions = useCallback((module: string): string[] => {
    if (isSuperAdmin) return [...ALL_ACTIONS];
    return modules[module]?.actions || [];
  }, [isSuperAdmin, modules]);

  return { can, hasMenuAccess, modules, isSuperAdmin: !!isSuperAdmin, getModuleActions };
}

export { SUITE_MODULES, ALL_ACTIONS };