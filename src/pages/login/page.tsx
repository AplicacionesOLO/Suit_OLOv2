import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';

const capabilities = [
  { icon: 'ri-user-settings-line', label: 'Gestión de Usuarios' },
  { icon: 'ri-shield-keyhole-line', label: 'Control de Accesos' },
  { icon: 'ri-apps-2-line', label: 'Aplicaciones Corporativas' },
  { icon: 'ri-file-search-line', label: 'Auditoría Centralizada' },
];

const badges = ['Logística', 'Distribución', 'Inventario', 'Seguridad'];

export default function LoginPage() {
  const { login, loginGoogle, resetPassword, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [localError, setLocalError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const displayError = localError || error;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Por favor completa todos los campos.');
      return;
    }

    const result = await login(email, password);
    if (result.error) {
      setLocalError(result.error);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError('');
    clearError();
    await loginGoogle();
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setLocalError('Ingresa tu correo electrónico para recuperar la contraseña.');
      return;
    }
    setLocalError('');
    clearError();
    const result = await resetPassword(email);
    if (!result.error) {
      setResetSent(true);
    } else {
      setLocalError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex bg-background-50 relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, oklch(var(--foreground-50)) 1.5px, transparent 0)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Connection lines - horizontal */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 0%, oklch(var(--primary-500)) 25%, transparent 50%, oklch(var(--accent-500)) 75%, transparent 100%),
              linear-gradient(90deg, transparent 0%, oklch(var(--accent-500)) 20%, transparent 40%, oklch(var(--primary-500)) 60%, transparent 80%, oklch(var(--accent-500)) 100%)
            `,
            backgroundSize: '100% 2px, 100% 1px',
            backgroundPosition: '0 33%, 0 66%',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Connection lines - vertical */}
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: `
              linear-gradient(180deg, transparent 0%, oklch(var(--primary-500)) 30%, transparent 60%, oklch(var(--accent-500)) 100%),
              linear-gradient(180deg, transparent 0%, oklch(var(--accent-500)) 25%, transparent 50%, oklch(var(--primary-500)) 75%, transparent 100%)
            `,
            backgroundSize: '1px 100%, 1px 100%',
            backgroundPosition: '25% 0, 75% 0',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Node points at intersections */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 33%, oklch(var(--primary-500)) 3px, transparent 0),
              radial-gradient(circle at 75% 33%, oklch(var(--accent-500)) 3px, transparent 0),
              radial-gradient(circle at 25% 66%, oklch(var(--accent-500)) 3px, transparent 0),
              radial-gradient(circle at 75% 66%, oklch(var(--primary-500)) 3px, transparent 0),
              radial-gradient(circle at 50% 50%, oklch(var(--primary-500)) 2px, transparent 0)
            `,
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-[-15%] left-[-8%] w-[550px] h-[550px] rounded-full bg-primary-500/4 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[450px] h-[450px] rounded-full bg-accent-500/4 blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-primary-500/2 blur-[100px]" />
      </div>

      {/* Left panel - OLO Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[44%] relative z-10 flex-col justify-between p-12 xl:p-16">
        {/* Top section */}
        <div>
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center glow-primary">
              <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
            </div>
            <div>
              <span className="text-foreground-100 font-bold text-xl tracking-tight">Suite</span>
              <span className="text-primary-400 font-bold text-xl tracking-tight">OLO</span>
            </div>
          </div>

          {/* OLO Identity subtitle */}
          <p className="text-foreground-600 text-xs tracking-wide mb-16 ml-[52px] uppercase">
            Overseas Logistics Operations
          </p>

          {/* Hero content */}
          <div className="max-w-md">
            <h1 className="text-3xl xl:text-4xl font-bold text-foreground-100 leading-tight mb-4">
              Centro de{' '}
              <span className="text-gradient-primary">Operaciones Digitales</span>
            </h1>
            <p className="text-foreground-500 text-sm xl:text-base leading-relaxed">
              Gestiona usuarios, permisos y accesos a todas las aplicaciones corporativas de OLO desde una única plataforma centralizada.
            </p>
          </div>

          {/* Operational badges */}
          <div className="flex flex-wrap gap-2.5 mt-10">
            {badges.map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary-500/10 text-secondary-300 border border-secondary-500/12"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Capability cards */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          {capabilities.map((cap) => (
            <div
              key={cap.label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background-100/70 border border-secondary-500/10 hover:border-secondary-500/20 transition-colors duration-300"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-500/10 text-primary-400 shrink-0">
                <i className={`${cap.icon} text-sm`}></i>
              </span>
              <span className="text-xs font-medium text-foreground-400 leading-tight">
                {cap.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-[420px] animate-slide-up">
          {/* Mobile branding */}
          <div className="lg:hidden mb-10 text-center">
            <div className="flex items-center gap-2 justify-center mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center glow-primary">
                <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
              </div>
              <span className="text-foreground-100 font-bold text-lg tracking-tight">Suite OLO</span>
            </div>
            <p className="text-foreground-600 text-[11px] tracking-wide uppercase mt-1">
              Overseas Logistics Operations
            </p>
          </div>

          <div className="glass-panel-strong rounded-2xl p-8 md:p-10">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground-100 mb-2">
                Iniciar sesión
              </h2>
              <p className="text-sm text-foreground-500">
                Accede a la plataforma corporativa de administración y seguridad de OLO.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {displayError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <i className="ri-error-warning-line"></i>
                  </span>
                  {displayError}
                </div>
              )}

              {resetSent && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <i className="ri-check-double-line"></i>
                  </span>
                  Correo de recuperación enviado. Revisa tu bandeja de entrada.
                </div>
              )}

              <Input
                label="Correo electrónico"
                type="email"
                placeholder="admin@olo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<i className="ri-mail-line text-base"></i>}
                autoComplete="email"
              />

              <div>
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<i className="ri-lock-line text-base"></i>}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500 focus:ring-primary-500/30 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-foreground-500 group-hover:text-foreground-400 transition-colors select-none whitespace-nowrap">
                    Recordar sesión
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium whitespace-nowrap"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-2"
              >
                Iniciar sesión
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-500/15"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs text-foreground-600">
                  o continuar con
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={handleGoogleLogin}
              loading={loading}
              icon={<i className="ri-google-fill text-base"></i>}
            >
              Continuar con Google
            </Button>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground-600">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-shield-check-line text-primary-400"></i>
              </span>
              Plataforma Corporativa · Acceso Seguro
            </div>
          </div>

          <p className="text-center text-xs text-foreground-700 mt-6">
            Overseas Logistics Operations · Suite OLO
          </p>
        </div>
      </div>
    </div>
  );
}