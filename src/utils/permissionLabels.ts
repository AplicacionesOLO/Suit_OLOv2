export const MODULE_LABELS: Record<string, string> = {
  tenants: 'Tenants',
  countries: 'Países',
  warehouses: 'Almacenes',
  clients: 'Clientes',
  users: 'Usuarios',
  categories: 'Categorías',
  applications: 'Aplicaciones',
  instances: 'Instancias',
  assignments: 'Asignaciones',
  roles: 'Roles',
  'app-access': 'Acceso a apps',
  profiles: 'Perfiles',
};

export const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  revoke: 'Revocar',
};

export const ACTION_ORDER: string[] = ['view', 'create', 'update', 'delete', 'revoke'];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  USER_INVITED: 'Invitación enviada',
  USER_INVITATION_ACCEPTED: 'Invitación aceptada',
  USER_INVITATION_REVOKED: 'Invitación revocada',
  PERMISSION_CHANGED: 'Permisos actualizados',
  ACCESS_GRANTED: 'Acceso otorgado',
  ACCESS_REVOKED: 'Acceso revocado',
  ACCESS_DENIED: 'Acceso denegado',
  USER_OPENED_EXTERNAL_APPLICATION: 'Aplicación abierta',
  USER_OPENED_FAVORITE_APPLICATION: 'Favorito abierto',
  TENANT_CONTEXT_SET: 'Contexto de tenant cambiado',
  COUNTRY_CONTEXT_SET: 'Contexto de país cambiado',
  CLIENT_CONTEXT_SET: 'Contexto de cliente cambiado',
  WAREHOUSE_CONTEXT_SET: 'Contexto de almacén cambiado',
  TENANT_CONTEXT_CLEARED: 'Contexto de tenant limpiado',
  COUNTRY_CONTEXT_CLEARED: 'Contexto de país limpiado',
  CLIENT_CONTEXT_CLEARED: 'Contexto de cliente limpiado',
  WAREHOUSE_CONTEXT_CLEARED: 'Contexto de almacén limpiado',
};

export function humanizeAuditAction(action: string): string {
  if (AUDIT_ACTION_LABELS[action]) return AUDIT_ACTION_LABELS[action];
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}