import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user, platformUser, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
      setPasswordError('Todos los campos son requeridos');
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError('Las contrasenas nuevas no coinciden');
      return;
    }
    if (passwordForm.newPass.length < 8) {
      setPasswordError('La contrasena debe tener al menos 8 caracteres');
      return;
    }
    setChangingPassword(true);
    try {
      const { supabase } = await import('@/services/supabase/client');
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) throw error;
      setPasswordSuccess(true);
      setShowPasswordModal(false);
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Error al cambiar contrasena');
    } finally {
      setChangingPassword(false);
    }
  };

  const recentActivity = [
    { action: 'Inicio de sesion', time: 'Hace 10 min', icon: 'ri-login-box-line', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { action: 'Acceso a WMS', time: 'Hace 25 min', icon: 'ri-archive-line', color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { action: 'Acceso a BI', time: 'Hace 1 hora', icon: 'ri-bar-chart-2-line', color: 'text-accent-400', bg: 'bg-accent-500/10' },
    { action: 'Cambio de permisos', time: 'Hace 12 horas', icon: 'ri-key-2-line', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { action: 'Exportacion de auditoria', time: 'Ayer', icon: 'ri-download-line', color: 'text-secondary-400', bg: 'bg-secondary-500/10' },
  ];

  const myApps = [
    { name: 'WMS', icon: 'ri-archive-line', color: 'emerald', role: 'Operador' },
    { name: 'TMS', icon: 'ri-truck-line', color: 'cyan', role: 'Operador' },
    { name: 'CRM', icon: 'ri-user-heart-line', color: 'violet', role: 'Consulta' },
    { name: 'BI', icon: 'ri-bar-chart-2-line', color: 'amber', role: 'Visualizador' },
    { name: 'PORTAL', icon: 'ri-global-line', color: 'indigo', role: 'Usuario' },
    { name: 'HELPDESK', icon: 'ri-customer-service-2-line', color: 'rose', role: 'Soporte' },
  ];

  const myPermissions = [
    { app: 'WMS', perms: 'Ver, Crear, Editar' },
    { app: 'TMS', perms: 'Ver, Crear, Editar, Exportar' },
    { app: 'CRM', perms: 'Ver, Exportar' },
    { app: 'BI', perms: 'Ver, Exportar' },
    { app: 'PORTAL', perms: 'Ver' },
    { app: 'HELPDESK', perms: 'Ver, Crear, Editar' },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground-100">Perfil de Usuario</h1>
          <p className="text-sm text-foreground-500 mt-1">Informacion personal, seguridad y actividad en Suite OLO.</p>
        </div>

        {passwordSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-check-line"></i></span>
            Contrasena cambiada exitosamente
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal info card */}
          <div className="glass-panel rounded-2xl p-5 lg:col-span-1">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-20 h-20 rounded-full bg-accent-500/20 border border-accent-500/25 flex items-center justify-center mb-4">
                <span className="text-accent-400 text-2xl font-bold">
                  {platformUser?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  {platformUser?.last_name?.[0] || ''}
                </span>
              </div>
              <h2 className="text-base font-semibold text-foreground-200">
                {platformUser?.first_name ? `${platformUser.first_name} ${platformUser.last_name || ''}` : user?.email?.split('@')[0] || 'Usuario'}
              </h2>
              <p className="text-xs text-foreground-500 mt-0.5">{user?.email || ''}</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {platformUser?.status || 'active'}
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Rol', value: platformUser?.role_name || '', icon: 'ri-shield-user-line' },
                { label: 'Perfil', value: platformUser?.profile_name || 'Administrador', icon: 'ri-user-settings-line' },
                { label: 'Tenant', value: platformUser?.tenant_name || 'Costa Rica', icon: 'ri-building-line' },
                { label: 'Pais', value: platformUser?.country_name || 'Costa Rica', icon: 'ri-map-pin-line' },
                { label: 'Ultimo acceso', value: platformUser?.last_login ? new Date(platformUser.last_login).toLocaleDateString('es') : 'Hoy', icon: 'ri-calendar-check-line' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-secondary-500/10 flex items-center justify-center shrink-0">
                    <i className={`${row.icon} text-foreground-500 text-sm`}></i>
                  </span>
                  <div>
                    <p className="text-2xs text-foreground-600">{row.label}</p>
                    <p className="text-sm text-foreground-300">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center gap-2 h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-lock-line text-sm"></i></span>
                Cambiar contrasena
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 h-9 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-logout-box-line text-sm"></i></span>
                Cerrar sesion
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* My apps */}
            <div className="glass-panel rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">Mis aplicaciones autorizadas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {myApps.map((app) => {
                  const cm = colorMap[app.color] || colorMap.emerald;
                  return (
                    <div key={app.name} className="flex items-center gap-3 p-3 rounded-xl border border-secondary-500/10 bg-background-100 hover:border-secondary-500/25 transition-all cursor-pointer">
                      <div className={`w-9 h-9 rounded-lg ${cm.bg} border ${cm.border} flex items-center justify-center shrink-0`}>
                        <i className={`${app.icon} ${cm.text} text-base`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground-300">{app.name}</p>
                        <p className="text-2xs text-foreground-600">{app.role}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* My permissions */}
            <div className="glass-panel rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">Mis permisos principales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myPermissions.map((perm) => (
                  <div key={perm.app} className="flex items-start gap-3 p-3 rounded-xl border border-secondary-500/10 bg-background-100">
                    <span className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <i className="ri-key-2-line text-primary-400 text-sm"></i>
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground-300">{perm.app}</p>
                      <p className="text-xs text-foreground-500 mt-0.5">{perm.perms}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="glass-panel rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">Actividad reciente</h2>
              <div className="space-y-3">
                {recentActivity.map((act) => (
                  <div key={act.action + act.time} className="flex items-center justify-between py-2 border-b border-secondary-500/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg ${act.bg} flex items-center justify-center`}>
                        <i className={`${act.icon} ${act.color} text-sm`}></i>
                      </span>
                      <span className="text-sm text-foreground-300">{act.action}</span>
                    </div>
                    <span className="text-xs text-foreground-600">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change password modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">Cambiar contrasena</h2>
              <button onClick={() => setShowPasswordModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-error-warning-line"></i></span>
                {passwordError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Contrasena actual</label>
                <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nueva contrasena</label>
                <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Minimo 8 caracteres" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Confirmar nueva contrasena</label>
                <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Repite la contrasena" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowPasswordModal(false)} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">Cancelar</button>
              <button onClick={handleChangePassword} disabled={changingPassword} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50">
                {changingPassword ? 'Cambiando...' : 'Cambiar contrasena'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}