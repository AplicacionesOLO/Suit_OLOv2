// ================================================================
// Tipos compartidos para la cascada organizacional Suite OLO
//
// Jerarquía: PAÍS ↔ TENANT → ALMACÉN → CLIENTE → USUARIO → APLICACIONES
//
// SINGLE SOURCE OF TRUTH: Este archivo define los tipos canónicos
// que toda la aplicación debe usar para la jerarquía organizacional.
//
// ⚠️  La relación País ↔ Tenant es N:M vía tenant_countries.
//     NO usar tenants.country_id ni countries.tenant_id como fuente.
// ================================================================

export interface CountryOption {
  /** UUID de la tabla countries */
  id: string;
  /** Nombre del país (ej: "Costa Rica") */
  name: string;
  /** Código ISO Alpha-2 (ej: "CR") */
  code?: string;
}

export interface TenantOption {
  /** UUID de la tabla tenants */
  id: string;
  /** Nombre del tenant (ej: "OLO") */
  name: string;
  /** Código del tenant (ej: "OLO") */
  code?: string;
  /**
   * @deprecated La relación País ↔ Tenant ahora es N:M vía tenant_countries.
   * Usar TenantCountryRelation en su lugar. Este campo se mantiene solo por
   * compatibilidad con código legacy.
   */
  country_id?: string | null;
}

/**
 * Relación N:M entre Tenant y País.
 * Fuente oficial: tabla tenant_countries.
 */
export interface TenantCountryRelation {
  /** UUID de tenant_countries */
  id: string;
  /** UUID del tenant */
  tenant_id: string;
  /** UUID del país */
  country_id: string;
  /** Nombre del tenant (join) */
  tenant_name?: string;
  /** Nombre del país (join) */
  country_name?: string;
}

export interface WarehouseOption {
  /** UUID de la tabla warehouses */
  id: string;
  /** Nombre del almacén (ej: "Almacén OLO") */
  name: string;
  /** Código del almacén */
  code?: string;
  /** UUID del tenant al que pertenece este almacén. Campo OBLIGATORIO para la cascada. */
  tenant_id: string;
  /** UUID del país al que pertenece este almacén */
  country_id: string;
}

export interface ClientOption {
  /** UUID de la tabla clients */
  id: string;
  /** Nombre del cliente (ej: "COFERSA") */
  name: string;
  /** Código del cliente */
  code?: string;
  /** UUID del país al que pertenece este cliente */
  country_id: string;
  /** UUID del tenant al que pertenece este cliente. Campo OBLIGATORIO para la cascada. */
  tenant_id: string;
  /** UUID del warehouse al que pertenece este cliente. Campo OBLIGATORIO para la cascada. */
  warehouse_id: string;
}

/**
 * Contexto jerárquico de un usuario.
 * Representa los valores por defecto (sin override).
 */
export interface UserContext {
  /** UUID del país por defecto */
  country_id: string | null;
  /** UUID del tenant por defecto */
  tenant_id: string | null;
  /** UUID del almacén por defecto */
  warehouse_id: string | null;
  /** UUID del cliente por defecto */
  client_id: string | null;
}

/**
 * Resultado de una validación de cascada.
 */
export interface CascadeValidationResult {
  /** true si toda la cascada es consistente */
  valid: boolean;
  /** Mensaje de error si valid === false */
  errorMessage: string;
  /** Detalles de cada nivel validado */
  errors: string[];
}