import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MODULE_LABELS, ACTION_LABELS, ACTION_ORDER } from '@/utils/permissionLabels';

export default function PermissionsCard() {
  const { platformUser } = useAuth();
  const isSuperAdmin = (platformUser?.role_level ?? 0) >= 100;
  const modules = platformUser?.suite_permissions?.modules || {};

  const entries = useMemo(() => {
    return Object.entries(modules)
      .filter(([, m]) => m.menu === true || (m.actions && m.actions.length > 0))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [modules]);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground-200">Mis permisos principales</h2>
        {isSuperAdmin && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20">
            <i className="ri-vip-crown-line"></i> Acceso total
          </span>
        )}
      </div>

      {isSuperAdmin && (
        <p className="text-xs text-foreground-500 mb-4">
          Como {platformUser?.role_name || 'Super Admin'} tienes control total sobre todos los módulos de la plataforma.
        </p>
      )}

      {entries.length === 0 ? (
        <div className="py-6 text-center">
          <span className="w-10 h-10 rounded-lg bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-2">
            <i className="ri-key-2-line text-foreground-500 text-lg"></i>
          </span>
          <p className="text-sm text-foreground-500">No tienes permisos asignados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {entries.map(([key, mod]) => {
            const actions = ACTION_ORDER.filter((a) => mod.actions?.includes(a));
            return (
              <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-background-100/70 border border-secondary-500/15">
                <span className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/15 flex items-center justify-center shrink-0">
                  <i className="ri-key-2-line text-primary-400 text-sm"></i>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground-200">{MODULE_LABELS[key] || key}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {actions.length > 0 ? (
                      actions.map((a) => (
                        <span
                          key={a}
                          className="px-1.5 py-0.5 rounded text-2xs bg-secondary-500/10 text-foreground-500 border border-secondary-500/20"
                        >
                          {ACTION_LABELS[a] || a}
                        </span>
                      ))
                    ) : (
                      <span className="text-2xs text-foreground-600">Sin acciones</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}