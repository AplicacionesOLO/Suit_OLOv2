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

export interface Profile {
  id: string;
  tenant_id: string;
  role_id: string | null;
  name: string;
  code: string;
  description: string | null;
  permissions: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
}

export interface ProfileWithDetails extends Profile {
  role_name?: string;
  user_count: number;
  permissions_count: number;
}

export async function fetchProfiles(): Promise<{ data: Profile[]; error: Error | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: [], error: new Error('No se pudo determinar el tenant') };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as Profile[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function fetchProfilesWithDetails(): Promise<{ data: ProfileWithDetails[]; error: Error | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: [], error: new Error('No se pudo determinar el tenant') };

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (profErr) throw profErr;
    if (!profiles || profiles.length === 0) return { data: [], error: null };

    const roleIds = [...new Set(profiles.map((p) => p.role_id).filter(Boolean))] as string[];
    const { data: roles } = await supabase.from('roles').select('id, name').in('id', roleIds);
    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r) => { roleMap[r.id] = r.name; });

    const profileIds = profiles.map((p) => p.id);
    const { data: users } = await supabase.from('platform_users').select('profile_id').in('profile_id', profileIds);
    const userCounts: Record<string, number> = {};
    (users || []).forEach((u) => { userCounts[u.profile_id] = (userCounts[u.profile_id] || 0) + 1; });

    const result: ProfileWithDetails[] = profiles.map((p) => {
      const perms = (p.permissions as { granted?: string[] })?.granted || [];
      return {
        ...p,
        role_name: p.role_id ? roleMap[p.role_id] : undefined,
        user_count: userCounts[p.id] || 0,
        permissions_count: perms.length,
      };
    });

    return { data: result, error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function createProfile(profile: Partial<Profile>): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const tenantId = await getEffectiveTenantId();
    if (!tenantId) return { data: null, error: new Error('No se pudo determinar el tenant') };

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        tenant_id: tenantId,
        role_id: profile.role_id || null,
        name: profile.name,
        code: profile.code,
        description: profile.description || null,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as Profile, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        code: updates.code,
        description: updates.description,
        role_id: updates.role_id,
        permissions: updates.permissions,
        is_default: updates.is_default,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Profile, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function copyProfile(id: string, newName: string, newCode: string): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const { data: source } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (!source) return { data: null, error: new Error('Profile not found') };

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        tenant_id: source.tenant_id,
        role_id: source.role_id,
        name: newName,
        code: newCode,
        description: source.description,
        permissions: source.permissions,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as Profile, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}