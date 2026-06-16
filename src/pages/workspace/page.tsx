import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { fetchInstanceById, type AppInstance } from '@/services/applications/applicationsService';
import { canAccessInstance, logAuditEvent } from '@/services/security/accessService';

interface InstanceFull extends AppInstance {
  application_name?: string;
  application_icon?: string;
  application_color?: string;
  tenant_name?: string;
}

type WorkspaceStatus = 'loading' | 'validating' | 'ready' | 'denied' | 'error' | 'inactive' | 'not_found';

export default function WorkspacePage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<WorkspaceStatus>('loading');
  const [instance, setInstance] = useState<InstanceFull | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const openMode = instance?.open_mode || 'external';
  const isEmbedded = openMode === 'embedded';
  const canEmbed = instance?.allows_iframe && isEmbedded;
  const effectiveUrl = instance?.url || '';

  const refreshIframe = useCallback(() => {
    setIframeError(false);
    setIframeKey((k) => k + 1);
  }, []);

  const openInNewTab = useCallback(() => {
    if (effectiveUrl) {
      window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
    }
    logAuditEvent({
      action: 'USER_OPENED_EXTERNAL_APPLICATION',
      entity_type: 'application_instance',
      entity_id: instanceId || null,
      details: {
        instance_name: instance?.instance_name,
        application_name: instance?.application_name,
        url: effectiveUrl,
        open_mode: 'external_new_tab',
      },
      severity: 'info',
    });
  }, [effectiveUrl, instanceId, instance]);

  useEffect(() => {
    if (!instanceId) {
      setStatus('error');
      setErrorMessage('ID de instancia no proporcionado');
      return;
    }

    console.log('[WorkspacePage] Received instanceId from URL:', instanceId);

    let cancelled = false;

    async function validate() {
      setStatus('validating');
      console.log('[WorkspacePage] Starting canAccessInstance check...');

      // Step 1: Check access
      const accessResult = await canAccessInstance(instanceId!);
      if (cancelled) return;

      console.log('[WorkspacePage] canAccessInstance result:', accessResult.allowed ? 'ALLOWED' : 'DENIED', '| error:', accessResult.error || 'none');

      if (!accessResult.allowed) {
        if (accessResult.error?.includes('no encontrada')) {
          setStatus('not_found');
        } else if (accessResult.error?.includes('no activa')) {
          setStatus('inactive');
        } else if (accessResult.error?.includes('No tienes acceso') || accessResult.error?.includes('no pertenece')) {
          // Log denied attempt
          await logAuditEvent({
            action: 'USER_DENIED_APPLICATION_ACCESS',
            entity_type: 'application_instance',
            entity_id: instanceId,
            details: { reason: accessResult.error },
            severity: 'warning',
          });
          setStatus('denied');
        } else {
          setStatus('error');
        }
        setErrorMessage(accessResult.error || 'Error de validación');
        return;
      }

      // Step 2: Fetch instance details
      console.log('[WorkspacePage] Fetching instance details via fetchInstanceById...');
      const instResult = await fetchInstanceById(instanceId!);
      if (cancelled) return;

      console.log('[WorkspacePage] fetchInstanceById result:', instResult.data ? 'FOUND' : 'NOT FOUND', '| error:', instResult.error || 'none');

      if (!instResult.data) {
        setStatus('not_found');
        setErrorMessage(instResult.error || 'Instancia no encontrada');
        return;
      }

      const inst = instResult.data as InstanceFull;
      setInstance(inst);

      if (inst.status !== 'active') {
        setStatus('inactive');
        setErrorMessage('Esta instancia no está activa');
        return;
      }

      // Step 3: Log audit event
      if (inst.open_mode === 'embedded' && inst.allows_iframe) {
        await logAuditEvent({
          action: 'USER_OPENED_APPLICATION',
          entity_type: 'application_instance',
          entity_id: instanceId,
          details: {
            instance_name: inst.instance_name,
            application_name: inst.application_name,
            url: inst.url,
            open_mode: 'embedded',
          },
          severity: 'info',
        });
      } else {
        await logAuditEvent({
          action: 'USER_OPENED_EXTERNAL_APPLICATION',
          entity_type: 'application_instance',
          entity_id: instanceId,
          details: {
            instance_name: inst.instance_name,
            application_name: inst.application_name,
            url: inst.url,
            open_mode: inst.open_mode || 'external',
          },
          severity: 'info',
        });
      }

      setStatus('ready');
    }

    validate();
    return () => { cancelled = true; };
  }, [instanceId]);

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  };

  function getColors(c: string) { return colorMap[c] || colorMap.emerald; }

  // Loading state
  if (status === 'loading' || status === 'validating') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto animate-pulse">
              <i className="ri-loader-4-line animate-spin text-primary-400 text-2xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground-200 mb-1">
                {status === 'loading' ? 'Cargando workspace...' : 'Verificando acceso...'}
              </h2>
              <p className="text-sm text-foreground-500">
                {status === 'validating' ? 'Validando que tengas acceso a esta instancia' : 'Preparando la aplicación'}
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error / denied states
  if (status === 'denied') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center space-y-5 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <i className="ri-shield-keyhole-line text-red-400 text-2xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground-200 mb-1">Acceso Denegado</h2>
              <p className="text-sm text-foreground-500 mb-1">{errorMessage}</p>
              <p className="text-xs text-foreground-600">No tienes autorización para abrir esta instancia. Si crees que es un error, contacta a tu administrador.</p>
            </div>
            <button
              onClick={() => navigate('/my-access')}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-line"></i></span>
              Volver a Mis Accesos
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (status === 'not_found') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center space-y-5 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto">
              <i className="ri-error-warning-line text-foreground-500 text-2xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground-200 mb-1">Instancia no encontrada</h2>
              <p className="text-sm text-foreground-500">{errorMessage || 'La instancia solicitada no existe o fue eliminada.'}</p>
            </div>
            <button
              onClick={() => navigate('/my-access')}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-line"></i></span>
              Volver a Mis Accesos
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (status === 'inactive') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center space-y-5 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <i className="ri-pause-circle-line text-amber-400 text-2xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground-200 mb-1">Instancia inactiva</h2>
              <p className="text-sm text-foreground-500">{errorMessage || 'Esta instancia no está disponible en este momento.'}</p>
            </div>
            <button
              onClick={() => navigate('/my-access')}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-line"></i></span>
              Volver a Mis Accesos
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (status === 'error') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center space-y-5 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <i className="ri-close-circle-line text-red-400 text-2xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground-200 mb-1">Error inesperado</h2>
              <p className="text-sm text-foreground-500">{errorMessage}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap cursor-pointer"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line"></i></span>
                Reintentar
              </button>
              <button
                onClick={() => navigate('/my-access')}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-line"></i></span>
                Volver a Mis Accesos
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Ready state
  if (!instance) return null;
  const colors = getColors(instance.application_color || 'emerald');

  // If not embedded mode, show external launch screen
  if (!canEmbed) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center space-y-6 max-w-lg w-full">
            <div className={`w-20 h-20 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center mx-auto`}>
              <i className={`${instance.application_icon || 'ri-apps-2-line'} ${colors.text} text-3xl`}></i>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground-100 mb-2">{instance.application_name || instance.instance_name}</h2>
              <p className="text-sm text-foreground-500 mb-1">Instancia: <span className="text-foreground-300 font-medium">{instance.instance_name}</span></p>
              {instance.tenant_name && (
                <p className="text-xs text-foreground-600">Tenant: {instance.tenant_name}</p>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-500/10 border border-secondary-500/20">
              <span className="w-3 h-3 flex items-center justify-center text-secondary-400"><i className="ri-external-link-line text-xs"></i></span>
              <span className="text-xs font-medium text-secondary-400 uppercase tracking-wider">APERTURA EXTERNA</span>
            </div>

            {!instance.allows_iframe && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
                <span className="w-5 h-5 flex items-center justify-center text-amber-400 shrink-0 mt-0.5"><i className="ri-information-line"></i></span>
                <p className="text-sm text-amber-300">Esta aplicación no permite ser embebida dentro de SuiteOLO. Se abrirá en una nueva pestaña.</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={openInNewTab}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-semibold whitespace-nowrap cursor-pointer"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-external-link-line"></i></span>
                Abrir en nueva pestaña
              </button>
              <button
                onClick={() => navigate('/my-access')}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap cursor-pointer"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-line"></i></span>
                Volver
              </button>
            </div>

            <p className="text-xs text-foreground-600">{effectiveUrl}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Embedded mode — full iframe
  return (
    <AppLayout>
      {/* Workspace toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-secondary-500/10 bg-background-50/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
            <i className={`${instance.application_icon || 'ri-apps-2-line'} ${colors.text} text-sm`}></i>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground-200 truncate">{instance.application_name || instance.instance_name}</p>
            <p className="text-2xs text-foreground-500 truncate">{instance.instance_name}{instance.tenant_name ? ` · ${instance.tenant_name}` : ''}</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20 whitespace-nowrap">
            EMBEBIDA
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={refreshIframe}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all cursor-pointer"
            title="Refrescar aplicación"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line text-sm"></i></span>
          </button>
          <button
            onClick={openInNewTab}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all cursor-pointer"
            title="Abrir en nueva pestaña"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-external-link-line text-sm"></i></span>
          </button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 8.5rem)' }}>
        {iframeError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background-50">
            <div className="text-center space-y-4 max-w-md px-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                <i className="ri-error-warning-line text-amber-400 text-xl"></i>
              </div>
              <h3 className="text-sm font-semibold text-foreground-200">La aplicación no pudo cargarse</h3>
              <p className="text-xs text-foreground-500">Esta aplicación no permite ser embebida o bloqueó la carga. Ábrela en una nueva pestaña.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={openInNewTab}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-external-link-line"></i></span>
                  Abrir en nueva pestaña
                </button>
                <button
                  onClick={refreshIframe}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 transition-all whitespace-nowrap cursor-pointer"
                >
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line"></i></span>
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            key={iframeKey}
            src={effectiveUrl}
            className="w-full h-full border-0"
            title={`${instance.application_name || 'Aplicación'} — ${instance.instance_name}`}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            onError={() => setIframeError(true)}
            loading="lazy"
          />
        )}
      </div>
    </AppLayout>
  );
}