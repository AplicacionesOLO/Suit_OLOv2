import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchProfilePermissions,
  saveProfilePermissions,
} from '@/services/security/permissionsService';
import { SUITE_MODULES, ALL_ACTIONS } from '@/hooks/useSuitePermissions';

export interface SuiteModulePerms {
  menu: boolean;
  actions: string[];
}

export interface SuitePermissionsMap {
  modules: Record<string, SuiteModulePerms>;
}

function emptyPermissions(): SuitePermissionsMap {
  const modules: Record<string, SuiteModulePerms> = {};
  SUITE_MODULES.forEach((m) => {
    modules[m] = { menu: false, actions: [] };
  });
  return { modules };
}

export function usePermissions() {
  const [perms, setPerms] = useState<SuitePermissionsMap>(emptyPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfileName, setSelectedProfileName] = useState<string>('');

  const loadForProfile = useCallback(async (profileId: string, profileName?: string) => {
    setLoading(true);
    setError(null);
    setSelectedProfileId(profileId);
    setSelectedProfileName(profileName || '');
    try {
      const result = await fetchProfilePermissions(profileId);
      if (result.error) throw result.error;
      const data = result.data as SuitePermissionsMap | null;

      if (data?.modules) {
        // Valid new-format permissions found
        setPerms(data);
      } else {
        // No permissions saved yet — start fresh
        setPerms(emptyPermissions());
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setPerms(emptyPermissions());
    setSelectedProfileId(null);
    setSelectedProfileName('');
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleAction = useCallback((module: string, action: string) => {
    setPerms((prev) => {
      const next = { ...prev, modules: { ...prev.modules } };
      next.modules = { ...next.modules };
      const mod = { ...(next.modules[module] || { menu: false, actions: [] }) };
      const hasAction = mod.actions.includes(action);
      mod.actions = hasAction
        ? mod.actions.filter((a) => a !== action)
        : [...mod.actions, action];
      mod.menu = mod.actions.length > 0 && mod.actions.includes('view');
      next.modules[module] = mod;
      return next;
    });
  }, []);

  const toggleMenu = useCallback((module: string) => {
    setPerms((prev) => {
      const next = { ...prev, modules: { ...prev.modules } };
      const mod = { ...(next.modules[module] || { menu: false, actions: [] }) };
      if (mod.menu) {
        mod.menu = false;
        mod.actions = [];
      } else {
        mod.menu = true;
        if (!mod.actions.includes('view')) mod.actions = ['view', ...mod.actions];
      }
      next.modules[module] = mod;
      return next;
    });
  }, []);

  const toggleAllActions = useCallback((module: string) => {
    setPerms((prev) => {
      const next = { ...prev, modules: { ...prev.modules } };
      const mod = { ...(next.modules[module] || { menu: false, actions: [] }) };
      const allGranted = ALL_ACTIONS.every((a) => mod.actions.includes(a));
      mod.actions = allGranted ? [] : [...ALL_ACTIONS];
      mod.menu = mod.actions.length > 0 && mod.actions.includes('view');
      next.modules[module] = mod;
      return next;
    });
  }, []);

  const save = useCallback(async (profileId: string) => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveProfilePermissions(profileId, JSON.parse(JSON.stringify(perms)));
      if (result.error) throw result.error;
      // Reload to confirm
      await loadForProfile(profileId, selectedProfileName);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [perms, loadForProfile, selectedProfileName]);

  const stats = useMemo(() => {
    let totalActions = 0;
    let grantedActions = 0;
    let grantedMenus = 0;
    SUITE_MODULES.forEach((m) => {
      const mod = perms.modules[m];
      if (!mod) return;
      totalActions += ALL_ACTIONS.length;
      grantedActions += mod.actions.length;
      if (mod.menu) grantedMenus += 1;
    });
    return {
      total: totalActions,
      granted: grantedActions,
      menus: grantedMenus,
      apps: grantedMenus,
      critical: SUITE_MODULES.filter((m) => {
        const mod = perms.modules[m];
        return mod?.actions.includes('delete') || mod?.actions.includes('configure');
      }).length,
    };
  }, [perms]);

  return {
    perms, loading, saving, error, stats,
    selectedProfileId, selectedProfileName,
    loadAll, loadForProfile,
    toggleAction, toggleMenu, toggleAllActions,
    save,
  };
}