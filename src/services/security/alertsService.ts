export interface SecurityAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  ip_address?: string;
  user?: string;
  application?: string;
  tenant_id?: string;
}

const mockAlerts: SecurityAlert[] = [
  { id: 'a1', type: 'login_failed', title: 'Multiple intentos fallidos', description: '5 intentos de login fallidos desde IP 45.33.32.156 para usuario admin@suiteolo.io', severity: 'critical', status: 'open', created_at: new Date(Date.now() - 900000).toISOString(), ip_address: '45.33.32.156', user: 'admin@suiteolo.io' },
  { id: 'a2', type: 'access_denied', title: 'Acceso denegado fuera de tenant', description: 'Usuario de Costa Rica intento acceder a WMS en tenant Panama', severity: 'critical', status: 'investigating', created_at: new Date(Date.now() - 600000).toISOString(), user: 'usuario@suiteolo.io', application: 'WMS' },
  { id: 'a3', type: 'permission_change', title: 'Cambio masivo de permisos', description: 'Perfil Administrador Operativo modificado: se agregaron acciones Aprobar y Auditar a WMS', severity: 'high', status: 'open', created_at: new Date(Date.now() - 43200000).toISOString(), user: 'admin@suiteolo.io', application: 'WMS' },
  { id: 'a4', type: 'new_ip', title: 'Acceso desde IP no reconocida', description: 'Usuario admin@suiteolo.io accedio desde IP 201.55.33.10 no registrada en rangos permitidos', severity: 'medium', status: 'investigating', created_at: new Date(Date.now() - 3600000).toISOString(), ip_address: '201.55.33.10', user: 'admin@suiteolo.io' },
  { id: 'a5', type: 'outside_tenant', title: 'Intento de acceso cross-tenant', description: 'Se detecto un intento de acceso a recursos de Panama desde una sesion de Costa Rica', severity: 'critical', status: 'open', created_at: new Date(Date.now() - 600000).toISOString(), user: 'usuario@suiteolo.io' },
  { id: 'a6', type: 'app_down', title: 'Aplicacion degradada', description: 'App Gateway reporta estado degradado. Latencia superior al umbral configurado.', severity: 'high', status: 'investigating', created_at: new Date(Date.now() - 7200000).toISOString(), application: 'App Gateway' },
  { id: 'a7', type: 'risky_session', title: 'Sesion de alto riesgo detectada', description: 'Sesion desde IP 45.33.32.156 usando python-requests clasificada como riesgo critico', severity: 'critical', status: 'open', created_at: new Date(Date.now() - 300000).toISOString(), ip_address: '45.33.32.156' },
  { id: 'a8', type: 'login_failed', title: 'Cuenta bloqueada por intentos', description: 'Cuenta en tenant Mexico bloqueada tras 6 intentos fallidos desde IP 187.45.23.99', severity: 'high', status: 'open', created_at: new Date(Date.now() - 1800000).toISOString(), ip_address: '187.45.23.99', user: 'unknown@mexico.com' },
  { id: 'a9', type: 'permission_change', title: 'Rol de sistema modificado', description: 'Nivel jerarquico de Super Admin cambiado de 90 a 100', severity: 'high', status: 'resolved', created_at: new Date(Date.now() - 259200000).toISOString(), user: 'admin@suiteolo.io' },
  { id: 'a10', type: 'access_denied', title: 'Acceso revocado por terminacion', description: 'Acceso a HR revocado para ex-empleado@suiteolo.io por terminacion de contrato', severity: 'medium', status: 'resolved', created_at: new Date(Date.now() - 28800000).toISOString(), user: 'ex-empleado@suiteolo.io', application: 'HR' },
  { id: 'a11', type: 'new_ip', title: 'Acceso desde nueva ubicacion', description: 'Usuario analista@suiteolo.io accedio desde IP 201.55.33.10 (primera vez)', severity: 'low', status: 'resolved', created_at: new Date(Date.now() - 7200000).toISOString(), ip_address: '201.55.33.10', user: 'analista@suiteolo.io' },
  { id: 'a12', type: 'risky_session', title: 'Sesion desde Panama revocada', description: 'Sesion de admin@panama.com revocada manualmente por posible compromiso', severity: 'high', status: 'resolved', created_at: new Date(Date.now() - 51840000).toISOString(), user: 'admin@panama.com' },
];

export async function fetchAlerts(): Promise<{ data: SecurityAlert[]; error: string | null }> {
  return { data: mockAlerts, error: null };
}

export async function resolveAlert(alertId: string): Promise<{ error: string | null }> {
  return { error: null };
}