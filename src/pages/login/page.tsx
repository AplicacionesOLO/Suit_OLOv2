import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';

export default function LoginPage() {
  const navigate = useNavigate();
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
      {/* Animated background grid */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(var(--foreground-50)) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary-500/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-500/5 blur-[100px]" />
      </div>

      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative z-10 flex-col justify-between p-12 xl:p-16">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center glow-primary">
              <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
            </div>
            <div>
              <span className="text-foreground-100 font-bold text-xl tracking-tight">Suite</span>
              <span className="text-primary-400 font-bold text-xl tracking-tight">OLO</span>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl xl:text-4xl font-bold text-foreground-100 leading-tight mb-4">
              Hub empresarial de{' '}
              <span className="text-gradient-primary">aplicaciones</span>
            </h1>
            <p className="text-foreground-500 text-base leading-relaxed">
              Plataforma centralizada de acceso, gobierno y seguridad para todas tus aplicaciones corporativas.
            </p>
          </div>

          {/* Security badges */}
          <div className="flex flex-wrap gap-3 mt-12">
            {['SOC 2 Type II', 'ISO 27001', 'GDPR Ready', 'Zero Trust'].map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary-500/10 text-secondary-300 border border-secondary-500/15"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { value: '99.99%', label: 'Uptime SLA' },
            { value: '256-bit', label: 'Encryption' },
            { value: '50K+', label: 'Active Users' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-lg font-bold text-foreground-200">{stat.value}</div>
              <div className="text-xs text-foreground-600 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-[420px] animate-slide-up">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center glow-primary">
              <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
            </div>
            <span className="text-foreground-100 font-bold text-lg tracking-tight">Suite OLO</span>
          </div>

          <div className="glass-panel-strong rounded-2xl p-8 md:p-10">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground-100 mb-2">
                Iniciar sesión
              </h2>
              <p className="text-sm text-foreground-500">
                Accede a tu panel de administración empresarial
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
                placeholder="admin@empresa.com"
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
                  <span className="text-xs text-foreground-500 group-hover:text-foreground-400 transition-colors select-none">
                    Recordar sesión
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium"
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
                <span className="px-3 text-xs text-foreground-600 bg-background-100">
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
              Conexión segura • TLS 1.3 • MFA disponible
            </div>
          </div>

          <p className="text-center text-xs text-foreground-700 mt-6">
            Suite OLO Platform v3.0.0
          </p>
        </div>
      </div>
    </div>
  );
}