import { supabase } from '@/services/supabase/client';

export interface ActiveSession {
  id: string;
  user_name: string;
  email: string;
  role: string;
  ip_address: string;
  country: string;
  device: string;
  browser: string;
  last_activity: string;
  status: string;
  risk: string;
}

export async function fetchSessions(): Promise<{ data: ActiveSession[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'LOGIN')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;

    const sessions: ActiveSession[] = (data || []).map((log, idx) => ({
      id: log.id,
      user_name: typeof log.details === 'object' && log.details !== null
        ? ((log.details as Record<string, unknown>).email as string)?.split('@')[0] || 'Usuario'
        : 'Usuario',
      email: typeof log.details === 'object' && log.details !== null
        ? ((log.details as Record<string, unknown>).email as string) || ''
        : '',
      role: 'Usuario',
      ip_address: log.ip_address || '—',
      country: '—',
      device: log.user_agent || '—',
      browser: log.user_agent || '—',
      last_activity: log.created_at,
      status: idx === 0 ? 'active' : 'inactive',
      risk: 'low',
    }));

    return { data: sessions, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Error al cargar sesiones' };
  }
}

export async function revokeSession(sessionId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .update({ severity: 'revoked' })
      .eq('id', sessionId);
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al revocar sesion' };
  }
}

export async function markSessionSuspicious(sessionId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .update({ severity: 'high' })
      .eq('id', sessionId);
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al marcar sesion' };
  }
}