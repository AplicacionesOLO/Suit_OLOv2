import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { applications, type AppItem } from '@/mocks/applications';
import { categories } from '@/mocks/categories';

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  active: { label: 'Activo', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  maintenance: { label: 'Mantenimiento', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  offline: { label: 'Offline', dot: 'bg-red-400', bg: 'bg-red-500/10', text: 'text-red-400' },
  beta: { label: 'Beta', dot: 'bg-violet-400', bg: 'bg-violet-500/10', text: 'text-violet-400' },
};

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredApps = applications.filter((a) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q) && !a.tags.some((t) => t.toLowerCase().includes(q))) return false;
    }
    if (selectedCategory && a.categoryId !== selectedCategory) return false;
    return true;
  });

  const appsByCategory = categories
    .filter((c) => !selectedCategory || c.id === selectedCategory)
    .map((cat) => ({
      category: cat,
      apps: filteredApps.filter((a) => a.categoryId === cat.id),
    }))
    .filter((g) => g.apps.length > 0);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Catálogo Empresarial</h1>
            <p className="text-sm text-foreground-500 mt-1">Explora todas las aplicaciones disponibles en la plataforma Suite OLO.</p>
          </div>
        </div>

        {/* Search + Category Filters */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-500 w-5 h-5 flex items-center justify-center">
              <i className="ri-search-line text-base"></i>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el catálogo empresarial..."
              className="w-full h-11 bg-background-100 border border-secondary-500/20 rounded-xl pl-11 pr-11 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/15 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${selectedCategory === null ? 'bg-primary-500 text-foreground-50' : 'bg-secondary-500/10 text-foreground-500 hover:text-foreground-300 hover:bg-secondary-500/20'}`}
            >
              Todo el catálogo
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${cat.id === selectedCategory ? `${cat.textColor} ${cat.bgColor} border ${cat.borderColor}` : 'bg-secondary-500/10 text-foreground-500 hover:text-foreground-300 hover:bg-secondary-500/20'}`}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center"><i className={`${cat.icon} text-xs`}></i></span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog by category */}
        <div className="space-y-8">
          {appsByCategory.map(({ category, apps }) => (
            <section key={category.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-lg ${category.bgColor} border ${category.borderColor} flex items-center justify-center`}>
                  <i className={`${category.icon} ${category.textColor} text-base`}></i>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground-200">{category.name}</h2>
                  <p className="text-2xs text-foreground-600">{apps.length} aplicaciones</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {apps.map((app) => {
                  const status = statusConfig[app.status];
                  return (
                    <div key={app.id} className="glass-panel rounded-2xl p-5 hover:border-secondary-500/20 transition-all duration-200 cursor-pointer group animate-fade-in" data-product-shop>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl ${app.bgColor} border ${app.borderColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                          <i className={`${app.icon} ${app.textColor} text-xl`}></i>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-medium ${status.bg} ${status.text}`}>{status.label}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground-200 mb-1.5">{app.name}</h3>
                      <p className="text-xs text-foreground-500 leading-relaxed line-clamp-2 mb-3">{app.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {app.tags.slice(0, 2).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded text-2xs bg-secondary-500/10 text-secondary-400 border border-secondary-500/15">{t}</span>
                          ))}
                        </div>
                        <span className="text-2xs text-foreground-600 font-mono">v{app.version}</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-secondary-500/10">
                        <button className="w-full h-8 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-xs font-medium whitespace-nowrap">
                          Solicitar acceso
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="glass-panel rounded-2xl p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-5">
              <i className="ri-store-2-line text-foreground-500 text-2xl"></i>
            </div>
            <h3 className="text-sm font-semibold text-foreground-300 mb-2">Sin aplicaciones</h3>
            <p className="text-xs text-foreground-500">No hay aplicaciones en esta categoría actualmente.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}