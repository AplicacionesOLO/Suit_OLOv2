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

export interface PlatformUser {
  id: string;
  auth_user_id: string;
  tenant_id: string;
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
}

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

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
      await supabase.from('audit_logs').insert({
        tenant_id: TENANT_ID,
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
      redirectTo: `${window.location.origin}/dashboard`,
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
    const { data: role } = await supabase.from('roles').select('level').eq('id', pu.role_id).maybeSingle();
    pu.role_level = role?.level ?? null;
  }

  return pu;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}