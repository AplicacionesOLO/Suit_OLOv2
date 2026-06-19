// ================================================================
// Tipos compartidos para la cascada organizacional Suite OLO
//
// Jerarquía: PAÍS → TENANT → ALMACÉN → CLIENTE → USUARIO → APLICACIONES
//
// SINGLE SOURCE OF TRUTH: Este archivo define los tipos canónicos
// que toda la aplicación debe usar para la jerarquía organizacional.
// ================================================================

export interface CountryOption {
  /** UUID de la tabla countries */
  id: string;
  /** Nombre del país (ej: "Costa Rica") */
  name: string;
}

export interface TenantOption {
  /** UUID de la tabla tenants */
  id: string;
  /** Nombre del tenant (ej: "OLO") */
  name: string;
  /** UUID del país al que pertenece este tenant. Campo OBLIGATORIO para la cascada. */
  country_id: string | null;
}

export interface WarehouseOption {
  /** UUID de la tabla warehouses */
  id: string;
  /** Nombre del almacén (ej: "Almacén OLO") */
  name: string;
  /** UUID del tenant al que pertenece este almacén. Campo OBLIGATORIO para la cascada. */
  tenant_id: string;
  /** UUID del país al que pertenece este almacén (vía tenant) */
  country_id?: string;
}

export interface ClientOption {
  /** UUID de la tabla clients */
  id: string;
  /** Nombre del cliente (ej: "COFERSA") */
  name: string;
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