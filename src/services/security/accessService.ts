import { supabase } from '@/services/supabase/client';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

export interface UserAppAccess {
  id: string;
  tenant_id: string;
  user_id: string;
  application_id: string;
  instance_id: string | null;
  access_status: string;
  granted_by: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface AccessWithDetails extends UserAppAccess {
  user_name?: string;
  user_email?: string;
  application_name?: string;
  application_code?: string;
  application_icon?: string;
  application_color?: string;
  instance_name?: string;
  role_name?: string;
}

export async function fetchUserAccesses(): Promise<{ data: AccessWithDetails[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_application_access')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return { data: [], error: null };

    const userIds = [...new Set(data.map((a) => a.user_id))];
    const appIds = [...new Set(data.map((a) => a.application_id))];
    const instanceIds = [...new Set(data.map((a) => a.instance_id).filter(Boolean))] as string[];

    const [usersRes, appsRes, instancesRes] = await Promise.all([
      supabase.from('platform_users').select('id, first_name, last_name, email, role_id').in('id', userIds),
      supabase.from('applications').select('id, name, code, icon, color').in('id', appIds),
      instanceIds.length > 0 ? supabase.from('application_instances').select('id, instance_name').in('id', instanceIds) : Promise.resolve({ data: [] }),
    ]);

    const userMap: Record<string, { name: string; email: string; role_id: string }> = {};
    (usersRes.data || []).forEach((u) => {
      userMap[u.id] = { name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—', email: u.email || '—', role_id: u.role_id };
    });

    const appMap: Record<string, { name: string; code: string; icon: string; color: string }> = {};
    (appsRes.data || []).forEach((a) => {
      appMap[a.id] = { name: a.name, code: a.code, icon: a.icon, color: a.color };
    });

    const instMap: Record<string, string> = {};
    (instancesRes.data || []).forEach((i) => { instMap[i.id] = i.instance_name; });

    const roleIds = [...new Set(Object.values(userMap).map((u) => u.role_id).filter(Boolean))] as string[];
    const { data: rolesData } = roleIds.length > 0
      ? await supabase.from('roles').select('id, name').in('id', roleIds)
      : { data: [] };
    const roleMap: Record<string, string> = {};
    (rolesData || []).forEach((r) => { roleMap[r.id] = r.name; });

    return {
      data: data.map((a) => {
        const user = userMap[a.user_id];
        const app = appMap[a.application_id];
        return {
          ...a,
          user_name: user?.name,
          user_email: user?.email,
          application_name: app?.name,
          application_code: app?.code,
          application_icon: app?.icon,
          application_color: app?.color,
          instance_name: a.instance_id ? instMap[a.instance_id] : undefined,
          role_name: user?.role_id ? roleMap[user.role_id] : undefined,
        };
      }),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function fetchMyAccesses(userId: string): Promise<{ data: AccessWithDetails[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_application_access')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return { data: [], error: null };

    const appIds = [...new Set(data.map((a) => a.application_id))];
    const instanceIds = [...new Set(data.map((a) => a.instance_id).filter(Boolean))] as string[];

    const [appsRes, instancesRes] = await Promise.all([
      supabase.from('applications').select('id, name, code, icon, color, base_url, status, version').in('id', appIds),
      instanceIds.length > 0 ? supabase.from('application_instances').select('*').in('id', instanceIds) : Promise.resolve({ data: [] }),
    ]);

    const appMap: Record<string, Record<string, unknown>> = {};
    (appsRes.data || []).forEach((a) => { appMap[a.id] = a; });

    const instMap: Record<string, Record<string, unknown>> = {};
    (instancesRes.data || []).forEach((i) => { instMap[i.id] = i; });

    return {
      data: data.map((a) => ({
        ...a,
        application_name: (appMap[a.application_id] as { name?: string })?.name,
        application_code: (appMap[a.application_id] as { code?: string })?.code,
        application_icon: (appMap[a.application_id] as { icon?: string })?.icon,
        application_color: (appMap[a.application_id] as { color?: string })?.color,
        instance_name: a.instance_id ? (instMap[a.instance_id] as { instance_name?: string })?.instance_name : undefined,
      })),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function grantAccess(access: Partial<UserAppAccess>): Promise<{ data: UserAppAccess | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_application_access')
      .insert({
        tenant_id: TENANT_ID,
        user_id: access.user_id,
        application_id: access.application_id,
        instance_id: access.instance_id || null,
        access_status: 'active',
        granted_by: access.granted_by || null,
        granted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as UserAppAccess, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateAccessStatus(id: string, status: string): Promise<{ error: Error | null }> {
  try {
    const updates: Record<string, unknown> = { access_status: status };
    if (status === 'revoked') updates.revoked_at = new Date().toISOString();
    const { error } = await supabase.from('user_application_access').update(updates).eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}