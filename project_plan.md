# Suite OLO — Enterprise Application Hub

## 1. Descripción del Proyecto
Suite OLO es una plataforma empresarial centralizada de acceso, gobierno, seguridad y publicación de aplicaciones corporativas. Funciona como un Enterprise Application Hub donde los usuarios visualizan únicamente las aplicaciones autorizadas según tenant, rol, perfil y permisos. Diseñada bajo modelo Zero Trust con SSO federado, JWT y control de acceso granular.

**Público objetivo:** Corporaciones multinacionales, holdings y organizaciones con múltiples aplicaciones empresariales que necesitan un punto único de gobierno y acceso.

**Valor central:** Un solo lugar para descubrir, acceder y gobernar todas las aplicaciones empresariales con seguridad zero-trust y experiencia premium.

## 2. Estructura de Páginas
- `/login` - Login con email/password y Google OAuth
- `/forgot-password` - Recuperación de contraseña
- `/dashboard` - Enterprise Application Hub (portal de aplicaciones)
- `/categories` - Categorías de aplicaciones
- `/applications` - Gestión de aplicaciones
- `/instances` - Instancias de aplicación por tenant
- `/catalog` - Catálogo empresarial
- `/assignments` - Asignación de aplicaciones a tenants/roles
- `/integration` - Configuración de integración (SSO, JWT, dominios)
- `/roles` - Roles CRUD empresarial
- `/profiles` - Perfiles CRUD con herencia
- `/permissions` - Matriz granular de permisos
- `/app-access` - Accesos a aplicaciones
- `/my-access` - Mis accesos
- `/audit` - Auditoría con filtros, timeline y exportación CSV
- `/security-settings` - Configuración de seguridad por tenant
- `/profile` - Perfil de usuario completo
- `/sessions` - Sesiones activas con monitoreo
- `/security-alerts` - Centro de alertas de seguridad
- `/modules` - Módulos del sistema (placeholder)
- `/countries` - CRUD de países multi-tenant
- `/warehouses` - CRUD de almacenes jerárquico
- `/clients` - CRUD de clientes jerárquico
- `/audit-logs` - (redirige a /audit)

## 3. Funcionalidades Core
- [x] Autenticación (email/password + Google OAuth)
- [x] Recuperación de contraseña
- [x] Enterprise Application Hub con búsqueda, categorías, favoritos, recientes
- [x] CRUD de categorías de aplicaciones
- [x] CRUD de aplicaciones con filtros por categoría y estado
- [x] CRUD de instancias por tenant con config SSO/JWT/iframe
- [x] Catálogo empresarial con vista por categorías
- [x] Asignación de aplicaciones a tenants y roles
- [x] Configuración de integración (SSO/OIDC, JWT, dominios, seguridad)
- [x] Gestión de roles CRUD empresarial con niveles jerárquicos
- [x] Matriz de permisos granular: Aplicación → Módulo → Funcionalidad → Acción
- [x] CRUD de módulos del sistema (placeholder)
- [x] Logs de auditoría con filtros avanzados, timeline y exportación CSV
- [x] Configuración de seguridad por tenant: MFA, sesiones, password, Zero Trust
- [x] Perfil de usuario con apps autorizadas, permisos y actividad
- [x] Sesiones activas con monitoreo de riesgo, revocación y detalle
- [x] Centro de alertas de seguridad con severidades y estados
- [x] Sidebar colapsable con navegación contextual
- [x] Topbar con buscador global, tenant selector, avatar
- [x] Tablas avanzadas con filtros, búsqueda, paginación
- [x] Formularios con validación visual en modales
- [x] Estados: empty, loading skeletons, success/error
- [x] Vista grid y lista para aplicaciones
- [x] Tema enterprise dark mode premium
- [x] CRUD jerárquico de países, almacenes y clientes (8 países, 14 almacenes, 28 clientes)

## 4. Modelo de Datos

### Tabla: categories
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| name | text | Nombre de la categoría |
| code | text | Código único |
| description | text | Descripción |
| icon | text | Icono Remix |
| color | text | Color de categoría |
| is_active | boolean | Estado |

### Tabla: applications
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| name | text | Nombre de la aplicación |
| code | text | Código único |
| description | text | Descripción |
| category_id | uuid | FK → categories |
| icon | text | Icono Remix |
| color | text | Color |
| base_url | text | URL base |
| status | text | active/maintenance/offline/beta |
| version | text | Versión |
| integration_type | text | internal/external/embedded/sso/api |

### Tabla: instances
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| application_id | uuid | FK → applications |
| instance_name | text | Nombre de instancia |
| url | text | URL específica |
| status | text | active/inactive/deploying |
| open_in_olo | boolean | Abrir dentro de OLO |
| open_in_new_tab | boolean | Abrir en nueva pestaña |
| allows_iframe | boolean | Permite iframe |
| sso_enabled | boolean | SSO habilitado |
| jwt_federated | boolean | JWT federado |
| allowed_domains | text[] | Dominios permitidos |

### Tabla: assignments
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| application_id | uuid | FK → applications |
| role_id | uuid | FK → roles |
| status | text | assigned/pending/revoked |

## 5. Plan de Integraciones
- **Supabase:** Autenticación, base de datos con RLS, Edge Functions, JWT.
- **Shopify:** No requerido.
- **Stripe:** No requerido inicialmente.

## 6. Plan de Desarrollo por Fases

### Fase 1: Login + Layout Shell ✅ COMPLETADO
- Login page con diseño enterprise, AppLayout con sidebar + topbar

### Fase 2: Enterprise Application Hub ✅ COMPLETADO
- Dashboard como portal de aplicaciones con búsqueda, categorías, favoritos, recientes
- CRUD de Categorías, Aplicaciones, Instancias
- Catálogo empresarial, Asignación, Configuración de Integración
- Rebranding completo a Suite OLO
- Navegación actualizada con nueva jerarquía

### Fase 3: Supabase Enterprise Foundation ✅ COMPLETADO
- Schema de 14 tablas con RLS multi-tenant
- Supabase Auth: email/password + Google OAuth
- AuthContext, useAuth hook, AuthGuard
- Servicios de datos con fallback a mocks
- Migración de Login, Dashboard, Categorías, Aplicaciones, Instancias a Supabase
- Seed data: 4 tenants, 7 roles, 8 categorías, 21 aplicaciones

### Fase 4: Roles, Perfiles y Permisos ✅ COMPLETADO
- CRUD de Roles con niveles jerárquicos y badges de sistema/personalizado
- CRUD de Perfiles con herencia de roles y copia de perfil
- Matriz de Permisos granular: Aplicación → Módulo → Funcionalidad → Acción
- Árbol expandible con checkboxes por acción y selección masiva
- Guardado de permisos por perfil en Supabase (permissions JSONB)
- Gestión de Accesos a Aplicaciones (approbar/revocar/denegar)
- Vista "Mis Accesos" para usuario final
- Dashboard integrado con user_application_access
- Sidebar actualizada con navegación de seguridad completa
- 81 permisos semilla en 9 aplicaciones con 8 tipos de acción
- 5 perfiles semilla con roles base
- Servicios: rolesService, profilesService, permissionsService, accessService
- Hooks: useRoles, useProfiles, usePermissions, useApplicationAccess

### Fase 5: Auditoría y Seguridad ✅ COMPLETADO
- Logs de auditoría con filtros avanzados, badges de severidad, timeline y exportación CSV
- Configuración de seguridad por tenant (MFA, sesiones, password policy, auditoría, Zero Trust)
- Perfil de usuario completo con información personal, apps autorizadas, permisos y actividad
- Sesiones activas con monitoreo de riesgo, revocación y detalle
- Centro de alertas de seguridad con severidades, estados y resolución
- 53 eventos de auditoría semilla con 25+ tipos de acción
- 4 configuraciones de tenant_settings semilla (CR, PA, MX, CO)
- Servicios: auditService, settingsService, sessionsService, alertsService
- Hooks: useAuditLogs, useSecuritySettings, useSessions, useSecurityAlerts
- Sidebar reorganizada con Seguridad (7 items) y Sistema (4 items)

### Fase 5.1: CRUD Jerarquico: Paises, Almacenes y Clientes ✅ COMPLETADO
- CRUD de Países con jerarquía tenant, filtros por estado, métricas de almacenes y clientes
- CRUD de Almacenes asignados a país con filtros por país y estado, direcciones y contadores
- CRUD de Clientes asignados a almacén con filtros por almacén, país y estado
- Jerarquía completa: Tenant → País → Almacén → Cliente
- 8 países semilla (CR, NI, PA, SV, MX, GT, CO, PE) en 4 tenants
- 14 almacenes semilla con direcciones realistas
- 28 clientes semilla con emails y códigos
- Sidebar con sección "Administración": Países, Almacenes, Clientes
- Dashboard con resumen operativo: países activos, almacenes activos, clientes activos
- Servicios: countriesService, warehousesService, clientsService
- Hooks: useCountries, useWarehouses, useClients
- Drawers premium para crear/editar, confirmaciones para activar/desactivar
- Skeleton loading, empty states, badges de estado en todas las pantallas

### Fase 5.1 Hotfix: Autocomplete Inteligente de Países ✅ COMPLETADO (Jun 2026)
- **RLS tenants arreglado**: política `tenant_select_all` para usuarios autenticados
- **platform_user creado** para Super Admin `arojas@ologistics.com` (tenant CR)
- **Columnas `currency` y `timezone`** agregadas a tabla `countries`
- **REST Countries API integrada** via `countriesApiService` con:
  - Cache en memoria (no re-fetch en cada modal)
  - `searchCountries()` con búsqueda por nombre, código e ISO
  - `mapCountryToForm()` para autocompletar nombre, código, ISO, moneda, zona horaria y bandera
- **Modal rediseñado** con:
  - Dropdown de tenant con skeleton/empty/error states
  - Buscador de país con autocomplete, dropdown de resultados con banderas
  - Preview del país seleccionado con flag, región, moneda y zona horaria
  - Badge "Autocompletado" en verde
  - Fallback a modo manual si la API falla
  - Validación de duplicados por tenant + código ISO
  - Campos manuales disponibles en modo edición
- **Hook `useWorldCountries`** con debounce (200ms), loading/error/retry
- **Columna Moneda** visible en la tabla de países
- Servicio: `src/services/external/countriesApiService.ts`
- Hook: `src/hooks/useWorldCountries.ts`

### Fase 5.2: Multi-Tenant Hardening ✅ COMPLETADO (Jun 2026)
- **Trigger automático** `auth.users → platform_users`: al registrarse un nuevo usuario en Supabase Auth, se crea automáticamente su registro en platform_users con estado `pending`
- **Columnas `tenant_context_override` y `country_context_override`** en platform_users: permiten a Super Admin y Country Admin anular su contexto para ver otros tenants/países
- **Función `get_user_tenant_id()` modificada**: ahora respeta el `tenant_context_override` — si un Super Admin anula su tenant, todas las queries RLS ven datos de ese tenant
- **Función `get_user_role_level()`**: retorna el nivel jerárquico del rol del usuario autenticado (Super Admin=100, Tenant Admin=80, Country Admin=60, Warehouse Admin=40, Client Admin=30, User=10, Auditor=50)
- **Funciones de contexto**: `set_tenant_context()`, `clear_tenant_context()`, `set_country_context()`, `clear_country_context()` — RPCs seguras con verificación de nivel de rol
- **Función `get_accessible_tenants()`**: Super Admin ve todos los tenants, usuarios regulares solo el suyo
- **Validación jerárquica completa**:
  - `can_access_country(country_id)`: verifica tenant + herencia de país
  - `can_access_warehouse(warehouse_id)`: verifica tenant → país → almacén
  - `can_access_client(client_id)`: verifica tenant → país → almacén → cliente
- **Página `/users`**: CRUD completo de platform_users con:
  - Tabla avanzada con filtros por email, rol y estado
  - Modal crear/editar con jerarquía encadenada: Tenant → País → Almacén → Cliente
  - Badges de rol por nivel jerárquico (rojo=Super Admin, ámbar=Tenant Admin, etc.)
  - Badges de estado (activo, pendiente, inactivo, suspendido)
  - Confirmación de eliminación con advertencia
  - Métricas superiores: total usuarios, activos, pendientes, Super Admins
  - Skeleton loading, empty states, manejo de errores
- **Tenant Context Switcher en Topbar**:
  - Super Admin ve dropdown con todos los tenants accesibles
  - Indicador visual: círculo ámbar parpadeante cuando el contexto está anulado
  - Badge "Anulado" / "Actual" en cada tenant
  - Botón "Volver a mi tenant original" para limpiar el override
  - Spinner durante el cambio de contexto
  - Auditoría automática de cada cambio de tenant (TENANT_CONTEXT_SWITCHED / TENANT_CONTEXT_CLEARED)
  - Usuarios no-admin solo ven su tenant sin dropdown
- **`useTenantContext` hook**: Provider + hook con estado de tenant efectivo, override activo, nivel de rol, tenants accesibles, países del tenant actual, y funciones switchTenant/clearTenant/switchCountry/clearCountry
- **`usersService`**: fetchUsers (con enriched data de tenants/roles/countries/warehouses/clients), createPlatformUser, updatePlatformUser, deletePlatformUser, fetchAccessibleTenants, getUserContext — todo con verificación de role_level >= 80 para operaciones de escritura
- **`useUsers` hook**: carga usuarios + catálogos (tenants, roles, countries, warehouses, clients) con enriched data
- **Auditoría de cambios de tenant**: cada switch/clear de tenant context registra automáticamente en audit_logs con severidad medium/low
- **Sidebar**: nuevo ítem "Usuarios" en Administración
- **Router**: nueva ruta `/users`
- **App.tsx**: TenantContextProvider envuelve AuthGuard para disponibilidad global del contexto

### Fase 5.2 DB Hardening: RLS Blindado a Nivel Base de Datos ✅ COMPLETADO (Jun 2026)

**Archivo:** `supabase/hardening_rls.sql` — script completo para ejecutar en Supabase SQL Editor

**Política insegura eliminada:**
- ❌ `tenant_select_all` — `USING (true)` para `authenticated` → **ELIMINADA**
- Reemplazada por `tenant_select_admin` (Super Admin level >= 100 ve todo) + `tenant_select_own` (usuarios solo ven su tenant)

**RLS completadas por tabla (INSERT/UPDATE/DELETE donde faltaban):**

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| tenants | rol-aware: admin ve todo, user ve suyo | N/A | N/A | N/A |
| countries | tenant_id = get_user_tenant_id() | admin + validación tenant activo | tenant_id match | tenant_id match |
| warehouses | tenant_id = get_user_tenant_id() | admin + validación país→tenant | tenant_id match | tenant_id match |
| clients | tenant_id = get_user_tenant_id() | admin + validación almacén→tenant | tenant_id match | tenant_id match |
| platform_users | tenant_id = get_user_tenant_id() | admin (level >= 80) + self | admin o self | solo admin |
| roles | tenant_id = get_user_tenant_id() | admin (level >= 80) | admin | admin (no system) |
| profiles | tenant_id = get_user_tenant_id() | admin (level >= 80) | admin | admin (no default) |
| permissions | tenant_id = get_user_tenant_id() | admin (level >= 80) | admin | admin |
| tenant_settings | tenant_id = get_user_tenant_id() | admin (level >= 80) | admin | admin |
| user_application_access | tenant_id = get_user_tenant_id() | admin (level >= 80) | admin | admin |
| applications | tenant_id = get_user_tenant_id() | tenant_id match | tenant_id match | tenant_id match |
| application_instances | tenant_id = get_user_tenant_id() | tenant_id match | tenant_id match | tenant_id match |
| application_categories | tenant_id = get_user_tenant_id() | tenant_id match | tenant_id match | tenant_id match |
| audit_logs | tenant_id = get_user_tenant_id() | system trigger | N/A | N/A |

**Mejora del trigger `handle_new_auth_user()`:**
- Registra evento `USER_REGISTERED` en audit_logs al crear un nuevo platform_user
- Mantiene estado `pending` con tenant_id=NULL hasta aprobación por admin

### Checklist de Hardening RLS (ejecutar verificación post-SQL)

- [ ] `tenant_select_all` ELIMINADO de pg_policies
- [ ] tenants: SELECT rol-aware (admin ve todo, usuario ve suyo)
- [ ] platform_users: INSERT/UPDATE/DELETE para admin + SELECT/UPDATE propio
- [ ] roles: CRUD completo con restricción admin + no borrar system
- [ ] profiles: CRUD completo con restricción admin + no borrar default
- [ ] permissions: CRUD completo con restricción admin
- [ ] tenant_settings: CRUD completo con restricción admin
- [ ] user_application_access: CRUD completo con restricción admin
- [ ] countries: INSERT con validación jerárquica tenant→country
- [ ] warehouses: INSERT con validación jerárquica country→warehouse
- [ ] clients: INSERT con validación jerárquica warehouse→client
- [ ] Trigger handle_new_auth_user: registra en audit_logs
- [ ] Ninguna política usa USING (true) sin restricción de rol
- [ ] Super Admin (level >= 100) ve todos los tenants — probado con get_accessible_tenants()
- [ ] Tenant Admin (level >= 80) ve y gestiona su tenant — probado con RLS
- [ ] Country Admin (level >= 60) ve su país dentro de su tenant — probado con can_access_country()
- [ ] Warehouse Admin (level >= 40) ve su almacén — probado con can_access_warehouse()
- [ ] Client Admin (level >= 30) ve su cliente — probado con can_access_client()
- [ ] Usuario normal (level >= 10) solo ve lo asignado dentro de su tenant

### Fase 5.3: Validación Real de RLS Multi-Tenant ✅ COMPLETADO (Jun 2026)

**Archivo SQL:** `supabase/phase_5.3_test_users.sql` — script para crear 7 usuarios de prueba con roles jerárquicos

**Página `/rls-test`** (gateada con `VITE_ENABLE_RLS_TEST=true`):
- Muestra información del usuario actual: email, ID, rol, nivel jerárquico, tenant asignado
- Evalúa 14 tablas via queries reales a Supabase con Row Level Security activo
- Indicadores visuales: PASS (verde), FAIL (rojo), WARNING (ámbar) por cada tabla
- Cada resultado muestra: expected (lo que debería ver según su rol) vs actual (lo que realmente ve)
- Skeleton loading durante ejecución de pruebas
- Empty state antes de la primera ejecución
- Registra resultados en `audit_logs`: RLS_TEST_RUN (resumen), RLS_TEST_PASS (por tabla), RLS_TEST_FAIL (por tabla)
- Redirección automática a /dashboard si VITE_ENABLE_RLS_TEST no es 'true'
- No accesible desde la sidebar ni visible en producción sin la flag

**Usuarios de prueba configurados:**

| Usuario | Rol | Nivel | Tenant | Alcance |
|---------|-----|-------|--------|---------|
| super.admin@olo.test | Super Admin | 100 | CR | Todos los tenants |
| tenant.admin@olo.test | Tenant Admin | 80 | CR | Solo tenant CR |
| country.admin@olo.test | Country Admin | 60 | CR | Solo país Costa Rica |
| warehouse.admin@olo.test | Warehouse Admin | 40 | CR | Solo Bodega Cartago |
| client.admin@olo.test | Client Admin | 30 | CR | Solo Almacenes El Roble |
| auditor@olo.test | Auditor | 50 | CR | Solo lectura auditoría |
| user@olo.test | User | 10 | CR | Solo apps asignadas |

**Tablas evaluadas en /rls-test:**
tenants, countries, warehouses, clients, roles, profiles, applications, application_instances, user_application_access, audit_logs, application_categories, permissions, tenant_settings, platform_users

**Archivos creados/modificados:**
```
NUEVOS:
supabase/phase_5.3_test_users.sql        — SQL para crear usuarios de prueba
src/pages/rls-test/page.tsx              — Página de validación RLS

MODIFICADOS:
.env                                     — Agregado VITE_ENABLE_RLS_TEST=true
src/router/config.tsx                    — Agregada ruta /rls-test
project_plan.md                          — Documentada Fase 5.3
```

**Instrucciones para el usuario:**
1. Ejecutar `supabase/hardening_rls.sql` en Supabase SQL Editor (¡crítico!)
2. Crear los 7 usuarios en Supabase Auth Dashboard (Authentication > Users)
3. Ejecutar `supabase/phase_5.3_test_users.sql` reemplazando los UUIDs de auth.users
4. Visitar `/rls-test` y hacer clic en "Ejecutar pruebas RLS"
5. Iniciar sesión con cada usuario de prueba y repetir para validar jerarquía completa
6. Para deshabilitar en producción: cambiar `VITE_ENABLE_RLS_TEST=false` en .env

### Jerarquía de acceso validada
```
Super Admin (level 100) → Todos los tenants, países, almacenes, clientes
  └─ Tenant Admin (level 80) → Solo su tenant y todo debajo
       └─ Country Admin (level 60) → Solo su país y todo debajo
            └─ Warehouse Admin (level 40) → Solo su almacén y clientes
                 └─ Client Admin (level 30) → Solo su cliente
                      └─ User (level 10) → Solo sus aplicaciones asignadas
```

### Fase 5.3.1: Hardening RLS V2.5 — Blindaje Enterprise Definitivo (OBSOLETA ❌ REEMPLAZADA POR V2.6) (Jun 2026)

**Archivos eliminados:** `supabase/hardening_rls_v2_5.sql`, `supabase/hardening_rls_v2_5_part2.sql`

**Problema no detectado en V2.5:** `soft_delete_record()` era SECURITY DEFINER ejecutable vía RPC por cualquier authenticated sin validación de permisos ni tenant. Las políticas DELETE físicas `roles_delete`, `profiles_delete`, `permissions_delete`, `tenant_settings_delete` nunca se droppearon explícitamente y podían seguir existiendo de versiones anteriores. `user_app_access_delete` era un DELETE físico activo. Todo corregido en V2.6.

---

### Fase 5.3.1: Hardening RLS V2.6 — Blindaje de Soft Delete + DELETE Físicas Eliminadas (OBSOLETA ❌ REEMPLAZADA POR V2.7) (Jun 2026)

**Archivos eliminados:** `supabase/hardening_rls_v2_6.sql`, `supabase/hardening_rls_v2_6_part2.sql`

**Problemas no detectados en V2.6:** (1) REVOKE de `soft_delete_record()` en Sección 0d se ejecutaba ANTES del CREATE, haciendo que el script fallara en DB limpia con rollback completo. (2) `set_tenant_context` no auditaba la rama Tenant Admin (solo Super Admin). (3) `admin_soft_delete_record` para Super Admin pasaba `p_tenant_id` del frontend a `soft_delete_record()` sin leer `record_tenant` real, pudiendo generar auditoría con tenant_id incorrecto. (4) `revoke_app_access` usaba `p_tenant_id` del frontend en `write_audit_log` en vez de `access_tenant` de la DB. Todo corregido en V2.7.

---

### Fase 5.3.1: Hardening RLS V2.7 — Auditoría con Tenant Real + Script Autocontenido (OBSOLETA ❌ REEMPLAZADA POR V2.8) (Jun 2026)

**Archivos eliminados:** `supabase/hardening_rls_v2_7.sql`, `supabase/hardening_rls_v2_7_part2.sql`

**Problemas no detectados en V2.7:** (1) `revoke_app_access()` usaba `SET status = 'revoked'` pero la columna real de `user_application_access` es `access_status`. La función fallaba en runtime. (2) Solo 4 de 27 funciones SECURITY DEFINER tenían OWNER/GRANTS explícitos; las 23 restantes heredaban el owner de quien ejecutaba el script (comportamiento no determinístico). (3) `REVOKE INSERT ON audit_logs FROM PUBLIC` no se ejecutaba (solo authenticated y anon). (4) Tests críticos usaban RAISE WARNING, permitiendo COMMIT con fallos de seguridad. Todo corregido en V2.8.

---

### Fase 5.3.1: Hardening RLS V2.8 — Blindaje de Integridad Total (OBSOLETA ❌ REEMPLAZADA POR V2.9) (Jun 2026)

**Archivos eliminados:** `supabase/hardening_rls_v2_8.sql`, `supabase/hardening_rls_v2_8_part2.sql`

**Problemas no detectados en V2.8:** (1) El DO block de tests en Part 2 declaraba `FUNCTION record_failure(...)` dentro del DECLARE — sintaxis inválida en PostgreSQL que hacía fallar la Part 2 completa antes de ejecutar los tests. (2) `write_audit_log()` atrapaba errores con RETURN false silencioso — si audit_logs fallaba, operaciones sensibles como soft delete y revoke continuaban sin registro de auditoría. (3) `can_access_*` y `can_manage_*` estaban expuestos como RPC a authenticated sin documentar por qué (las RLS policies los necesitan porque ejecutan con privilegios del caller). Todo corregido en V2.9.

---

### Fase 5.3.1: Hardening RLS V2.9 — Auditoría Estricta + Sintaxis Corregida (OBSOLETA ❌ REEMPLAZADA POR V3.0) (Jun 2026)

**Archivos:** `supabase/hardening_rls_v2_9.sql` (Parte 1/2) + `supabase/hardening_rls_v2_9_part2.sql` (Parte 2/2)

Reemplazo de V2.8 con 4 correcciones críticas: 1 bloqueo de sintaxis (DO block inválido) + 1 riesgo de integridad (auditoría silenciosa) + 1 deuda de documentación (grants sin explicar).

**4 Correcciones aplicadas vs V2.8:**

| # | Corrección | Riesgo mitigado |
|---|-----------|----------------|
| 1 | **`write_audit_log_strict()`** — variante que RAISEA EXCEPTION en fallo. Usada por `soft_delete_record()` y `revoke_app_access()`. Si audit_logs falla, la operación completa hace ROLLBACK. `write_audit_log()` no-strict se preserva para operaciones no-críticas (context switching, profile update, user registration). | En V2.8, si audit_logs fallaba, un soft delete o una revocación de acceso continuaban sin registro de auditoría — operación fantasma sin trazabilidad. |
| 2 | **Grants `can_access_*`/`can_manage_*` DOCUMENTADOS.** Estas 5 funciones necesitan GRANT EXECUTE TO authenticated porque las RLS policies (`countries_select`, `warehouses_select`, `clients_select`, `roles_update`, `platform_users_update_admin`) las llaman directamente en su USING/WITH CHECK. Las policies ejecutan con privilegios del caller (NO son SECURITY DEFINER). El frontend NO las llama (grep en src/ confirma 0 usos). | En V2.8 no había documentación de por qué estas funciones = RPC. Sin esa documentación, un revisor podría intentar revocar los grants y romper las policies. |
| 3 | **DO block de tests CORREGIDO.** V2.8 declaraba `FUNCTION record_failure(test_label TEXT, detail TEXT) RETURNS void` dentro del DECLARE del `DO $$`. PostgreSQL NO permite definir funciones dentro de DECLARE en un DO block. Variables no utilizadas (`critical_failures`, `critical_fail_count`) eliminadas. | En V2.8, la Part 2 fallaba con error de sintaxis antes de ejecutar cualquier test. |
| 4 | **Test de sintaxis real para el DO block.** Pre-test al inicio de Sección 11 (Part 2) que valida que el DO block compila correctamente con solo variables en DECLARE. | Sin este test, un error de sintaxis en el DO block pasaba desapercibido hasta ejecutar en producción. |

**Arquitectura de auditoría V2.9:**

| Función | Acceso | Modo | Usado por |
|---------|--------|------|-----------|
| `write_audit_log()` | NO RPC | No-strict (RETURN false) | Context switching, profile update, user registration |
| `write_audit_log_strict()` | NO RPC | **STRICT (RAISE EXCEPTION)** | `soft_delete_record()`, `revoke_app_access()` |
| `admin_write_audit_log()` | RPC (SA) | Delega en `write_audit_log()` | Super Admin manual |
| `soft_delete_record()` | NO RPC | Delega auditoría en `write_audit_log_strict()` | `admin_soft_delete_record()` y funciones internas |
| `admin_soft_delete_record()` | RPC (SA/TA) | Hereda strict de `soft_delete_record()` | Frontend admin |
| `revoke_app_access()` | RPC (SA/TA) | Auditoría directa con `write_audit_log_strict()` | Frontend admin |

**16 Tests críticos (RAISE EXCEPTION → ROLLBACK):**
1. `write_audit_log_strict()` existe y bloqueado para frontend ← **NUEVO V2.9**
2. `soft_delete_record` usa `write_audit_log_strict` ← **NUEVO V2.9**
3. `revoke_app_access` usa `write_audit_log_strict` ← **NUEVO V2.9**
4. `revoke_app_access` usa `access_status` (no `status`)
5. `revoke_app_access` OWNER=postgres + GRANTS
6. authenticated NO puede `write_audit_log`
7. anon NO puede `write_audit_log`
8. `write_audit_log` OWNER=postgres
9. REVOKE INSERT FROM PUBLIC en audit_logs
10. REVOKE INSERT authenticated en audit_logs
11. `admin_write_audit_log` valida `is_super_admin()`
12. authenticated NO puede `soft_delete_record`
13. `soft_delete_record` OWNER=postgres
14. `admin_soft_delete_record` valida permisos
15. CERO políticas DELETE físicas en tablas críticas
16. Solo `write_audit_log`/`write_audit_log_strict` hacen INSERT en audit_logs

**Instrucciones de ejecución:**
1. Abrir [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Copiar y pegar TODO `supabase/hardening_rls_v2_9.sql` → Run
3. Copiar y pegar TODO `supabase/hardening_rls_v2_9_part2.sql` → Run
4. Verificar que los 16 tests críticos muestran PASS (si alguno falla, el script hará ROLLBACK)
5. Los tests no-críticos con WARNING no bloquean COMMIT pero deben revisarse
6. Luego ejecutar `supabase/phase_5.3_test_users.sql` y validar en `/rls-test`

---

### Fase 5.3.1: Hardening RLS V3.0 — Soft Delete Dinámico + Schema Validation (OBSOLETA ❌ REEMPLAZADA POR V3.1) (Jun 2026)

**Archivos eliminados:** `supabase/hardening_rls_v3_0.sql`, `supabase/hardening_rls_v3_0_part2.sql`

**Problema no detectado en V3.0:** PostgreSQL RLS NO restringe columnas en policies FOR UPDATE. Las 9 políticas `*_soft_delete` (roles_soft_delete, profiles_soft_delete, permissions_soft_delete, etc.) permitían a un Tenant Admin modificar CUALQUIER columna (no solo deleted_at/deleted_by), creando un bypass de las restricciones jerárquicas. Por ejemplo, `roles_soft_delete` permitía modificar `level` e `is_system` sin pasar por `can_manage_role()` que exige `roles_update`. Además, `soft_delete_record()` es SECURITY DEFINER OWNER=postgres (bypassea RLS), por lo que estas políticas eran innecesarias. Todo corregido en V3.1.

---

### Fase 5.3.1: Hardening RLS V3.1 — Eliminación de Bypass *_soft_delete ✅ LISTO PARA EJECUTAR (Jun 2026)

**Archivos:** `supabase/hardening_rls_v3_1.sql` (Parte 1/3) + `supabase/hardening_rls_v3_1_part2.sql` (Parte 2/3) + `supabase/hardening_rls_v3_1_part3.sql` (Parte 3/3)

Reemplazo de V3.0 con 1 corrección de seguridad crítica: eliminación de TODAS las políticas `*_soft_delete` FOR UPDATE que creaban bypass de las restricciones jerárquicas.

**Corrección aplicada vs V3.0:**

| # | Corrección | Riesgo mitigado |
|---|-----------|----------------|
| 1 | **ELIMINACIÓN de TODAS las políticas `*_soft_delete` FOR UPDATE.** PostgreSQL RLS NO restringe columnas. Una policy `roles_soft_delete FOR UPDATE` permitía a un Tenant Admin modificar CUALQUIER columna (level, is_system, name, tenant_id, etc.), saltándose completamente `can_manage_role()` de `roles_update`. `soft_delete_record()` y `admin_soft_delete_record()` son SECURITY DEFINER con OWNER=postgres — las funciones SECURITY DEFINER BYPASSEAN RLS por diseño. Las políticas `*_soft_delete` eran innecesarias para el soft delete y solo abrían un agujero de seguridad en las 9 tablas whitelist. | En V3.0, un Tenant Admin podía hacer `UPDATE roles SET level=100, is_system=true WHERE id=X` a través de `roles_soft_delete` — escalamiento de privilegios sin pasar por `can_manage_role()`. Lo mismo para `profiles_soft_delete`, `permissions_soft_delete`, y las otras 6 tablas. |

**Arquitectura de soft delete V3.1 (FINAL):**

```
admin_soft_delete_record() ← UNICO punto de entrada (RPC, SA/TA)
  → validación de permisos (level >= 80 o 100)
  → validación de tenant (cross-tenant bloqueado para TA)
  → soft_delete_record() (SECURITY DEFINER, OWNER=postgres)
    → whitelist check
    → detección dinámica de columnas (information_schema.columns)
    → UPDATE construido dinámicamente (solo columnas existentes)
    → write_audit_log_strict() (auditoría inmutable)

CERO políticas *_soft_delete.
roles_update es la ÚNICA vía de UPDATE en roles + can_manage_role().
Ningún Tenant Admin puede modificar level/is_system de roles.
```

**25 Tests críticos (RAISE EXCEPTION → ROLLBACK):**

5 NUEVOS V3.1:
1. CERO políticas `*_soft_delete` en las 9 tablas whitelist ← **NUEVO V3.1**
2. `roles_update` es la ÚNICA policy FOR UPDATE en roles ← **NUEVO V3.1**
3. `roles_update` exige `can_manage_role()` en USING y WITH CHECK ← **NUEVO V3.1**
4. Ninguna policy FOR UPDATE en roles es más permisiva que `roles_update` ← **NUEVO V3.1**
5. `soft_delete_record` es SECURITY DEFINER OWNER=postgres ← **NUEVO V3.1**

4 HEREDADOS V3.0:
6-9. Schema whitelist (deleted_at/deleted_by) + soft_delete_record dinámico

16 HEREDADOS V2.9:
10-25. Auditoría strict + OWNER/GRANTS + integridad

**Instrucciones de ejecución:**
1. Abrir [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Copiar y pegar TODO `supabase/hardening_rls_v3_1.sql` → Run
3. Copiar y pegar TODO `supabase/hardening_rls_v3_1_part2.sql` → Run
4. Copiar y pegar TODO `supabase/hardening_rls_v3_1_part3.sql` → Run
5. Verificar que los **25 tests críticos** muestran PASS (si alguno falla, ROLLBACK automático)
6. Confirmar que NO existen políticas `*_soft_delete` en pg_policies
7. Luego ejecutar `supabase/phase_5.3_test_users.sql` y validar en `/rls-test`
8. **Prueba crítica V3.1:** Intentar como Tenant Admin un `UPDATE roles SET level=100` — debe ser bloqueado por `roles_update` vía `can_manage_role()`

### Fase 6: Modelo de Alcances Multi-Tenant ✅ COMPLETADO (Jun 2026)

**Objetivo:** Evolucionar del modelo usuario → tenant único a un modelo enterprise donde un usuario puede tener acceso a múltiples tenants, países, almacenes y clientes simultáneamente.

**Arquitectura del nuevo modelo:**
```
IDENTIDAD (quién es)
  → ROL (capacidades administrativas)
    → PERMISOS (qué puede hacer)
      → ALCANCES (dónde puede operar: multi-tenant, multi-país, multi-almacén, multi-cliente)
        → APLICACIONES (qué apps puede abrir)
```

**Cambios en Base de Datos:**

1. **Tablas puente pobladas y activas:**
   - `user_tenants` — relación usuario ↔ tenant (con FK, UNIQUE, índices)
   - `user_countries` — relación usuario ↔ país
   - `user_warehouses` — relación usuario ↔ almacén
   - `user_clients` — relación usuario ↔ cliente

2. **Columnas `scope_all_*` en `platform_users`:**
   - `scope_all_tenants` (boolean) — acceso a todos los tenants
   - `scope_all_countries` (boolean) — acceso a todos los países
   - `scope_all_warehouses` (boolean) — acceso a todos los almacenes
   - `scope_all_clients` (boolean) — acceso a todos los clientes

3. **`user_invitations` extendido:**
   - `scope_tenants`, `scope_countries`, `scope_warehouses`, `scope_clients` (UUID[]) — alcances multi-select
   - `scope_all_tenants`, `scope_all_countries`, `scope_all_warehouses`, `scope_all_clients` (boolean) — acceso global

**Funciones RLS actualizadas:**

| Función | Comportamiento nuevo |
|---------|---------------------|
| `get_accessible_tenant_ids()` | **NUEVA** — retorna array de todos los tenant IDs del usuario desde `user_tenants` |
| `get_accessible_tenants()` | Ahora lee de `user_tenants` bridge table, no de `platform_users.tenant_id` único |
| `get_user_tenant_id()` | Prioriza `tenant_context_override`, luego `user_tenants`, luego `platform_users.tenant_id` |
| `get_user_country_id()` | **NUEVA** — retorna país activo con soporte multi-tenant |
| `can_access_country()` | Verifica `user_countries` bridge + `scope_all_countries` + `scope_all_tenants` |
| `can_access_warehouse()` | Verifica `user_warehouses` bridge + herencia tenant→país + scope_all flags |
| `can_access_client()` | Verifica `user_clients` bridge + herencia completa + scope_all flags |
| `create_user_invitation()` | Acepta `p_scope_tenants[]`, `p_scope_countries[]`, `p_scope_warehouses[]`, `p_scope_clients[]` + 4 flags `p_scope_all_*` |
| `handle_new_auth_user()` | Al aceptar invitación, popula automáticamente las 4 tablas puente via `_populate_user_scopes()` |
| `_populate_user_scopes()` | **NUEVA** — helper que inserta scopes primarios + arrays en tablas puente con ON CONFLICT DO NOTHING |

**Cambios en Frontend:**

1. **`MultiSelect` component** (`src/components/base/MultiSelect.tsx`):
   - Búsqueda integrada con filtrado
   - Selección múltiple con checkboxes
   - Botones "Todos" / "Limpiar"
   - Dropdown animado con glass-panel
   - Contador de seleccionados

2. **Modal de invitación rediseñado** (`src/pages/users/page.tsx`):
   - Sección "Alcances adicionales" con 4 MultiSelects (tenants, países, almacenes, clientes)
   - Sección "Acceso Global" con 4 checkboxes (scope_all_*)
   - Jerarquía principal conservada para compatibilidad
   - Filtrado encadenado: país→almacén→cliente basado en selecciones combinadas

3. **Context Switcher en Topbar** (`src/components/feature/Topbar.tsx`):
   - **Antes:** Solo Super Admin (role_level >= 100) podía cambiar de tenant
   - **Ahora:** Cualquier usuario con múltiples tenants asignados puede cambiar de contexto
   - Condición: `accessibleTenants.length > 1`

4. **`usersService` actualizado:**
   - `CreateInvitationInput` extendido con `scope_*` arrays y `scope_all_*` flags
   - `createUserInvitation()` pasa los 8 nuevos parámetros al RPC

**Migración de datos existentes:**
- Ejecutada automáticamente: todos los `platform_users.tenant_id` → `user_tenants`
- Ídem para `country_id` → `user_countries`, `warehouse_id` → `user_warehouses`, `client_id` → `user_clients`
- Sin pérdida de datos. Se preservan las columnas originales para compatibilidad.

**Compatibilidad:**
- Las columnas `tenant_id`, `country_id`, `warehouse_id`, `client_id` en `platform_users` se mantienen
- Las funciones RLS usan las tablas puente como fuente primaria, con fallback a columnas originales
- Usuarios existentes sin cambios en su experiencia
- Nuevas invitaciones pueden usar multi-scope opcionalmente

**Criterios de aceptación:**
- ✅ Multi-tenant real: un usuario puede tener N tenants
- ✅ Multi-país real: un usuario puede tener N países
- ✅ Multi-almacén real: un usuario puede tener N almacenes
- ✅ Multi-cliente real: un usuario puede tener N clientes
- ✅ Acceso global configurable (scope_all_*)
- ✅ Selector de contexto para todos los usuarios multi-tenant
- ✅ Invitaciones con multi-select de alcances
- ✅ Migración automática sin pérdida de datos
- ✅ RLS actualizado para respetar tablas puente
- ✅ Compatible con usuarios existentes
- ✅ Arquitectura escalable para crecimiento regional de OLO

**Archivos modificados/creados:**

```
NUEVOS:
src/components/base/MultiSelect.tsx          — Componente multi-select reutilizable

MODIFICADOS:
src/services/auth/usersService.ts            — Tipos multi-scope + RPC params extendidos
src/pages/users/page.tsx                     — Modal de invitación con multi-selects + scope_all
src/components/feature/Topbar.tsx            — Context switcher para todos los multi-tenant
src/hooks/useTenantContext.tsx               — Ya usaba get_accessible_tenants() actualizado

SQL (ejecutado en Supabase):
- ALTER user_invitations: 8 columnas nuevas (scope_* arrays + scope_all_* flags)
- CREATE/REPLACE get_accessible_tenant_ids()
- CREATE/REPLACE get_accessible_tenants()
- CREATE/REPLACE get_user_tenant_id()
- CREATE/REPLACE get_user_country_id()
- CREATE/REPLACE can_access_country()
- CREATE/REPLACE can_access_warehouse()
- CREATE/REPLACE can_access_client()
- CREATE/REPLACE create_user_invitation()
- CREATE/REPLACE handle_new_auth_user()
- CREATE _populate_user_scopes()
- Migración: INSERT INTO user_tenants/countries/warehouses/clients
```