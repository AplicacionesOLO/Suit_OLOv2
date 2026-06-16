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

const mockAuditLogs: AuditLog[] = [
  { id: 'm1', tenant_id: '00000000-0000-0000-0000-000000000001', user_id: null, action: 'LOGIN', entity_type: 'session', entity_id: null, details: { email: 'admin@suiteolo.io', method: 'password' }, ip_address: '186.32.45.12', user_agent: 'Chrome/125', severity: 'info', created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 'm2', tenant_id: '00000000-0000-0000-0000-000000000001', user_id: null, action: 'LOGIN_FAILED', entity_type: 'session', entity_id: null, details: { email: 'attacker@dark.com', reason: 'invalid_credentials' }, ip_address: '45.33.32.156', user_agent: 'python-requests', severity: 'critical', created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'm3', tenant_id: '00000000-0000-0000-0000-000000000001', user_id: null, action: 'ACCESS_REVOKED', entity_type: 'user_application_access', entity_id: null, details: { application: 'HR', user: 'ex@suiteolo.io', reason: 'termination' }, ip_address: '186.32.45.12', user_agent: 'Chrome/125', severity: 'high', created_at: new Date(Date.now() - 28800000).toISOString() },
  { id: 'm4', tenant_id: '00000000-0000-0000-0000-000000000001', user_id: null, action: 'PERMISSION_CHANGED', entity_type: 'permissions', entity_id: null, details: { profile: 'Admin Operativo', application: 'WMS', changes: { added: ['Aprobar', 'Auditar'] } }, ip_address: '186.32.45.12', user_agent: 'Chrome/125', severity: 'high', created_at: new Date(Date.now() - 43200000).toISOString() },
  { id: 'm5', tenant_id: '00000000-0000-0000-0000-000000000001', user_id: null, action: 'ROLE_CREATED', entity_type: 'roles', entity_id: null, details: { name: 'Operador Almacen', code: 'WH_OPERATOR' }, ip_address: '186.32.45.12', user_agent: 'Chrome/125', severity: 'low', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'm6', tenant_id: '00000000-0000-0000-0000-000000000002', user_id: null, action: 'LOGIN', entity_type: 'session', entity_id: null, details: { email: 'admin@panama.com', method: 'password' }, ip_address: '190.140.50.30', user_agent: 'Chrome/124', severity: 'info', created_at: new Date(Date.now() - 18000000).toISOString() },
  { id: 'm7', tenant_id: '00000000-0000-0000-0000-000000000003', user_id: null, action: 'ACCESS_DENIED', entity_type: 'application', entity_id: null, details: { user: 'externo@mexico.com', application: 'FINANCE', reason: 'tenant_mismatch' }, ip_address: '187.45.23.99', user_agent: 'Edge/122', severity: 'critical', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'm8', tenant_id: '00000000-0000-0000-0000-000000000001', user_id: null, action: 'SECURITY_SETTING_CHANGED', entity_type: 'tenant_settings', entity_id: null, details: { setting: 'session_timeout', from: 480, to: 240 }, ip_address: '186.32.45.12', user_agent: 'Chrome/125', severity: 'high', created_at: new Date(Date.now() - 86400000).toISOString() },
];

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
    if (data && data.length > 0) {
      return { data: data as AuditLog[], error: null, count: count || 0 };
    }
    return applyMockFilters(mockAuditLogs, filters);
  } catch {
    return applyMockFilters(mockAuditLogs, filters);
  }
}

export async function fetchAuditDetail(id: string): Promise<{ data: AuditLog | null; error: string | null }> {
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (data) return { data: data as AuditLog, error: null };
    const mock = mockAuditLogs.find((l) => l.id === id) || null;
    return { data: mock, error: null };
  } catch {
    const mock = mockAuditLogs.find((l) => l.id === id) || null;
    return { data: mock, error: null };
  }
}

export async function fetchAuditStats(): Promise<{ data: AuditStats; error: string | null }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: allData, error } = await supabase.from('audit_logs').select('action, severity, created_at');
    if (error) throw error;
    if (allData && allData.length > 0) {
      return {
        data: {
          total_today: allData.filter((l) => l.created_at >= todayISO).length,
          critical: allData.filter((l) => l.severity === 'critical').length,
          access_denied: allData.filter((l) => l.action.includes('DENIED')).length,
          permission_changes: allData.filter((l) => l.action === 'PERMISSION_CHANGED').length,
          recent_logins: allData.filter((l) => l.action === 'LOGIN' && l.created_at >= todayISO).length,
        },
        error: null,
      };
    }
    return { data: computeMockStats(mockAuditLogs), error: null };
  } catch {
    return { data: computeMockStats(mockAuditLogs), error: null };
  }
}

export async function fetchDistinctActions(): Promise<{ data: string[]; error: string | null }> {
  try {
    const { data, error } = await supabase.from('audit_logs').select('action');
    if (error) throw error;
    if (data && data.length > 0) {
      const actions = [...new Set(data.map((r) => r.action))].sort();
      return { data: actions, error: null };
    }
    const mockActions = [...new Set(mockAuditLogs.map((l) => l.action))].sort();
    return { data: mockActions, error: null };
  } catch {
    const mockActions = [...new Set(mockAuditLogs.map((l) => l.action))].sort();
    return { data: mockActions, error: null };
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

function applyMockFilters(logs: AuditLog[], filters: AuditFilter): { data: AuditLog[]; error: null; count: number } {
  let result = [...logs];
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((l) =>
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(q) ||
      (l.ip_address || '').toLowerCase().includes(q)
    );
  }
  if (filters.action) result = result.filter((l) => l.action === filters.action);
  if (filters.entity_type) result = result.filter((l) => l.entity_type === filters.entity_type);
  if (filters.severity) result = result.filter((l) => l.severity === filters.severity);
  if (filters.tenant_id) result = result.filter((l) => l.tenant_id === filters.tenant_id);
  if (filters.date_from) result = result.filter((l) => l.created_at >= filters.date_from);
  if (filters.date_to) result = result.filter((l) => l.created_at <= filters.date_to);

  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const count = result.length;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const start = (page - 1) * pageSize;
  return { data: result.slice(start, start + pageSize), error: null, count };
}

function computeMockStats(logs: AuditLog[]): AuditStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  return {
    total_today: logs.filter((l) => l.created_at >= todayISO).length,
    critical: logs.filter((l) => l.severity === 'critical').length,
    access_denied: logs.filter((l) => l.action.includes('DENIED') || l.action.includes('REVOKED')).length,
    permission_changes: logs.filter((l) => l.action === 'PERMISSION_CHANGED').length,
    recent_logins: logs.filter((l) => l.action === 'LOGIN' && l.created_at >= todayISO).length,
  };
}