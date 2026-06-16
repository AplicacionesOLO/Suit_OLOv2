export interface AppCategory {
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

export const categories: AppCategory[] = [
  {
    id: 'cat-1',
    name: 'Logística',
    code: 'LOGISTICS',
    description: 'Gestión de cadena de suministro, almacenes, transporte y distribución',
    icon: 'ri-truck-line',
    color: 'emerald',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    isActive: true,
    appCount: 3,
  },
  {
    id: 'cat-2',
    name: 'Comercial',
    code: 'COMMERCIAL',
    description: 'Ventas, CRM, atención al cliente y gestión de relaciones comerciales',
    icon: 'ri-shake-hands-line',
    color: 'cyan',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
    isActive: true,
    appCount: 4,
  },
  {
    id: 'cat-3',
    name: 'Finanzas',
    code: 'FINANCE',
    description: 'Contabilidad, facturación, tesorería y control financiero empresarial',
    icon: 'ri-money-dollar-box-line',
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    isActive: true,
    appCount: 2,
  },
  {
    id: 'cat-4',
    name: 'Operaciones',
    code: 'OPERATIONS',
    description: 'Control de procesos, calidad, mantenimiento y gestión operativa',
    icon: 'ri-settings-line',
    color: 'slate',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/20',
    isActive: true,
    appCount: 3,
  },
  {
    id: 'cat-5',
    name: 'RRHH',
    code: 'HR',
    description: 'Gestión de talento, nómina, reclutamiento y desarrollo organizacional',
    icon: 'ri-team-line',
    color: 'rose',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/20',
    isActive: true,
    appCount: 2,
  },
  {
    id: 'cat-6',
    name: 'Analítica',
    code: 'ANALYTICS',
    description: 'Business Intelligence, dashboards, reportes y análisis de datos',
    icon: 'ri-bar-chart-2-line',
    color: 'violet',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/20',
    isActive: true,
    appCount: 2,
  },
  {
    id: 'cat-7',
    name: 'Tecnología',
    code: 'TECH',
    description: 'Infraestructura, desarrollo, DevOps y gestión de sistemas TI',
    icon: 'ri-cpu-line',
    color: 'indigo',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/20',
    isActive: true,
    appCount: 3,
  },
  {
    id: 'cat-8',
    name: 'Seguridad',
    code: 'SECURITY',
    description: 'Ciberseguridad, control de acceso, auditoría y cumplimiento normativo',
    icon: 'ri-shield-check-line',
    color: 'red',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/20',
    isActive: true,
    appCount: 2,
  },
];