import { supabase } from '@/services/supabase/client';

export interface SecurityAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  ip_address?: string;
  user?: string;
  application?: string;
  tenant_id?: string;
}

function deriveAlertType(action: string): string {
  if (action === 'LOGIN_FAILED') return 'login_failed';
  if (action === 'ACCESS_DENIED') return 'access_denied';
  if (action === 'PERMISSION_CHANGED') return 'permission_change';
  if (action === 'ACCESS_REVOKED') return 'access_denied';
  if (action === 'SESSION_REVOKED') return 'risky_session';
  return 'general';
}

function deriveTitle(action: string, details: Record<string, unknown> | null): string {
  if (action === 'LOGIN_FAILED') return 'Intento de inicio de sesion fallido';
  if (action === 'ACCESS_DENIED') return 'Acceso denegado';
  if (action === 'PERMISSION_CHANGED') return 'Cambio de permisos';
  if (action === 'ACCESS_REVOKED') return 'Acceso revocado';
  if (action === 'SESSION_REVOKED') return 'Sesion revocada';
  if (action === 'SECURITY_SETTING_CHANGED') return 'Configuracion de seguridad modificada';
  const detailStr = details ? JSON.stringify(details) : '';
  if (detailStr.includes('email')) return 'Actividad de autenticacion';
  return action.replace(/_/g, ' ');
}

export async function fetchAlerts(): Promise<{ data: SecurityAlert[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .neq('severity', 'info')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const alerts: SecurityAlert[] = (data || []).map((log) => ({
      id: log.id,
      type: deriveAlertType(log.action),
      title: deriveTitle(log.action, log.details),
      description: typeof log.details === 'object' && log.details !== null
        ? JSON.stringify(log.details)
        : 'Evento de seguridad registrado',
      severity: log.severity || 'medium',
      status: 'open',
      created_at: log.created_at,
      ip_address: log.ip_address || undefined,
      user: typeof log.details === 'object' && log.details !== null
        ? (log.details as Record<string, unknown>).email as string || undefined
        : undefined,
      tenant_id: log.tenant_id,
    }));

    return { data: alerts, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Error al cargar alertas' };
  }
}

export async function resolveAlert(alertId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .update({ severity: 'resolved' })
      .eq('id', alertId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al resolver alerta' };
  }
}