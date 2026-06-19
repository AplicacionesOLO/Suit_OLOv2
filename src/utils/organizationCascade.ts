// ================================================================
// Helpers centrales de cascada organizacional Suite OLO
//
// Jerarquía: PAÍS ↔ TENANT → ALMACÉN → CLIENTE → USUARIO → APLICACIONES
//
// ⚠️  La relación País ↔ Tenant es N:M vía tenant_countries.
//     NO usar tenants.country_id ni countries.tenant_id como fuente.
//
// USO OBLIGATORIO: Toda la aplicación debe usar estas funciones
// en lugar de implementar filtros manuales de cascada.
// ================================================================

import type {
  CountryOption,
  TenantOption,
  WarehouseOption,
  ClientOption,
  TenantCountryRelation,
  CascadeValidationResult,
} from '@/types/organization';

// ========== CASCADE FILTERS (N:M via tenant_countries) ==========

/**
 * Devuelve los tenants asociados a un país vía tenant_countries.
 * NO usa tenants.country_id.
 */
export function getTenantsByCountry(
  countryId: string,
  tenantCountries: TenantCountryRelation[],
  tenants: TenantOption[],
): TenantOption[] {
  if (!countryId) return [];
  const tenantIds = new Set(
    tenantCountries
      .filter((tc) => tc.country_id === countryId)
      .map((tc) => tc.tenant_id),
  );
  return tenants.filter((t) => tenantIds.has(t.id));
}

/**
 * Devuelve los países asociados a un tenant vía tenant_countries.
 */
export function getCountriesByTenant(
  tenantId: string,
  tenantCountries: TenantCountryRelation[],
  countries: CountryOption[],
): CountryOption[] {
  if (!tenantId) return [];
  const countryIds = new Set(
    tenantCountries
      .filter((tc) => tc.tenant_id === tenantId)
      .map((tc) => tc.country_id),
  );
  return countries.filter((c) => countryIds.has(c.id));
}

/**
 * Cuenta cuántos tenants están asociados a un país vía tenant_countries.
 */
export function countTenantsByCountry(
  countryId: string,
  tenantCountries: TenantCountryRelation[],
): number {
  if (!countryId) return 0;
  return tenantCountries.filter((tc) => tc.country_id === countryId).length;
}

/**
 * Cuenta cuántos países están asociados a un tenant vía tenant_countries.
 */
export function countCountriesByTenant(
  tenantId: string,
  tenantCountries: TenantCountryRelation[],
): number {
  if (!tenantId) return 0;
  return tenantCountries.filter((tc) => tc.tenant_id === tenantId).length;
}

/**
 * Nombres de países asociados a un tenant vía tenant_countries.
 */
export function getCountryNamesByTenant(
  tenantId: string,
  tenantCountries: TenantCountryRelation[],
): string[] {
  if (!tenantId) return [];
  return tenantCountries
    .filter((tc) => tc.tenant_id === tenantId && tc.country_name)
    .map((tc) => tc.country_name!);
}

/**
 * Filtra warehouses que pertenecen a un país + tenant específicos.
 */
export function getWarehousesByCountryTenant(
  countryId: string,
  tenantId: string,
  warehouses: WarehouseOption[],
): WarehouseOption[] {
  if (!countryId || !tenantId) return [];
  return warehouses.filter(
    (w) => w.country_id === countryId && w.tenant_id === tenantId,
  );
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
 * Filtra clients por país + tenant + warehouse.
 */
export function getClientsByCountryTenantWarehouse(
  countryId: string,
  tenantId: string,
  warehouseId: string,
  clients: ClientOption[],
): ClientOption[] {
  if (!countryId || !tenantId || !warehouseId) return [];
  return clients.filter(
    (c) =>
      c.country_id === countryId &&
      c.tenant_id === tenantId &&
      c.warehouse_id === warehouseId,
  );
}

// ========== VALIDATION HELPERS (N:M via tenant_countries) ==========

/**
 * Valida que un tenant esté asociado a un país vía tenant_countries.
 */
export function validateCountryTenant(
  countryId: string,
  tenantId: string,
  tenantCountries: TenantCountryRelation[],
): boolean {
  if (!tenantId) return true; // sin tenant = nada que validar
  if (!countryId) return true;
  return tenantCountries.some(
    (tc) => tc.country_id === countryId && tc.tenant_id === tenantId,
  );
}

/**
 * Valida que un warehouse pertenezca al país + tenant dados.
 */
export function validateWarehouseBelongsToCountryTenant(
  warehouseId: string,
  countryId: string,
  tenantId: string,
  warehouses: WarehouseOption[],
): boolean {
  if (!warehouseId) return true;
  if (!countryId || !tenantId) return true;
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  if (!warehouse) return false;
  return warehouse.country_id === countryId && warehouse.tenant_id === tenantId;
}

/**
 * Valida que un cliente pertenezca al warehouse dado.
 */
export function validateClientBelongsToWarehouse(
  clientId: string,
  warehouseId: string,
  clients: ClientOption[],
): boolean {
  if (!clientId) return true;
  if (!warehouseId) return true;
  const client = clients.find((c) => c.id === clientId);
  if (!client) return false;
  return client.warehouse_id === warehouseId;
}

// ========== FULL CASCADE VALIDATION (N:M) ==========

export interface FullCascadeInput {
  countryId: string;
  tenantId: string;
  warehouseId: string;
  clientId: string;
  scopeCountryIds: string[];
  scopeTenantIds: string[];
  scopeWarehouseIds: string[];
  scopeClientIds: string[];
  scopeAllCountries: boolean;
  scopeAllTenants: boolean;
  scopeAllWarehouses: boolean;
  scopeAllClients: boolean;
  /** Relaciones N:M oficiales */
  tenantCountries: TenantCountryRelation[];
  tenants: TenantOption[];
  warehouses: WarehouseOption[];
  clients: ClientOption[];
}

/**
 * Valida TODA la cascada organizacional antes de guardar.
 *
 * Reglas:
 * 1. Cada tenant debe estar asociado a un país vía tenant_countries
 * 2. Cada warehouse debe pertenecer a su país + tenant
 * 3. Cada cliente debe pertenecer a su país + tenant + warehouse
 * 4. El tenant principal debe estar asociado al país principal
 * 5. El warehouse principal pertenece al país + tenant principal
 * 6. El cliente principal pertenece al warehouse principal
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

  // Regla 1: Todo tenant debe estar asociado a un país vía tenant_countries
  if (!input.scopeAllCountries && !input.scopeAllTenants) {
    for (const tid of selectedTenantIds) {
      const tenant = input.tenants.find((t) => t.id === tid);
      if (!tenant) {
        errors.push(`El tenant con ID ${tid} no existe.`);
        continue;
      }
      // Buscar si hay al menos un país en común vía tenant_countries
      const tenantCountries = input.tenantCountries.filter(
        (tc) => tc.tenant_id === tid,
      );
      const hasCommonCountry = tenantCountries.some((tc) =>
        selectedCountryIds.has(tc.country_id),
      );
      if (!hasCommonCountry) {
        errors.push(
          `El tenant "${tenant.name}" no está asociado a ningún país seleccionado. Agrega ese país a los alcances o elimina el tenant.`,
        );
      }
    }
  }

  // Regla 2: Todo warehouse debe pertenecer a su país + tenant
  if (!input.scopeAllWarehouses && !input.scopeAllTenants) {
    for (const wid of selectedWarehouseIds) {
      const warehouse = input.warehouses.find((w) => w.id === wid);
      if (!warehouse) {
        errors.push(`El almacén con ID ${wid} no existe.`);
        continue;
      }
      if (!warehouse.tenant_id || !warehouse.country_id) {
        errors.push(
          `El almacén "${warehouse.name}" no tiene país o tenant asignado.`,
        );
        continue;
      }
      if (!selectedTenantIds.has(warehouse.tenant_id)) {
        errors.push(
          `El almacén "${warehouse.name}" pertenece a un tenant no seleccionado.`,
        );
      }
      if (!selectedCountryIds.has(warehouse.country_id)) {
        errors.push(
          `El almacén "${warehouse.name}" pertenece a un país no seleccionado.`,
        );
      }
    }
  }

  // Regla 3: Todo cliente debe pertenecer a su warehouse
  if (!input.scopeAllClients && !input.scopeAllWarehouses) {
    const allClientIds = [input.clientId, ...input.scopeClientIds].filter(Boolean);
    for (const clid of allClientIds) {
      const client = input.clients.find((c) => c.id === clid);
      if (!client) {
        errors.push(`El cliente con ID ${clid} no existe.`);
        continue;
      }
      if (!client.warehouse_id) {
        errors.push(`El cliente "${client.name}" no tiene almacén asignado.`);
        continue;
      }
      if (!selectedWarehouseIds.has(client.warehouse_id)) {
        errors.push(
          `El cliente "${client.name}" pertenece a un almacén no seleccionado.`,
        );
      }
    }
  }

  // Regla 4: El tenant principal debe estar asociado al país principal vía tenant_countries
  if (input.tenantId && input.countryId && !input.scopeAllCountries) {
    const valid = validateCountryTenant(
      input.countryId,
      input.tenantId,
      input.tenantCountries,
    );
    if (!valid) {
      const tenant = input.tenants.find((t) => t.id === input.tenantId);
      errors.push(
        `El tenant principal "${tenant?.name || input.tenantId}" no está asociado al país principal. La cascada País→Tenant no es válida.`,
      );
    }
  }

  // Regla 5: El warehouse principal pertenece al país + tenant principal
  if (input.warehouseId && input.tenantId && input.countryId && !input.scopeAllTenants) {
    const warehouse = input.warehouses.find((w) => w.id === input.warehouseId);
    if (warehouse) {
      if (warehouse.tenant_id !== input.tenantId) {
        errors.push(
          `El almacén principal "${warehouse.name}" no pertenece al tenant principal.`,
        );
      }
      if (warehouse.country_id !== input.countryId) {
        errors.push(
          `El almacén principal "${warehouse.name}" no pertenece al país principal.`,
        );
      }
    }
  }

  // Regla 6: El cliente principal pertenece al warehouse principal
  if (input.clientId && input.warehouseId && !input.scopeAllWarehouses) {
    const client = input.clients.find((c) => c.id === input.clientId);
    if (client && client.warehouse_id !== input.warehouseId) {
      errors.push(
        `El cliente principal "${client.name}" no pertenece al almacén principal.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errorMessage:
      errors.length > 0
        ? 'La relación País → Tenant → Almacén → Cliente no es válida.'
        : '',
    errors,
  };
}

// ========== DEV WARNINGS (solo en development) ==========

const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

/**
 * Audita la integridad de cascada en desarrollo.
 */
export function auditCascadeData(
  tenants: { id: string; name: string; country_id?: string | null }[],
  warehouses: { id: string; name: string; tenant_id?: string }[],
  clients: { id: string; name: string; tenant_id?: string; warehouse_id?: string }[],
): void {
  if (!isDev) return;
  let tenantWarnings = 0;
  let warehouseWarnings = 0;
  let clientWarnings = 0;

  for (const t of tenants) {
    if (!t.country_id) {
      console.warn('[Cascade] Tenant without country_id (deprecated field)', { id: t.id, name: t.name });
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