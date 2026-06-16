import { supabase } from '@/services/supabase/client';

async function getEffectiveTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: pu } = await supabase
    .from('platform_users')
    .select('tenant_id, tenant_context_override')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!pu) return null;
  return pu.tenant_context_override || pu.tenant_id;
}

export interface SuitePermissionsModule {
  menu: boolean;
  actions: string[];
}

export interface SuitePermissionsData {
  modules: Record<string, SuitePermissionsModule>;
}

// Legacy interfaces kept for backward compat with app-access feature
export interface Permission {
  id: string;
  tenant_id: string;
  application: string;
  module: string;
  feature: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface PermissionNode {
  application: string;
  modules: ModuleNode[];
}

export interface ModuleNode {
  module: string;
  features: FeatureNode[];
}

export interface FeatureNode {
  feature: string;
  actions: ActionNode[];
}

export interface ActionNode {
  action: string;
  id: string;
  granted: boolean;
}

export async function fetchProfilePermissions(profileId: string): Promise<{ data: SuitePermissionsData | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('permissions')
      .eq('id', profileId)
      .single();

    if (error) throw error;
    const perms = data?.permissions as SuitePermissionsData | null;
    return { data: perms || null, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function saveProfilePermissions(profileId: string, permissions: SuitePermissionsData): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ permissions: permissions as unknown as Record<string, unknown> })
      .eq('id', profileId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function fetchProfilePermissionsCount(profileId: string): Promise<{ count: number; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('permissions')
      .eq('id', profileId)
      .single();

    if (error) throw error;
    const perms = data?.permissions as SuitePermissionsData | null;
    if (!perms?.modules) return { count: 0, error: null };
    let count = 0;
    Object.values(perms.modules).forEach((mod) => {
      count += (mod.actions?.length || 0);
    });
    return { count, error: null };
  } catch (err) {
    return { count: 0, error: err as Error };
  }
}

// Legacy functions for app-access pages
export async function fetchAllPermissions(): Promise<{ data: Permission[]; error: Error | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: [], error: new Error('No se pudo determinar el tenant') };

    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('application', { ascending: true })
      .order('module', { ascending: true })
      .order('feature', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as Permission[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export function buildPermissionTree(permissions: Permission[], grantedIds: string[]): PermissionNode[] {
  const appMap: Record<string, Record<string, Record<string, ActionNode[]>>> = {};

  permissions.forEach((p) => {
    if (!appMap[p.application]) appMap[p.application] = {};
    if (!appMap[p.application][p.module]) appMap[p.application][p.module] = {};
    if (!appMap[p.application][p.module][p.feature]) appMap[p.application][p.module][p.feature] = [];

    appMap[p.application][p.module][p.feature].push({
      action: p.action,
      id: p.id,
      granted: grantedIds.includes(p.id),
    });
  });

  const result: PermissionNode[] = [];
  Object.entries(appMap).sort().forEach(([app, modules]) => {
    const modNodes: ModuleNode[] = [];
    Object.entries(modules).sort().forEach(([mod, features]) => {
      const featNodes: FeatureNode[] = [];
      Object.entries(features).sort().forEach(([feat, actions]) => {
        featNodes.push({ feature: feat, actions });
      });
      modNodes.push({ module: mod, features: featNodes });
    });
    result.push({ application: app, modules: modNodes });
  });

  return result;
}