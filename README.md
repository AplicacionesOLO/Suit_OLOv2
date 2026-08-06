# Suite OLO — Enterprise Application Hub

> **Plataforma centralizada de acceso, gobierno, seguridad y publicación de aplicaciones corporativas para Overseas Logistics Operations.**

---

## Tabla de Contenidos

1. [¿Qué es Suite OLO?](#qué-es-suite-olo)
2. [Arquitectura General](#arquitectura-general)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Cómo se organiza el código](#cómo-se-organiza-el-código)
6. [Sistema de Autenticación](#sistema-de-autenticación)
7. [Sistema de Permisos y Roles](#sistema-de-permisos-y-roles)
8. [Modelo Multi-Tenant](#modelo-multi-tenant)
9. [Contexto y Cascada Organizacional](#contexto-y-cascada-organizacional)
10. [Seguridad (RLS y Hardening)](#seguridad-rls-y-hardening)
11. [Sistema de Diseño (Temas)](#sistema-de-diseño-temas)
12. [Navegación y Layout](#navegación-y-layout)
13. [Páginas y sus Funcionalidades](#páginas-y-sus-funcionalidades)
14. [Servicios y Hooks](#servicios-y-hooks)
15. [Flujo de Datos](#flujo-de-datos)
16. [Cómo ejecutar el proyecto](#cómo-ejecutar-el-proyecto)
17. [Cómo contribuir](#cómo-contribuir)
18. [Roadmap](#roadmap)

---

## ¿Qué es Suite OLO?

Suite OLO es el **panel de control corporativo** de Overseas Logistics Operations. Funciona como un **hub centralizado** donde los empleados de OLO descubren, acceden y gestionan todas las aplicaciones empresariales de la compañía.

### El problema que resuelve

OLO opera en múltiples países (Costa Rica, Panamá, México, Colombia, etc.) con múltiples bodegas, clientes y aplicaciones. Antes de Suite OLO, cada aplicación tenía su propio login, sus propios permisos, y no había una visión unificada de quién podía acceder a qué. Suite OLO centraliza todo esto en un solo lugar con **seguridad Zero Trust**.

### Para quién es

| Rol | Qué puede hacer |
|-----|----------------|
| **Super Admin** | Ve todo — todos los países, tenants, usuarios, aplicaciones. Puede cambiar de contexto para auditar cualquier parte de la organización. |
| **Tenant Admin** | Administra su tenant (ej: OLO Costa Rica). Crea usuarios, asigna aplicaciones, configura seguridad. |
| **Country Admin** | Administra un país específico. Gestiona almacenes y clientes de ese país. |
| **Warehouse Admin** | Administra una bodega y sus clientes. |
| **Client Admin** | Administra un cliente específico y los usuarios que acceden a sus apps. |
| **Usuario final** | Ve solo las aplicaciones que le fueron asignadas. Las abre desde su panel "Mis Accesos". |
| **Auditor** | Solo lectura — ve logs de auditoría y actividad pero no modifica nada. |

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO (Navegador)                      │
├─────────────────────────────────────────────────────────────┤
│  React SPA (Vite + TypeScript + TailwindCSS)                 │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Login   │  │ Dashboard │  │ Mis Acc. │  │  Admin Pages │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
│       │              │              │               │         │
│  ┌────┴──────────────┴──────────────┴───────────────┴────┐  │
│  │              Context Providers                          │  │
│  │  AuthProvider → ThemeProvider → TenantContextProvider   │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────┴───────────────────────────────┐  │
│  │              Service Layer (@/services/)                 │  │
│  │  authService, usersService, accessService, etc.         │  │
│  └────────────────────────┬───────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS + JWT
┌───────────────────────────┼─────────────────────────────────┐
│                  SUPABASE                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ Auth (SSO)   │  │ Database     │  │ RLS Policies      │   │
│  │ Email/Pass   │  │ 20+ tablas   │  │ Multi-tenant      │   │
│  │ Google OAuth │  │ PostgreSQL   │  │ Row Level Sec.    │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

La aplicación es una **Single Page Application (SPA)** construida con React que se comunica directamente con Supabase. No hay servidor intermedio — React habla con Supabase mediante su SDK JavaScript. Toda la seguridad se aplica en la base de datos mediante **Row Level Security (RLS)**.

---

## Stack Tecnológico

| Capa | Tecnología | ¿Por qué? |
|------|-----------|-----------|
| **Frontend** | React 19 + TypeScript | Componentes tipados, rendimiento, ecosistema |
| **Build** | Vite 8 | Desarrollo ultrarrápido, HMR instantáneo |
| **Estilos** | TailwindCSS 3.4 + OKLCH | Utilidades atómicas + sistema de color perceptual |
| **Ruteo** | React Router 7 | Navegación SPA con guards de autenticación |
| **Backend** | Supabase | Auth, base de datos PostgreSQL, RLS, Edge Functions |
| **Íconos** | Remix Icon 4.5 + Font Awesome 6 | CDN, sin dependencias npm |
| **Gráficos** | Recharts 3 | Visualizaciones para dashboards |
| **Drag & Drop** | @dnd-kit 6 | Reordenamiento de favoritos |
| **i18n** | i18next 25 | Preparado para multi-idioma |
| **Fuentes** | Inter + JetBrains Mono | Google Fonts via CDN |

---

## Estructura de Archivos

```
suite-olo/
├── index.html                    # Entry point HTML, CDN links, SEO meta tags
├── package.json                  # Dependencias y scripts
├── tailwind.config.ts            # Config de Tailwind + sistema de color OKLCH
├── vite.config.ts                # Config de Vite (base path, plugins)
├── tsconfig.json                 # Config global de TypeScript
├── tsconfig.app.json             # Config TS para el código de la app
├── project_plan.md               # Plan completo del proyecto (fases, features, DB schema)
│
├── supabase/                     # Scripts SQL para Supabase
│   ├── hardening_rls_v3_1.sql         # RLS blindado (Parte 1/3)
│   ├── hardening_rls_v3_1_part2.sql   # RLS blindado (Parte 2/3)
│   ├── hardening_rls_v3_1_part3.sql   # RLS blindado (Parte 3/3)
│   └── phase_5.3_test_users.sql       # Usuarios de prueba para validar RLS
│
└── src/                          # Código fuente de la aplicación
    ├── main.tsx                  # Entry point React — monta <App />
    ├── App.tsx                   # Root component — providers + auth guard + router
    ├── index.css                 # Estilos globales, temas (OKLCH), animaciones
    │
    ├── router/
    │   ├── index.ts              # AppRoutes con useRoutes + navigatePromise global
    │   └── config.tsx            # Todas las rutas con RouteGuard
    │
    ├── components/
    │   ├── base/                 # Componentes atómicos reutilizables
    │   │   ├── Badge.tsx         # Badge de estado/severidad
    │   │   ├── Button.tsx        # Botón con variantes y loading state
    │   │   ├── Input.tsx         # Input con validación visual
    │   │   ├── Modal.tsx         # Modal animado con backdrop
    │   │   └── MultiSelect.tsx   # Selector múltiple con búsqueda
    │   │
    │   └── feature/              # Componentes compuestos de funcionalidad
    │       ├── AppLayout.tsx     # Shell principal: Sidebar + Topbar + contenido
    │       ├── AuthGuard.tsx     # Protege rutas — redirige a login si no autenticado
    │       ├── RouteGuard.tsx    # Protege rutas por permisos — redirige a 403
    │       ├── Sidebar.tsx       # Navegación lateral colapsable
    │       └── Topbar.tsx        # Barra superior con breadcrumb, contexto, avatar
    │
    ├── pages/                    # Páginas (una carpeta por ruta)
    │   ├── login/page.tsx               # Login con email/password + Google OAuth
    │   ├── forgot-password/page.tsx      # Recuperación de contraseña
    │   ├── auth-callback/page.tsx        # Callback OAuth de Supabase
    │   ├── dashboard/page.tsx            # Enterprise Application Hub
    │   ├── my-access/                    # Mis Accesos (apps del usuario)
    │   │   ├── page.tsx                  # Página principal
    │   │   └── components/
    │   │       └── FavoritesSection.tsx  # Sección de favoritos con DnD
    │   ├── workspace/page.tsx            # Workspace embebido (iframe/SSO)
    │   ├── categories/page.tsx           # CRUD de categorías
    │   ├── applications/page.tsx         # CRUD de aplicaciones
    │   ├── instances/page.tsx            # CRUD de instancias por tenant
    │   ├── catalog/page.tsx              # Catálogo empresarial
    │   ├── assignments/page.tsx          # Asignación de apps a tenants/roles
    │   ├── integration/page.tsx          # Config SSO/JWT/dominios
    │   ├── roles/page.tsx                # Roles CRUD empresarial
    │   ├── app-access/page.tsx           # Gestión de accesos a apps
    │   ├── audit/page.tsx                # Auditoría con filtros y exportación
    │   ├── security-settings/page.tsx    # Config de seguridad por tenant
    │   ├── profile/page.tsx              # Perfil del usuario
    │   ├── sessions/page.tsx             # Sesiones activas
    │   ├── security-alerts/page.tsx      # Centro de alertas
    │   ├── countries/page.tsx            # CRUD de países
    │   ├── warehouses/page.tsx           # CRUD de almacenes
    │   ├── clients/page.tsx              # CRUD de clientes
    │   ├── users/                        # Gestión de usuarios
    │   │   ├── page.tsx                  # Tabla de usuarios + invitaciones
    │   │   └── components/
    │   │       └── EditUserModal.tsx     # Modal crear/editar usuario
    │   ├── tenants/
    │   │   ├── page.tsx                  # Lista de tenants
    │   │   └── detail.tsx                # Detalle de tenant
    │   ├── rls-test/page.tsx             # Validación de RLS (solo dev)
    │   ├── placeholders/page.tsx         # Placeholder para módulos pendientes
    │   ├── AccessDenied.tsx              # Página 403
    │   └── NotFound.tsx                  # Página 404
    │
    ├── services/                  # Capa de acceso a datos
    │   ├── supabase/
    │   │   └── client.ts                 # Cliente Supabase singleton
    │   ├── auth/
    │   │   ├── authService.ts            # Login, logout, Google OAuth, sesión
    │   │   ├── contextService.ts         # Contexto organizacional del usuario
    │   │   └── usersService.ts           # CRUD de usuarios + RPCs de contexto
    │   ├── applications/
    │   │   └── applicationsService.ts    # CRUD de aplicaciones e instancias
    │   ├── catalog/
    │   │   └── countryCatalogService.ts  # Catálogo de países (REST Countries API)
    │   ├── operations/
    │   │   ├── countriesService.ts       # CRUD de países
    │   │   ├── tenantsService.ts         # CRUD de tenants
    │   │   ├── warehousesService.ts      # CRUD de almacenes
    │   │   └── clientsService.ts         # CRUD de clientes
    │   └── security/
    │       ├── accessService.ts          # Accesos a aplicaciones
    │       ├── alertsService.ts          # Alertas de seguridad
    │       ├── auditService.ts           # Logs de auditoría
    │       ├── favoritesService.ts       # Favoritos del usuario
    │       ├── permissionsService.ts     # Matriz de permisos
    │       ├── rolesService.ts           # Roles CRUD
    │       ├── sessionsService.ts        # Sesiones activas
    │       └── settingsService.ts        # Config de seguridad
    │
    ├── hooks/                     # Custom hooks (lógica de negocio)
    │   ├── useAuth.tsx                   # AuthProvider + useAuth hook
    │   ├── useTenantContext.tsx          # TenantContextProvider + cascada
    │   ├── useTheme.tsx                  # ThemeProvider (dark/light)
    │   ├── useApplicationAccess.ts       # Accesos del usuario actual
    │   ├── useAuditLogs.ts               # Logs de auditoría
    │   ├── useClients.ts                 # Clientes
    │   ├── useCountries.ts               # Países
    │   ├── useFavorites.ts               # Favoritos
    │   ├── usePermissions.ts             # Permisos
    │   ├── useRoles.ts                   # Roles
    │   ├── useSecurityAlerts.ts          # Alertas de seguridad
    │   ├── useSecuritySettings.ts        # Config de seguridad
    │   ├── useSessions.ts                # Sesiones
    │   ├── useSuitePermissions.ts        # Control de acceso a módulos/menú
    │   ├── useTenants.ts                 # Tenants
    │   ├── useUsers.ts                   # Usuarios
    │   ├── useWarehouses.ts              # Almacenes
    │   └── useWorldCountries.ts          # Búsqueda de países (REST API)
    │
    ├── utils/                     # Utilidades
    │   ├── groupApps.ts                  # Agrupamiento jerárquico de apps
    │   ├── organizationCascade.ts        # Validación de cascada organizacional
    │   ├── sanitize.ts                   # Sanitización de strings
    │   └── tenant.ts                     # Utilidades de tenant
    │
    ├── types/
    │   └── organization.ts               # Tipos compartidos (Country, Tenant, etc.)
    │
    └── i18n/                      # Internacionalización (preparado)
        ├── index.ts
        └── local/
            └── index.ts
```

---

## Cómo se organiza el código

Suite OLO sigue una arquitectura de **tres capas** bien definidas:

### Capa 1: Páginas (`src/pages/`)

Cada página es un componente React que representa una ruta. Las páginas **no llaman a Supabase directamente**. Usan hooks para obtener datos y delegar lógica.

```tsx
// Ejemplo simplificado de una página
export default function CountriesPage() {
  const { countries, loading, error, create, remove } = useCountries();
  // renderiza tabla, formularios, etc.
}
```

### Capa 2: Hooks (`src/hooks/`)

Los hooks son la **capa de lógica de negocio**. Cada hook encapsula el estado (loading, error, datos) y las operaciones (crear, editar, eliminar) de una entidad. Los hooks llaman a los servicios.

```tsx
// Ejemplo simplificado de un hook
export function useCountries() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCountries = async () => {
    const data = await countriesService.fetchAll();
    setCountries(data);
    setLoading(false);
  };

  return { countries, loading, fetchCountries };
}
```

### Capa 3: Servicios (`src/services/`)

Los servicios son la **única capa que habla con Supabase**. Cada archivo contiene funciones puras que ejecutan queries SQL mediante el SDK de Supabase. Ningún componente o hook llama a `supabase.from()` directamente.

```tsx
// Ejemplo simplificado de un servicio
export async function fetchCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (error) throw error;
  return data;
}
```

### ¿Por qué esta separación?

1. **Si cambia la base de datos**, solo tocás los servicios.
2. **Si cambia la UI**, solo tocás las páginas.
3. **Los hooks son reutilizables** entre páginas.
4. **Testear es más fácil** porque cada capa tiene una responsabilidad clara.

---

## Sistema de Autenticación

### Flujo completo de login

```
Usuario visita /login
       │
       ▼
┌─────────────────┐
│  Login Page      │  ← Formulario email/password + botón Google
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Email/Pass  Google OAuth
    │         │
    │         └──→ Redirige a Google → Callback → Supabase Auth
    │
    ▼
┌─────────────────┐
│  authService     │  ← loginWithEmail() o loginWithGoogle()
│  (Supabase Auth) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JWT + Session   │  ← Supabase devuelve token + datos del usuario
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AuthProvider    │  ← Guarda session, user, platformUser en React Context
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redirección     │  ← roleLevel >= 50 → /dashboard
│                   │     roleLevel < 50  → /my-access
└─────────────────┘
```

### AuthProvider (`src/hooks/useAuth.tsx`)

Es un **React Context** que envuelve toda la aplicación y provee:

| Propiedad/Método | Descripción |
|-----------------|-------------|
| `session` | Sesión actual de Supabase (JWT, expiración, etc.) |
| `user` | Datos del usuario autenticado (email, ID, metadata) |
| `platformUser` | Datos extendidos del usuario desde `platform_users` (rol, tenant, país) |
| `login(email, password)` | Inicia sesión con email/contraseña |
| `loginGoogle()` | Redirige a Google OAuth |
| `logout()` | Cierra sesión y redirige a /login |
| `resetPassword(email)` | Envía email de recuperación |
| `isAuthenticated` | `true` si hay sesión activa |
| `loading` | `true` mientras se verifica la sesión inicial |

### AuthGuard (`src/components/feature/AuthGuard.tsx`)

Protege las rutas. Si el usuario no está autenticado y trata de acceder a `/dashboard`, lo redirige a `/login`. Si ya está autenticado y va a `/login`, lo redirige a su página principal.

### Supabase Client Singleton

El cliente de Supabase se crea **una sola vez** en `src/services/supabase/client.ts`. Incluye un manejador global de errores que detecta tokens expirados y cierra la sesión automáticamente, evitando que el usuario quede en un estado roto.

---

## Sistema de Permisos y Roles

### Jerarquía de roles

```
Super Admin (level 100) — Ve y gestiona TODO
  │
  ├── Tenant Admin (level 80) — Gestiona su tenant
  │     │
  │     ├── Country Admin (level 60) — Gestiona su país
  │     │     │
  │     │     ├── Warehouse Admin (level 40) — Gestiona su bodega
  │     │     │     │
  │     │     │     ├── Client Admin (level 30) — Gestiona su cliente
  │     │     │     │     │
  │     │     │     │     └── User (level 10) — Solo apps asignadas
  │     │     │     │
  │     │     │     └── ...
  │     │     │
  │     │     └── ...
  │     │
  │     └── Auditor (level 50) — Solo lectura de auditoría
  │
  └── ...
```

Cada rol tiene un `level` numérico. Las funciones RLS en la base de datos comparan `get_user_role_level()` con estos niveles para decidir si el usuario puede ver/editar/eliminar datos.

### Permisos de módulo

Además de los roles jerárquicos, existe un sistema de **permisos por módulo**. Cada módulo del sistema (dashboard, countries, users, etc.) tiene acciones (view, create, edit, delete).

El hook `useSuitePermissions` consulta los permisos del usuario y expone:

- `hasMenuAccess(module)` — ¿Este usuario puede ver este ítem en la sidebar?
- `can(module, action)` — ¿Este usuario puede ejecutar esta acción?

RouteGuard usa esto para bloquear páginas enteras. La sidebar oculta ítems que el usuario no debería ver.

---

## Modelo Multi-Tenant

### La jerarquía organizacional

```
PAÍS ↔ TENANT (relación N:M vía tenant_countries)
       │
       ▼
   ALMACÉN (pertenece a un país + tenant)
       │
       ▼
    CLIENTE (pertenece a un almacén)
       │
       ▼
    USUARIO (pertenece a un cliente, puede tener múltiples vía scope)
       │
       ▼
 APLICACIÓN (asignada al usuario vía user_application_access)
```

### ¿Qué es un Tenant?

Un **tenant** es una división organizacional de OLO. Por ejemplo: "OLO Costa Rica", "OLO Panamá", "OLO México". Cada tenant tiene sus propios usuarios, aplicaciones, bodegas y clientes. Un Super Admin puede ver todos los tenants. Un Tenant Admin solo ve el suyo.

### Tablas puente (Bridge Tables)

Para soportar que un usuario pueda tener acceso a **múltiples** tenants, países, almacenes y clientes, existen 4 tablas puente:

| Tabla | Relación |
|-------|---------|
| `user_tenants` | Usuario ↔ Tenants que puede ver |
| `user_countries` | Usuario ↔ Países que puede ver |
| `user_warehouses` | Usuario ↔ Almacenes que puede ver |
| `user_clients` | Usuario ↔ Clientes que puede ver |

Cuando un admin crea un usuario, puede asignarle uno o varios alcances. El usuario verá datos de todos los tenants/países/clientes que tenga asignados.

### Scope Global

Un usuario puede tener flags `scope_all_*` que le dan acceso a **todos** los registros de ese nivel sin necesidad de estar en la tabla puente. Por ejemplo, un Super Admin tiene `scope_all_tenants = true`.

---

## Contexto y Cascada Organizacional

### El problema

Imaginate que sos un Super Admin que necesita auditar lo que ve un usuario de OLO Panamá. O sos un Country Admin de Costa Rica que también tiene acceso a Nicaragua. ¿Cómo sabe el sistema qué datos mostrarte en cada momento?

### La solución: TenantContextProvider

El `TenantContextProvider` (`src/hooks/useTenantContext.tsx`) mantiene el **contexto activo** del usuario:

| Propiedad | Significado |
|-----------|-------------|
| `currentCountryId` | País activo (puede ser override) |
| `currentTenantId` | Tenant activo (puede ser override) |
| `currentWarehouseId` | Almacén activo (puede ser override) |
| `currentClientId` | Cliente activo (puede ser override) |
| `tenantOverrideActive` | ¿El usuario está viendo un tenant diferente al suyo? |
| `accessibleTenants` | Lista de tenants que este usuario PUEDE ver |
| `accessibleCountries` | Lista de países que este usuario PUEDE ver |

### Cambio de contexto

En la Topbar, los usuarios con múltiples tenants/países ven **dropdowns** para cambiar de contexto:

```
[ 🌎 Costa Rica ▼ ]  [ 🏢 OLO CR ▼ ]  [ 🔔 ] [ 👤 ]
```

Cuando cambiás de país, el sistema:
1. Llama al RPC `set_country_context_override(country_id)` en Supabase
2. Registra el cambio en `audit_logs`
3. Limpia los contextos inferiores (tenant, warehouse, cliente) porque la cascada cambió
4. Refresca todas las listas accesibles
5. Todas las queries RLS ahora filtran por el nuevo país

### Cascada País → Tenant → Cliente

La utilidad `src/utils/organizationCascade.ts` contiene todas las funciones de validación:

- `getTenantsByCountry()` — ¿Qué tenants operan en este país? (vía N:M `tenant_countries`)
- `getWarehousesByCountryTenant()` — ¿Qué bodegas hay en este país + tenant?
- `getClientsByWarehouse()` — ¿Qué clientes están en esta bodega?
- `validateFullCascade()` — Antes de guardar un usuario, valida que toda la cadena País → Tenant → Cliente sea consistente

---

## Seguridad (RLS y Hardening)

### ¿Qué es RLS?

**Row Level Security** es un mecanismo de PostgreSQL que filtra automáticamente las filas que un usuario puede ver/modificar. Cada query que la aplicación hace a Supabase pasa por las políticas RLS.

Ejemplo: Cuando un Tenant Admin de Costa Rica hace `SELECT * FROM clients`, PostgreSQL automáticamente agrega `WHERE tenant_id = 'CR'` gracias a las políticas RLS. El frontend **no necesita** pasar el tenant_id — la base de datos lo resuelve.

### Las políticas RLS

El archivo `supabase/hardening_rls_v3_1.sql` (y sus partes 2 y 3) contiene **todas** las políticas RLS del sistema. Se ejecutan una sola vez en el SQL Editor de Supabase.

Tablas protegidas: `tenants`, `countries`, `warehouses`, `clients`, `roles`, `profiles`, `permissions`, `applications`, `application_instances`, `application_categories`, `user_application_access`, `audit_logs`, `tenant_settings`, `platform_users`.

### Soft Delete

Cuando un admin "elimina" un rol, perfil, permiso, etc., en realidad se hace un **soft delete**: se marca `deleted_at = NOW()` y `deleted_by = current_user`. El registro sigue en la base de datos pero es invisible para las queries normales. Esto permite auditoría completa y recuperación.

La función `soft_delete_record()` en PostgreSQL maneja esto de forma dinámica — detecta automáticamente si la tabla tiene columnas `deleted_at`/`deleted_by` y construye el UPDATE.

### Auditoría obligatoria

Las operaciones críticas (soft delete, revocar acceso) usan `write_audit_log_strict()` que **fuerza un ROLLBACK** si la auditoría falla. Esto garantiza que ninguna operación sensible ocurra sin dejar registro.

### Tests de seguridad

La página `/rls-test` (solo accesible con `VITE_ENABLE_RLS_TEST=true`) ejecuta queries reales contra Supabase y verifica que las políticas RLS funcionan correctamente para cada rol.

---

## Sistema de Diseño (Temas)

### Cómo funciona

Suite OLO usa **OKLCH** como espacio de color en vez de HEX o RGB. OKLCH es un espacio de color perceptual donde la luminosidad, chroma (saturación) y hue (tono) son independientes. Esto permite:

1. **Generar escalas completas** desde un solo color base
2. **Dark mode y light mode** intercambiando valores de luminosidad
3. **Colores que se ven bien** en todas las pantallas

### Las 5 escalas de color

| Escala | Uso |
|--------|-----|
| `background` | Fondo de página, cards, paneles |
| `primary` | Color principal de marca — botones CTA, links, acentos |
| `accent` | Segundo color de acento — badges, highlights, indicadores |
| `secondary` | Color de soporte — bordes, placeholders, elementos secundarios |
| `foreground` | Color de texto — desde titulos (950) hasta texto muy claro (50) |

Cada escala tiene 11 pasos: 50, 100, 200, ..., 950.

### Dark Mode vs Light Mode

Las variables CSS están definidas dos veces en `index.css`:

```css
:root {
  /* Dark mode (default) */
  --primary-500: 0.65 0.18 170;  /* Verde esmeralda vibrante */
  --background-50: 0.16 0.012 255; /* Fondo oscuro profundo */
}

[data-theme="light"] {
  /* Light mode */
  --primary-500: 0.58 0.20 170;  /* Verde ajustado para fondo claro */
  --background-50: 0.990 0.002 95; /* Fondo casi blanco */
}
```

El atributo `data-theme` en `<html>` determina qué modo está activo. El `ThemeProvider` persiste la preferencia en localStorage.

### Tailwind y OKLCH

En `tailwind.config.ts`, los colores se definen usando `oklch(var(--primary-500) / <alpha-value>)`. Esto permite usar clases como `bg-primary-500`, `text-foreground-950`, etc., que automáticamente respetan el tema activo.

### Componentes glass

Las clases `.glass-panel` y `.glass-panel-strong` aplican un efecto de vidrio esmerilado en dark mode. En light mode, los overrides en `index.css` reemplazan el blur por un fondo sólido con borde, porque el efecto glass no se ve bien sobre fondos claros.

---

## Navegación y Layout

### AppLayout (`src/components/feature/AppLayout.tsx`)

Es el **shell** de la aplicación para páginas autenticadas:

```
┌──────────────────────────────────────────────────────┐
│  TOPBAR (fixed, 60px)                                │
│  [🌎 CR ▼] [🏢 OLO CR ▼] ...           [🔔] [👤]  │
├────────┬─────────────────────────────────────────────┤
│SIDEBAR │                                             │
│(fixed) │  CONTENIDO DE LA PÁGINA                    │
│        │                                             │
│  Dash. │  Scrollable, padding 24-32px               │
│  Mis A.│                                             │
│  ────  │                                             │
│  Países│                                             │
│  Tenant│                                             │
│  Almac.│                                             │
│  Client│                                             │
│  Usuar.│                                             │
│  ────  │                                             │
│  Categ.│                                             │
│  Apps  │                                             │
│  Inst. │                                             │
│  ────  │                                             │
│  Roles │                                             │
│  Acces.│                                             │
│        │                                             │
│ [👤]   │                                             │
│ [☰]   │                                             │
└────────┴─────────────────────────────────────────────┘
```

### Sidebar

- **Colapsable**: haciendo clic en el botón `☰`, se reduce a solo iconos (68px de ancho)
- **Grupos expandibles**: Principal, Organización, Aplicaciones, Seguridad
- **Ítems por permisos**: solo se muestran los módulos que el usuario puede ver
- **Indicador activo**: un punto verde + highlight en el ítem actual

### Topbar

- **Selectores de contexto**: País → Tenant (solo visibles si el usuario tiene múltiples)
- **Modo "Ver Todo"**: para Super Admins, permite desactivar el filtro de contexto
- **Búsqueda global**: (placeholder, preparado para implementar)
- **Notificaciones**: campanita
- **Avatar**: click → perfil

### Ruteo

El archivo `src/router/config.tsx` define todas las rutas como un array de `RouteObject`. Cada ruta autenticada está envuelta en `<RouteGuard>` que verifica permisos.

`window.REACT_APP_NAVIGATE` es una referencia global al `navigate` de React Router, para poder redirigir desde servicios sin necesidad de hooks.

---

## Páginas y sus Funcionalidades

### 🔐 Autenticación

| Página | Ruta | Descripción |
|--------|------|-------------|
| Login | `/login` | Email/password + botón "Continuar con Google". Validación visual de errores. |
| Recuperar contraseña | `/forgot-password` | Envía magic link al email. Feedback visual de éxito/error. |
| Auth Callback | `/auth/callback` | Recibe el callback de Google OAuth, procesa el token. |

### 📊 Principal

| Página | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | Enterprise Hub: estadísticas, apps recientes, accesos rápidos. |
| Mis Accesos | `/my-access` | Apps autorizadas del usuario con búsqueda, favoritos DnD, apertura embebida/externa. |
| Workspace | `/workspace/:id` | Iframe/SSO para apps que se abren dentro de Suite OLO. |

### 🏢 Organización

| Página | Ruta | Descripción |
|--------|------|-------------|
| Países | `/countries` | Tabla con banderas, monedas, contadores de almacenes/clientes. Autocomplete de países vía REST Countries API. |
| Tenants | `/tenants` | Lista y detalle de tenants con países asociados. |
| Almacenes | `/warehouses` | CRUD con filtros por país y tenant, direcciones. |
| Clientes | `/clients` | CRUD con filtros por almacén, país, tenant. |
| Usuarios | `/users` | Tabla de platform_users, invitaciones, modal con cascada País→Tenant→Cliente. |

### 📱 Aplicaciones

| Página | Ruta | Descripción |
|--------|------|-------------|
| Categorías | `/categories` | CRUD con iconos y colores. |
| Aplicaciones | `/applications` | Catálogo de apps con versión, estado, tipo de integración. |
| Instancias | `/instances` | Instancias de apps por tenant con URLs, SSO, iframe config. |
| Asignaciones | `/assignments` | Asignar apps a tenants y roles. |

### 🔒 Seguridad

| Página | Ruta | Descripción |
|--------|------|-------------|
| Roles y Permisos | `/roles` | CRUD de roles + matriz granular de permisos. |
| Apps Asignadas | `/app-access` | Aprobar/revocar/denegar accesos de usuarios a apps. |
| Auditoría | `/audit` | Logs con filtros avanzados, timeline, exportación CSV. |
| Config Seguridad | `/security-settings` | MFA, sesiones, password policy por tenant. |
| Sesiones | `/sessions` | Sesiones activas con riesgo, geolocalización, revocación. |
| Alertas | `/security-alerts` | Centro de alertas con severidades. |
| Perfil | `/profile` | Info personal, apps autorizadas, permisos, actividad. |

### 🧪 Desarrollo

| Página | Ruta | Descripción |
|--------|------|-------------|
| RLS Test | `/rls-test` | Solo con `VITE_ENABLE_RLS_TEST=true`. Valida las 14 tablas contra RLS. |

---

## Servicios y Hooks

### Relación Hooks ↔ Servicios

Cada entidad del sistema sigue el mismo patrón:

```
Página → usa → Hook → llama → Servicio → consulta → Supabase
```

| Entidad | Hook | Servicio |
|---------|------|----------|
| Auth / Sesión | `useAuth` | `authService` |
| Contexto Org | `useTenantContext` | `contextService` + `usersService` |
| Países | `useCountries` | `countriesService` |
| Tenants | `useTenants` | `tenantsService` |
| Almacenes | `useWarehouses` | `warehousesService` |
| Clientes | `useClients` | `clientsService` |
| Usuarios | `useUsers` | `usersService` |
| Roles | `useRoles` | `rolesService` |
| Permisos | `usePermissions` | `permissionsService` |
| Accesos a Apps | `useApplicationAccess` | `accessService` |
| Favoritos | `useFavorites` | `favoritesService` |
| Auditoría | `useAuditLogs` | `auditService` |
| Config Seguridad | `useSecuritySettings` | `settingsService` |
| Sesiones | `useSessions` | `sessionsService` |
| Alertas | `useSecurityAlerts` | `alertsService` |
| Búsqueda Países | `useWorldCountries` | `countryCatalogService` |
| Permisos Módulo | `useSuitePermissions` | `permissionsService` |

### Cómo agregar una nueva entidad

1. **Crear el servicio** en `src/services/[area]/[entidad]Service.ts` con funciones `fetchAll()`, `create()`, `update()`, `delete()`
2. **Crear el hook** en `src/hooks/use[Nombre].ts` que use `useState` + `useEffect` + el servicio
3. **Crear la página** en `src/pages/[nombre]/page.tsx` que use el hook
4. **Agregar la ruta** en `src/router/config.tsx`
5. **Agregar al sidebar** en `src/components/feature/Sidebar.tsx`

---

## Flujo de Datos

### Cómo se carga una página típica (ej: Países)

```
1. Usuario navega a /countries
2. React Router renderiza <CountriesPage />
   │
3. CountriesPage llama a useCountries()
   │
4. useCountries() inicia con loading=true
   │
5. useEffect dispara countriesService.fetchAll()
   │
6. countriesService llama a supabase.from('countries').select('*')
   │
7. Supabase recibe la query
   │
8. PostgreSQL aplica RLS:
   - Super Admin → ve todos los países
   - Tenant Admin → filtra por tenant_id = get_user_tenant_id()
   - Usuario normal → filtra por user_countries bridge table
   │
9. PostgreSQL devuelve solo las filas autorizadas
   │
10. Supabase devuelve los datos al servicio
   │
11. Servicio devuelve datos al hook
   │
12. Hook actualiza estado: loading=false, countries=[...]
   │
13. Página re-renderiza con la tabla de países
```

### Estados de UI

Todas las páginas manejan consistentemente:

- **🟡 Loading** — Skeleton cards/pills animados
- **🟢 Success** — Datos renderizados normalmente
- **🔴 Error** — Mensaje de error + botón de reintentar
- **⚪ Empty** — Ilustración + mensaje + CTA para crear el primer registro

---

## Cómo ejecutar el proyecto

### Requisitos

- **Node.js** 18 o superior
- **npm** 9 o superior
- Una cuenta de **Supabase** con el proyecto configurado

### Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd suite-olo

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Copiá .env.example a .env y completá con tus credenciales de Supabase:
# VITE_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
# VITE_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# 4. Ejecutar scripts SQL en Supabase (en orden):
#    - supabase/hardening_rls_v3_1.sql
#    - supabase/hardening_rls_v3_1_part2.sql
#    - supabase/hardening_rls_v3_1_part3.sql
#    - supabase/phase_5.3_test_users.sql

# 5. Iniciar servidor de desarrollo
npm run dev
```

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia Vite en modo desarrollo (HMR) |
| `npm run build` | Compila para producción en `dist/` |
| `npm run preview` | Previsualiza la build de producción |
| `npm run lint` | Ejecuta ESLint en todo el código |
| `npm run type-check` | Verifica tipos de TypeScript sin emitir |

---

## Cómo contribuir

### Reglas del proyecto

1. **Nunca llames a `supabase.from()` en una página o componente.** Usá servicios.
2. **Nunca uses `../` en imports.** Usá `@/` (ej: `import { useAuth } from '@/hooks/useAuth'`).
3. **Nunca hardcodees colores.** Usá las clases de Tailwind con las escalas (`bg-primary-500`, `text-foreground-950`).
4. **No uses azul ni púrpura.** La paleta es verde esmeralda (primary) + cyan (accent).
5. **No uses shadows.** Los bordes y el layering se logran con fondos y bordes.
6. **Todas las páginas deben tener estados: loading, empty, error, success.**
7. **No generes páginas de administración de Supabase.** Los usuarios administran datos desde Supabase Dashboard.
8. **No modifiques `src/router/index.ts`.** Solo agregá rutas en `config.tsx`.
9. **No uses `alert()`.** Implementá modales o mensajes inline.
10. **Mantené los archivos bajo 500 líneas.** Si crece, extraé a componentes.

### Antes de hacer commit

```bash
npm run type-check   # Sin errores de tipos
npm run lint         # Sin warnings
npm run build        # Build limpio
```

---

## Roadmap

### ✅ Completado

- Autenticación (email + Google OAuth)
- Dashboard Enterprise Hub
- CRUD completo: países, tenants, almacenes, clientes, usuarios
- CRUD completo: categorías, aplicaciones, instancias
- Asignación de apps a tenants/roles
- Roles y matriz de permisos granular
- Mis Accesos con favoritos DnD
- Workspace embebido (iframe/SSO)
- Auditoría con filtros, timeline y exportación CSV
- Configuración de seguridad por tenant
- Sesiones activas con monitoreo
- Centro de alertas de seguridad
- Cambio de contexto multi-tenant (País, Tenant, Cliente)
- RLS blindado con 25 tests críticos
- Soft delete dinámico con auditoría obligatoria

### ⏳ Pendiente

- **Fase 8:** Dashboard Ejecutivo con métricas agregadas y drill-down jerárquico
- **Fase 9:** Mejora de Auditoría/Logs
- **Fase 10:** Sistema de Notificaciones
- **Fase 11:** Reportes (Excel/CSV/PDF)
- Búsqueda global en Topbar
- Fotos de perfil de usuario
- 2FA/MFA configurable por usuario

### 📋 Postergado

- `application_scopes` — App pertenece a múltiples clientes (se revisará cuando haya 50+ clientes y 100+ apps)
- `instance_scopes` — Depende de application_scopes

---

## Glosario

| Término | Significado |
|---------|-------------|
| **Tenant** | División organizacional de OLO (ej: OLO Costa Rica, OLO Panamá) |
| **RLS** | Row Level Security — PostgreSQL filtra filas automáticamente según el usuario |
| **JWT** | JSON Web Token — token de autenticación que Supabase genera al hacer login |
| **RPC** | Remote Procedure Call — funciones PostgreSQL que se llaman desde el frontend |
| **Soft Delete** | Marcar un registro como eliminado sin borrarlo físicamente |
| **Cascada** | Relación jerárquica País → Tenant → Almacén → Cliente |
| **Contexto** | País/Tenant/Almacén/Cliente activo que determina qué datos ve el usuario |
| **Override** | Cuando un admin cambia temporalmente su contexto para ver otro tenant/país |
| **OKLCH** | Espacio de color perceptual usado para los temas |
| **Glass Panel** | Efecto de vidrio esmerilado en dark mode |
| **SPA** | Single Page Application — la app carga una sola vez y navega sin recargar |
| **HMR** | Hot Module Replacement — los cambios en código se reflejan instantáneamente |

---

*Suite OLO — v1.0. Hecho con 💚 por el equipo de Overseas Logistics Operations.*