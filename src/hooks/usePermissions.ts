import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllPermissions,
  fetchProfilePermissions,
  saveProfilePermissions,
  buildPermissionTree,
  type Permission,
  type PermissionNode,
} from '@/services/security/permissionsService';

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [tree, setTree] = useState<PermissionNode[]>([]);
  const [grantedIds, setGrantedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllPermissions();
      if (result.error) throw result.error;
      setPermissions(result.data);
      setTree(buildPermissionTree(result.data, grantedIds));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [grantedIds]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadForProfile = useCallback(async (profileId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [allResult, grantedResult] = await Promise.all([
        fetchAllPermissions(),
        fetchProfilePermissions(profileId),
      ]);
      if (allResult.error) throw allResult.error;
      const ids = grantedResult.data;
      setGrantedIds(ids);
      setPermissions(allResult.data);
      setTree(buildPermissionTree(allResult.data, ids));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePermission = useCallback((permId: string) => {
    setGrantedIds((prev) => {
      if (prev.includes(permId)) return prev.filter((id) => id !== permId);
      return [...prev, permId];
    });
  }, []);

  const toggleAllFeature = useCallback((featurePerms: { id: string }[], grant: boolean) => {
    setGrantedIds((prev) => {
      const ids = featurePerms.map((p) => p.id);
      if (grant) {
        const toAdd = ids.filter((id) => !prev.includes(id));
        return [...prev, ...toAdd];
      }
      return prev.filter((id) => !ids.includes(id));
    });
  }, []);

  const toggleAllModule = useCallback((modulePerms: { id: string }[], grant: boolean) => {
    setGrantedIds((prev) => {
      const ids = modulePerms.map((p) => p.id);
      if (grant) {
        const toAdd = ids.filter((id) => !prev.includes(id));
        return [...prev, ...toAdd];
      }
      return prev.filter((id) => !ids.includes(id));
    });
  }, []);

  const toggleAllApplication = useCallback((appPerms: { id: string }[], grant: boolean) => {
    setGrantedIds((prev) => {
      const ids = appPerms.map((p) => p.id);
      if (grant) {
        const toAdd = ids.filter((id) => !prev.includes(id));
        return [...prev, ...toAdd];
      }
      return prev.filter((id) => !ids.includes(id));
    });
  }, []);

  const save = useCallback(async (profileId: string) => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveProfilePermissions(profileId, grantedIds);
      if (result.error) throw result.error;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [grantedIds]);

  const stats = {
    total: permissions.length,
    granted: grantedIds.length,
    critical: permissions.filter((p) => ['Aprobar', 'Eliminar', 'Configurar', 'Auditar'].includes(p.action) && grantedIds.includes(p.id)).length,
    apps: [...new Set(permissions.filter((p) => grantedIds.includes(p.id)).map((p) => p.application))].length,
  };

  return {
    permissions, tree, grantedIds, loading, saving, error,
    loadAll, loadForProfile, togglePermission,
    toggleAllFeature, toggleAllModule, toggleAllApplication,
    save, stats,
  };
}