import { supabase } from '@/services/supabase/client';
import type { AuthError, Session, User } from '@supabase/supabase-js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface SuitePermissions {
  modules: Record<string, { menu: boolean; actions: string[] }>;
}

export interface PlatformUser {
  id: string;
  auth_user_id: string;
  tenant_id: string | null;
  country_id: string | null;
  warehouse_id: string | null;
  client_id: string | null;
  role_id: string | null;
  role_level: number | null;
  profile_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string;
  last_login: string | null;
  avatar_url: string | null;
  tenant_context_override: string | null;
  country_context_override: string | null;
  tenant_name?: string | null;
  role_name?: string | null;
  country_name?: string | null;
  profile_name?: string | null;
  suite_permissions?: SuitePermissions | null;
}

export async function loginWithEmail({ email, password }: LoginCredentials): Promise<LoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { user: null, session: null, error };
  }

  if (data.user) {
    try {
      await supabase
        .from('platform_users')
        .update({ last_login: new Date().toISOString() })
        .eq('auth_user_id', data.user.id);
    } catch {
      // Non-critical — profile update can fail silently
    }

    try {
      const { data: pu } = await supabase.from('platform_users').select('tenant_id').eq('auth_user_id', data.user.id).maybeSingle();
      await supabase.from('audit_logs').insert({
        tenant_id: pu?.tenant_id || null,
        user_id: null,
        action: 'login',
        entity_type: 'auth',
        entity_id: data.user.id,
        details: { email },
        severity: 'info',
      });
    } catch {
      // Non-critical audit log
    }
  }

  return { user: data.user, session: data.session, error: null };
}

export async function loginWithGoogle(): Promise<LoginResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { user: null, session: null, error: error || null };
}

export async function logout(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function sendPasswordReset(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
  return { error };
}

export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getPlatformUser(authUserId: string): Promise<PlatformUser | null> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data) return null;

  const pu = data as PlatformUser;

  if (pu.role_id) {
    const { data: role } = await supabase.from('roles').select('level, name').eq('id', pu.role_id).maybeSingle();
    if (role) {
      pu.role_level = role.level;
      pu.role_name = role.name;
    }
  }

  if (pu.tenant_id) {
    const { data: tenant } = await supabase.from('tenants').select('name').eq('id', pu.tenant_id).maybeSingle();
    if (tenant) pu.tenant_name = tenant.name;
  }

  if (pu.country_id) {
    const { data: country } = await supabase.from('countries').select('name').eq('id', pu.country_id).maybeSingle();
    if (country) pu.country_name = country.name;
  }

  if (pu.profile_id) {
    const { data: profile } = await supabase.from('profiles').select('name, permissions').eq('id', pu.profile_id).maybeSingle();
    if (profile) {
      pu.profile_name = profile.name;
      pu.suite_permissions = (profile.permissions as SuitePermissions) || null;
    }
  }

  return pu;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}