import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';

const MAX_RETRIES = 10;
const INITIAL_DELAY_MS = 500;
const MAX_DELAY_MS = 4000;

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Conectando con Google...');
  const [allRetriesExhausted, setAllRetriesExhausted] = useState(false);
  const [manualRetrying, setManualRetrying] = useState(false);
  const processed = useRef(false);
  const mountedRef = useRef(true);

  const tryGetSessionOnce = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const onSessionFound = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus('Sesión verificada. Redirigiendo...');

    // Clean residual OAuth hash/fragment AFTER session is confirmed
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search.replace(/[?&]code=[^&]*/, ''));
    }

    setTimeout(() => {
      if (mountedRef.current) navigate('/dashboard', { replace: true });
    }, 300);
  }, [navigate]);

  const startPolling = useCallback((startDelay: number) => {
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = () => {
      if (!mountedRef.current) return;

      attempts++;
      setStatus(attempts === 1
        ? 'Verificando sesión...'
        : `Esperando autenticación... (intento ${attempts}/${MAX_RETRIES})`);

      tryGetSessionOnce().then((hasSession) => {
        if (!mountedRef.current) return;

        if (hasSession) {
          onSessionFound();
          return;
        }

        if (attempts < MAX_RETRIES) {
          const delay = Math.min(INITIAL_DELAY_MS * Math.pow(1.4, attempts), MAX_DELAY_MS);
          timeoutId = setTimeout(poll, delay);
        } else {
          setAllRetriesExhausted(true);
          setStatus('No se pudo verificar la sesión. Verifica tu conexión e intenta de nuevo.');
        }
      });
    };

    timeoutId = setTimeout(poll, startDelay);

    return () => clearTimeout(timeoutId);
  }, [tryGetSessionOnce, onSessionFound]);

  const handleManualRetry = useCallback(() => {
    setManualRetrying(true);
    setAllRetriesExhausted(false);
    setStatus('Reintentando verificación de sesión...');

    // Try once immediately
    tryGetSessionOnce().then((hasSession) => {
      if (!mountedRef.current) return;

      if (hasSession) {
        onSessionFound();
        return;
      }

      // Start fresh polling
      startPolling(500);
    });
  }, [tryGetSessionOnce, onSessionFound, startPolling]);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    let cleanupPolling: (() => void) | undefined;

    // IMPORTANTE: NO limpiar el hash ANTES de que Supabase SDK lo procese.
    // detectSessionInUrl=true en el cliente de Supabase necesita el hash/code
    // para extraer la sesión. Limpiarlo antes rompe el flujo en conexiones lentas.

    // Registrar listener de onAuthStateChange ANTES de iniciar el polling.
    // Si Supabase SDK ya procesó el código OAuth, onAuthStateChange dispara
    // sincrónicamente al registrarse y capturamos la sesión sin polling.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mountedRef.current) {
        onSessionFound();
      }
    });

    // Iniciar polling con delay inicial. El delay da tiempo a que
    // detectSessionInUrl + onAuthStateChange se ejecuten primero.
    cleanupPolling = startPolling(INITIAL_DELAY_MS);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      if (cleanupPolling) cleanupPolling();
    };
  }, [startPolling, onSessionFound]);

  const handleBackToLogin = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background-50 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm mx-auto px-6">
        {/* OLO Brand mark */}
        <div className="w-14 h-14 rounded-2xl bg-primary-500/12 border border-primary-500/25 flex items-center justify-center mx-auto">
          <span className="text-primary-500 font-bold text-base tracking-tighter">OLO</span>
        </div>

        {/* Spinner — solo cuando está cargando */}
        {!allRetriesExhausted && (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
          </div>
        )}

        {/* Warning icon when retries exhausted */}
        {allRetriesExhausted && (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <i className="ri-wifi-off-line text-amber-500 text-lg"></i>
            </div>
          </div>
        )}

        {/* Status text */}
        <p className={`text-sm max-w-xs mx-auto leading-relaxed ${allRetriesExhausted ? 'text-foreground-700' : 'text-foreground-600 animate-pulse'}`}>
          {status}
        </p>

        {/* Action buttons when retries exhausted */}
        {allRetriesExhausted && (
          <div className="space-y-3 pt-2">
            <button
              onClick={handleManualRetry}
              disabled={manualRetrying}
              className="w-full px-5 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {manualRetrying ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-background-50/30 border-t-background-50 animate-spin" />
                  Reintentando...
                </span>
              ) : (
                'Reintentar verificación'
              )}
            </button>
            <button
              onClick={handleBackToLogin}
              className="w-full px-5 py-2.5 rounded-lg border border-secondary-500/20 text-foreground-600 text-sm hover:bg-secondary-500/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}

        <p className="text-xs text-foreground-400/70">
          Suite OLO &middot; Autenticación segura
        </p>
      </div>
    </div>
  );
}