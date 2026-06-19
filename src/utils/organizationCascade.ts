// ================================================================
// Helpers centrales de cascada organizacional Suite OLO
//
// Jerarquía: PAÍS → TENANT → ALMACÉN → CLIENTE → USUARIO → APLICACIONES
//
// USO OBLIGATORIO: Toda la aplicación debe usar estas funciones
// en lugar de implementar filtros manuales de cascada.
// ================================================================

import type {
  CountryOption,
  TenantOption,
  WarehouseOption,
  ClientOption,
  CascadeValidationResult,
} from '@/types/organization';

// ========== DEV WARNINGS (solo en development) ==========

const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

/**
 * Emite un warning si un tenant llega sin country_id.
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
 * Emite un warning si un warehouse llega sin tenant_id.
 */
export function warnWarehouseWithoutTenant(warehouse: { id: string; name: string; tenant_id?: string }): void {
  if (!isDev) return;
  if (!warehouse.tenant_id) {
    console.warn(
      '[Cascade] Warehouse without tenant_id — la cascada Tenant→Almacén romperá para este almacén:',
      { id: warehouse.id, name: warehouse.name },
    );
  }
}

/**
 * Emite un warning si un client llega sin tenant_id o sin warehouse_id.
 */
export function warnClientWithoutContext(client: { id: string; name: string; tenant_id?: string; warehouse_id?: string }): void {
  if (!isDev) return;
  if (!client.tenant_id) {
    console.warn(
      '[Cascade] Client without tenant_id — la cascada Almacén→Cliente romperá para este cliente:',
      { id: client.id, name: client.name },
    );
  }
  if (!client.warehouse_id) {
    console.warn(
      '[Cascade] Client without warehouse_id — la cascada Almacén→Cliente romperá para este cliente:',
      { id: client.id, name: client.name },
    );
  }
}

/**
 * Emite warnings de desarrollo sobre toda la data cargada.
 */
export function auditCascadeData(
  tenants: TenantOption[],
  warehouses: WarehouseOption[],
  clients: ClientOption[],
): void {
  if (!isDev) return;
  let tenantWarnings = 0;
  let warehouseWarnings = 0;
  let clientWarnings = 0;

  for (const t of tenants) {
    if (!t.country_id) {
      console.warn('[Cascade] Tenant without country_id', { id: t.id, name: t.name });
      tenantWarnings += 1;
    }
  }

  for (const w of warehouses) {
    if (!w.tenant_id) {
      console.warn('[Cascade] Warehouse without tenant_id', { id: w.id, name: w.name });
      warehouseWarnings += 1;
    }
  }

  for (const c of clients) {
    if (!c.tenant_id || !c.warehouse_id) {
      console.warn('[Cascade] Client without tenant_id/warehouse_id', { id: c.id, name: c.name });
      clientWarnings += 1;
    }
  }

  if (tenantWarnings > 0 || warehouseWarnings > 0 || clientWarnings > 0) {
    console.warn(
      `[Cascade] Data integrity issues: ${tenantWarnings} tenants, ${warehouseWarnings} warehouses, ${clientWarnings} clients. ` +
      'La cascada País→Tenant→Almacén→Cliente no funcionará correctamente.',
    );
  }
}

// ========== CASCADE FILTERS ==========

/**
 * Filtra tenants que pertenecen a un país específico.
 */
export function getTenantsByCountry(
  tenants: TenantOption[],
  countryId: string,
): TenantOption[] {
  if (!countryId) return [];
  return tenants.filter((t) => t.country_id === countryId);
}

/**
 * Filtra warehouses que pertenecen a un tenant específico.
 */
export function getWarehousesByTenant(
  warehouses: WarehouseOption[],
  tenantId: string,
): WarehouseOption[] {
  if (!tenantId) return [];
  return warehouses.filter((w) => w.tenant_id === tenantId);
}

/**
 * Filtra clients que pertenecen a un warehouse específico.
 */
export function getClientsByWarehouse(
  clients: ClientOption[],
  warehouseId: string,
): ClientOption[] {
  if (!warehouseId) return [];
  return clients.filter((c) => c.warehouse_id === warehouseId);
}

/**
 * Filtra clients que pertenecen a un tenant específico (vía warehouse).
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
 */
export function validateCountryTenant(
  countryId: string,
  tenantId: string,
  tenants: TenantOption[],
): boolean {
  if (!tenantId) return true;
  if (!countryId) return true;
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) return false;
  if (!tenant.country_id) return false;
  return tenant.country_id === countryId;
}

/**
 * Valida que un warehouse pertenezca a un tenant dado.
 */
export function validateTenantWarehouse(
  tenantId: string,
  warehouseId: string,
  warehouses: WarehouseOption[],
): boolean {
  if (!warehouseId) return true;
  if (!tenantId) return true;
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  if (!warehouse) return false;
  return warehouse.tenant_id === tenantId;
}

/**
 * Valida que un cliente pertenezca a un warehouse dado.
 */
export function validateWarehouseClient(
  warehouseId: string,
  clientId: string,
  clients: ClientOption[],
): boolean {
  if (!clientId) return true;
  if (!warehouseId) return true;
  const client = clients.find((c) => c.id === clientId);
  if (!client) return false;
  return client.warehouse_id === warehouseId;
}

// ========== FULL CASCADE VALIDATION ==========

export interface FullCascadeInput {
  /** ID del país principal (o vacío) */
  countryId: string;
  /** ID del tenant principal (o vacío) */
  tenantId: string;
  /** ID del almacén principal (o vacío) */
  warehouseId: string;
  /** ID del cliente principal (o vacío) */
  clientId: string;
  /** IDs de países adicionales en el alcance */
  scopeCountryIds: string[];
  /** IDs de tenants adicionales en el alcance */
  scopeTenantIds: string[];
  /** IDs de almacenes adicionales en el alcance */
  scopeWarehouseIds: string[];
  /** IDs de clientes adicionales en el alcance */
  scopeClientIds: string[];
  /** Si tiene acceso global a países */
  scopeAllCountries: boolean;
  /** Si tiene acceso global a tenants */
  scopeAllTenants: boolean;
  /** Si tiene acceso global a almacenes */
  scopeAllWarehouses: boolean;
  /** Si tiene acceso global a clientes */
  scopeAllClients: boolean;
  /** Lista completa de tenants (con country_id) */
  tenants: TenantOption[];
  /** Lista completa de warehouses (con tenant_id) */
  warehouses: WarehouseOption[];
  /** Lista completa de clients (con tenant_id y warehouse_id) */
  clients: ClientOption[];
}

/**
 * Valida TODA la cascada organizacional antes de guardar.
 *
 * Reglas:
 * 1. Cada tenant debe pertenecer a un país incluido en el alcance
 * 2. Cada warehouse debe pertenecer a un tenant incluido en el alcance
 * 3. Cada cliente debe pertenecer a un warehouse incluido en el alcance
 */
export function validateFullCascade(input: FullCascadeInput): CascadeValidationResult {
  const errors: string[] = [];

  const selectedCountryIds = new Set(
    [input.countryId, ...input.scopeCountryIds].filter(Boolean),
  );
  const selectedTenantIds = new Set(
    [input.tenantId, ...input.scopeTenantIds].filter(Boolean),
  );
  const selectedWarehouseIds = new Set(
    [input.warehouseId, ...input.scopeWarehouseIds].filter(Boolean),
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

  // Regla 2: Todo warehouse debe pertenecer a un tenant seleccionado
  if (!input.scopeAllWarehouses && !input.scopeAllTenants) {
    for (const wid of selectedWarehouseIds) {
      const warehouse = input.warehouses.find((w) => w.id === wid);
      if (!warehouse) {
        errors.push(`El almacén con ID ${wid} no existe en la base de datos.`);
        continue;
      }
      if (!warehouse.tenant_id) {
        errors.push(`El almacén "${warehouse.name}" no tiene tenant asignado. Contacta al administrador.`);
        continue;
      }
      if (!selectedTenantIds.has(warehouse.tenant_id)) {
        errors.push(
          `El almacén "${warehouse.name}" pertenece a un tenant no seleccionado. Agrega ese tenant a los alcances o elimina el almacén.`,
        );
      }
    }
  }

  // Regla 3: Todo cliente debe pertenecer a un warehouse seleccionado
  if (!input.scopeAllClients && !input.scopeAllWarehouses) {
    const allClientIds = [input.clientId, ...input.scopeClientIds].filter(Boolean);
    for (const clid of allClientIds) {
      const client = input.clients.find((c) => c.id === clid);
      if (!client) {
        errors.push(`El cliente con ID ${clid} no existe en la base de datos.`);
        continue;
      }
      if (!client.warehouse_id) {
        errors.push(`El cliente "${client.name}" no tiene almacén asignado. Contacta al administrador.`);
        continue;
      }
      if (!selectedWarehouseIds.has(client.warehouse_id)) {
        errors.push(
          `El cliente "${client.name}" pertenece a un almacén no seleccionado. Agrega ese almacén a los alcances o elimina el cliente.`,
        );
      }
    }
  }

  // Regla 4: El tenant principal debe pertenecer al país principal
  if (input.tenantId && input.countryId && !input.scopeAllCountries) {
    const tenant = input.tenants.find((t) => t.id === input.tenantId);
    if (tenant && tenant.country_id && tenant.country_id !== input.countryId) {
      errors.push(
        `El tenant principal "${tenant.name}" pertenece al país "${tenant.country_id}" pero el país principal es "${input.countryId}". La cascada País→Tenant no es válida.`,
      );
    }
  }

  // Regla 5: El warehouse principal debe pertenecer al tenant principal
  if (input.warehouseId && input.tenantId && !input.scopeAllTenants) {
    const warehouse = input.warehouses.find((w) => w.id === input.warehouseId);
    if (warehouse && warehouse.tenant_id !== input.tenantId) {
      errors.push(
        `El almacén principal "${warehouse.name}" pertenece al tenant "${warehouse.tenant_id}" pero el tenant principal es "${input.tenantId}". La cascada Tenant→Almacén no es válida.`,
      );
    }
  }

  // Regla 6: El cliente principal debe pertenecer al warehouse principal
  if (input.clientId && input.warehouseId && !input.scopeAllWarehouses) {
    const client = input.clients.find((c) => c.id === input.clientId);
    if (client && client.warehouse_id !== input.warehouseId) {
      errors.push(
        `El cliente principal "${client.name}" pertenece al almacén "${client.warehouse_id}" pero el almacén principal es "${input.warehouseId}". La cascada Almacén→Cliente no es válida.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errorMessage: errors.length > 0
      ? 'La relación País → Tenant → Almacén → Cliente no es válida.'
      : '',
    errors,
  };
}