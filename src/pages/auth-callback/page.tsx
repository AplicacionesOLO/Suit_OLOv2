import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';

const MAX_RETRIES = 8;
const INITIAL_DELAY_MS = 300;
const MAX_DELAY_MS = 3000;

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Conectando con Google...');
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    let mounted = true;
    let attempts = 0;

    const tryGetSession = async () => {
      if (!mounted) return;

      // Clean residual hash from OAuth redirect
      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setStatus('Verificando sesión...');

      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        setStatus('Sesión verificada. Redirigiendo...');
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (mounted) navigate('/dashboard', { replace: true });
        return;
      }

      // Also listen for the auth state change — sometimes the SDK fires
      // onAuthStateChange before getSession() picks it up
      attempts++;
      if (attempts < MAX_RETRIES && mounted) {
        const delay = Math.min(INITIAL_DELAY_MS * Math.pow(1.5, attempts - 1), MAX_DELAY_MS);
        setStatus(`Esperando autenticación... (${attempts}/${MAX_RETRIES})`);
        setTimeout(tryGetSession, delay);
      } else if (mounted) {
        setStatus('No se detectó sesión. Redirigiendo al login...');
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (mounted) navigate('/login', { replace: true });
      }
    };

    // Listen for auth state changes in parallel — if the SDK fires
    // onAuthStateChange, we catch it immediately without polling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mounted) {
        setStatus('Sesión verificada. Redirigiendo...');
        setTimeout(() => {
          if (mounted) navigate('/dashboard', { replace: true });
        }, 200);
      }
    });

    // Start polling after a small initial delay to let the SDK process the code
    setTimeout(tryGetSession, INITIAL_DELAY_MS);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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