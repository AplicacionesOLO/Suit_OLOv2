import { supabase } from '@/services/supabase/client';

export interface TenantSettings {
  id: string;
  tenant_id: string;
  mfa_enabled: boolean;
  max_login_attempts: number;
  session_timeout_minutes: number;
  password_min_length: number;
  sso_enabled: boolean;
  audit_retention_days: number;
  allowed_ip_ranges: string[];
  branding: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SecuritySettingsForm {
  mfa_enabled: boolean;
  allow_google_oauth: boolean;
  max_login_attempts: number;
  session_timeout_minutes: number;
  inactivity_timeout_minutes: number;
  refresh_token_policy: string;
  global_logout: boolean;
  password_min_length: number;
  allow_access_requests: boolean;
  require_approval: boolean;
  allowed_domains: string;
  audit_enabled: boolean;
  audit_retention_days: number;
  critical_alerts: boolean;
  allow_export: boolean;
  device_validation: boolean;
  session_risk: boolean;
  access_context: boolean;
  reauth_critical: boolean;
}

const defaultSettings: SecuritySettingsForm = {
  mfa_enabled: true,
  allow_google_oauth: true,
  max_login_attempts: 3,
  session_timeout_minutes: 480,
  inactivity_timeout_minutes: 30,
  refresh_token_policy: 'rotate',
  global_logout: false,
  password_min_length: 12,
  allow_access_requests: true,
  require_approval: true,
  allowed_domains: 'suiteolo.io, corporativo.com',
  audit_enabled: true,
  audit_retention_days: 365,
  critical_alerts: true,
  allow_export: true,
  device_validation: false,
  session_risk: false,
  access_context: false,
  reauth_critical: false,
};

export async function fetchTenantSettings(tenantId: string): Promise<{ data: SecuritySettingsForm | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return { data: mapToForm(data as TenantSettings), error: null };
    }
    return { data: { ...defaultSettings }, error: null };
  } catch {
    return { data: { ...defaultSettings }, error: null };
  }
}

export async function saveTenantSettings(tenantId: string, form: SecuritySettingsForm): Promise<{ error: string | null }> {
  try {
    const record = mapFromForm(tenantId, form);

    const { data: existing } = await supabase
      .from('tenant_settings')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('tenant_settings')
        .update(record)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('tenant_settings')
        .insert(record);
      if (error) throw error;
    }
    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar';
    return { error: msg };
  }
}

function mapToForm(ts: TenantSettings): SecuritySettingsForm {
  const domains = ts.allowed_ip_ranges?.join(', ') || '186.32.0.0/16';
  return {
    mfa_enabled: ts.mfa_enabled ?? defaultSettings.mfa_enabled,
    allow_google_oauth: ts.sso_enabled ?? defaultSettings.allow_google_oauth,
    max_login_attempts: ts.max_login_attempts ?? defaultSettings.max_login_attempts,
    session_timeout_minutes: ts.session_timeout_minutes ?? defaultSettings.session_timeout_minutes,
    inactivity_timeout_minutes: defaultSettings.inactivity_timeout_minutes,
    refresh_token_policy: defaultSettings.refresh_token_policy,
    global_logout: defaultSettings.global_logout,
    password_min_length: ts.password_min_length ?? defaultSettings.password_min_length,
    allow_access_requests: defaultSettings.allow_access_requests,
    require_approval: defaultSettings.require_approval,
    allowed_domains: domains,
    audit_enabled: defaultSettings.audit_enabled,
    audit_retention_days: ts.audit_retention_days ?? defaultSettings.audit_retention_days,
    critical_alerts: defaultSettings.critical_alerts,
    allow_export: defaultSettings.allow_export,
    device_validation: defaultSettings.device_validation,
    session_risk: defaultSettings.session_risk,
    access_context: defaultSettings.access_context,
    reauth_critical: defaultSettings.reauth_critical,
  };
}

function mapFromForm(tenantId: string, form: SecuritySettingsForm) {
  return {
    tenant_id: tenantId,
    mfa_enabled: form.mfa_enabled,
    max_login_attempts: form.max_login_attempts,
    session_timeout_minutes: form.session_timeout_minutes,
    password_min_length: form.password_min_length,
    sso_enabled: form.allow_google_oauth,
    audit_retention_days: form.audit_retention_days,
    allowed_ip_ranges: form.allowed_domains.split(',').map((d) => d.trim()).filter(Boolean),
    branding: { theme: 'dark', logo_url: null },
  };
}