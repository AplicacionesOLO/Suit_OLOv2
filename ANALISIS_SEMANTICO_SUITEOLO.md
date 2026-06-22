# ANÁLISIS SEMÁNTICO COMPLETO — SUITE OLO

> **Fecha:** 2026-06-22
> **Versión:** Arquitectura Cerrada v1.0
> **Propósito:** Documentación exhaustiva de la estructura semántica, jerarquía organizacional, flujo de datos, y modelo de seguridad del sistema SUITEOLO.

---

## 1. VISIÓN GENERAL DEL SISTEMA

**Suite OLO** es un Enterprise Application Hub — plataforma centralizada de acceso, gobierno, seguridad y publicación de aplicaciones corporativas. Opera bajo modelo **Zero Trust** con SSO federado (Google OAuth), JWT, y control de acceso granular multi-tenant.

### 1.1 Propósito de Negocio

Una corporación multinacional (OLO) necesita que sus empleados accedan a aplicaciones empresariales desde un único punto. Cada empleado pertenece a una estructura organizacional y solo debe ver las aplicaciones que le corresponden según su país, tenant, almacén, cliente y rol.

### 1.2 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + TailwindCSS |
| Router | React Router DOM v6 |
| Backend | Supabase (Auth, Database, RLS, Edge Functions, RPC) |
| Estilos | StyleSystem dinámico (OKLCH) — 5 roles: background, accent, primary, secondary, foreground |
| Iconos | Remix Icon + FontAwesome (CDN) |
| Estado global | React Context (useTenantContext) |
| Persistencia | localStorage (solo persistencia, NUNCA fuente de verdad) |

---

## 2. JERARQUÍA ORGANIZACIONAL — EL CORAZÓN DEL SISTEMA

### 2.1 El Modelo Canónico

```
                    ┌──────────────────────────────┐
                    │         PAÍS (countries)       │  RAÍZ ORGANIZACIONAL
                    │  id, name, code, iso_code,     │
                    │  tenant_id, status, currency,  │
                    │  timezone, flag_url, continent │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │   tenant_countries (N:M)       │  TABLA PUENTE OFICIAL
                    │  id, tenant_id, country_id     │  ⚠️ ÚNICA fuente de verdad
                    └──────────┬───────────────────┘  para País↔Tenant
                               │
                    ┌──────────▼───────────────────┐
                    │       TENANT (tenants)         │
                    │  id, name, code, domain,       │
                    │  country_id, status, settings  │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │     ALMACÉN (warehouses)       │
                    │  id, name, code, address,      │
                    │  country_id, tenant_id, status │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │      CLIENTE (clients)         │
                    │  id, name, code,               │
                    │  tenant_id, warehouse_id,      │
                    │  country_id, status            │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │   USUARIO (platform_users)     │
                    │  id, auth_user_id, role_id,    │
                    │  tenant_id, country_id,        │
                    │  warehouse_id, client_id,      │
                    │  *_context_override (4),       │
                    │  scope_all_* (4)               │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │  APLICACIÓN (applications)     │
                    │  id, name, code, tenant_id,    │
                    │  client_id, category_id,       │
                    │  status, integration_type      │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │  INSTANCIA (app_instances)     │
                    │  id, tenant_id, app_id,        │
                    │  client_id, url, sso_enabled   │
                    └──────────────────────────────┘
```

### 2.2 ⚠️ REGLA DE ORO: tenant_countries es la ÚNICA fuente de verdad para País↔Tenant

**NUNCA uses `tenants.country_id` ni `countries.tenant_id` para determinar la relación País↔Tenant.**

La tabla `tenant_countries` es la relación N:M oficial:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK → tenants.id |
| `country_id` | uuid | FK → countries.id |
| `created_at` | timestamptz | Fecha de creación |

**Datos reales actuales:**

| Tenant | País vía tenant_countries | tenants.country_id |
|--------|--------------------------|-------------------|
| OLO | Costa Rica ✅ | Costa Rica |
| OLO | Venezuela ✅ | Costa Rica |
| EPA | Costa Rica ✅ | Costa Rica |

- **OLO** está en 2 países (Costa Rica + Venezuela)
- **EPA** está en 1 país (Costa Rica)
- `tenants.country_id` es solo un campo auxiliar/deprecado

### 2.3 Campos CRÍTICOS en Cada Entidad

#### 2.3.1 countries (País)

```
id            UUID PK
tenant_id     UUID FK → tenants  (⚠️ deprecado, usar tenant_countries)
name          TEXT               (ej: "Costa Rica")
code          TEXT               (ej: "CR")
iso_code      TEXT               (ej: "CRI")
status        TEXT               (active/inactive)
currency      TEXT               (ej: "CRC")
currency_name TEXT               (ej: "Colón costarricense")
timezone      TEXT               (ej: "America/Costa_Rica")
continent     TEXT               (ej: "América")
flag_url      TEXT
language      TEXT
phone_prefix  TEXT
```

#### 2.3.2 tenants (Tenant)

```
id        UUID PK
name      TEXT               (ej: "OLO", "EPA")
code      TEXT               (ej: "CR", "EPA")
domain    TEXT               (ej: "ologistics.com")
country_id UUID FK → countries (⚠️ deprecado para relación N:M)
status    TEXT               (active/inactive)
settings  JSONB
```

#### 2.3.3 warehouses (Almacén)

```
id          UUID PK
tenant_id   UUID FK → tenants   ← OBLIGATORIO para cascada
country_id  UUID FK → countries ← OBLIGATORIO para cascada
name        TEXT                (ej: "Bodega Cartago")
code        TEXT
address     TEXT
status      TEXT                (active/inactive)
```

#### 2.3.4 clients (Cliente)

```
id           UUID PK
tenant_id    UUID FK → tenants     ← OBLIGATORIO para cascada
warehouse_id UUID FK → warehouses  ← OBLIGATORIO para cascada
country_id   UUID FK → countries
name         TEXT                  (ej: "COFERSA", "EPA")
code         TEXT
contact_email TEXT
status       TEXT                  (active/inactive)
```

#### 2.3.5 platform_users (Usuario)

```
id                       UUID PK
auth_user_id             UUID FK → auth.users
tenant_id                UUID FK → tenants
country_id               UUID FK → countries
warehouse_id             UUID FK → warehouses
client_id                UUID FK → clients
role_id                  UUID FK → roles

─── OVERRIDE DE CONTEXTO (4 campos) ───
tenant_context_override    UUID   ← Cambio explícito de tenant via Topbar
country_context_override   UUID   ← Cambio explícito de país via Topbar
warehouse_context_override UUID   ← Cambio explícito de almacén via Topbar
client_context_override    UUID   ← Cambio explícito de cliente via Topbar

─── ALCANCE GLOBAL (4 flags boolean) ───
scope_all_tenants       BOOLEAN  ← Ve TODOS los tenants
scope_all_countries     BOOLEAN  ← Ve TODOS los países
scope_all_warehouses    BOOLEAN  ← Ve TODOS los almacenes
scope_all_clients       BOOLEAN  ← Ve TODOS los clientes
```

### 2.4 Tablas Puente de Alcance Multi (N:M Usuario↔Entidad)

| Tabla | Columnas | Propósito |
|-------|----------|-----------|
| `user_tenants` | user_id, tenant_id | Usuario puede acceder a MÚLTIPLES tenants |
| `user_countries` | user_id, country_id | Usuario puede acceder a MÚLTIPLES países |
| `user_warehouses` | user_id, warehouse_id | Usuario puede acceder a MÚLTIPLES almacenes |
| `user_clients` | user_id, client_id | Usuario puede acceder a MÚLTIPLES clientes |

---

## 3. SISTEMA DE ROLES JERÁRQUICOS

### 3.1 Niveles de Rol

| Rol | Código | Nivel | Alcance |
|-----|--------|-------|---------|
| Super Admin | SUPER_ADMIN | 100 | Toda la organización (todos los tenants, países, todo) |
| Tenant Admin | TENANT_ADMIN | 80 | Solo su tenant y todo lo que cuelga de él |
| Supervisor Logístico | SUPER_LOG | 60 | Su país dentro de su tenant |
| Auditor Seguridad | AUDIT_SEC | 55 | Solo lectura de auditoría |
| Administrador Operativo | ADMIN_OP | 50 | Operaciones dentro de su alcance |
| Analista Comercial | ANALYST_COMM | 40 | Su almacén asignado |
| Usuario Básico | BASIC_USER | 10 | Solo sus aplicaciones asignadas |

### 3.2 Jerarquía de Acceso por Nivel

```
Super Admin (100)
  │
  ├── TODOS los tenants
  ├── TODOS los países
  ├── TODOS los almacenes
  ├── TODOS los clientes
  └── TODAS las aplicaciones
      │
      └── Tenant Admin (80)
            │
            ├── SOLO su tenant
            ├── Países de su tenant (vía tenant_countries)
            ├── Almacenes de su tenant
            ├── Clientes de su tenant
            └── Aplicaciones de su tenant
                │
                └── Country Admin / Supervisor (60)
                      │
                      ├── SOLO su país
                      ├── Almacenes de su país
                      └── Clientes de su país
                          │
                          └── Warehouse Admin (40)
                                │
                                ├── SOLO su almacén
                                └── Clientes de su almacén
                                    │
                                    └── Client Admin (30)
                                          │
                                          └── SOLO su cliente
                                              │
                                              └── Usuario (10)
                                                    │
                                                    └── Apps asignadas vía user_application_access
```

---

## 4. EL SISTEMA DE CONTEXTO — useTenantContext

### 4.1 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                     TenantContextProvider                        │
│  (envuelve toda la app en App.tsx)                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Estado React (ctx: UserContextFull)                      │   │
│  │                                                           │   │
│  │  currentCountryId     ← country_context_override          │   │
│  │  currentCountryName   ←   || country_id                   │   │
│  │  currentTenantId      ← tenant_context_override           │   │
│  │  currentTenantName    ←   || tenant_id                    │   │
│  │  currentWarehouseId   ← warehouse_context_override        │   │
│  │  currentWarehouseName ←   || warehouse_id                 │   │
│  │  currentClientId      ← client_context_override           │   │
│  │  currentClientName    ←   || client_id                    │   │
│  │                                                           │   │
│  │  showAll  ← Modo Auditoría (Super Admin)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Listas Accesibles (scope del usuario)                    │   │
│  │                                                           │   │
│  │  accessibleCountries    ← get_accessible_countries() RPC  │   │
│  │  accessibleTenants      ← get_accessible_tenants() RPC    │   │
│  │  accessibleWarehouses   ← supabase.from('warehouses')    │   │
│  │  accessibleClients      ← supabase.from('clients')       │   │
│  │  tenantCountriesMap     ← load_tenant_countries_map()    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Acciones de Contexto (mutan DB + refrescan React)        │   │
│  │                                                           │   │
│  │  switchCountry(id)     → setCountryContextOverride()      │   │
│  │  switchTenant(id)      → setTenantContextOverride()       │   │
│  │  switchWarehouse(id)   → set_warehouse_context() RPC      │   │
│  │  switchClient(id)      → set_client_context() RPC         │   │
│  │  clearCountry()        → clearCountryContextOverride()    │   │
│  │  clearTenant()         → clearTenantContextOverride()     │   │
│  │  clearWarehouse()      → clear_warehouse_context() RPC    │   │
│  │  clearClient()         → clear_client_context() RPC       │   │
│  │  clearFullContext()    → TODOS los clear + reset showAll  │   │
│  │  toggleShowAll()       → Modo Operativo ↔ Auditoría       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│                    localStorage (SOLO PERSISTENCIA)                │
│                    NO es fuente de verdad NUNCA                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Prioridad de Resolución de Contexto

```
Para CADA nivel (country, tenant, warehouse, client):

1. *_context_override   ← Si existe, se usa (cambio explícito via Topbar)
2. *_id                 ← Valor por defecto del usuario
3. null                 ← Sin contexto en este nivel
```

### 4.3 Flujo de Cambio de Contexto (EJ: cambiar de EPA a COFERSA)

```
PASO 1: Usuario selecciona "COFERSA" en el dropdown Cliente del Topbar
        ↓
PASO 2: ctx.switchClient('cofersa-id')
        │
        ├── 2a. Valida que COFERSA pertenece al tenant/warehouse actual
        ├── 2b. Ejecuta RPC: set_client_context('cofersa-id')
        │       → DB: platform_users.client_context_override = 'cofersa-id'
        ├── 2c. Guarda en localStorage (solo persistencia)
        ├── 2d. Registra en audit_logs: CLIENT_CONTEXT_SWITCHED
        ├── 2e. Limpia caché: clearUserContextCache()
        └── 2f. Re-fetch: getUserContextFull()
                │
                ▼
PASO 3: setCtx(refreshed) → React Context se actualiza
        │
        ├── currentClientId = 'cofersa-id'
        └── currentClientName = 'COFERSA'
                │
                ▼
PASO 4: TODAS las páginas que consumen useTenantContext() re-renderizan
        │
        ├── Dashboard: loadData() se re-ejecuta (deps: currentClientId)
        ├── Applications: loadData() se re-ejecuta (deps: currentClientId)
        ├── Instances: loadData() se re-ejecuta (deps: currentClientId)
        ├── My Access: useEffect se re-ejecuta (deps: currentClientId)
        ├── Users: load() se re-ejecuta (deps: currentTenantId)
        ├── Clients: load() se re-ejecuta (deps: currentTenantId)
        └── Assignments: loadData() se re-ejecuta (deps)
                │
                ▼
PASO 5: UI actualizada — SIN F5, SIN reload, SIN navegar
```

### 4.4 Validación en Cascada al Cambiar Contexto

```
switchCountry(countryId)
  ├── Valida: siempre OK (es la raíz)
  ├── Efecto cascada: limpia tenant, warehouse, client downstream
  └── Auditoría: COUNTRY_CONTEXT_SWITCHED

switchTenant(tenantId)
  ├── Valida: tenant ∈ tenantCountriesMap.get(countryId)
  │           (solo si NO es super admin y NO es scope_all)
  ├── Efecto cascada: limpia warehouse, client downstream
  └── Auditoría: TENANT_CONTEXT_SWITCHED

switchWarehouse(warehouseId)
  ├── Valida: warehouse.country_id = currentCountryId
  │           warehouse.tenant_id = currentTenantId
  │           (solo si NO es super admin)
  ├── Efecto cascada: limpia client downstream
  └── Auditoría: WAREHOUSE_CONTEXT_SWITCHED

switchClient(clientId)
  ├── Valida: client.tenant_id = currentTenantId
  │           client.warehouse_id = currentWarehouseId
  │           (solo si NO es super admin)
  └── Auditoría: CLIENT_CONTEXT_SWITCHED
```

---

## 5. MODOS DE OPERACIÓN DEL TOPBAR

### 5.1 Modo Operativo (por defecto)

- Contexto visible: "Costa Rica / OLO / OLO / EPA"
- Los dropdowns muestran SOLO lo accesible según el contexto actual
- Las páginas filtran por el contexto seleccionado
- El switch de Modo Auditoría está OFF

### 5.2 Modo Auditoría (Super Admin, showAll = true)

- Activado por Super Admin con el toggle en el panel de contexto
- Indicador visual: círculo ámbar parpadeante + "Modo Auditoría"
- **Las tablas muestran TODOS los registros** (sin filtrar por contexto)
- **Los formularios SIGUEN usando el contexto operativo**
- El contexto en el Topbar muestra: "Contexto de trabajo: Costa Rica / OLO / EPA"
- Mensaje: "Viendo todos los registros. El contexto solo aplica en formularios."

### 5.3 Usuarios con Una Sola Ruta

Si un usuario tiene 1 país, 1 tenant, 1 almacén, 1 cliente → no se muestran dropdowns innecesarios. El Topbar muestra directamente "Costa Rica / OLO / EPA" como texto plano.

---

## 6. SEGURIDAD — ROW LEVEL SECURITY (RLS)

### 6.1 Funciones RLS Clave

| Función | Retorna | Lógica |
|---------|---------|--------|
| `get_user_tenant_id()` | uuid | `tenant_context_override \|\| user_tenants[0] \|\| platform_users.tenant_id` |
| `get_user_country_id()` | uuid | `country_context_override \|\| user_countries[0] \|\| platform_users.country_id` |
| `get_user_role_level()` | int | Nivel del role_id del usuario (100=SA, 80=TA, etc.) |
| `is_super_admin()` | boolean | `get_user_role_level() >= 100` |
| `can_access_country(id)` | boolean | `scope_all_countries \|\| scope_all_tenants \|\| user_countries bridge \|\| tenant→country via tenant_countries` |
| `can_access_warehouse(id)` | boolean | `scope_all_warehouses \|\| scope_all_tenants \|\| user_warehouses bridge \|\| herencia tenant→country→warehouse` |
| `can_access_client(id)` | boolean | `scope_all_clients \|\| scope_all_tenants \|\| user_clients bridge \|\| herencia tenant→country→warehouse→client` |
| `get_accessible_tenants()` | SETOF record | Super Admin: todos. Resto: user_tenants bridge. |
| `get_accessible_tenant_ids()` | UUID[] | Array de todos los tenant IDs del usuario |
| `load_tenant_countries_map()` | SETOF record | SECURITY DEFINER — TODAS las relaciones tenant↔país sin RLS |

### 6.2 Políticas RLS por Tabla (Resumen)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **tenants** | SA ve todo, user ve suyo | N/A | Solo SA | N/A |
| **countries** | `can_access_country(id)` | Solo admin | SA o TA o Country Admin | N/A (soft delete) |
| **warehouses** | `can_access_warehouse(id)` | Solo admin | SA o TA o Country/Warehouse Admin | N/A (soft delete) |
| **clients** | `can_access_client(id)` | Solo admin | SA o TA o Country/Warehouse/Client Admin | N/A (soft delete) |
| **tenant_countries** | SA o `tenant_id = get_user_tenant_id()` o `can_access_country(country_id)` | Admin | SA o TA | SA o TA |
| **platform_users** | SA o `tenant_id = get_user_tenant_id()` o self | Admin | SA o TA (`can_manage_user`) | N/A (soft delete) |
| **applications** | SA o `tenant_id = get_user_tenant_id()` o `can_access_client(client_id)` | Admin | SA o TA | N/A (soft delete) |
| **app_instances** | SA o `tenant_id = get_user_tenant_id()` o `can_access_client(client_id)` | Admin | SA o TA | N/A (soft delete) |
| **user_tenants** | Self o SA | Via trigger | Via trigger | Via trigger |
| **user_countries** | Self o SA | Via trigger | Via trigger | Via trigger |
| **user_warehouses** | Self o SA | Via trigger | Via trigger | Via trigger |
| **user_clients** | Self o SA | Via trigger | Via trigger | Via trigger |

### 6.3 Hardening RLS V3.1 (Estado Actual)

- **25 tests críticos** con RAISE EXCEPTION → ROLLBACK en caso de fallo
- **CERO políticas `*_soft_delete` FOR UPDATE** (bypass eliminado)
- **`soft_delete_record()` es SECURITY DEFINER OWNER=postgres**
- **`write_audit_log_strict()`** para operaciones críticas (soft delete, revoke)
- **TODAS las funciones de auditoría con tenant real** (no confiar en input del frontend)

---

## 7. TOPBAR — EL SELECTOR DE CONTEXTO GLOBAL

### 7.1 Ubicación y Comportamiento

```
┌────────────────────────────────────────────────────────────────────┐
│  [Sidebar] │  TOPBAR (fixed, h-[60px], backdrop-blur)              │
│            │                                                       │
│            │    [Contexto: CR / OLO / EPA ▾] [🔍] [🔔3] [👤▾]    │
│            │                                                       │
│            ├───────────────────────────────────────────────────────┤
│            │                                                       │
│            │  CONTENIDO DE LA PÁGINA                               │
│            │                                                       │
└────────────┴───────────────────────────────────────────────────────┘
```

### 7.2 Panel de Contexto (Dropdown)

Al hacer clic en el botón de contexto, se despliega:

```
┌────────────────────────────────────┐
│ Modo Operativo                     │
│ Costa Rica / OLO / EPA            │
├────────────────────────────────────┤
│ 🌍 País          [Costa Rica ▾]   │
│ 🏢 Tenant        [OLO ▾]          │
│ 🏬 Almacén       [OLO ▾]          │
│ 🏭 Cliente       [EPA ▾]          │
├────────────────────────────────────┤
│ ☑ Modo Auditoría                   │  ← Solo Super Admin
│ Viendo todos los registros...      │
├────────────────────────────────────┤
│ [↩ Volver a modo operativo]        │
└────────────────────────────────────┘
```

### 7.3 Lógica de Filtrado de Opciones en Cascada

```
countryOptions = accessibleCountries (todos)

tenantOptions = SI currentCountryId:
    tenantCountriesMap.get(currentCountryId)
    → filtrar accessibleTenants por esos IDs
    SI NO:
    → todos los accessibleTenants

warehouseOptions = accessibleWarehouses
    → filtrar por currentCountryId
    → filtrar por currentTenantId

clientOptions = accessibleClients
    → filtrar por currentTenantId
    → filtrar por currentWarehouseId
```

---

## 8. PÁGINAS Y SU REACTIVIDAD AL CONTEXTO

### 8.1 Matriz de Reactividad

| Página | Ruta | ¿Reacciona al cambiar contexto? | Mecanismo | Estado |
|--------|------|--------------------------------|-----------|--------|
| Dashboard | `/dashboard` | ✅ | `loadData` deps: `[currentTenantId, currentCountryId, ...]` | CORRECTO |
| Mis Accesos | `/my-access` | ✅ | `useEffect` deps: `[currentTenantId, currentCountryId, currentWarehouseId, currentClientId, showAll]` + `contextFiltered` IIFE | CORRECTO |
| Aplicaciones | `/applications` | ✅ | `loadData` deps + `visibleApps` useMemo | CORRECTO |
| Instancias | `/instances` | ✅ | `loadData` deps + `filtered` useMemo | CORRECTO |
| Usuarios | `/users` | ✅ | `useUsers().load` deps: `[currentCountryId, currentTenantId, currentWarehouseId, currentClientId, showAll]` | CORRECTO |
| Clientes | `/clients` | ✅ | `useClients().load` deps: contexto | CORRECTO |
| Asignaciones | `/assignments` | ✅ | `loadData` deps | CORRECTO |
| Países | `/countries` | ✅ | `useCountries` con deps de contexto | CORRECTO |
| Almacenes | `/warehouses` | ✅ | `useWarehouses` con deps de contexto | CORRECTO |
| Tenants | `/tenants` | ✅ | `useTenants` con deps de contexto | CORRECTO |

### 8.2 Patrón de Consumo de Contexto (ejemplo canónico)

```typescript
// En CADA página que consume contexto:
function MyPage() {
  const ctx = useTenantContext();

  const loadData = useCallback(async () => {
    // fetch datos desde Supabase
    // usando ctx.currentTenantId, ctx.currentCountryId, etc.
  }, [ctx.currentTenantId, ctx.currentCountryId,
      ctx.currentWarehouseId, ctx.currentClientId, ctx.showAll]);

  useEffect(() => {
    loadData();
  }, [loadData]);  // ← loadData CAMBIA cuando el contexto cambia
                    // → useEffect se re-ejecuta automáticamente
}
```

---

## 9. FLUJO DE DATOS COMPLETO

### 9.1 Autenticación → Contexto → Páginas

```
1. LOGIN (Google OAuth o email/password)
   ↓
2. Supabase Auth → auth.users
   ↓
3. Trigger: handle_new_auth_user()
   → Crea platform_users (status='pending' si es nuevo)
   → Popula user_tenants, user_countries, user_warehouses, user_clients
   ↓
4. AuthGuard verifica sesión
   ↓
5. TenantContextProvider.loadContext()
   → getUserContextFull()
     → Lee platform_users (con overrides)
     → Resuelve nombres (tenants, countries, warehouses, clients)
     → Calcula role_level, is_super_admin, scope_all_*
   → loadAccessibleLists()
     → get_accessible_countries() RPC
     → get_accessible_tenants() RPC
     → load_tenant_countries_map() RPC
     → warehouses (filtrado por tenant)
     → clients (filtrado por tenant)
   ↓
6. React Context disponible para TODA la app
   ↓
7. Topbar muestra contexto actual + dropdowns
   ↓
8. Páginas consumen ctx y cargan datos filtrados
```

### 9.2 Cambio de Contexto → Re-fetch

```
Topbar: usuario selecciona nuevo tenant
   ↓
switchTenant(id)
   ├── RPC: set_tenant_context(id) → DB actualizada
   ├── localStorage: guarda tenantId
   ├── Audit: TENANT_CONTEXT_SWITCHED
   └── clearUserContextCache() + getUserContextFull()
       ↓
setCtx(refreshed) → React Context nuevo
   ↓
TODAS las páginas:
   ├── useMemo/useEffect detectan cambio en ctx.*
   ├── Re-fetch datos con nuevo contexto
   └── UI actualizada SIN F5
```

---

## 10. SERVICIOS Y HOOKS DEL SISTEMA

### 10.1 Servicios (Capa de Datos)

| Archivo | Responsabilidad |
|---------|----------------|
| `src/services/auth/contextService.ts` | `getUserContextFull()` — resuelve el contexto completo del usuario desde platform_users + joins |
| `src/services/auth/usersService.ts` | CRUD de platform_users, invitaciones, overrides de contexto |
| `src/services/auth/authService.ts` | Login, logout, Google OAuth, recuperación de contraseña |
| `src/services/operations/countriesService.ts` | CRUD de países |
| `src/services/operations/tenantsService.ts` | CRUD de tenants |
| `src/services/operations/warehousesService.ts` | CRUD de almacenes |
| `src/services/operations/clientsService.ts` | CRUD de clientes |
| `src/services/applications/applicationsService.ts` | CRUD de aplicaciones e instancias |
| `src/services/security/accessService.ts` | `fetchMyAccesses()` — accesos del usuario a aplicaciones |
| `src/services/security/auditService.ts` | Logs de auditoría |
| `src/services/security/permissionsService.ts` | Matriz de permisos |
| `src/services/security/rolesService.ts` | CRUD de roles |
| `src/services/supabase/client.ts` | Cliente Supabase singleton |

### 10.2 Hooks (Capa de Estado)

| Hook | Retorna | Usado por |
|------|---------|-----------|
| `useTenantContext()` | Contexto organizacional completo + acciones | TODAS las páginas |
| `useAuth()` | user, platformUser, login, logout, loading | AuthGuard, Topbar, Sidebar |
| `useUsers()` | filteredUsers, load, loading, create, update, delete | /users |
| `useClients()` | filtered, load, loading, create, update, remove | /clients |
| `useCountries()` | countries, load, loading, create, update | /countries |
| `useWarehouses()` | warehouses, load, loading, create, update | /warehouses |
| `useTenants()` | tenants, load, loading | /tenants |
| `useApplicationAccess()` | myAccesses, loadMyAccesses, loading | /my-access |
| `useRoles()` | roles, load, loading | /roles |
| `useSuitePermissions()` | hasMenuAccess, can | Sidebar, RouteGuard |
| `useTheme()` | theme, setTheme | Topbar |

---

## 11. REGLAS DE NEGOCIO FIRMES (v1.0)

| # | Regla | Definición |
|---|-------|-----------|
| 1 | **tenant_countries es la única fuente de verdad** | La relación País↔Tenant SIEMPRE se consulta vía `tenant_countries`. `tenants.country_id` y `countries.tenant_id` están deprecados. |
| 2 | **Aplicación → Un solo Cliente** | Una app pertenece a un solo cliente. Si otro cliente necesita la misma app, se crea una nueva relación. |
| 3 | **Instancia → Un solo Cliente** | Una instancia pertenece a un solo cliente. Misma regla que aplicación. |
| 4 | **País → N Tenants (N:M)** | Un país puede tener múltiples tenants. Un tenant puede estar en múltiples países. |
| 5 | **React Context es la ÚNICA fuente de verdad** | localStorage solo persiste, NUNCA propaga cambios. |
| 6 | **Cascada obligatoria** | País → Tenant → Almacén → Cliente. Cada nivel valida pertenencia al nivel superior. |
| 7 | **Todo cambio de contexto se audita** | Cada switch/clear de país, tenant, almacén o cliente genera registro en audit_logs. |
| 8 | **Modo Auditoría: tablas sin filtro, formularios con contexto** | showAll=true → las tablas muestran todo, pero los formularios siguen usando el contexto operativo. |
| 9 | **Nunca se requiere F5** | El cambio de contexto dispara re-fetch automático en todas las páginas. |
| 10 | **Sin ALMACÉN en la cadena de alcance del usuario** | El almacén existe en la jerarquía de datos pero NO en los selectores de alcance del usuario (País→Tenant→Cliente). |

---

## 12. LO QUE ESTÁ POSTERGADO

| Ítem | Motivo |
|------|--------|
| `application_scopes` | Una app pertenece a 1 cliente. El modelo multi-cliente para apps se revisará cuando haya 50+ clientes, 100+ apps, 500+ instancias. |
| `instance_scopes` | Depende de application_scopes. Mismo criterio. |
| Dashboard Ejecutivo (Fase 8) | KPIs, drill-down jerárquico, gráficos |
| Auditoría Mejorada (Fase 9) | Reportes avanzados |
| Notificaciones (Fase 10) | Sistema de notificaciones en tiempo real |
| Reportes (Fase 11) | Exportación Excel/CSV/PDF |

---

## 13. DIAGRAMA ENTIDAD-RELACIÓN (TABLAS CLAVE)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│  countries   │───────│ tenant_countries  │───────│   tenants    │
│              │  N:M  │                  │  N:M  │              │
│  id (PK)     │       │  id (PK)         │       │  id (PK)     │
│  tenant_id   │       │  tenant_id (FK)  │       │  country_id  │
│  name        │       │  country_id (FK) │       │  name        │
│  code        │       └──────────────────┘       │  code        │
│  iso_code    │                                   │  domain      │
│  status      │                                   │  status      │
│  currency    │                                   │  settings    │
│  timezone    │                                   └──────┬───────┘
└──────┬───────┘                                          │
       │                                                  │
       │         ┌──────────────────────────────┐         │
       │         │        warehouses             │         │
       │         │                               │         │
       │         │  id (PK)                      │         │
       ├─────────│  country_id (FK) ─────────────┤         │
       │         │  tenant_id (FK) ──────────────┤         │
       │         │  name                         │         │
       │         │  code, address, status        │         │
       │         └──────────────┬────────────────┘         │
       │                        │                           │
       │         ┌──────────────▼────────────────┐         │
       │         │         clients                │         │
       │         │                                │         │
       │         │  id (PK)                       │         │
       ├─────────│  country_id (FK) ──────────────┤         │
       │         │  tenant_id (FK) ───────────────┤         │
       │         │  warehouse_id (FK)             │         │
       │         │  name, code, status            │         │
       │         └──────────────┬─────────────────┘         │
       │                        │                           │
       │         ┌──────────────▼──────────────────────────┐│
       │         │          platform_users                  ││
       │         │                                          ││
       │         │  id (PK), auth_user_id (FK→auth.users)  ││
       ├─────────│  country_id (FK) ────────────────────────┤│
       │         │  tenant_id (FK) ─────────────────────────┤│
       │         │  warehouse_id (FK)                       ││
       │         │  client_id (FK)                          ││
       │         │  role_id (FK→roles)                      ││
       │         │  *_context_override (4 campos)           ││
       │         │  scope_all_* (4 flags)                   ││
       │         └──────────────┬───────────────────────────┘│
       │                        │                             │
       │  ┌─────────────────────┼──────────────────────┐     │
       │  │  Tablas Puente      │                       │     │
       │  │  user_tenants       │ user_id, tenant_id    │     │
       │  │  user_countries     │ user_id, country_id   │     │
       │  │  user_warehouses    │ user_id, warehouse_id │     │
       │  │  user_clients       │ user_id, client_id    │     │
       │  └─────────────────────┼──────────────────────┘     │
       │                        │                             │
       │         ┌──────────────▼────────────────┐           │
       │         │       applications             │           │
       │         │                                │           │
       │         │  id (PK)                       │           │
       │         │  tenant_id (FK) ───────────────┤           │
       │         │  client_id (FK)                │           │
       │         │  category_id (FK)              │           │
       │         │  name, code, status            │           │
       │         └──────────────┬─────────────────┘           │
       │                        │                              │
       │         ┌──────────────▼─────────────────┐          │
       │         │    application_instances        │          │
       │         │                                 │          │
       │         │  id (PK)                        │          │
       │         │  tenant_id (FK) ────────────────┤          │
       │         │  application_id (FK)            │          │
       │         │  client_id (FK)                 │          │
       │         │  instance_name, url, status     │          │
       │         │  sso_enabled, jwt_federated     │          │
       │         └─────────────────────────────────┘          │
       │                                                      │
       │         ┌──────────────────────────────┐            │
       │         │           roles               │            │
       │         │  id (PK), tenant_id (FK) ────┤            │
       │         │  name, code, level,          │            │
       │         │  is_system, permissions      │            │
       │         └──────────────────────────────┘            │
       └──────────────────────────────────────────────────────┘
```

---

## 14. GLOSARIO

| Término | Definición |
|---------|-----------|
| **Tenant** | Unidad organizacional que agrupa países, almacenes, clientes, usuarios y aplicaciones. Ej: "OLO", "EPA" |
| **País** | Raíz de la jerarquía. Un tenant puede operar en múltiples países vía `tenant_countries`. |
| **Almacén** | Subdivisión de un tenant dentro de un país. Pertenece a UN tenant y UN país. |
| **Cliente** | Subdivisión de un almacén. Pertenece a UN tenant, UN país, y UN almacén. |
| **Contexto Operativo** | La posición actual del usuario en la jerarquía (País → Tenant → Almacén → Cliente). Determina qué datos ve. |
| **Context Override** | Cuando un usuario cambia explícitamente de tenant/país/almacén/cliente vía Topbar. Se guarda como `*_context_override` en platform_users. |
| **Scope (Alcance)** | Los tenants/países/almacenes/clientes que un usuario PUEDE ver. Viene de las tablas puente `user_*`. |
| **scope_all_*** | Flag que da acceso GLOBAL a todas las entidades de ese tipo. |
| **Modo Auditoría** | Modo donde las tablas muestran TODOS los registros sin filtrar por contexto. Solo Super Admin. |
| **RLS** | Row Level Security — Políticas de seguridad a nivel de fila en PostgreSQL/Supabase. |
| **SECURITY DEFINER** | Funciones SQL que se ejecutan con los privilegios del creador (postgres), no del caller. Usadas para bypass controlado de RLS. |
| **Cascada** | La validación jerárquica: cada nivel debe pertenecer al nivel superior. País → Tenant → Almacén → Cliente. |
| **tenant_countries** | Tabla puente N:M que define qué tenants operan en qué países. Fuente de verdad OFICIAL. |
| **user_tenants / user_countries / user_warehouses / user_clients** | Tablas puente N:M que definen el alcance de cada usuario. |

---

## 15. ARQUITECTURA DE ARCHIVOS (src/)

```
src/
├── components/
│   ├── base/           ← Botones, inputs, modales, badges, MultiSelect
│   └── feature/        ← Topbar, Sidebar, AuthGuard, RouteGuard, AppLayout
├── hooks/              ← useTenantContext, useAuth, useUsers, useClients,
│                         useCountries, useWarehouses, useTenants,
│                         useApplicationAccess, useSuitePermissions, etc.
├── pages/
│   ├── dashboard/      ← Enterprise Application Hub
│   ├── applications/   ← CRUD de aplicaciones
│   ├── instances/      ← CRUD de instancias
│   ├── clients/        ← CRUD de clientes
│   ├── countries/      ← CRUD de países
│   ├── warehouses/     ← CRUD de almacenes
│   ├── tenants/        ← CRUD de tenants
│   ├── users/          ← CRUD de usuarios + modal invitación
│   ├── my-access/      ← Mis Accesos (usuario final)
│   ├── assignments/    ← Asignaciones app↔tenant↔rol
│   ├── roles/          ← CRUD de roles
│   ├── catalog/        ← Catálogo empresarial
│   ├── audit/          ← Logs de auditoría
│   ├── security-*/     ← Config seguridad, sesiones, alertas
│   └── ...
├── services/
│   ├── auth/           ← authService, contextService, usersService
│   ├── operations/     ← countries, tenants, warehouses, clients
│   ├── applications/   ← applications, instances
│   ├── security/       ← access, roles, permissions, audit, sessions, alerts
│   └── supabase/       ← client.ts (singleton)
├── types/
│   └── organization.ts ← Tipos canónicos: CountryOption, TenantOption, etc.
├── utils/
│   ├── organizationCascade.ts ← Validación de cascada, filtros N:M
│   └── tenant.ts              ← getEffectiveTenantId()
├── router/
│   ├── config.tsx       ← Definición de rutas
│   └── index.ts         ← AppRoutes, BrowserRouter
├── i18n/                ← Internacionalización
├── mocks/               ← Datos mock (solo fallback)
└── App.tsx              ← Entry point: TenantContextProvider > AuthGuard > AppRoutes
```

---

## 16. CONCLUSIÓN

**Suite OLO es un sistema enterprise multi-tenant con una jerarquía organizacional en cascada de 5 niveles** (País ↔ Tenant → Almacén → Cliente → Usuario → Aplicación → Instancia), gobernada por:

1. **React Context como única fuente de verdad reactiva** — el Topbar es el selector de contexto global, y cuando cambia cualquier nivel, TODAS las páginas reaccionan en tiempo real sin F5.

2. **Row Level Security en PostgreSQL** — cada query a Supabase está protegida por políticas RLS que validan la pertenencia del usuario al tenant/país/almacén/cliente correspondiente, con hardening V3.1 (25 tests críticos, soft delete dinámico, auditoría estricta).

3. **Tablas puente N:M para relaciones flexibles** — `tenant_countries` (País↔Tenant) y `user_*` (Usuario↔Entidad) permiten que un tenant opere en múltiples países y que un usuario tenga alcance en múltiples entidades.

4. **Modelo de overrides de contexto** — los campos `*_context_override` en `platform_users` permiten cambiar temporalmente el contexto sin perder el contexto original, con auditoría completa de cada cambio.

5. **localStorage es solo persistencia** — nunca se usa como fuente de verdad para propagar cambios de estado. El flujo es: React Context → localStorage (write-only).