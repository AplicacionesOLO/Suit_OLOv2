import { supabase } from '@/services/supabase/client';

export interface Cluster {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  app_count?: number;
  user_count?: number;
}

export interface ClusterApp {
  id: string;
  application_id: string;
  name: string;
  icon: string;
  color: string;
  status: string;
}

export interface ClusterUser {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string;
}

export interface ClusterInput {
  name: string;
  description?: string;
}

export interface AssignClusterResult {
  apps: number;
  users: number;
  assigned: number;
}

async function getCurrentPlatformUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('platform_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  return data?.id || null;
}

export async function fetchClusters(): Promise<{ clusters: Cluster[]; error: string | null }> {
  const { data, error } = await supabase
    .from('clusters')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) return { clusters: [], error: error.message };

  const clusters = (data || []) as Cluster[];
  if (clusters.length === 0) return { clusters: [], error: null };

  const clusterIds = clusters.map((c) => c.id);

  const [appsRes, usersRes] = await Promise.all([
    supabase.from('cluster_apps').select('cluster_id').in('cluster_id', clusterIds),
    supabase.from('cluster_users').select('cluster_id').in('cluster_id', clusterIds),
  ]);

  const appCounts: Record<string, number> = {};
  (appsRes.data || []).forEach((r: { cluster_id: string }) => {
    appCounts[r.cluster_id] = (appCounts[r.cluster_id] || 0) + 1;
  });

  const userCounts: Record<string, number> = {};
  (usersRes.data || []).forEach((r: { cluster_id: string }) => {
    userCounts[r.cluster_id] = (userCounts[r.cluster_id] || 0) + 1;
  });

  return {
    clusters: clusters.map((c) => ({
      ...c,
      app_count: appCounts[c.id] || 0,
      user_count: userCounts[c.id] || 0,
    })),
    error: null,
  };
}

export async function fetchClusterApps(clusterId: string): Promise<{ apps: ClusterApp[]; error: string | null }> {
  const { data, error } = await supabase
    .from('cluster_apps')
    .select('*')
    .eq('cluster_id', clusterId)
    .order('created_at', { ascending: true });

  if (error) return { apps: [], error: error.message };

  const rows = (data || []) as { id: string; application_id: string }[];
  if (rows.length === 0) return { apps: [], error: null };

  const appIds = rows.map((r) => r.application_id);
  const { data: appsData } = await supabase
    .from('applications')
    .select('id, name, icon, color, status')
    .in('id', appIds);

  const appMap: Record<string, { name: string; icon: string; color: string; status: string }> = {};
  (appsData || []).forEach((a: { id: string; name: string; icon: string; color: string; status: string }) => {
    appMap[a.id] = a;
  });

  return {
    apps: rows.map((r) => ({
      id: r.id,
      application_id: r.application_id,
      name: appMap[r.application_id]?.name || '—',
      icon: appMap[r.application_id]?.icon || 'ri-apps-2-line',
      color: appMap[r.application_id]?.color || 'emerald',
      status: appMap[r.application_id]?.status || '',
    })),
    error: null,
  };
}

export async function fetchClusterUsers(clusterId: string): Promise<{ users: ClusterUser[]; error: string | null }> {
  const { data, error } = await supabase
    .from('cluster_users')
    .select('*')
    .eq('cluster_id', clusterId)
    .order('created_at', { ascending: true });

  if (error) return { users: [], error: error.message };

  const rows = (data || []) as { id: string; user_id: string }[];
  if (rows.length === 0) return { users: [], error: null };

  const userIds = rows.map((r) => r.user_id);
  const { data: usersData } = await supabase
    .from('platform_users')
    .select('id, first_name, last_name, email, status')
    .in('id', userIds);

  const userMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null; status: string }> = {};
  (usersData || []).forEach((u: { id: string; first_name: string | null; last_name: string | null; email: string | null; status: string }) => {
    userMap[u.id] = u;
  });

  return {
    users: rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      first_name: userMap[r.user_id]?.first_name || null,
      last_name: userMap[r.user_id]?.last_name || null,
      email: userMap[r.user_id]?.email || null,
      status: userMap[r.user_id]?.status || '',
    })),
    error: null,
  };
}

export async function createCluster(input: ClusterInput, tenantId: string): Promise<{ cluster: Cluster | null; error: string | null }> {
  const currentUserId = await getCurrentPlatformUserId();

  const { data, error } = await supabase
    .from('clusters')
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      created_by: currentUserId,
    })
    .select()
    .single();

  if (error) return { cluster: null, error: error.message };
  return { cluster: data as Cluster, error: null };
}

export async function updateCluster(clusterId: string, input: ClusterInput): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('clusters')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clusterId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteCluster(clusterId: string): Promise<{ error: string | null }> {
  const currentUserId = await getCurrentPlatformUserId();

  const { error } = await supabase
    .from('clusters')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentUserId,
    })
    .eq('id', clusterId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function addAppsToCluster(clusterId: string, tenantId: string, appIds: string[]): Promise<{ error: string | null }> {
  if (appIds.length === 0) return { error: null };

  const { error } = await supabase
    .from('cluster_apps')
    .insert(appIds.map((applicationId) => ({ cluster_id: clusterId, tenant_id: tenantId, application_id: applicationId })));

  if (error) return { error: error.message };
  return { error: null };
}

export async function removeAppFromCluster(clusterAppId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cluster_apps')
    .delete()
    .eq('id', clusterAppId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function addUsersToCluster(clusterId: string, tenantId: string, userIds: string[]): Promise<{ error: string | null }> {
  if (userIds.length === 0) return { error: null };

  const { error } = await supabase
    .from('cluster_users')
    .insert(userIds.map((userId) => ({ cluster_id: clusterId, tenant_id: tenantId, user_id: userId })));

  if (error) return { error: error.message };
  return { error: null };
}

export async function removeUserFromCluster(clusterUserId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cluster_users')
    .delete()
    .eq('id', clusterUserId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function assignClusterAccess(clusterId: string): Promise<{ result: AssignClusterResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('assign_cluster_access', { p_cluster_id: clusterId });

  if (error) return { result: null, error: error.message };
  return { result: data as AssignClusterResult, error: null };
}