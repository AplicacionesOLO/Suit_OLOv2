import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { fetchCategories, type AppCategory } from '@/services/applications/applicationsService';
import {
  fetchClusters,
  createCluster,
  updateCluster,
  deleteCluster,
  addAppsToCluster,
  removeAppFromCluster,
  addUsersToCluster,
  removeUserFromCluster,
  assignClusterAccess,
  type Cluster,
  type ClusterInput,
  type AssignClusterResult,
} from '@/services/auth/clustersService';

export interface ApplicationOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: string;
  tenant_id: string;
  category_id: string | null;
  category_name: string;
}

interface UseClustersReturn {
  clusters: Cluster[];
  apps: ApplicationOption[];
  categories: AppCategory[];
  loading: boolean;
  error: string | null;
  createCluster: (input: ClusterInput, tenantId: string) => Promise<{ cluster: Cluster | null; error: string | null }>;
  updateCluster: (clusterId: string, input: ClusterInput) => Promise<{ error: string | null }>;
  removeCluster: (clusterId: string) => Promise<{ error: string | null }>;
  addApps: (clusterId: string, tenantId: string, appIds: string[]) => Promise<{ error: string | null }>;
  removeApp: (clusterAppId: string) => Promise<{ error: string | null }>;
  addUsers: (clusterId: string, tenantId: string, userIds: string[]) => Promise<{ error: string | null }>;
  removeUser: (clusterUserId: string) => Promise<{ error: string | null }>;
  assignCluster: (clusterId: string) => Promise<{ result: AssignClusterResult | null; error: string | null }>;
  refresh: () => void;
}

export function useClusters(): UseClustersReturn {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [apps, setApps] = useState<ApplicationOption[]>([]);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [clustersResult, appsResult, catsResult] = await Promise.all([
        fetchClusters(),
        supabase
          .from('applications')
          .select('id, name, icon, color, status, tenant_id, category_id')
          .order('name'),
        fetchCategories(),
      ]);

      if (clustersResult.error) {
        setError(clustersResult.error);
      } else {
        setClusters(clustersResult.clusters);
      }

      const cats = catsResult.data || [];
      setCategories(cats);

      if (appsResult.data) {
        const catNameById = new Map<string, string>(cats.map((c) => [c.id, c.name]));
        setApps(
          (appsResult.data as any[]).map((a) => ({
            ...a,
            category_name: a.category_id
              ? catNameById.get(a.category_id) || 'Sin categoría'
              : 'Sin categoría',
          })) as ApplicationOption[],
        );
      }
    } catch {
      setError('Error al cargar clusters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(
    async (input: ClusterInput, tenantId: string) => {
      const result = await createCluster(input, tenantId);
      if (!result.error) await load();
      return result;
    },
    [load],
  );

  const handleUpdate = useCallback(
    async (clusterId: string, input: ClusterInput) => {
      const result = await updateCluster(clusterId, input);
      if (!result.error) await load();
      return result;
    },
    [load],
  );

  const handleRemove = useCallback(
    async (clusterId: string) => {
      const result = await deleteCluster(clusterId);
      if (!result.error) await load();
      return result;
    },
    [load],
  );

  const handleAddApps = useCallback(
    async (clusterId: string, tenantId: string, appIds: string[]) => {
      const result = await addAppsToCluster(clusterId, tenantId, appIds);
      return result;
    },
    [],
  );

  const handleRemoveApp = useCallback(async (clusterAppId: string) => {
    const result = await removeAppFromCluster(clusterAppId);
    return result;
  }, []);

  const handleAddUsers = useCallback(
    async (clusterId: string, tenantId: string, userIds: string[]) => {
      const result = await addUsersToCluster(clusterId, tenantId, userIds);
      return result;
    },
    [],
  );

  const handleRemoveUser = useCallback(async (clusterUserId: string) => {
    const result = await removeUserFromCluster(clusterUserId);
    return result;
  }, []);

  const handleAssign = useCallback(async (clusterId: string) => {
    const result = await assignClusterAccess(clusterId);
    return result;
  }, []);

  return {
    clusters,
    apps,
    categories,
    loading,
    error,
    createCluster: handleCreate,
    updateCluster: handleUpdate,
    removeCluster: handleRemove,
    addApps: handleAddApps,
    removeApp: handleRemoveApp,
    addUsers: handleAddUsers,
    removeUser: handleRemoveUser,
    assignCluster: handleAssign,
    refresh: load,
  };
}