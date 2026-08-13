import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { userHasPassword } from '@/services/auth/authService';
import AuthorizedAppsCard from '@/pages/profile/components/AuthorizedAppsCard';
import PermissionsCard from '@/pages/profile/components/PermissionsCard';
import RecentActivityCard from '@/pages/profile/components/RecentActivityCard';

export default function ProfilePage() {
  const { user, platformUser, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [passwordStatusLoading, setPasswordStatusLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const loadPasswordStatus = useCallback(async () => {
    setPasswordStatusLoading(true);
    const has = await userHasPassword();
    setHasPassword(has);
    setPasswordStatusLoading(false);
  }, []);

  useEffect(() => {
    loadPasswordStatus();
  }, [loadPasswordStatus]);

  const openPasswordModal = () => {
    setPasswordForm({ current: '', newPass: '', confirm: '' });
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleSubmitPassword = async () => {
    setPasswordError('');

    if (!passwordForm.newPass || !passwordForm.confirm) {
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
    if (hasPassword && !passwordForm.current) {
      setPasswordError('Ingresa tu contrasena actual');
      return;
    }

    setChangingPassword(true);
    try {
      const { supabase } = await import('@/services/supabase/client');

      // Si ya tiene contrasena, verificamos la actual antes de cambiarla.
      if (hasPassword) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: passwordForm.current,
        });
        if (verifyError) {
          setPasswordError('La contrasena actual es incorrecta');
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) throw error;

      setHasPassword(true);
      setPasswordSuccess(true);
      setShowPasswordModal(false);
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Error al guardar la contrasena');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground-100">Perfil de Usuario</h1>
          <p className="text-sm text-foreground-500 mt-1">Informacion personal, seguridad y actividad en Suite OLO.</p>
        </div>

        {passwordSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-check-line"></i></span>
            Contrasena guardada exitosamente
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                {platformUser?.status || 'active'}
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Rol', value: platformUser?.role_name || '', icon: 'ri-shield-user-line' },
                { label: 'Perfil', value: platformUser?.profile_name || 'Administrador', icon: 'ri-user-settings-line' },
                { label: 'Tenant', value: platformUser?.tenant_name || '—', icon: 'ri-building-line' },
                { label: 'Pais', value: platformUser?.country_name || '—', icon: 'ri-map-pin-line' },
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
                onClick={openPasswordModal}
                className="w-full flex items-center gap-2 h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-lock-line text-sm"></i></span>
                {hasPassword === false ? 'Crear contrasena' : 'Cambiar contrasena'}
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
            <AuthorizedAppsCard />
            <PermissionsCard />
            <RecentActivityCard />
          </div>
        </div>
      </div>

      {/* Password modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#231E20]/60 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">
                {hasPassword === false ? 'Crear contrasena' : 'Cambiar contrasena'}
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>
            </div>

            {passwordStatusLoading && hasPassword === null ? (
              <div className="py-10 flex flex-col items-center gap-3 text-foreground-500">
                <div className="w-6 h-6 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
                <p className="text-xs">Verificando tu cuenta...</p>
              </div>
            ) : (
              <>
                {passwordError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-error-warning-line"></i></span>
                    {passwordError}
                  </div>
                )}

                {hasPassword === false && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm mb-4">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5"><i className="ri-information-line"></i></span>
                    <span>Inicias sesion con Google y aun no tienes contrasena. Creala para poder entrar tambien con tu email.</span>
                  </div>
                )}

                <div className="space-y-4">
                  {hasPassword !== false && (
                    <div>
                      <label className="block text-xs font-medium text-foreground-400 mb-1.5">Contrasena actual</label>
                      <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="••••••••" />
                    </div>
                  )}
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
                  <button onClick={handleSubmitPassword} disabled={changingPassword} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50">
                    {changingPassword ? 'Guardando...' : hasPassword === false ? 'Crear contrasena' : 'Cambiar contrasena'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}