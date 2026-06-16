import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { SuitePermissions } from '@/services/auth/authService';

export const SUITE_MODULES = [
  'tenants', 'countries', 'warehouses', 'clients',
  'users', 'categories', 'applications', 'instances',
  'assignments', 'roles', 'app-access',
] as const;

export type SuiteModule = (typeof SUITE_MODULES)[number];

export const ALL_ACTIONS = ['view', 'create', 'update', 'delete', 'revoke'] as const;

export type SuiteAction = (typeof ALL_ACTIONS)[number];

const ALWAYS_VISIBLE = ['dashboard', 'my-access', 'profile'];

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
    if (ALWAYS_VISIBLE.includes(module) && action === 'view') return true;
    const mod = modules[module];
    if (!mod) return false;
    return mod.actions.includes(action);
  }, [isSuperAdmin, modules]);

  const hasMenuAccess = useCallback((module: string): boolean => {
    if (isSuperAdmin) return true;
    if (ALWAYS_VISIBLE.includes(module)) return true;
    const mod = modules[module];
    return mod?.menu === true && mod.actions.includes('view');
  }, [isSuperAdmin, modules]);

  const getModuleActions = useCallback((module: string): string[] => {
    if (isSuperAdmin) return [...ALL_ACTIONS];
    if (ALWAYS_VISIBLE.includes(module)) return ['view'];
    return modules[module]?.actions || [];
  }, [isSuperAdmin, modules]);

  return { can, hasMenuAccess, modules, isSuperAdmin: !!isSuperAdmin, getModuleActions };
}