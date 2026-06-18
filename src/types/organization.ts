// ================================================================
// Tipos compartidos para la cascada organizacional Suite OLO
//
// Jerarquía: PAÍS → TENANT → CLIENTE → USUARIO → APLICACIONES
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
  /** Nombre del tenant (ej: "OLO CR") */
  name: string;
  /** UUID del país al que pertenece este tenant. Campo OBLIGATORIO para la cascada. */
  country_id: string | null;
}

export interface ClientOption {
  /** UUID de la tabla clients */
  id: string;
  /** Nombre del cliente (ej: "Walmart") */
  name: string;
  /** UUID del tenant al que pertenece este cliente. Campo OBLIGATORIO para la cascada. */
  tenant_id: string;
  /** UUID del warehouse asociado (opcional) */
  warehouse_id?: string;
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