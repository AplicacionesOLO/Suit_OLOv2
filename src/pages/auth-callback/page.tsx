import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import AppLogo from '@/components/feature/AppLogo';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Conectando con Google...');
  const [failed, setFailed] = useState(false);

  const handleBackToLogin = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    // PKCE: Google devuelve el código de autorización en el query string.
    const code = new URLSearchParams(window.location.search).get('code');

    if (!code) {
      setStatus('No se recibió el código de autenticación de Google. Vuelve a intentar el inicio de sesión.');
      setFailed(true);
      return;
    }

    const exchange = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;

        if (error) {
          console.error('[OLO Site] exchangeCodeForSession error:', error.message);
          setStatus('No se pudo verificar la sesión. Verifica tu conexión e intenta de nuevo.');
          setFailed(true);
          return;
        }

        // Limpiar el query string para no reprocesar el código (de un solo uso)
        window.history.replaceState({}, document.title, window.location.pathname);

        // Defensivo: este flujo de recuperación normalmente llega a /login,
        // pero por si acaso un enlace de recuperación aterriza aquí.
        const redirectType = (data as { redirectType?: string } | null)?.redirectType;
        if (redirectType === 'recovery') {
          setTimeout(() => {
            if (!cancelled) navigate('/forgot-password', { replace: true });
          }, 200);
          return;
        }

        setStatus('Sesión verificada. Redirigiendo...');
        setTimeout(() => {
          if (!cancelled) navigate('/dashboard', { replace: true });
        }, 300);
      } catch (err) {
        if (cancelled) return;
        console.error('[OLO Site] callback exchange error:', err);
        setStatus('No se pudo verificar la sesión. Verifica tu conexión e intenta de nuevo.');
        setFailed(true);
      }
    };

    exchange();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background-50 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm mx-auto px-6">
        {/* OLO Brand mark */}
        <AppLogo showText={false} size="xl" className="mx-auto" />

        {/* Spinner — solo cuando está cargando */}
        {!failed && (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
          </div>
        )}

        {/* Warning icon cuando falla */}
        {failed && (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <i className="ri-wifi-off-line text-amber-500 text-lg"></i>
            </div>
          </div>
        )}

        {/* Status text */}
        <p className={`text-sm max-w-xs mx-auto leading-relaxed ${failed ? 'text-foreground-700' : 'text-foreground-600 animate-pulse'}`}>
          {status}
        </p>

        {/* Acción cuando falla */}
        {failed && (
          <div className="space-y-3 pt-2">
            <button
              onClick={handleBackToLogin}
              className="w-full px-5 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}

        <p className="text-xs text-foreground-400/70">
          OLO Site &middot; Autenticación segura
        </p>
      </div>
    </div>
  );
}