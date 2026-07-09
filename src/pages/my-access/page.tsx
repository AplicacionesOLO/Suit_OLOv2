import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useApplicationAccess } from '@/hooks/useApplicationAccess';
import { useFavorites } from '@/hooks/useFavorites';
import { useTenantContext } from '@/hooks/useTenantContext';
import { logAuditEvent } from '@/services/security/accessService';
import FavoritesSection from '@/pages/my-access/components/FavoritesSection';
import { groupApps } from '@/utils/groupApps';
import type { FavoriteWithDetails } from '@/services/security/favoritesService';
import type { AccessWithDetails } from '@/services/security/accessService';

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-600', border: 'border-cyan-500/30' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-600', border: 'border-amber-500/30' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-600', border: 'border-violet-500/30' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-600', border: 'border-rose-500/30' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-600', border: 'border-indigo-500/30' },
  red: { bg: 'bg-red-500/20', text: 'text-red-600', border: 'border-red-500/30' },
};

function getColors(c: string) { return colorMap[c] || colorMap.emerald; }

function AppCard({ acc, isFav, isToggling, onToggle, onOpen, pending = false }: {
  acc: AccessWithDetails;
  isFav: boolean;
  isToggling: boolean;
  onToggle: (appId: string) => void;
  onOpen: (acc: AccessWithDetails) => void;
  pending?: boolean;
}) {
  const colors = getColors(acc.application_color || 'emerald');
  const openMode = acc.instance_open_mode || 'external';
  const isEmbedded = openMode === 'embedded';

  return (
    <div
      onClick={() => !pending && onOpen(acc)}
      className={`glass-panel rounded-xl p-3.5 transition-all duration-200 group relative ${
        pending
          ? 'border-l-[3px] border-l-amber-500 opacity-80'
          : 'hover:border-secondary-500/40 hover:bg-background-100 cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 ${pending ? '' : 'group-hover:scale-110'} transition-transform duration-200`}>
          <i className={`${acc.application_icon || 'ri-apps-line'} ${colors.text} text-lg`}></i>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground-200">{acc.application_name}</h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium border ${
              pending
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : isEmbedded
                  ? 'bg-accent-100 text-accent-700 border-accent-200'
                  : 'bg-secondary-100 text-secondary-700 border-secondary-200'
            }`}>
              {pending ? 'Pendiente' : isEmbedded ? 'EMBEBIDA' : 'EXTERNA'}
            </span>
          </div>

          {acc.instance_name && (
            <p className="text-2xs text-foreground-500 mt-0.5">Instancia: {acc.instance_name}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            {acc.client_name && (
              <span className="text-2xs text-foreground-500">{acc.client_name}</span>
            )}
            {acc.warehouse_name && (
              <>
                <span className="text-foreground-700 text-2xs">·</span>
                <span className="text-2xs text-foreground-600">{acc.warehouse_name}</span>
              </>
            )}
            {acc.country_name && (
              <>
                <span className="text-foreground-700 text-2xs">·</span>
                <span className="text-2xs text-foreground-600">{acc.country_name}</span>
              </>
            )}
          </div>

          {acc.category_name && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs bg-secondary-100 text-secondary-700 mt-1.5 border border-secondary-200">
              {acc.category_name}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {!pending && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(acc.application_id);
              }}
              disabled={isToggling}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
                isFav
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                  : 'bg-background-100 text-foreground-600 hover:text-amber-600 hover:bg-amber-100 opacity-0 group-hover:opacity-100'
              } ${isToggling ? 'animate-pulse' : ''}`}
              title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <i className={`${isFav ? 'ri-star-fill' : 'ri-star-line'} text-sm`}></i>
            </button>
          )}
          {!pending && (
            <span className="text-xs font-medium text-primary-600 group-hover:text-primary-500 transition-colors flex items-center gap-1">
              Abrir <i className="ri-arrow-right-line"></i>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyAccessPage() {
  const navigate = useNavigate();
  const { platformUser, user } = useAuth();
  const { myAccesses, myLoading, loadMyAccesses } = useApplicationAccess();
  const { favorites, loading: favLoading, toggleFavorite, isAppFavorite, togglingIds, handleReorder } = useFavorites();
  const ctx = useTenantContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);

  const handleOpenApp = (acc: AccessWithDetails) => {
    const openMode = acc.instance_open_mode || 'external';
    const instanceId = acc.instance_id;
    const instanceUrl = acc.instance_url || acc.application_base_url;

    if (openMode === 'embedded' && instanceId) {
      navigate(`/workspace/${instanceId}`);
    } else if (instanceUrl) {
      window.open(instanceUrl, '_blank', 'noopener,noreferrer');
      logAuditEvent({
        action: 'USER_OPENED_EXTERNAL_APPLICATION',
        entity_type: 'user_application_access',
        entity_id: acc.id,
        details: {
          application_name: acc.application_name,
          instance_name: acc.instance_name,
          url: instanceUrl,
          open_mode: 'external_direct',
        },
        severity: 'info',
      });
    } else {
      if (instanceId) {
        navigate(`/workspace/${instanceId}`);
      }
    }
  };

  const handleOpenFavorite = (fav: FavoriteWithDetails) => {
    const openMode = fav.instance_open_mode || 'external';
    const instanceId = fav.instance_id;
    const instanceUrl = fav.instance_url || fav.application_base_url;

    if (openMode === 'embedded' && instanceId) {
      navigate(`/workspace/${instanceId}`);
    } else if (instanceUrl) {
      window.open(instanceUrl, '_blank', 'noopener,noreferrer');
      logAuditEvent({
        action: 'USER_OPENED_FAVORITE_APPLICATION',
        entity_type: 'user_favorites',
        entity_id: fav.id,
        details: {
          application_name: fav.application_name,
          instance_name: fav.instance_name,
          url: instanceUrl,
          open_mode: 'external_direct',
        },
        severity: 'info',
      });
    } else {
      if (instanceId) {
        navigate(`/workspace/${instanceId}`);
      }
    }
  };

  useEffect(() => {
    if (platformUser?.id) {
      loadMyAccesses(platformUser.id);
    }
  }, [platformUser, loadMyAccesses, ctx.currentCountryId, ctx.currentTenantId, ctx.currentWarehouseId, ctx.currentClientId, ctx.showAll]);

  const filtered = myAccesses.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (a.application_name || '').toLowerCase().includes(q) || (a.application_code || '').toLowerCase().includes(q);
  });

  const contextFiltered = (() => {
    if (ctx.showAll) return filtered;
    if (ctx.currentClientId && ctx.currentClientId !== 'all') {
      return filtered.filter((a: any) => a.client_id === ctx.currentClientId);
    }
    if (ctx.currentWarehouseId && ctx.currentWarehouseId !== 'all') {
      return filtered.filter((a: any) => a.warehouse_id === ctx.currentWarehouseId);
    }
    if (ctx.currentTenantId && ctx.currentTenantId !== 'all') {
      return filtered.filter((a: any) => a.tenant_id === ctx.currentTenantId);
    }
    if (ctx.currentCountryId && ctx.currentCountryId !== 'all') {
      return filtered.filter((a: any) => a.country_id === ctx.currentCountryId);
    }
    return filtered;
  })();

  const activeAccesses = contextFiltered.filter((a) => a.access_status === 'assigned');
  const pendingAccesses = contextFiltered.filter((a) => a.access_status === 'pending');

  const activeGroups = groupApps(activeAccesses);

  if (myLoading) {
    return (
      <AppLayout>
        <div className="animate-fade-in space-y-5">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Mis Accesos</h1>
            <p className="text-sm text-foreground-500 mt-0.5">Cargando tus aplicaciones asignadas...</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-xl p-3.5 h-[88px] animate-pulse bg-background-100/50" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5">
        {/* Header with inline stats */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Mis Accesos</h1>
            <p className="text-sm text-foreground-500 mt-0.5">
              Aplicaciones e instancias autorizadas para tu usuario.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">
              <i className="ri-check-double-line"></i> {activeAccesses.length} Apps
            </span>
            {pendingAccesses.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
                <i className="ri-time-line"></i> {pendingAccesses.length} Pend
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-100 text-primary-700 text-xs font-medium border border-primary-200">
              <i className="ri-key-2-line"></i> {contextFiltered.length} Total
            </span>
          </div>
        </div>

        {/* Mis Alcances — compact collapsible */}
        <section className="glass-panel rounded-xl overflow-hidden">
          <button
            onClick={() => setIsScopeExpanded(!isScopeExpanded)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background-100/50 transition-colors cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
              <i className="ri-stack-line text-emerald-600 text-sm"></i>
            </span>
            <div className="text-left">
              <h2 className="text-sm font-semibold text-foreground-200">Mis Alcances</h2>
              <p className="text-2xs text-foreground-500">País → Tenant → Cliente</p>
            </div>
            <span
              className="ml-auto w-6 h-6 flex items-center justify-center text-foreground-500 transition-transform duration-200"
              style={{ transform: isScopeExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <i className="ri-arrow-down-s-line"></i>
            </span>
          </button>
          {isScopeExpanded && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-secondary-500/15 animate-slide-up">
              <div className="p-3 rounded-lg bg-background-100/70 border border-secondary-500/15">
                <p className="text-xs font-medium text-foreground-500 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center text-emerald-600"><i className="ri-global-line text-xs"></i></span>
                  Países
                </p>
                {ctx.accessibleCountries.length === 0 ? (
                  <p className="text-xs text-foreground-600 italic">Sin países asignados</p>
                ) : (
                  <ul className="space-y-1">
                    {ctx.accessibleCountries.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-xs text-foreground-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.id === ctx.currentCountryId ? 'bg-emerald-500' : 'bg-emerald-400/50'}`}></span>
                        {c.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-3 rounded-lg bg-background-100/70 border border-secondary-500/15">
                <p className="text-xs font-medium text-foreground-500 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center text-primary-600"><i className="ri-building-line text-xs"></i></span>
                  Tenants
                </p>
                {ctx.accessibleTenants.length === 0 ? (
                  <p className="text-xs text-foreground-600 italic">Sin tenants asignados</p>
                ) : (
                  <ul className="space-y-1">
                    {ctx.accessibleTenants.map((t) => (
                      <li key={t.tenant_id} className="flex items-center gap-2 text-xs text-foreground-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.tenant_name === ctx.currentTenantName ? 'bg-primary-500' : 'bg-primary-400/50'}`}></span>
                        {t.tenant_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-3 rounded-lg bg-background-100/70 border border-secondary-500/15">
                <p className="text-xs font-medium text-foreground-500 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center text-amber-600"><i className="ri-building-2-line text-xs"></i></span>
                  Clientes
                </p>
                {ctx.accessibleClients.length === 0 ? (
                  <p className="text-xs text-foreground-600 italic">Sin clientes asignados</p>
                ) : (
                  <ul className="space-y-1">
                    {ctx.accessibleClients.map((cl) => (
                      <li key={cl.id} className="flex items-center gap-2 text-xs text-foreground-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${cl.id === ctx.currentClientId ? 'bg-violet-500' : 'bg-amber-400/50'}`}></span>
                        {cl.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Favorites */}
        <FavoritesSection
          favorites={favorites}
          loading={favLoading}
          onOpenApp={handleOpenFavorite}
          onReorder={handleReorder}
        />

        {/* Search */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-500 w-5 h-5 flex items-center justify-center">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de aplicación..."
            className="w-full h-11 bg-background-100 border border-secondary-500/30 rounded-xl pl-12 pr-10 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-foreground-500 hover:text-foreground-300 cursor-pointer rounded-md hover:bg-background-200 transition-colors"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          )}
        </div>

        {/* Content */}
        {myAccesses.length === 0 ? (
          <div className="glass-panel rounded-2xl p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary-100 border border-secondary-200 flex items-center justify-center mx-auto mb-5">
              <i className="ri-shield-keyhole-line text-foreground-500 text-2xl"></i>
            </div>
            <h3 className="text-sm font-semibold text-foreground-300 mb-2">No tienes aplicaciones asignadas para este contexto</h3>
            <p className="text-xs text-foreground-500 max-w-sm mx-auto mb-6">
              No hay aplicaciones autorizadas para el país, tenant o cliente seleccionado. Cambia de contexto o contacta a tu administrador.
            </p>
            <button className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">
              Ir al catálogo
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary-100 border border-secondary-200 flex items-center justify-center mx-auto mb-3">
              <i className="ri-search-line text-foreground-500 text-lg"></i>
            </div>
            <p className="text-sm text-foreground-500">No se encontraron aplicaciones con &quot;{searchQuery}&quot;</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-primary-600 hover:text-primary-500 transition-colors cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {activeAccesses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground-200 mb-3 flex items-center gap-2">
                  <i className="ri-check-double-line text-emerald-600"></i>
                  Aplicaciones autorizadas
                </h2>
                {activeGroups.length === 0 ? (
                  <p className="text-xs text-foreground-500">No hay aplicaciones activas en este contexto.</p>
                ) : (
                  <div className="space-y-5">
                    {activeGroups.map((group, gi) => (
                      <div key={gi}>
                        {group.label && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 rounded-md bg-secondary-100 border border-secondary-200 flex items-center justify-center">
                              <i className={`${group.icon} ${group.iconColor} text-xs`}></i>
                            </span>
                            <h3 className="text-xs font-semibold text-foreground-400">{group.label}</h3>
                            <span className="text-2xs text-foreground-600 font-normal">({group.items.length})</span>
                            <div className="flex-1 h-px bg-secondary-500/20"></div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {group.items.map((acc) => {
                            const isFav = isAppFavorite(acc.application_id);
                            const isToggling = togglingIds.has(acc.application_id);
                            return (
                              <AppCard
                                key={acc.id}
                                acc={acc}
                                isFav={isFav}
                                isToggling={isToggling}
                                onToggle={toggleFavorite}
                                onOpen={handleOpenApp}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {pendingAccesses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground-200 mb-3 flex items-center gap-2">
                  <i className="ri-time-line text-amber-600"></i>
                  Pendientes de aprobación
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {pendingAccesses.map((acc) => {
                    const isFav = isAppFavorite(acc.application_id);
                    const isToggling = togglingIds.has(acc.application_id);
                    return (
                      <AppCard
                        key={acc.id}
                        acc={acc}
                        isFav={isFav}
                        isToggling={isToggling}
                        onToggle={toggleFavorite}
                        onOpen={handleOpenApp}
                        pending
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}