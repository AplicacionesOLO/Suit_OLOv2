-- ============================================================
-- SUITE OLO — MULTI-TENANT HARDENING RLS
-- Versión: 1.0.0
-- Fecha:   2026-06-15
-- 
-- ⛔ EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR:
--    https://supabase.com/dashboard/project/_/sql
-- 
-- 🎯 Objetivo:
--    Eliminar políticas permisivas, completar RLS faltantes,
--    y blindar la arquitectura multi-tenant a nivel base de datos.
--
-- 📋 Orden de ejecución:
--    1. Eliminar políticas inseguras
--    2. Reconstruir RLS de tenants (rol-aware)
--    3. Completar RLS faltantes por tabla
--    4. Mejorar trigger de auto-registro
--    5. Verificación final
-- ============================================================

BEGIN;

-- ============================================================
-- SECCIÓN 1: ELIMINAR POLÍTICAS INSEGURAS
-- ============================================================

-- ❌ tenant_select_all: permitía a CUALQUIER authenticated ver TODOS los tenants
--    Esto es un agujero de seguridad enterprise-level.
--    Reemplazada por tenant_select_admin (solo Super Admin ve todo).
DROP POLICY IF EXISTS tenant_select_all ON public.tenants;

-- ❌ tenant_select: solo permitía ver el tenant propio via get_user_tenant_id()
--    Pero si get_user_tenant_id() retorna NULL (usuario sin platform_user),
--    el usuario no ve NADA. La reemplazamos con políticas rol-aware.
DROP POLICY IF EXISTS tenant_select ON public.tenants;


-- ============================================================
-- SECCIÓN 2: RECONSTRUIR RLS DE TENANTS (ROL-AWARE)
-- ============================================================

-- Política 1: Super Admin (level >= 100) ve TODOS los tenants
-- Esto permite al Super Admin cambiar de contexto entre tenants
CREATE POLICY tenant_select_admin ON public.tenants
    FOR SELECT
    TO authenticated
    USING (public.get_user_role_level() >= 100);

-- Política 2: Usuarios normales solo ven SU tenant asignado
-- get_user_tenant_id() respeta tenant_context_override si el Super Admin
-- cambió de contexto, o retorna el tenant_id del platform_user
CREATE POLICY tenant_select_own ON public.tenants
    FOR SELECT
    TO authenticated
    USING (
        id = public.get_user_tenant_id()
        AND public.get_user_role_level() < 100
    );

-- NOTA: PostgreSQL aplica OR entre políticas PERMISSIVE.
-- Super Admin level=100 → tenant_select_admin (true para todas las rows)
-- Usuario normal level<100 → tenant_select_own (solo su tenant)


-- ============================================================
-- SECCIÓN 3: RLS FALTANTES — platform_users
-- ============================================================

-- Situación actual: SELECT, INSERT (solo self), UPDATE (solo self)
-- Faltan: INSERT para admins, UPDATE para admins, DELETE (soft)

-- Permitir que Tenant Admin+ cree platform_users dentro de su tenant
-- (usado para invitaciones y gestión de usuarios)
DROP POLICY IF EXISTS platform_users_insert_admin ON public.platform_users;
CREATE POLICY platform_users_insert_admin ON public.platform_users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

-- Permitir que Tenant Admin+ actualice cualquier platform_user de su tenant
-- (cambiar rol, estado, país, almacén, cliente asignado)
DROP POLICY IF EXISTS platform_users_update_admin ON public.platform_users;
CREATE POLICY platform_users_update_admin ON public.platform_users
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    )
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

-- Permitir que Super Admin o Tenant Admin desactiven usuarios (soft delete)
-- No permitimos DELETE real, solo UPDATE status = 'inactive'
-- (el UPDATE anterior ya cubre esto, pero documentamos la intención)


-- ============================================================
-- SECCIÓN 4: RLS FALTANTES — roles
-- ============================================================

-- Situación actual: solo SELECT (tenant_id = get_user_tenant_id())
-- Faltan: INSERT, UPDATE, DELETE para Tenant Admin+

DROP POLICY IF EXISTS roles_insert ON public.roles;
CREATE POLICY roles_insert ON public.roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS roles_update ON public.roles;
CREATE POLICY roles_update ON public.roles
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    )
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS roles_delete ON public.roles;
CREATE POLICY roles_delete ON public.roles
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
        AND is_system = false  -- Nunca eliminar roles del sistema
    );


-- ============================================================
-- SECCIÓN 5: RLS FALTANTES — profiles
-- ============================================================

-- Situación actual: solo SELECT (tenant_id = get_user_tenant_id())
-- Faltan: INSERT, UPDATE, DELETE para Tenant Admin+

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    )
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete ON public.profiles
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
        AND is_default = false  -- Nunca eliminar perfiles default
    );


-- ============================================================
-- SECCIÓN 6: RLS FALTANTES — permissions
-- ============================================================

-- Situación actual: solo SELECT (tenant_id = get_user_tenant_id())
-- Faltan: INSERT, UPDATE, DELETE para Tenant Admin+

DROP POLICY IF EXISTS permissions_insert ON public.permissions;
CREATE POLICY permissions_insert ON public.permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS permissions_update ON public.permissions;
CREATE POLICY permissions_update ON public.permissions
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    )
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS permissions_delete ON public.permissions;
CREATE POLICY permissions_delete ON public.permissions
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );


-- ============================================================
-- SECCIÓN 7: RLS FALTANTES — tenant_settings
-- ============================================================

-- Situación actual: solo SELECT (tenant_id = get_user_tenant_id())
-- Faltan: INSERT, UPDATE, DELETE para Tenant Admin+

DROP POLICY IF EXISTS tenant_settings_insert ON public.tenant_settings;
CREATE POLICY tenant_settings_insert ON public.tenant_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS tenant_settings_update ON public.tenant_settings;
CREATE POLICY tenant_settings_update ON public.tenant_settings
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    )
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS tenant_settings_delete ON public.tenant_settings;
CREATE POLICY tenant_settings_delete ON public.tenant_settings
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );


-- ============================================================
-- SECCIÓN 8: RLS FALTANTES — user_application_access
-- ============================================================

-- Situación actual: solo SELECT (tenant_id = get_user_tenant_id())
-- Faltan: INSERT, UPDATE, DELETE para Tenant Admin+

DROP POLICY IF EXISTS user_app_access_insert ON public.user_application_access;
CREATE POLICY user_app_access_insert ON public.user_application_access
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS user_app_access_update ON public.user_application_access;
CREATE POLICY user_app_access_update ON public.user_application_access
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    )
    WITH CHECK (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );

DROP POLICY IF EXISTS user_app_access_delete ON public.user_application_access;
CREATE POLICY user_app_access_delete ON public.user_application_access
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role_level() >= 80
        AND tenant_id = public.get_user_tenant_id()
    );


-- ============================================================
-- SECCIÓN 9: MEJORAR TRIGGER auth.users → platform_users
-- ============================================================

-- El trigger actual inserta con tenant_id=NULL y role_id=NULL,
-- dejando al usuario en estado 'pending'. Esto es correcto como
-- flujo de aprobación, pero necesitamos asegurar que:
--   a) El insert no falle por RLS
--   b) Se registre en audit_logs

-- El trigger corre como SECURITY DEFINER (owner = superuser),
-- por lo que ignora RLS. Pero para trazabilidad, registramos
-- el evento en audit_logs.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_platform_user_id UUID;
BEGIN
    -- Insertar platform_user en estado 'pending'
    -- Un Super Admin o Tenant Admin debe aprobarlo manualmente
    INSERT INTO public.platform_users (
        auth_user_id,
        email,
        status,
        tenant_id,
        role_id,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        'pending',
        NULL,
        NULL,
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_user_id) DO NOTHING
    RETURNING id INTO v_platform_user_id;

    -- Registrar en auditoría
    IF v_platform_user_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            tenant_id,
            user_id,
            action,
            entity_type,
            entity_id,
            details,
            severity,
            created_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',  -- system tenant
            v_platform_user_id,
            'USER_REGISTERED',
            'platform_users',
            v_platform_user_id,
            jsonb_build_object(
                'email', NEW.email,
                'auth_user_id', NEW.id,
                'status', 'pending'
            ),
            'info',
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$function$;


-- ============================================================
-- SECCIÓN 10: REFORZAR RLS EXISTENTES CON SCOPE JERÁRQUICO
-- ============================================================

-- Las tablas operativas (countries, warehouses, clients) ya tienen
-- CRUD completo con (tenant_id = get_user_tenant_id()).
-- Añadimos capa adicional de validación jerárquica para INSERT/UPDATE.

-- countries: al insertar, validar que el tenant existe y está activo
DROP POLICY IF EXISTS countries_insert ON public.countries;
CREATE POLICY countries_insert ON public.countries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role_level() >= 60
        AND EXISTS (
            SELECT 1 FROM public.tenants t
            WHERE t.id = tenant_id AND t.status = 'active'
        )
    );

-- warehouses: al insertar, validar que el país pertenece al tenant
DROP POLICY IF EXISTS warehouses_insert ON public.warehouses;
CREATE POLICY warehouses_insert ON public.warehouses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role_level() >= 60
        AND EXISTS (
            SELECT 1 FROM public.countries c
            WHERE c.id = country_id AND c.tenant_id = tenant_id
        )
    );

-- clients: al insertar, validar que el almacén pertenece al tenant
DROP POLICY IF EXISTS clients_insert ON public.clients;
CREATE POLICY clients_insert ON public.clients
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role_level() >= 40
        AND EXISTS (
            SELECT 1 FROM public.warehouses w
            WHERE w.id = warehouse_id AND w.tenant_id = tenant_id
        )
    );


-- ============================================================
-- SECCIÓN 11: VERIFICACIÓN FINAL
-- ============================================================

-- Ejecutar estas queries después de aplicar el script para validar:

-- 1. Confirmar que tenant_select_all NO existe:
--    SELECT policyname FROM pg_policies
--    WHERE tablename = 'tenants' AND policyname = 'tenant_select_all';
--    → Debe retornar 0 rows

-- 2. Listar todas las políticas activas:
--    SELECT tablename, policyname, cmd, qual IS NOT NULL AS has_using,
--           with_check IS NOT NULL AS has_check
--    FROM pg_policies
--    WHERE schemaname = 'public'
--    ORDER BY tablename, policyname;

-- 3. Verificar que TODAS las tablas multi-tenant tienen al menos SELECT:
--    SELECT table_name
--    FROM information_schema.tables
--    WHERE table_schema = 'public'
--      AND table_name NOT IN (
--        SELECT tablename FROM pg_policies
--        WHERE schemaname = 'public' AND cmd = 'SELECT'
--      );
--    → Debe retornar 0 rows

-- 4. Probar como Super Admin (debe ver todos los tenants):
--    SET ROLE authenticated;
--    -- Simular: SELECT * FROM tenants; → debe retornar todos

-- 5. Probar que get_user_role_level() funciona:
--    SELECT public.get_user_role_level();
--    → Debe retornar 100 para Super Admin

COMMIT;

-- ============================================================
-- CHECKLIST DE HARDENING RLS
-- ============================================================
-- [ ] tenant_select_all ELIMINADO
-- [ ] tenants: SELECT rol-aware (admin ve todo, usuario ve suyo)
-- [ ] platform_users: INSERT/UPDATE para admin + SELECT/UPDATE propio
-- [ ] roles: CRUD completo con restricción admin + no borrar system
-- [ ] profiles: CRUD completo con restricción admin + no borrar default
-- [ ] permissions: CRUD completo con restricción admin
-- [ ] tenant_settings: CRUD completo con restricción admin
-- [ ] user_application_access: CRUD completo con restricción admin
-- [ ] countries: INSERT con validación jerárquica tenant→country
-- [ ] warehouses: INSERT con validación jerárquica country→warehouse
-- [ ] clients: INSERT con validación jerárquica warehouse→client
-- [ ] Trigger handle_new_auth_user: registra en audit_logs
-- [ ] Ninguna política usa USING (true) sin restricción de rol
-- [ ] Super Admin (level >= 100) ve todos los tenants
-- [ ] Tenant Admin (level >= 80) ve y gestiona su tenant
-- [ ] Country Admin (level >= 60) ve su país dentro de su tenant
-- [ ] Warehouse Admin (level >= 40) ve su almacén
-- [ ] Client Admin (level >= 30) ve su cliente
-- [ ] Usuario normal (level >= 10) solo ve lo asignado
-- ============================================================