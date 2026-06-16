import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { useAuth } from '@/hooks/useAuth';

const complianceChecks = [
  { label: 'MFA obligatorio', key: 'mfa_enabled' as const, critical: true },
  { label: 'Longitud minima de password >= 12', key: 'password_min_length' as const, critical: true, check: (v: number) => v >= 12 },
  { label: 'Max intentos de login <= 3', key: 'max_login_attempts' as const, critical: true, check: (v: number) => v <= 3 },
  { label: 'Auditoria activa', key: 'audit_enabled' as const, critical: false },
  { label: 'Alertas criticas activas', key: 'critical_alerts' as const, critical: false },
  { label: 'Retencion de logs >= 90 dias', key: 'audit_retention_days' as const, critical: false, check: (v: number) => v >= 90 },
  { label: 'Validacion por dispositivo', key: 'device_validation' as const, critical: false },
  { label: 'Analisis de riesgo de sesion', key: 'session_risk' as const, critical: false },
];

export default function SecuritySettingsPage() {
  const { platformUser } = useAuth();
  const tenantId = platformUser?.tenant_id || '00000000-0000-0000-0000-000000000001';
  const { settings, loading, saving, error, success, update, save } = useSecuritySettings(tenantId);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);

  const handleSave = () => {
    const changes: string[] = [];
    if (settings.mfa_enabled !== true) changes.push('MFA desactivado');
    if (settings.password_min_length < 8) changes.push('Password minimo bajo');
    if (settings.max_login_attempts > 5) changes.push('Intentos de login altos');
    setPendingChanges(changes);
    if (changes.length > 0) {
      setShowConfirm(true);
    } else {
      save();
    }
  };

  const doSave = async () => {
    setShowConfirm(false);
    await save();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-background-100 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 h-48 bg-background-100/50" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Configuracion de Seguridad</h1>
            <p className="text-sm text-foreground-500 mt-1">Politicas de autenticacion, sesiones, acceso y auditoria del tenant.</p>
          </div>
          <div className="flex items-center gap-2">
            {success && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-check-line text-sm"></i></span>
                Guardado
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-loader-4-line animate-spin"></i></span>
                  Guardando...
                </>
              ) : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
            {error}
          </div>
        )}

        {/* Compliance status */}
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground-200 mb-4">Estado de cumplimiento</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {complianceChecks.map((check) => {
              let passed = false;
              const val = settings[check.key];
              if (typeof val === 'boolean') passed = val;
              else if (typeof val === 'number' && check.check) passed = check.check(val);
              else passed = !!val;
              return (
                <div key={check.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  passed
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : check.critical
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                }`}>
                  <span className={`w-5 h-5 flex items-center justify-center ${passed ? 'text-emerald-400' : check.critical ? 'text-red-400' : 'text-amber-400'}`}>
                    <i className={`${passed ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} text-base`}></i>
                  </span>
                  <div>
                    <p className="text-xs font-medium text-foreground-300">{check.label}</p>
                    <p className="text-2xs text-foreground-600">{passed ? 'Cumple' : 'No cumple'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Autenticacion */}
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground-200 mb-1">Autenticacion</h2>
            <p className="text-xs text-foreground-600 mb-4">Configuracion de metodos y politicas de autenticacion</p>
            <div className="space-y-4">
              <ToggleRow label="MFA obligatorio" value={settings.mfa_enabled} onChange={(v) => update({ mfa_enabled: v })} />
              <ToggleRow label="Login con Google OAuth" value={settings.allow_google_oauth} onChange={(v) => update({ allow_google_oauth: v })} />
              <ToggleRow label="Login con Microsoft (futuro)" value={false} onChange={() => {}} disabled />
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Longitud minima de password</label>
                <input
                  type="number"
                  min={4}
                  max={64}
                  value={settings.password_min_length}
                  onChange={(e) => update({ password_min_length: parseInt(e.target.value) || 8 })}
                  className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Maximos intentos de login</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.max_login_attempts}
                  onChange={(e) => update({ max_login_attempts: parseInt(e.target.value) || 3 })}
                  className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sesiones */}
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground-200 mb-1">Sesiones</h2>
            <p className="text-xs text-foreground-600 mb-4">Control de sesiones activas y politicas de timeout</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tiempo maximo de sesion (minutos)</label>
                <input
                  type="number"
                  min={15}
                  max={1440}
                  value={settings.session_timeout_minutes}
                  onChange={(e) => update({ session_timeout_minutes: parseInt(e.target.value) || 480 })}
                  className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Tiempo de inactividad (minutos)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={settings.inactivity_timeout_minutes}
                  onChange={(e) => update({ inactivity_timeout_minutes: parseInt(e.target.value) || 30 })}
                  className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Politica de refresh token</label>
                <select
                  value={settings.refresh_token_policy}
                  onChange={(e) => update({ refresh_token_policy: e.target.value })}
                  className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                >
                  <option value="rotate">Rotar (recomendado)</option>
                  <option value="reuse">Reutilizar</option>
                  <option value="once">Un solo uso</option>
                </select>
              </div>
              <ToggleRow label="Cierre de sesion global" value={settings.global_logout} onChange={(v) => update({ global_logout: v })} />
            </div>
          </div>

          {/* Acceso */}
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground-200 mb-1">Acceso</h2>
            <p className="text-xs text-foreground-600 mb-4">Control de solicitudes de acceso y restricciones</p>
            <div className="space-y-4">
              <ToggleRow label="Permitir solicitudes de acceso" value={settings.allow_access_requests} onChange={(v) => update({ allow_access_requests: v })} />
              <ToggleRow label="Requiere aprobacion" value={settings.require_approval} onChange={(v) => update({ require_approval: v })} />
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Dominios / IPs permitidas</label>
                <input
                  type="text"
                  value={settings.allowed_domains}
                  onChange={(e) => update({ allowed_domains: e.target.value })}
                  placeholder="186.32.0.0/16, suiteolo.io"
                  className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
                />
              </div>
              <ToggleRow label="Restriccion por IP (futuro)" value={false} onChange={() => {}} disabled />
              <ToggleRow label="Bloqueo por pais (futuro)" value={false} onChange={() => {}} disabled />
            </div>
          </div>

          {/* Auditoria */}
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground-200 mb-1">Auditoria</h2>
            <p className="text-xs text-foreground-600 mb-4">Configuracion de logs y alertas de auditoria</p>
            <div className="space-y-4">
              <ToggleRow label="Auditoria activa" value={settings.audit_enabled} onChange={(v) => update({ audit_enabled: v })} />
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Retencion de logs (dias)</label>
                <input
                  type="number"
                  min={30}
                  max={3650}
                  value={settings.audit_retention_days}
                  onChange={(e) => update({ audit_retention_days: parseInt(e.target.value) || 365 })}
                  className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 transition-all"
                />
              </div>
              <ToggleRow label="Alertas criticas" value={settings.critical_alerts} onChange={(v) => update({ critical_alerts: v })} />
              <ToggleRow label="Exportacion permitida" value={settings.allow_export} onChange={(v) => update({ allow_export: v })} />
            </div>
          </div>

          {/* Zero Trust */}
          <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-foreground-200 mb-1">Zero Trust (preparacion)</h2>
            <p className="text-xs text-foreground-600 mb-4">Funcionalidades preparadas para implementacion futura de arquitectura Zero Trust</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ToggleRow label="Validacion por dispositivo" value={settings.device_validation} onChange={(v) => update({ device_validation: v })} disabled />
              <ToggleRow label="Analisis de riesgo de sesion" value={settings.session_risk} onChange={(v) => update({ session_risk: v })} disabled />
              <ToggleRow label="Contexto de acceso" value={settings.access_context} onChange={(v) => update({ access_context: v })} disabled />
              <ToggleRow label="Reautenticacion para acciones criticas" value={settings.reauth_critical} onChange={(v) => update({ reauth_critical: v })} disabled />
            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialog for critical changes */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <i className="ri-alert-line text-amber-400 text-2xl"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-200 text-center mb-2">Cambios criticos detectados</h3>
            <p className="text-sm text-foreground-500 text-center mb-4">Se detectaron los siguientes cambios que pueden reducir la seguridad:</p>
            <div className="space-y-2 mb-6">
              {pendingChanges.map((c) => (
                <div key={c} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-alert-line"></i></span>
                  {c}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowConfirm(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={doSave} className="h-9 px-4 rounded-lg bg-amber-500 text-foreground-950 hover:bg-amber-400 transition-colors text-sm font-medium whitespace-nowrap">Guardar de todos modos</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ToggleRow({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={`text-sm ${disabled ? 'text-foreground-600' : 'text-foreground-300'}`}>{label}</span>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative w-10 h-5 rounded-full transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${value ? 'bg-emerald-500' : 'bg-secondary-500/40'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground-50 transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}></span>
      </button>
    </div>
  );
}