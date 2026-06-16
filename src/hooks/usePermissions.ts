import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { SuitePermissions } from '@/services/auth/authService';
import { SUITE_MODULES, ALL_ACTIONS, type SuiteModule, type SuiteAction } from '@/hooks/useSuitePermissions';

export interface SuitePermissionsState {
  modules: Record<string, { menu: boolean; actions: string[] }>;
}

export function usePermissions() {
  const { platformUser } = useAuth();

  const initPermissions = useCallback((): SuitePermissionsState => {
    const modules: Record<string, { menu: boolean; actions: string[] }> = {};
    SUITE_MODULES.forEach((m) => { modules[m] = { menu: false, actions: [] }; });
    return { modules };
  }, []);

  const loadFromProfile = useCallback((permissions: SuitePermissions | null | undefined): SuitePermissionsState => {
    const state = initPermissions();
    if (permissions?.modules) {
      Object.entries(permissions.modules).forEach(([key, val]) => {
        if (state.modules[key]) {
          state.modules[key] = { menu: val.menu, actions: [...val.actions] };
        }
      });
    }
    return state;
  }, [initPermissions]);

  const toggleMenu = useCallback((state: SuitePermissionsState, module: string): SuitePermissionsState => {
    const next = { modules: { ...state.modules } };
    if (next.modules[module]) {
      const current = next.modules[module];
      next.modules[module] = { menu: !current.menu, actions: current.actions };
    }
    return next;
  }, []);

  const toggleAction = useCallback((state: SuitePermissionsState, module: string, action: string): SuitePermissionsState => {
    const next = { modules: { ...state.modules } };
    if (next.modules[module]) {
      const current = next.modules[module];
      const has = current.actions.includes(action);
      next.modules[module] = {
        menu: current.menu,
        actions: has ? current.actions.filter((a) => a !== action) : [...current.actions, action],
      };
    }
    return next;
  }, []);

  const setAllActions = useCallback((state: SuitePermissionsState, module: string, enabled: boolean): SuitePermissionsState => {
    const next = { modules: { ...state.modules } };
    if (next.modules[module]) {
      next.modules[module] = {
        menu: enabled || next.modules[module].menu,
        actions: enabled ? [...ALL_ACTIONS] : [],
      };
    }
    return next;
  }, []);

  const countActivePermissions = useCallback((state: SuitePermissionsState): number => {
    let count = 0;
    Object.values(state.modules).forEach((mod) => {
      count += mod.actions.length;
    });
    return count;
  }, []);

  return {
    initPermissions,
    loadFromProfile,
    toggleMenu,
    toggleAction,
    setAllActions,
    countActivePermissions,
  };
}