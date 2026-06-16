import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import { fetchCategories, fetchApplications, fetchInstances, type AppCategory as SupaCategory, type Application as SupaApplication, type AppInstance as SupaInstance } from '@/services/applications/applicationsService';
import { fetchMyAccesses } from '@/services/security/accessService';

interface AppCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  isActive: boolean;
  appCount: number;
}

interface AppItem {
  id: string;
  name: string;
  code: string;
  description: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  baseUrl: string;
  status: 'active' | 'maintenance' | 'offline' | 'beta';
  version: string;
  integrationType: 'internal' | 'external' | 'embedded' | 'sso' | 'api';
  integrationLabel: string;
  isFavorite: boolean;
  lastUsed: string;
  tags: string[];
}

interface AppInstance {
  id: string;
  tenantId: string;
  tenantName: string;
  applicationId: string;
  applicationName: string;
  instanceName: string;
  url: string;
  status: 'active' | 'inactive' | 'deploying';
  openInOLO: boolean;
  openInNewTab: boolean;
  allowsIframe: boolean;
  ssoEnabled: boolean;
  jwtFederated: boolean;
  allowedDomains: string[];
  createdAt: string;
}

type ViewMode = 'grid' | 'list';

const statusConfig: Record<string, { label: string; dot: string; badgeBg: string; badgeText: string }> = {
  active: { label: 'Activo', dot: 'bg-emerald-400', badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400' },
  maintenance: { label: 'Mantenimiento', dot: 'bg-amber-400', badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400' },
  offline: { label: 'Offline', dot: 'bg-red-400', badgeBg: 'bg-red-500/10', badgeText: 'text-red-400' },
  beta: { label: 'Beta', dot: 'bg-violet-400', badgeBg: 'bg-violet-500/10', badgeText: 'text-violet-400' },
};

const systemServices = [
  { label: 'OLO Auth', status: 'operational' },
  { label: 'SSO Broker', status: 'operational' },
  { label: 'App Gateway', status: 'degraded' },
  { label: 'Audit Pipeline', status: 'operational' },
  { label: 'JWT Service', status: 'operational' },
] as const;

// Color mapping helper
const colorMap: Record<string, { bgColor: string; textColor: string; borderColor: string }> = {
  emerald: { bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  cyan: { bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-400', borderColor: 'border-cyan-500/20' },
  amber: { bgColor: 'bg-amber-500/10', textColor: 'text-amber-400', borderColor: 'border-amber-500/20' },
  slate: { bgColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-slate-500/20' },
  rose: { bgColor: 'bg-rose-500/10', textColor: 'text-rose-400', borderColor: 'border-rose-500/20' },
  violet: { bgColor: 'bg-violet-500/10', textColor: 'text-violet-400', borderColor: 'border-violet-500/20' },
  indigo: { bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-400', borderColor: 'border-indigo-500/20' },
  red: { bgColor: 'bg-red-500/10', textColor: 'text-red-400', borderColor: 'border-red-500/20' },
};

function getColorStyles(color: string) {
  return colorMap[color] || colorMap.emerald;
}

function mapSupaAppToAppItem(app: SupaApplication, catMap: Map<string, SupaCategory>): AppItem {
  const cat = app.category_id ? catMap.get(app.category_id) : undefined;
  const colors = getColorStyles(app.color);
  const integrationLabelMap: Record<string, string> = {
    internal: 'Interna', external: 'Externa', embedded: 'Embebida', sso: 'SSO', api: 'API',
  };

  return {
    id: app.id,
    name: app.name,
    code: app.code,
    description: app.description || '',
    categoryId: app.category_id || '',
    categoryName: cat?.name || 'Sin categoría',
    icon: app.icon,
    color: app.color,
    bgColor: colors.bgColor,
    textColor: colors.textColor,
    borderColor: colors.borderColor,
    baseUrl: app.base_url || '',
    status: (app.status as AppItem['status']) || 'active',
    version: app.version,
    integrationType: (app.integration_type as AppItem['integrationType']) || 'internal',
    integrationLabel: integrationLabelMap[app.integration_type] || 'Interna',
    isFavorite: false,
    lastUsed: app.created_at,
    tags: app.tags || [],
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [dataLoading, setDataLoading] = useState(true);

  // Data state - starts empty, filled by Supabase
  const [appCategories, setAppCategories] = useState<AppCategory[]>([]);
  const [appList, setAppList] = useState<AppItem[]>([]);
  const [instanceList, setInstanceList] = useState<AppInstance[]>([]);
  const [userAccessAppIds, setUserAccessAppIds] = useState<Set<string>>(new Set());
  const [accessChecked, setAccessChecked] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Operational summary
  const [opSummary, setOpSummary] = useState({ activeCountries: 0, activeWarehouses: 0, activeClients: 0 });

  // Load from Supabase
  const loadData = useCallback(async () => {
    try {
      const [catResult, appResult, instResult] = await Promise.all([
        fetchCategories(),
        fetchApplications(),
        fetchInstances(),
      ]);

      // Also load user accesses if logged in
      if (user) {
        try {
          const accessResult = await fetchMyAccesses(user.id);
          if (accessResult.data.length > 0) {
            const activeAppIds = new Set(
              accessResult.data
                .filter((a) => a.access_status === 'active')
                .map((a) => a.application_id)
            );
            setUserAccessAppIds(activeAppIds);
          }
        } catch {
          // Access check is non-blocking
        }
        setAccessChecked(true);
      }

      // Load operational summary
      try {
        const [{ count: cCount }, { count: wCount }, { count: clCount }] = await Promise.all([
          supabase.from('countries').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ]);
        setOpSummary({
          activeCountries: cCount || 0,
          activeWarehouses: wCount || 0,
          activeClients: clCount || 0,
        });
      } catch {
        // Non-blocking
      }

      if (instResult.data.length > 0) {
        const mappedInstances: AppInstance[] = instResult.data.map((inst: SupaInstance) => ({
          id: inst.id,
          tenantId: inst.tenant_id,
          tenantName: inst.tenant_id,
          applicationId: inst.application_id,
          applicationName: inst.instance_name,
          instanceName: inst.instance_name,
          url: inst.url || '',
          status: (inst.status as AppInstance['status']) || 'active',
          openInOLO: inst.open_in_olo,
          openInNewTab: inst.open_in_new_tab,
          allowsIframe: inst.allows_iframe,
          ssoEnabled: inst.sso_enabled,
          jwtFederated: inst.jwt_federated,
          allowedDomains: inst.allowed_domains || [],
          createdAt: inst.created_at,
        }));
        setInstanceList(mappedInstances);
      }

      if (catResult.data.length > 0) {
        const catMap = new Map<SupaCategory['id'], SupaCategory>();
        catResult.data.forEach((c) => catMap.set(c.id, c));

        // Map categories to display format
        const mappedCats: AppCategory[] = catResult.data.map((c) => {
          const colors = getColorStyles(c.color);
          return {
            id: c.id,
            name: c.name,
            code: c.code,
            description: c.description || '',
            icon: c.icon,
            color: c.color,
            bgColor: colors.bgColor,
            textColor: colors.textColor,
            borderColor: colors.borderColor,
            isActive: c.is_active,
            appCount: appResult.data.filter((a) => a.category_id === c.id).length,
          };
        });
        setAppCategories(mappedCats);

        if (appResult.data.length > 0) {
          const mappedApps = appResult.data.map((a) => mapSupaAppToAppItem(a, catMap));
          setAppList(mappedApps);
          const favIds = new Set(mappedApps.filter((a) => a.isFavorite).map((a) => a.id));
          setFavorites(favIds);
        }
      } else {
        setAccessChecked(true);
      }
    } catch {
      // silently handle errors
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFavorite = (appId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategory((prev) => (prev === catId ? null : catId));
  };

  const filteredApps = useMemo(() => {
    let result = appList;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.categoryName.toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      result = result.filter((a) => a.categoryId === selectedCategory);
    }

    return result;
  }, [searchQuery, selectedCategory, appList]);

  // Access-filtered apps for the main display sections
  const accessibleApps = useMemo(() => {
    if (!accessChecked || userAccessAppIds.size === 0) return appList;
    return appList.filter((a) => userAccessAppIds.has(a.id));
  }, [appList, userAccessAppIds, accessChecked]);

  const favoriteApps = accessibleApps.filter((a) => favorites.has(a.id));
  const recentApps = [...accessibleApps]
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    .slice(0, 6);

  const activeInstances = instanceList.filter((i) => i.status === 'active');
  const activeAppsCount = accessibleApps.filter((a) => a.status === 'active').length;

  const AppCard = ({ app }: { app: AppItem }) => {
    const isFav = favorites.has(app.id);
    const status = statusConfig[app.status];

    return (
      <div
        className="glass-panel rounded-2xl p-5 hover:border-secondary-500/20 transition-all duration-200 cursor-pointer group animate-fade-in"
        onClick={() => navigate(`/applications?app=${app.id}`)}
        data-product-shop
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${app.bgColor} border ${app.borderColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
            <i className={`${app.icon} ${app.textColor} text-xl`}></i>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-2xs font-medium ${status.badgeBg} ${status.badgeText}`}>
              {status.label}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(app.id);
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                isFav
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-secondary-500/5 text-foreground-600 hover:text-amber-400 hover:bg-amber-500/10'
              }`}
              title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              <i className={`${isFav ? 'ri-star-fill' : 'ri-star-line'} text-sm`}></i>
            </button>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-foreground-200 mb-1.5">{app.name}</h3>
        <p className="text-xs text-foreground-500 leading-relaxed line-clamp-2 mb-3">{app.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-md ${app.bgColor} border ${app.borderColor} flex items-center justify-center`}>
              <i className={`${app.icon} ${app.textColor} text-xs`}></i>
            </span>
            <span className="text-2xs text-foreground-600">{app.categoryName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-foreground-600">v{app.version}</span>
            <span className={`px-1.5 py-0.5 rounded text-2xs font-medium bg-secondary-500/10 text-secondary-400 border border-secondary-500/15`}>
              {app.integrationLabel}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const AppCardCompact = ({ app }: { app: AppItem }) => {
    const isFav = favorites.has(app.id);
    const status = statusConfig[app.status];

    return (
      <div
        className="glass-panel rounded-xl p-4 hover:border-secondary-500/20 transition-all duration-200 cursor-pointer group flex items-center gap-4 animate-fade-in"
        onClick={() => navigate(`/applications?app=${app.id}`)}
        data-product-shop
      >
        <div className={`w-10 h-10 rounded-xl ${app.bgColor} border ${app.borderColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <i className={`${app.icon} ${app.textColor} text-lg`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-foreground-200">{app.name}</h3>
            <span className={`px-1.5 py-0.5 rounded-full text-2xs font-medium ${status.badgeBg} ${status.badgeText} whitespace-nowrap`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-foreground-500 truncate">{app.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-2xs text-foreground-600">{app.categoryName}</span>
          <span className="text-2xs text-foreground-600">v{app.version}</span>
          <span className={`px-1.5 py-0.5 rounded text-2xs font-medium bg-secondary-500/10 text-secondary-400 border border-secondary-500/15`}>
            {app.integrationLabel}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(app.id);
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isFav
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-secondary-500/5 text-foreground-600 hover:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <i className={`${isFav ? 'ri-star-fill' : 'ri-star-line'} text-sm`}></i>
          </button>
        </div>
      </div>
    );
  };

  if (dataLoading) {
    return (
      <AppLayout>
        <div className="animate-fade-in space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-background-100 rounded-lg" />
            <div className="h-4 w-72 bg-background-100 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="glass-panel rounded-2xl p-5 h-48 bg-background-100/50" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Aplicaciones</h1>
            <p className="text-sm text-foreground-500 mt-1">
              Hub de aplicaciones empresariales —{' '}
              <span className="text-primary-400 font-medium">Suite OLO</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background-100 border border-secondary-500/15">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-foreground-50' : 'text-foreground-500 hover:text-foreground-300'}`}
                title="Vista cuadrícula"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-layout-grid-line text-sm"></i>
                </span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary-500 text-foreground-50' : 'text-foreground-500 hover:text-foreground-300'}`}
                title="Vista lista"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-list-check text-sm"></i>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Quick Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Apps disponibles', value: activeAppsCount, icon: 'ri-apps-2-line', bg: 'bg-primary-500/10', text: 'text-primary-400' },
            { label: 'Instancias activas', value: activeInstances.length, icon: 'ri-server-line', bg: 'bg-accent-500/10', text: 'text-accent-400' },
            { label: 'Servicios OK', value: `${systemServices.filter(s=>s.status==='operational').length}/${systemServices.length}`, icon: 'ri-check-double-line', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            { label: 'Favoritos', value: favorites.size, icon: 'ri-star-line', bg: 'bg-amber-500/10', text: 'text-amber-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <i className={`${stat.icon} ${stat.text} text-base`}></i>
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground-100">{stat.value}</div>
                  <div className="text-2xs text-foreground-600">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Operational Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Paises activos', value: opSummary.activeCountries, icon: 'ri-global-line', bg: 'bg-violet-500/10', text: 'text-violet-400', path: '/countries' },
            { label: 'Almacenes activos', value: opSummary.activeWarehouses, icon: 'ri-store-2-line', bg: 'bg-cyan-500/10', text: 'text-cyan-400', path: '/warehouses' },
            { label: 'Clientes activos', value: opSummary.activeClients, icon: 'ri-building-2-line', bg: 'bg-rose-500/10', text: 'text-rose-400', path: '/clients' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-4 cursor-pointer hover:border-secondary-500/20 transition-all" onClick={() => navigate(stat.path)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                    <i className={`${stat.icon} ${stat.text} text-base`}></i>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground-100">{stat.value}</div>
                    <div className="text-2xs text-foreground-600">{stat.label}</div>
                  </div>
                </div>
                <span className="w-5 h-5 flex items-center justify-center text-foreground-600">
                  <i className="ri-arrow-right-s-line text-sm"></i>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Category Filters */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-500 w-5 h-5 flex items-center justify-center">
              <i className="ri-search-line text-base"></i>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aplicaciones por nombre, categoría o palabra clave..."
              className="w-full h-11 bg-background-100 border border-secondary-500/20 rounded-xl pl-11 pr-11 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/15 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-500 hover:text-foreground-300 w-5 h-5 flex items-center justify-center"
              >
                <i className="ri-close-line text-base"></i>
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-primary-500 text-foreground-50'
                  : 'bg-secondary-500/10 text-foreground-500 hover:text-foreground-300 hover:bg-secondary-500/20 border border-transparent hover:border-secondary-500/20'
              }`}
            >
              Todas
            </button>
            {appCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? `${cat.textColor} ${cat.bgColor} border ${cat.borderColor}`
                    : 'bg-secondary-500/10 text-foreground-500 hover:text-foreground-300 hover:bg-secondary-500/20 border border-transparent hover:border-secondary-500/20'
                }`}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <i className={`${cat.icon} text-xs`}></i>
                </span>
                {cat.name}
                <span className="text-2xs opacity-60 ml-0.5">{accessibleApps.filter((a) => a.categoryId === cat.id).length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        {searchQuery || selectedCategory ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground-300">
                {filteredApps.length} {filteredApps.length === 1 ? 'aplicación encontrada' : 'aplicaciones encontradas'}
              </h2>
            </div>
            {filteredApps.length === 0 ? (
              <div className="glass-panel rounded-2xl p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-5">
                  <i className="ri-search-line text-foreground-500 text-2xl"></i>
                </div>
                <h3 className="text-sm font-semibold text-foreground-300 mb-2">Sin resultados</h3>
                <p className="text-xs text-foreground-500 max-w-sm mx-auto">
                  No encontramos aplicaciones que coincidan con tu búsqueda. Intenta con otros términos o categorías.
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredApps.map((app) => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredApps.map((app) => (
                  <AppCardCompact key={app.id} app={app} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {favoriteApps.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center text-amber-400">
                      <i className="ri-star-fill text-base"></i>
                    </span>
                    <h2 className="text-sm font-semibold text-foreground-200">Favoritos</h2>
                  </div>
                  <span className="text-xs text-foreground-600">{favoriteApps.length} apps</span>
                </div>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {favoriteApps.map((app) => (
                      <AppCard key={app.id} app={app} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {favoriteApps.map((app) => (
                      <AppCardCompact key={app.id} app={app} />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground-200">Todas las aplicaciones</h2>
                <span className="text-xs text-foreground-600">{accessibleApps.length} apps</span>
              </div>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {accessibleApps.map((app) => (
                    <AppCard key={app.id} app={app} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {accessibleApps.map((app) => (
                    <AppCardCompact key={app.id} app={app} />
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground-200">Usadas recientemente</h2>
                  <span className="text-xs text-foreground-600">Últimos accesos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recentApps.map((app) => {
                    const status = statusConfig[app.status];
                    const lastUsed = new Date(app.lastUsed);
                    const now = new Date();
                    const diffMs = now.getTime() - lastUsed.getTime();
                    const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
                    const timeAgo = diffHrs < 1 ? 'Ahora' : diffHrs < 24 ? `Hace ${diffHrs}h` : `Hace ${Math.round(diffHrs / 24)}d`;

                    return (
                      <div
                        key={app.id}
                        className="glass-panel rounded-xl p-4 hover:border-secondary-500/20 transition-all duration-200 cursor-pointer group flex items-center gap-3"
                        onClick={() => navigate(`/applications?app=${app.id}`)}
                        data-product-shop
                      >
                        <div className={`w-10 h-10 rounded-xl ${app.bgColor} border ${app.borderColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                          <i className={`${app.icon} ${app.textColor} text-lg`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-foreground-200 truncate">{app.name}</h4>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`}></span>
                          </div>
                          <p className="text-2xs text-foreground-600 mt-0.5">{app.categoryName} · {timeAgo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-foreground-200 mb-4">Estado de sistemas</h2>
                <div className="space-y-3">
                  {systemServices.map((svc) => (
                    <div key={svc.label} className="flex items-center justify-between py-2 border-b border-secondary-500/5 last:border-0">
                      <span className="text-xs text-foreground-500">{svc.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          svc.status === 'operational' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                        }`}></span>
                        <span className={`text-2xs font-medium ${
                          svc.status === 'operational' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {svc.status === 'operational' ? 'OK' : 'Degradado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-secondary-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-foreground-400">Instancias activas</h3>
                    <button
                      onClick={() => navigate('/instances')}
                      className="text-2xs text-primary-400 hover:text-primary-300 transition-colors font-medium"
                    >
                      Ver todas
                    </button>
                  </div>
                  <div className="space-y-2">
                    {activeInstances.slice(0, 4).map((inst) => (
                      <div key={inst.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${inst.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        <span className="text-foreground-400 truncate flex-1">{inst.instanceName}</span>
                        {inst.ssoEnabled && (
                          <span className="text-2xs text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded font-medium">SSO</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-secondary-500/10">
                  <h3 className="text-xs font-medium text-foreground-400 mb-3">Acciones rápidas</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Nueva App', icon: 'ri-add-circle-line', path: '/applications', color: 'primary' },
                      { label: 'Instancias', icon: 'ri-server-line', path: '/instances', color: 'accent' },
                      { label: 'Catálogo', icon: 'ri-store-2-line', path: '/catalog', color: 'amber' },
                      { label: 'Seguridad', icon: 'ri-shield-check-line', path: '/security', color: 'red' },
                    ].map((action) => (
                      <button
                        key={action.path}
                        onClick={() => navigate(action.path)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-500/10 bg-background-100 hover:border-secondary-500/25 hover:bg-background-200/40 transition-all text-xs text-foreground-400"
                      >
                        <span className={`w-4 h-4 flex items-center justify-center text-${action.color}-400`}>
                          <i className={`${action.icon} text-sm`}></i>
                        </span>
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}