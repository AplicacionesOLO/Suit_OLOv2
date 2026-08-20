import { supabase } from '@/services/supabase/client';

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  severity: string;
  created_at: string;
}

export interface AuditFilter {
  search?: string;
  action?: string;
  entity_type?: string;
  severity?: string;
  tenant_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditStats {
  total_today: number;
  critical: number;
  access_denied: number;
  permission_changes: number;
  recent_logins: number;
}

export async function fetchAuditLogs(filters: AuditFilter = {}): Promise<{ data: AuditLog[]; error: string | null; count: number }> {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (filters.search) {
      const s = `%${filters.search}%`;
      query = query.or(`action.ilike.${s},entity_type.ilike.${s},details->>'email'.ilike.${s},details->>'user'.ilike.${s},details->>'application'.ilike.${s}`);
    }
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
    if (filters.severity) query = query.eq('severity', filters.severity);
    if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: (data || []) as AuditLog[], error: null, count: count || 0 };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Error al cargar auditoria', count: 0 };
  }
}

export async function fetchAuditDetail(id: string): Promise<{ data: AuditLog | null; error: string | null }> {
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (data) return { data: data as AuditLog, error: null };
    return { data: null, error: 'Registro no encontrado' };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Error al cargar detalle' };
  }
}

export async function fetchAuditStats(): Promise<{ data: AuditStats; error: string | null }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: allData, error } = await supabase.from('audit_logs').select('action, severity, created_at');

    if (error) throw error;

    const data = allData || [];
    return {
      data: {
        total_today: data.filter((l) => l.created_at >= todayISO).length,
        critical: data.filter((l) => l.severity === 'critical').length,
        access_denied: data.filter((l) => l.action.includes('DENIED') || l.action.includes('REVOKED')).length,
        permission_changes: data.filter((l) => l.action === 'PERMISSION_CHANGED').length,
        recent_logins: data.filter((l) => l.action === 'LOGIN' && l.created_at >= todayISO).length,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: { total_today: 0, critical: 0, access_denied: 0, permission_changes: 0, recent_logins: 0 },
      error: err instanceof Error ? err.message : 'Error al cargar estadisticas',
    };
  }
}

export async function fetchDistinctActions(): Promise<{ data: string[]; error: string | null }> {
  try {
    const { data, error } = await supabase.from('audit_logs').select('action');
    if (error) throw error;
    const actions = [...new Set((data || []).map((r) => r.action))].sort();
    return { data: actions, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Error al cargar acciones' };
  }
}

export function exportAuditCSV(logs: AuditLog[]): void {
  const headers = ['Fecha/Hora', 'Accion', 'Entidad', 'Severidad', 'IP', 'Detalles'];
  const rows = logs.map((l) => [
    new Date(l.created_at).toISOString(),
    l.action,
    l.entity_type,
    l.severity,
    l.ip_address || '',
    JSON.stringify(l.details || {}),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}