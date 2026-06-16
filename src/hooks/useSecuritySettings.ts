import { useState, useEffect, useCallback } from 'react';
import { fetchTenantSettings, saveTenantSettings, type SecuritySettingsForm } from '@/services/security/settingsService';

const defaultForm: SecuritySettingsForm = {
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
  allowed_domains: '',
  audit_enabled: true,
  audit_retention_days: 365,
  critical_alerts: true,
  allow_export: true,
  device_validation: false,
  session_risk: false,
  access_context: false,
  reauth_critical: false,
};

export function useSecuritySettings(tenantId: string) {
  const [settings, setSettings] = useState<SecuritySettingsForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const result = await fetchTenantSettings(tenantId);
    if (result.data) setSettings(result.data);
    if (result.error) setError(result.error);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback((patch: Partial<SecuritySettingsForm>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSuccess(false);
  }, []);

  const save = useCallback(async () => {
    if (!tenantId) return { error: 'No tenant selected' };
    setSaving(true);
    setError(null);
    setSuccess(false);
    const result = await saveTenantSettings(tenantId, settings);
    setSaving(false);
    if (result.error) { setError(result.error); return result; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    return result;
  }, [tenantId, settings]);

  return { settings, loading, saving, error, success, update, save, load };
}