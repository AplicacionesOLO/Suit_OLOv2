import AppLayout from '@/components/feature/AppLayout';

export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground-100">{title}</h1>
          <p className="text-sm text-foreground-500 mt-1">{description}</p>
        </div>

        <div className="glass-panel rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-5">
            <i className="ri-tools-line text-2xl text-primary-400"></i>
          </div>
          <h2 className="text-lg font-semibold text-foreground-200 mb-2">Modulo en desarrollo</h2>
          <p className="text-sm text-foreground-500 max-w-md leading-relaxed">
            Esta seccion estara disponible en las proximas fases de desarrollo.
            Se implementara con funcionalidad CRUD completa, tablas avanzadas con
            filtros, busqueda, paginacion y estados.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

export function ModulesPage() {
  return <PlaceholderPage title="Modulos del Sistema" description="Administra los modulos disponibles en la plataforma" />;
}