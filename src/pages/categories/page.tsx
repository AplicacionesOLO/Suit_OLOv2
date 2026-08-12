import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  softDeleteCategory,
  type AppCategory as SupaCategory,
} from '@/services/applications/applicationsService';
import { useSuitePermissions } from '@/hooks/useSuitePermissions';

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

interface CategoryForm {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  code: '',
  description: '',
  isActive: true,
};

function getColorStyles(color: string) {
  const map: Record<string, { bgColor: string; textColor: string; borderColor: string }> = {
    emerald: { bgColor: 'bg-primary-500/10', textColor: 'text-primary-400', borderColor: 'border-primary-500/20' },
    cyan: { bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-400', borderColor: 'border-cyan-500/20' },
    amber: { bgColor: 'bg-amber-500/10', textColor: 'text-amber-400', borderColor: 'border-amber-500/20' },
    slate: { bgColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-slate-500/20' },
    rose: { bgColor: 'bg-rose-500/10', textColor: 'text-rose-400', borderColor: 'border-rose-500/20' },
    violet: { bgColor: 'bg-violet-500/10', textColor: 'text-violet-400', borderColor: 'border-violet-500/20' },
    indigo: { bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-400', borderColor: 'border-indigo-500/20' },
    red: { bgColor: 'bg-red-500/10', textColor: 'text-red-400', borderColor: 'border-red-500/20' },
  };
  return map[color] || map.emerald;
}

function mapSupaCat(c: SupaCategory): AppCategory {
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
    appCount: 0,
  };
}

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AppCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [catList, setCatList] = useState<AppCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { can } = useSuitePermissions();

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const result = await fetchCategories();
      if (result.error) {
        setLoadError(result.error);
      } else {
        setCatList(result.data.map(mapSupaCat));
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = catList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEdit = (cat: AppCategory) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      code: cat.code,
      description: cat.description,
      isActive: cat.isActive,
    });
    setFormError(null);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setFormError(null);
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const code = form.code.trim();

    if (!name) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (!code) {
      setFormError('El código es obligatorio.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    if (editingCategory) {
      const { error } = await updateCategory(editingCategory.id, {
        name,
        code,
        description: form.description,
        is_active: form.isActive,
      });
      if (error) {
        setFormError(error);
        setSubmitting(false);
        return;
      }
      showToast('success', 'Categoría actualizada correctamente.');
    } else {
      const { error } = await createCategory({
        name,
        code,
        description: form.description,
        is_active: form.isActive,
      });
      if (error) {
        setFormError(error);
        setSubmitting(false);
        return;
      }
      showToast('success', 'Categoría creada correctamente.');
    }

    setSubmitting(false);
    setShowModal(false);
    setFormError(null);
    await loadData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await softDeleteCategory(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);

    if (error) {
      showToast('error', error);
      return;
    }
    showToast('success', 'Categoría eliminada correctamente.');
    await loadData();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="glass-panel rounded-2xl p-8 h-96 bg-background-100/50" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {toast && (
          <div
            className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm border ${
              toast.type === 'success'
                ? 'bg-primary-500/10 border-primary-500/25 text-primary-300'
                : 'bg-red-500/10 border-red-500/25 text-red-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={`${toast.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} text-base`}></i>
              </span>
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-background-200/50 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-close-line text-sm"></i>
              </span>
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-100">Categorías de Aplicaciones</h1>
            <p className="text-sm text-foreground-500 mt-1">Organiza tus aplicaciones empresariales por categoría funcional.</p>
          </div>
          {can('categories', 'create') && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-add-line text-base"></i>
              </span>
              Nueva categoría
            </button>
          )}
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-secondary-500/10">
            <div className="relative max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar categorías..."
                className="w-full h-9 bg-background-100 border border-secondary-500/20 rounded-lg pl-9 pr-3 text-sm text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
              />
            </div>
          </div>

          {loadError && (
            <div className="px-5 py-4 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between gap-3">
              <span className="text-sm text-red-400">{loadError}</span>
              <button
                onClick={loadData}
                className="h-8 px-3 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors whitespace-nowrap"
              >
                Reintentar
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-500/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Código</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Descripción</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Apps</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr key={cat.id} className="border-b border-secondary-500/5 hover:bg-background-100/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${cat.bgColor} border ${cat.borderColor} flex items-center justify-center`}>
                          <i className={`${cat.icon} ${cat.textColor} text-base`}></i>
                        </div>
                        <span className="text-sm font-medium text-foreground-200">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs bg-secondary-500/10 text-secondary-400 px-2 py-0.5 rounded font-mono">{cat.code}</code>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-foreground-500 max-w-xs truncate">{cat.description}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-foreground-300">{cat.appCount}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium ${cat.isActive ? 'bg-primary-500/10 text-primary-400' : 'bg-red-500/10 text-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.isActive ? 'bg-primary-400' : 'bg-red-400'}`}></span>
                        {cat.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {can('categories', 'update') && (
                          <button
                            onClick={() => openEdit(cat)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
                            title="Editar"
                          >
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-edit-line text-sm"></i>
                            </span>
                          </button>
                        )}
                        {can('categories', 'delete') && (
                          <button
                            onClick={() => setDeleteTarget(cat)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Eliminar"
                          >
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-delete-bin-line text-sm"></i>
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <span className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-folder-open-line text-foreground-500 text-xl"></i>
                </span>
                <p className="text-sm text-foreground-500">No se encontraron categorías</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-secondary-500/10 flex items-center justify-between">
            <span className="text-xs text-foreground-600">{filtered.length} de {catList.length} categorías</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all" disabled>
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-left-s-line text-sm"></i></span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 text-xs font-medium">1</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-s-line text-sm"></i></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#231E20]/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground-200">
                {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-close-line text-lg"></i>
                </span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all"
                  placeholder="Ej: Logística"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Código</label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all font-mono"
                  placeholder="Ej: LOGISTICS"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Descripción</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="w-full bg-background-100 border border-secondary-500/20 rounded-lg px-3 py-2 text-sm text-foreground-200 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all resize-none"
                  placeholder="Describe el propósito de esta categoría..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500 focus:ring-primary-500/30"
                />
                <label className="text-sm text-foreground-400">Categoría activa</label>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-2.5 text-sm text-red-400">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <i className="ri-error-warning-line text-base"></i>
                  </span>
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : editingCategory ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#231E20]/60 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative glass-panel-strong rounded-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                <i className="ri-delete-bin-line text-red-400 text-lg"></i>
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground-200">Eliminar categoría</h3>
                <p className="text-sm text-foreground-500 mt-1">
                  ¿Seguro que deseas eliminar <strong className="text-foreground-300">{deleteTarget.name}</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-9 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}