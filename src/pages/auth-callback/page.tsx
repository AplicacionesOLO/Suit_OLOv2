import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Conectando con Google...');
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      try {
        // Wait a tick so Supabase SDK can process the hash fragment
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Clean any residual hash from the URL — never let index.html# linger
        if (window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        setStatus('Verificando sesión...');

        const { data } = await supabase.auth.getSession();

        if (data?.session) {
          setStatus('Sesión verificada. Redirigiendo...');
          await new Promise((resolve) => setTimeout(resolve, 300));
          navigate('/dashboard', { replace: true });
        } else {
          setStatus('No se detectó sesión. Redirigiendo al login...');
          await new Promise((resolve) => setTimeout(resolve, 800));
          navigate('/login', { replace: true });
        }
      } catch {
        setStatus('Error inesperado. Redirigiendo al login...');
        await new Promise((resolve) => setTimeout(resolve, 800));
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background-50 flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* OLO Brand mark */}
        <div className="w-14 h-14 rounded-2xl bg-primary-500/12 border border-primary-500/25 flex items-center justify-center mx-auto">
          <span className="text-primary-500 font-bold text-base tracking-tighter">OLO</span>
        </div>

        {/* Spinner */}
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
        </div>

        {/* Status text */}
        <p className="text-sm text-foreground-600 animate-pulse max-w-xs mx-auto leading-relaxed">
          {status}
        </p>

        <p className="text-xs text-foreground-400/70">
          Suite OLO &middot; Autenticación segura
        </p>
      </div>
    </div>
  );
}