import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex bg-background-50 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(var(--foreground-50)) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary-500/5 blur-[100px]" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[420px] animate-slide-up">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center glow-primary">
              <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
            </div>
            <span className="text-foreground-100 font-bold text-lg tracking-tight">Suite OLO</span>
          </div>

          <div className="glass-panel-strong rounded-2xl p-8 md:p-10">
            {sent ? (
              <div className="text-center animate-slide-up">
                <div className="w-14 h-14 rounded-full bg-primary-500/15 border border-primary-500/25 flex items-center justify-center mx-auto mb-5">
                  <i className="ri-mail-check-line text-2xl text-primary-400"></i>
                </div>
                <h2 className="text-xl font-semibold text-foreground-100 mb-2">Revisa tu correo</h2>
                <p className="text-sm text-foreground-500 mb-6 leading-relaxed">
                  Hemos enviado un enlace de recuperación a{' '}
                  <span className="text-foreground-300 font-medium">{email}</span>.
                  El enlace expirará en 15 minutos.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  icon={<i className="ri-arrow-left-line"></i>}
                >
                  Volver al inicio de sesión
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-sm text-foreground-500 hover:text-foreground-300 transition-colors mb-6"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-arrow-left-line"></i>
                    </span>
                    Volver
                  </button>
                  <h2 className="text-xl font-semibold text-foreground-100 mb-2">
                    Recuperar contraseña
                  </h2>
                  <p className="text-sm text-foreground-500">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                      <span className="w-4 h-4 flex items-center justify-center shrink-0">
                        <i className="ri-error-warning-line"></i>
                      </span>
                      {error}
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

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                  >
                    Enviar enlace de recuperación
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}