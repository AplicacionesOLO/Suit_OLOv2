import { useCallback, useEffect, useRef, useState } from 'react';

export type IframeProbeStatus = 'checking' | 'allowed' | 'blocked';

const PROBE_TIMEOUT_MS = 4500;
const SETTLE_DELAY_MS = 350;

/**
 * Prueba una URL cargándola en un iframe invisible y deduce si el sitio
 * permite ser embebido.
 *
 * Señales que se consideran bloqueo:
 *  - La carga nunca termina dentro del tiempo límite (frame-ancestors muy estricto).
 *  - El frame queda en `about:blank` (el navegador reemplazó el contenido por
 *    una página de error por X-Frame-Options / CSP).
 *  - Contenido mixto: OLO Site en https cargando un http.
 *
 * Señal de éxito: el frame carga contenido de otro origen (el acceso a
 * `location.href` lanza SecurityError, lo que confirma contenido real).
 */
function probeIframe(rawUrl: string): Promise<Exclude<IframeProbeStatus, 'checking'>> {
  return new Promise((resolve) => {
    const url = (rawUrl || '').trim();
    if (!url) { resolve('blocked'); return; }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      resolve('blocked');
      return;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      resolve('blocked');
      return;
    }

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && parsed.protocol === 'http:') {
      resolve('blocked');
      return;
    }

    let iframe: HTMLIFrameElement | null = null;
    let settled = false;
    let timer = 0;
    let settleTimer = 0;

    const cleanup = () => {
      window.clearTimeout(timer);
      window.clearTimeout(settleTimer);
      if (iframe) {
        iframe.removeAttribute('src');
        iframe.remove();
        iframe = null;
      }
    };

    const finish = (status: Exclude<IframeProbeStatus, 'checking'>) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(status);
    };

    timer = window.setTimeout(() => finish('blocked'), PROBE_TIMEOUT_MS);

    iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');
    iframe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;';

    iframe.addEventListener('load', () => {
      // Damos un instante para que el navegador resuelva el frame real
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        try {
          const win = iframe?.contentWindow;
          if (!win) { finish('blocked'); return; }
          const href = win.location.href; // cross-origin real => lanza SecurityError
          if (!href || href === 'about:blank' || href === 'about:srcdoc') {
            finish('blocked');
            return;
          }
          finish('allowed');
        } catch {
          // SecurityError = cargó contenido de otro origen correctamente
          finish('allowed');
        }
      }, SETTLE_DELAY_MS);
    });

    iframe.addEventListener('error', () => finish('blocked'));

    iframe.src = url;
    document.body.appendChild(iframe);
  });
}

/**
 * Detecta, para una lista de URLs, cuáles no pueden mostrarse dentro de un iframe.
 * Las pruebas se ejecutan en serie para no saturar la red ni el navegador.
 */
export function useIframeProbe(urls: string[], enabled = true) {
  const [results, setResults] = useState<Record<string, IframeProbeStatus>>({});
  const [runId, setRunId] = useState(0);
  const probedRef = useRef<Record<string, boolean>>({});
  const listKey = urls.join('|');

  useEffect(() => {
    if (!enabled) return;
    const targets = Array.from(new Set(urls.filter(Boolean)));
    if (targets.length === 0) return;

    let cancelled = false;

    const run = async () => {
      for (const target of targets) {
        if (cancelled) return;
        if (probedRef.current[target]) continue;
        setResults((prev) => ({ ...prev, [target]: 'checking' }));
        const status = await probeIframe(target);
        if (cancelled) return;
        probedRef.current[target] = true;
        setResults((prev) => ({ ...prev, [target]: status }));
      }
    };

    run();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, enabled, runId]);

  const recheck = useCallback(() => {
    probedRef.current = {};
    setResults({});
    setRunId((n) => n + 1);
  }, []);

  return { results, recheck };
}

export default useIframeProbe;