// ================================================================
// Helpers centrales de cascada organizacional Suite OLO
//
// Jerarquía: PAÍS → TENANT → CLIENTE → USUARIO → APLICACIONES
//
// USO OBLIGATORIO: Toda la aplicación debe usar estas funciones
// en lugar de implementar filtros manuales de cascada.
// ================================================================

import type {
  CountryOption,
  TenantOption,
  ClientOption,
  CascadeValidationResult,
} from '@/types/organization';

// ========== DEV WARNINGS (solo en development) ==========

const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

/**
 * Emite un warning si un tenant llega sin country_id.
 * Este campo es OBLIGATORIO para que la cascada País→Tenant funcione.
 */
export function warnTenantWithoutCountry(tenant: { id: string; name: string; country_id?: string | null }): void {
  if (!isDev) return;
  if (!tenant.country_id) {
    console.warn(
      '[Cascade] Tenant without country_id — la cascada País→Tenant romperá para este tenant:',
      { id: tenant.id, name: tenant.name },
    );
  }
}

/**
 * Emite un warning si un client llega sin tenant_id.
 * Este campo es OBLIGATORIO para que la cascada Tenant→Cliente funcione.
 */
export function warnClientWithoutTenant(client: { id: string; name: string; tenant_id?: string }): void {
  if (!isDev) return;
  if (!client.tenant_id) {
    console.warn(
      '[Cascade] Client without tenant_id — la cascada Tenant→Cliente romperá para este cliente:',
      { id: client.id, name: client.name },
    );
  }
}

/**
 * Emite warnings de desarrollo sobre todos los tenants y clients cargados.
 * Llámala después de cualquier carga de datos (ej: en useUsers, useTenantContext).
 */
export function auditCascadeData(
  tenants: TenantOption[],
  clients: ClientOption[],
): void {
  if (!isDev) return;
  let tenantWarnings = 0;
  let clientWarnings = 0;

  for (const t of tenants) {
    if (!t.country_id) {
      console.warn('[Cascade] Tenant without country_id', { id: t.id, name: t.name });
      tenantWarnings += 1;
    }
  }

  for (const c of clients) {
    if (!c.tenant_id) {
      console.warn('[Cascade] Client without tenant_id', { id: c.id, name: c.name });
      clientWarnings += 1;
    }
  }

  if (tenantWarnings > 0 || clientWarnings > 0) {
    console.warn(
      `[Cascade] Data integrity issues: ${tenantWarnings} tenants without country_id, ${clientWarnings} clients without tenant_id. ` +
      'La cascada País→Tenant→Cliente no funcionará correctamente.',
    );
  }
}

// ========== CASCADE FILTERS ==========

/**
 * Filtra tenants que pertenecen a un país específico.
 * Si el tenant no tiene country_id, NO será incluido (seguridad por defecto).
 *
 * @param tenants - Lista completa de tenants (debe incluir country_id)
 * @param countryId - UUID del país a filtrar
 * @returns Tenants que pertenecen a ese país
 */
export function getTenantsByCountry(
  tenants: TenantOption[],
  countryId: string,
): TenantOption[] {
  if (!countryId) return [];
  return tenants.filter((t) => t.country_id === countryId);
}

/**
 * Filtra clients que pertenecen a un tenant específico.
 *
 * @param clients - Lista completa de clients (debe incluir tenant_id)
 * @param tenantId - UUID del tenant a filtrar
 * @returns Clients que pertenecen a ese tenant
 */
export function getClientsByTenant(
  clients: ClientOption[],
  tenantId: string,
): ClientOption[] {
  if (!tenantId) return [];
  return clients.filter((c) => c.tenant_id === tenantId);
}

// ========== VALIDATION HELPERS ==========

/**
 * Valida que un tenant pertenezca a un país dado.
 *
 * @returns true si el tenant existe y pertenece al país (o si tenantId está vacío)
 */
export function validateCountryTenant(
  countryId: string,
  tenantId: string,
  tenants: TenantOption[],
): boolean {
  if (!tenantId) return true; // Sin tenant = sin restricción
  if (!countryId) return true; // Sin país = no podemos validar
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) return false; // Tenant no existe
  if (!tenant.country_id) return false; // Tenant sin país asociado
  return tenant.country_id === countryId;
}

/**
 * Valida que un cliente pertenezca a un tenant dado.
 *
 * @returns true si el cliente existe y pertenece al tenant (o si clientId está vacío)
 */
export function validateTenantClient(
  tenantId: string,
  clientId: string,
  clients: ClientOption[],
): boolean {
  if (!clientId) return true; // Sin cliente = sin restricción
  if (!tenantId) return true; // Sin tenant = no podemos validar
  const client = clients.find((c) => c.id === clientId);
  if (!client) return false; // Cliente no existe
  return client.tenant_id === tenantId;
}

// ========== FULL CASCADE VALIDATION ==========

export interface FullCascadeInput {
  /** ID del país principal (o vacío) */
  countryId: string;
  /** ID del tenant principal (o vacío) */
  tenantId: string;
  /** ID del cliente principal (o vacío) */
  clientId: string;
  /** IDs de países adicionales en el alcance */
  scopeCountryIds: string[];
  /** IDs de tenants adicionales en el alcance */
  scopeTenantIds: string[];
  /** IDs de clientes adicionales en el alcance */
  scopeClientIds: string[];
  /** Si tiene acceso global a países */
  scopeAllCountries: boolean;
  /** Si tiene acceso global a tenants */
  scopeAllTenants: boolean;
  /** Si tiene acceso global a clientes */
  scopeAllClients: boolean;
  /** Lista completa de tenants (con country_id) */
  tenants: TenantOption[];
  /** Lista completa de clients (con tenant_id) */
  clients: ClientOption[];
}

/**
 * Valida TODA la cascada organizacional antes de guardar.
 *
 * Reglas:
 * 1. Cada tenant debe pertenecer a un país incluido en el alcance
 * 2. Cada cliente debe pertenecer a un tenant incluido en el alcance
 *
 * Si scopeAllCountries es true, la regla 1 se salta.
 * Si scopeAllTenants es true, la regla 2 se salta.
 *
 * @returns CascadeValidationResult con valid: true si todo OK
 */
export function validateFullCascade(input: FullCascadeInput): CascadeValidationResult {
  const errors: string[] = [];

  // Construir sets de IDs seleccionados
  const selectedCountryIds = new Set(
    [input.countryId, ...input.scopeCountryIds].filter(Boolean),
  );
  const selectedTenantIds = new Set(
    [input.tenantId, ...input.scopeTenantIds].filter(Boolean),
  );

  // Regla 1: Todo tenant debe pertenecer a un país seleccionado
  if (!input.scopeAllCountries && !input.scopeAllTenants) {
    for (const tid of selectedTenantIds) {
      const tenant = input.tenants.find((t) => t.id === tid);
      if (!tenant) {
        errors.push(`El tenant con ID ${tid} no existe en la base de datos.`);
        continue;
      }
      if (!tenant.country_id) {
        errors.push(`El tenant "${tenant.name}" no tiene país asignado. Contacta al administrador.`);
        continue;
      }
      if (!selectedCountryIds.has(tenant.country_id)) {
        errors.push(
          `El tenant "${tenant.name}" pertenece a un país no seleccionado. Agrega ese país a los alcances o elimina el tenant.`,
        );
      }
    }
  }

  // Regla 2: Todo cliente debe pertenecer a un tenant seleccionado
  if (!input.scopeAllClients && !input.scopeAllTenants) {
    const allClientIds = [input.clientId, ...input.scopeClientIds].filter(Boolean);
    for (const clid of allClientIds) {
      const client = input.clients.find((c) => c.id === clid);
      if (!client) {
        errors.push(`El cliente con ID ${clid} no existe en la base de datos.`);
        continue;
      }
      if (!client.tenant_id) {
        errors.push(`El cliente "${client.name}" no tiene tenant asignado. Contacta al administrador.`);
        continue;
      }
      if (!selectedTenantIds.has(client.tenant_id)) {
        errors.push(
          `El cliente "${client.name}" pertenece a un tenant no seleccionado. Agrega ese tenant a los alcances o elimina el cliente.`,
        );
      }
    }
  }

  // Regla 3: El tenant principal debe pertenecer al país principal
  if (input.tenantId && input.countryId && !input.scopeAllCountries) {
    const tenant = input.tenants.find((t) => t.id === input.tenantId);
    if (tenant && tenant.country_id && tenant.country_id !== input.countryId) {
      errors.push(
        `El tenant principal "${tenant.name}" pertenece al país "${tenant.country_id}" pero el país principal es "${input.countryId}". La cascada País→Tenant no es válida.`,
      );
    }
  }

  // Regla 4: El cliente principal debe pertenecer al tenant principal
  if (input.clientId && input.tenantId && !input.scopeAllTenants) {
    const client = input.clients.find((c) => c.id === input.clientId);
    if (client && client.tenant_id !== input.tenantId) {
      errors.push(
        `El cliente principal "${client.name}" pertenece al tenant "${client.tenant_id}" pero el tenant principal es "${input.tenantId}". La cascada Tenant→Cliente no es válida.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errorMessage: errors.length > 0
      ? 'La relación País → Tenant → Cliente no es válida.'
      : '',
    errors,
  };
}