import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const moduleLabels: Record<string, string> = {
  tenants: 'Tenants',
  countries: 'Países',
  warehouses: 'Almacenes',
  clients: 'Clientes',
  users: 'Usuarios',
  categories: 'Categorías',
  applications: 'Aplicaciones',
  instances: 'Instancias',
  assignments: 'Asignaciones',
  roles: 'Roles y Permisos',
  'app-access': 'Apps Asignadas',
};

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { platformUser } = useAuth();

  const from = searchParams.get('from') || '';
  const module = searchParams.get('module') || '';
  const moduleLabel = moduleLabels[module] || module || 'este módulo';

  return (
    <div className="min-h-screen bg-background-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <i className="ri-shield-cross-line text-red-400 text-4xl"></i>
        </div>

        <h1 className="text-2xl font-bold text-foreground-100 mb-3">Acceso Denegado</h1>

        <p className="text-sm text-foreground-500 mb-2">
          No tienes permisos para acceder a <strong className="text-foreground-300">{moduleLabel}</strong>.
        </p>

        {platformUser?.role_name && (
          <p className="text-xs text-foreground-600 mb-6">
            Tu rol actual es <span className="text-foreground-400 font-medium">{platformUser.role_name}</span>.
            Contacta a un administrador si necesitas acceso adicional.
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="h-10 px-6 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Ir al Dashboard
          </button>
          <button
            onClick={() => navigate('/my-access')}
            className="h-10 px-6 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap"
          >
            Mis Accesos
          </button>
        </div>
      </div>
    </div>
  );
}