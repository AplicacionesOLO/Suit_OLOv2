-- ============================================================================
-- Suite OLO - HARDENING RLS V3.1 (ENTERPRISE SECURITY BASELINE - FINAL)
-- Version: 3.1.0 | Fecha: 2026-06-15
--
-- CORRECCIONES CRITICAS vs V3.0:
--   1. ELIMINACION de TODAS las politicas *_soft_delete FOR UPDATE.
--      RAZON: PostgreSQL RLS NO limita columnas en policies FOR UPDATE.
--      Una policy "roles_soft_delete FOR UPDATE" permite a un Tenant Admin
--      modificar CUALQUIER columna (level, is_system, name, etc.),
--      saltandose completamente can_manage_role() de roles_update.
--
--      soft_delete_record() es SECURITY DEFINER + OWNER=postgres.
--      Las funciones SECURITY DEFINER con OWNER=postgres BYPASSEAN RLS.
--      Por lo tanto, las politicas *_soft_delete NO son necesarias para
--      que el soft delete funcione. Son puro bypass innecesario.
--
--      Lo mismo aplica a profiles_soft_delete, permissions_soft_delete,
--      y todas las demas: son agujeros de seguridad, no features.
--
--   2. El soft delete sigue funcionando EXCLUSIVAMENTE via
--      admin_soft_delete_record() -> soft_delete_record(), ambos
--      SECURITY DEFINER con OWNER=postgres, que bypassean RLS
--      y hacen sus propias validaciones de permisos y tenant.
--
--   3. Las politicas *_update (roles_update, profiles_update, etc.)
--      permanecen como UNICA via de UPDATE directo via RLS, con
--      sus restricciones jerarquicas (can_manage_role, can_access_*, etc.).
--
-- PREREQUISITO: Ninguno. Script autocontenido e idempotente.
-- EJECUCION: Copiar COMPLETO en Supabase SQL Editor -> Run (Parte 1/2)
--   Luego ejecutar hardening_rls_v3_1_part2.sql (Parte 2/2)
-- ============================================================================

BEGIN;

RAISE NOTICE 'Suite OLO - Hardening RLS V3.1 - Iniciando Parte 1/2...';
RAISE NOTICE 'CORRECCION V3.1: ELIMINACION de TODAS las politicas *_soft_delete (bypass de RLS via FOR UPDATE sin restriccion de columnas)';
RAISE NOTICE 'soft_delete_record() es SECURITY DEFINER OWNER=postgres -> bypassea RLS. Las policies *_soft_delete eran innecesarias y peligrosas.';


-- ============================================================================
-- SECCION 0: write_audit_log() CENTRAL - NO EXPUESTO AL FRONTEND
--           + write_audit_log_strict() para operaciones criticas (V2.9)
-- ============================================================================

-- Limpiar TODAS las firmas antiguas conocidas de write_audit_log
DROP FUNCTION IF EXISTS public.write_audit_log(uuid, uuid, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.write_audit_log(text, uuid, uuid, text, uuid, text, jsonb);

-- 0a: write_audit_log (NO-STRICT) - backward compatible, para operaciones
--     no-criticas (ej: context switching donde el PERFORM ignora el retorno).
--     Operaciones sensibles (soft delete, revoke_app_access) usan
--     write_audit_log_strict().
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_tenant_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_severity text DEFAULT 'info',
  p_details jsonb DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (tenant_id, user_id, action, entity_type, entity_id, severity, details)
  VALUES (p_tenant_id, p_user_id, p_action, p_entity_type, p_entity_id, p_severity, p_details);
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'write_audit_log failed (non-critical): %', SQLERRM;
  RETURN false;
END $$;

ALTER FUNCTION public.write_audit_log(text, uuid, uuid, text, uuid, text, jsonb) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.write_audit_log(text, uuid, uuid, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log(text, uuid, uuid, text, uuid, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.write_audit_log(text, uuid, uuid, text, uuid, text, jsonb) FROM anon;

-- 0a-strict: write_audit_log_strict - para operaciones criticas.
--     Si audit_logs falla, RAISEA EXCEPTION -> la operacion completa hace
--     ROLLBACK. Esto garantiza que NO hay operaciones sensibles sin auditoria.
--     Usado por: soft_delete_record(), revoke_app_access().
--     NO expuesto al frontend (mismas reglas que write_audit_log).
CREATE OR REPLACE FUNCTION public.write_audit_log_strict(
  p_action text,
  p_tenant_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_severity text DEFAULT 'info',
  p_details jsonb DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (tenant_id, user_id, action, entity_type, entity_id, severity, details)
  VALUES (p_tenant_id, p_user_id, p_action, p_entity_type, p_entity_id, p_severity, p_details);
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'write_audit_log_strict CRITICAL FAILURE: no se pudo registrar auditoria para accion "%" en tenant %. La operacion sensible NO puede continuar sin registro de auditoria. Error: %',
    p_action, p_tenant_id, SQLERRM;
END $$;

ALTER FUNCTION public.write_audit_log_strict(text, uuid, uuid, text, uuid, text, jsonb) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.write_audit_log_strict(text, uuid, uuid, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log_strict(text, uuid, uuid, text, uuid, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.write_audit_log_strict(text, uuid, uuid, text, uuid, text, jsonb) FROM anon;

RAISE NOTICE '[OK] Seccion 0: write_audit_log() + write_audit_log_strict() - AMBAS BLOQUEADAS para frontend (solo SECURITY DEFINER interno). Strict = EXCEPTION en fallo.';


-- ============================================================================
-- SECCION 0b: admin_write_audit_log() - GATEWAY SEGURO PARA SUPER ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_write_audit_log(
  p_action text,
  p_tenant_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_severity text DEFAULT 'info',
  p_details jsonb DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'admin_write_audit_log: solo Super Admin puede registrar auditoria administrativa. Tu nivel de rol no tiene permisos suficientes.';
  END IF;

  RETURN public.write_audit_log(p_action, p_tenant_id, p_user_id, p_entity_type, p_entity_id, p_severity, p_details);
END $$;

ALTER FUNCTION public.admin_write_audit_log(text, uuid, uuid, text, uuid, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_write_audit_log(text, uuid, uuid, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_write_audit_log(text, uuid, uuid, text, uuid, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_write_audit_log(text, uuid, uuid, text, uuid, text, jsonb) TO authenticated;

RAISE NOTICE '[OK] Seccion 0b: admin_write_audit_log() - gateway seguro para Super Admin';


-- ============================================================================
-- SECCION 0c: REVOKE INSERT DIRECTO SOBRE audit_logs (INCLUYE PUBLIC)
-- ============================================================================

DO $$
BEGIN
  REVOKE INSERT ON public.audit_logs FROM authenticated;
  REVOKE INSERT ON public.audit_logs FROM anon;
  REVOKE INSERT ON public.audit_logs FROM PUBLIC;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'REVOKE INSERT ya aplicado o no necesario: %', SQLERRM;
END $$;

RAISE NOTICE '[OK] Seccion 0c: REVOKE INSERT directo sobre audit_logs (PUBLIC + authenticated + anon)';


-- ============================================================================
-- SECCION 0d: NOTA - REVOKE de soft_delete_record() MOVIDO a Seccion 5
-- ============================================================================

RAISE NOTICE '[OK] Seccion 0d: REVOKE de soft_delete_record() movido a Seccion 5 (post-CREATE) - script ahora autocontenido en DB limpia';


-- ============================================================================
-- SECCION 1: SUPER ADMIN GLOBAL + FUNCIONES CORE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT;
BEGIN
  SELECT COALESCE(r.level, 0) INTO rlevel FROM public.platform_users pu
  JOIN public.roles r ON r.id = pu.role_id WHERE pu.auth_user_id = auth.uid();
  RETURN COALESCE(rlevel, 0) >= 100;
END $$;

CREATE OR REPLACE FUNCTION public.get_accessible_tenants()
RETURNS TABLE(tenant_id uuid, tenant_name text, tenant_code text, tenant_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE is_sa BOOLEAN; user_tid UUID; user_override UUID;
BEGIN
  is_sa := public.is_super_admin();
  IF is_sa THEN
    RETURN QUERY SELECT t.id, t.name, t.code, COALESCE(t.status, 'active')
    FROM public.tenants t ORDER BY t.name;
  ELSE
    SELECT pu.tenant_id, pu.tenant_context_override INTO user_tid, user_override
    FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid();
    IF user_tid IS NULL THEN RETURN; END IF;
    RETURN QUERY SELECT t.id, t.name, t.code, COALESCE(t.status, 'active')
    FROM public.tenants t WHERE t.id = COALESCE(user_override, user_tid) ORDER BY t.name;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE tid UUID; override UUID; is_sa BOOLEAN;
BEGIN
  SELECT pu.tenant_id, pu.tenant_context_override INTO tid, override
  FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;
  is_sa := public.is_super_admin();
  IF is_sa AND override IS NOT NULL THEN RETURN override; END IF;
  IF is_sa AND override IS NULL THEN RETURN NULL; END IF;
  IF override IS NOT NULL THEN RETURN override; END IF;
  RETURN tid;
END $$;

CREATE OR REPLACE FUNCTION public.get_user_role_level()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT;
BEGIN
  SELECT COALESCE(r.level, 0) INTO rlevel FROM public.platform_users pu
  JOIN public.roles r ON r.id = pu.role_id WHERE pu.auth_user_id = auth.uid();
  RETURN COALESCE(rlevel, 0);
END $$;

CREATE OR REPLACE FUNCTION public.get_user_country_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE cid UUID; override UUID; is_sa BOOLEAN;
BEGIN
  SELECT pu.country_id, pu.country_context_override INTO cid, override
  FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;
  is_sa := public.is_super_admin();
  IF is_sa AND override IS NOT NULL THEN RETURN override; END IF;
  IF is_sa AND override IS NULL THEN RETURN NULL; END IF;
  IF override IS NOT NULL THEN RETURN override; END IF;
  RETURN cid;
END $$;

RAISE NOTICE '[OK] Seccion 1: Super Admin Global + funciones core';


-- ============================================================================
-- SECCION 2: CONTEXT SWITCHING COMPLETO (4 NIVELES) - AUDITADO
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='platform_users' AND column_name='warehouse_context_override')
  THEN ALTER TABLE public.platform_users ADD COLUMN warehouse_context_override uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='platform_users' AND column_name='client_context_override')
  THEN ALTER TABLE public.platform_users ADD COLUMN client_context_override uuid; END IF;
END $$;

-- 2.1 Tenant context (SA + TA BOTH audited)
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT; user_tenant UUID; target_exists BOOLEAN; pu_id UUID;
BEGIN
  SELECT COALESCE(r.level,0), pu.tenant_id, pu.id INTO rlevel, user_tenant, pu_id
  FROM public.platform_users pu JOIN public.roles r ON r.id = pu.role_id
  WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.tenants WHERE id = p_tenant_id) INTO target_exists;
  IF NOT target_exists THEN RETURN false; END IF;
  IF rlevel >= 100 THEN
    UPDATE public.platform_users SET tenant_context_override = p_tenant_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('TENANT_CONTEXT_SET', user_tenant, pu_id, 'tenant', p_tenant_id, 'info',
            jsonb_build_object('previous', user_tenant, 'new', p_tenant_id));
    RETURN true;
  END IF;
  IF rlevel >= 80 AND user_tenant = p_tenant_id THEN
    UPDATE public.platform_users SET tenant_context_override = p_tenant_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('TENANT_CONTEXT_SET', user_tenant, pu_id, 'tenant', p_tenant_id, 'info',
            jsonb_build_object('previous', user_tenant, 'new', p_tenant_id));
    RETURN true;
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.clear_tenant_context()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE old_override UUID; user_tenant UUID; pu_id UUID;
BEGIN
  SELECT pu.tenant_context_override, pu.tenant_id, pu.id
  INTO old_override, user_tenant, pu_id FROM public.platform_users pu
  WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.platform_users SET tenant_context_override = NULL, updated_at = NOW()
  WHERE auth_user_id = auth.uid();
  PERFORM public.write_audit_log('TENANT_CONTEXT_CLEARED', COALESCE(user_tenant, '00000000-0000-0000-0000-000000000000'), pu_id,
          'tenant', NULL, 'info',
          jsonb_build_object('previous', old_override));
  RETURN true;
END $$;

-- 2.2 Country context
CREATE OR REPLACE FUNCTION public.set_country_context(p_country_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT; country_tenant UUID; user_tenant UUID; pu_id UUID;
BEGIN
  SELECT COALESCE(r.level,0), pu.tenant_id, pu.id INTO rlevel, user_tenant, pu_id
  FROM public.platform_users pu JOIN public.roles r ON r.id = pu.role_id
  WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT tenant_id INTO country_tenant FROM public.countries WHERE id = p_country_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF rlevel >= 100 THEN
    UPDATE public.platform_users SET country_context_override = p_country_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('COUNTRY_CONTEXT_SET', user_tenant, pu_id, 'country', p_country_id, 'info',
            jsonb_build_object('country_id', p_country_id));
    RETURN true;
  ELSIF rlevel >= 80 AND user_tenant = country_tenant THEN
    UPDATE public.platform_users SET country_context_override = p_country_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('COUNTRY_CONTEXT_SET', user_tenant, pu_id, 'country', p_country_id, 'info',
            jsonb_build_object('country_id', p_country_id));
    RETURN true;
  ELSIF rlevel >= 60 AND EXISTS(
    SELECT 1 FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid() AND pu.country_id = p_country_id)
  THEN
    UPDATE public.platform_users SET country_context_override = p_country_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('COUNTRY_CONTEXT_SET', user_tenant, pu_id, 'country', p_country_id, 'info',
            jsonb_build_object('country_id', p_country_id));
    RETURN true;
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.clear_country_context()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE old_override UUID; user_tenant UUID; pu_id UUID;
BEGIN
  SELECT pu.country_context_override, pu.tenant_id, pu.id
  INTO old_override, user_tenant, pu_id FROM public.platform_users pu
  WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.platform_users SET country_context_override = NULL, updated_at = NOW()
  WHERE auth_user_id = auth.uid();
  PERFORM public.write_audit_log('COUNTRY_CONTEXT_CLEARED', user_tenant, pu_id, 'country', NULL, 'info',
          jsonb_build_object('previous', old_override));
  RETURN true;
END $$;

-- 2.3 Warehouse context
CREATE OR REPLACE FUNCTION public.set_warehouse_context(p_warehouse_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT; wh_tenant UUID; wh_country UUID; user_tenant UUID; user_country UUID; pu_id UUID;
BEGIN
  SELECT COALESCE(r.level,0), pu.tenant_id, pu.country_id, pu.id
  INTO rlevel, user_tenant, user_country, pu_id
  FROM public.platform_users pu JOIN public.roles r ON r.id = pu.role_id
  WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT w.tenant_id, w.country_id INTO wh_tenant, wh_country
  FROM public.warehouses w WHERE w.id = p_warehouse_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF rlevel >= 100 THEN
    UPDATE public.platform_users SET warehouse_context_override = p_warehouse_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('WAREHOUSE_CONTEXT_SET', user_tenant, pu_id, 'warehouse', p_warehouse_id, 'info',
            jsonb_build_object('warehouse_id', p_warehouse_id));
    RETURN true;
  ELSIF rlevel >= 80 AND user_tenant = wh_tenant THEN
    UPDATE public.platform_users SET warehouse_context_override = p_warehouse_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('WAREHOUSE_CONTEXT_SET', user_tenant, pu_id, 'warehouse', p_warehouse_id, 'info',
            jsonb_build_object('warehouse_id', p_warehouse_id));
    RETURN true;
  ELSIF rlevel >= 60 AND user_country = wh_country THEN
    UPDATE public.platform_users SET warehouse_context_override = p_warehouse_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('WAREHOUSE_CONTEXT_SET', user_tenant, pu_id, 'warehouse', p_warehouse_id, 'info',
            jsonb_build_object('warehouse_id', p_warehouse_id));
    RETURN true;
  ELSIF rlevel >= 40 AND EXISTS(
    SELECT 1 FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid() AND pu.warehouse_id = p_warehouse_id)
  THEN
    UPDATE public.platform_users SET warehouse_context_override = p_warehouse_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('WAREHOUSE_CONTEXT_SET', user_tenant, pu_id, 'warehouse', p_warehouse_id, 'info',
            jsonb_build_object('warehouse_id', p_warehouse_id));
    RETURN true;
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.clear_warehouse_context()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE old_override UUID; user_tenant UUID; pu_id UUID;
BEGIN
  SELECT pu.warehouse_context_override, pu.tenant_id, pu.id
  INTO old_override, user_tenant, pu_id FROM public.platform_users pu
  WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.platform_users SET warehouse_context_override = NULL, updated_at = NOW()
  WHERE auth_user_id = auth.uid();
  PERFORM public.write_audit_log('WAREHOUSE_CONTEXT_CLEARED', user_tenant, pu_id, 'warehouse', NULL, 'info',
          jsonb_build_object('previous', old_override));
  RETURN true;
END $$;

-- 2.4 Client context
CREATE OR REPLACE FUNCTION public.set_client_context(p_client_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT; client_tenant UUID; client_warehouse UUID; client_wh_country UUID;
        user_tenant UUID; user_country UUID; user_warehouse UUID; pu_id UUID;
BEGIN
  SELECT COALESCE(r.level,0), pu.tenant_id, pu.country_id, pu.warehouse_id, pu.id
  INTO rlevel, user_tenant, user_country, user_warehouse, pu_id
  FROM public.platform_users pu JOIN public.roles r ON r.id = pu.role_id
  WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT c.tenant_id, c.warehouse_id, w.country_id
  INTO client_tenant, client_warehouse, client_wh_country
  FROM public.clients c JOIN public.warehouses w ON w.id = c.warehouse_id WHERE c.id = p_client_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF rlevel >= 100 THEN
    UPDATE public.platform_users SET client_context_override = p_client_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('CLIENT_CONTEXT_SET', user_tenant, pu_id, 'client', p_client_id, 'info',
            jsonb_build_object('client_id', p_client_id));
    RETURN true;
  ELSIF rlevel >= 80 AND user_tenant = client_tenant THEN
    UPDATE public.platform_users SET client_context_override = p_client_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('CLIENT_CONTEXT_SET', user_tenant, pu_id, 'client', p_client_id, 'info',
            jsonb_build_object('client_id', p_client_id));
    RETURN true;
  ELSIF rlevel >= 60 AND user_country = client_wh_country THEN
    UPDATE public.platform_users SET client_context_override = p_client_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('CLIENT_CONTEXT_SET', user_tenant, pu_id, 'client', p_client_id, 'info',
            jsonb_build_object('client_id', p_client_id));
    RETURN true;
  ELSIF rlevel >= 40 AND user_warehouse = client_warehouse THEN
    UPDATE public.platform_users SET client_context_override = p_client_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('CLIENT_CONTEXT_SET', user_tenant, pu_id, 'client', p_client_id, 'info',
            jsonb_build_object('client_id', p_client_id));
    RETURN true;
  ELSIF rlevel >= 30 AND EXISTS(
    SELECT 1 FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = p_client_id)
  THEN
    UPDATE public.platform_users SET client_context_override = p_client_id, updated_at = NOW()
    WHERE auth_user_id = auth.uid();
    PERFORM public.write_audit_log('CLIENT_CONTEXT_SET', user_tenant, pu_id, 'client', p_client_id, 'info',
            jsonb_build_object('client_id', p_client_id));
    RETURN true;
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.clear_client_context()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE old_override UUID; user_tenant UUID; pu_id UUID;
BEGIN
  SELECT pu.client_context_override, pu.tenant_id, pu.id
  INTO old_override, user_tenant, pu_id FROM public.platform_users pu
  WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.platform_users SET client_context_override = NULL, updated_at = NOW()
  WHERE auth_user_id = auth.uid();
  PERFORM public.write_audit_log('CLIENT_CONTEXT_CLEARED', user_tenant, pu_id, 'client', NULL, 'info',
          jsonb_build_object('previous', old_override));
  RETURN true;
END $$;

RAISE NOTICE '[OK] Seccion 2: Context switching 4 niveles (TODOS auditados via write_audit_log interno, incluye rama Tenant Admin en set_tenant_context)';


-- ============================================================================
-- SECCION 3: VALIDACIONES JERARQUICAS REALES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_country(p_country_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT; user_tenant UUID; user_country UUID; target_tenant UUID;
BEGIN
  IF public.is_super_admin() THEN RETURN true; END IF;
  rlevel := public.get_user_role_level();
  user_tenant := public.get_user_tenant_id();
  user_country := public.get_user_country_id();
  SELECT tenant_id INTO target_tenant FROM public.countries WHERE id = p_country_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF rlevel >= 80 AND user_tenant IS NOT NULL AND user_tenant = target_tenant THEN RETURN true; END IF;
  IF user_country IS NOT NULL AND user_country = p_country_id THEN RETURN true; END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.can_access_warehouse(p_warehouse_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT; user_tenant UUID; user_country UUID; user_warehouse UUID;
        target_tenant UUID; target_country UUID;
BEGIN
  IF public.is_super_admin() THEN RETURN true; END IF;
  rlevel := public.get_user_role_level();
  user_tenant := public.get_user_tenant_id();
  user_country := public.get_user_country_id();
  SELECT pu.warehouse_id INTO user_warehouse FROM public.platform_users pu
  WHERE pu.auth_user_id = auth.uid();
  SELECT w.tenant_id, w.country_id INTO target_tenant, target_country
  FROM public.warehouses w WHERE w.id = p_warehouse_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF rlevel >= 80 AND user_tenant IS NOT NULL AND user_tenant = target_tenant THEN RETURN true; END IF;
  IF rlevel >= 60 AND user_country IS NOT NULL AND user_country = target_country THEN RETURN true; END IF;
  IF rlevel >= 40 AND user_warehouse IS NOT NULL AND user_warehouse = p_warehouse_id THEN RETURN true; END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.can_access_client(p_client_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE rlevel INT; user_tenant UUID; user_country UUID; user_warehouse UUID; user_client UUID;
        target_tenant UUID; target_warehouse UUID; target_country UUID;
BEGIN
  IF public.is_super_admin() THEN RETURN true; END IF;
  rlevel := public.get_user_role_level();
  user_tenant := public.get_user_tenant_id();
  user_country := public.get_user_country_id();
  SELECT pu.warehouse_id, pu.client_id INTO user_warehouse, user_client
  FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid();
  SELECT c.tenant_id, c.warehouse_id, w.country_id
  INTO target_tenant, target_warehouse, target_country
  FROM public.clients c JOIN public.warehouses w ON w.id = c.warehouse_id WHERE c.id = p_client_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF rlevel >= 80 AND user_tenant IS NOT NULL AND user_tenant = target_tenant THEN RETURN true; END IF;
  IF rlevel >= 60 AND user_country IS NOT NULL AND user_country = target_country THEN RETURN true; END IF;
  IF rlevel >= 40 AND user_warehouse IS NOT NULL AND user_warehouse = target_warehouse THEN RETURN true; END IF;
  IF rlevel >= 30 AND user_client IS NOT NULL AND user_client = p_client_id THEN RETURN true; END IF;
  RETURN false;
END $$;

RAISE NOTICE '[OK] Seccion 3: Validaciones jerarquicas reales';


-- ============================================================================
-- SECCION 4: AUDIT_LOGS RLS ENTERPRISE (INMUTABLE, AUDITOR NIVEL 50 REAL)
-- ============================================================================

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_update ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_delete ON public.audit_logs;

CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT
USING (
  public.is_super_admin()
  OR (public.get_user_role_level() = 50 AND tenant_id = public.get_user_tenant_id())
  OR (public.get_user_role_level() >= 80 AND tenant_id = public.get_user_tenant_id())
  OR (public.get_user_role_level() >= 60 AND tenant_id = public.get_user_tenant_id()
      AND ((details->>'country_id') IS NULL OR (details->>'country_id')::uuid = public.get_user_country_id()))
  OR (public.get_user_role_level() >= 40 AND tenant_id = public.get_user_tenant_id()
      AND ((details->>'warehouse_id') IS NULL OR (details->>'warehouse_id')::uuid =
          (SELECT warehouse_id FROM public.platform_users WHERE auth_user_id = auth.uid())))
  OR (public.get_user_role_level() >= 30 AND tenant_id = public.get_user_tenant_id()
      AND ((details->>'client_id') IS NULL OR (details->>'client_id')::uuid =
          (SELECT client_id FROM public.platform_users WHERE auth_user_id = auth.uid())))
  OR (public.get_user_role_level() >= 10
      AND user_id = (SELECT id FROM public.platform_users WHERE auth_user_id = auth.uid()))
);

CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT
WITH CHECK (public.is_super_admin());

RAISE NOTICE '[OK] Seccion 4: Audit logs enterprise (Auditor level=50, inmutable, REVOKE + RLS)';


-- ============================================================================
-- SECCION 5: SOFT DELETE BLINDADO (WHITELIST + ADMIN GATEWAY + VALIDACION TENANT
--            + DINAMICO POR TABLA V3.0)
-- ============================================================================
-- CORRECCION V3.0: soft_delete_record() ahora consulta information_schema.columns
-- por tabla ANTES de construir el UPDATE. Ya no asume que todas las tablas tienen
-- las columnas status y updated_at.
--
-- CORRECCION V3.1: ELIMINACION de TODAS las politicas *_soft_delete FOR UPDATE.
--   RAZON: PostgreSQL RLS NO limita columnas. Una policy FOR UPDATE
--   permite modificar CUALQUIER columna de la fila, no solo deleted_at.
--   Esto creaba un bypass: roles_soft_delete permitia a un Tenant Admin
--   modificar level/is_system sin pasar por can_manage_role().
--
--   soft_delete_record() y admin_soft_delete_record() son SECURITY DEFINER
--   con OWNER=postgres. Las funciones SECURITY DEFINER con OWNER=postgres
--   BYPASSEAN RLS por diseno. Las politicas *_soft_delete NO eran necesarias
--   para que el soft delete funcionara. Solo abrian un agujero de seguridad.
--
--   Las politicas *_update (roles_update con can_manage_role, profiles_update,
--   etc.) permanecen como UNICA via de UPDATE directo via RLS, cada una con
--   sus restricciones jerarquicas correspondientes.
--
-- Schema real (V3.0 diagnosticado, preservado en V3.1):
--   roles:                  SIN status, SIN updated_at
--   profiles:               SIN status, SIN updated_at
--   permissions:            SIN status, SIN updated_at
--   application_categories: SIN status, CON updated_at
--   applications:           CON status, CON updated_at
--   application_instances:  CON status, CON updated_at
--   countries:              CON status, CON updated_at
--   warehouses:             CON status, CON updated_at
--   clients:                CON status, CON updated_at

DO $$
DECLARE tbl TEXT;
  tables_to_alter TEXT[] := ARRAY[
    'roles','profiles','permissions','applications','application_instances',
    'application_categories','countries','warehouses','clients'];
BEGIN
  FOREACH tbl IN ARRAY tables_to_alter LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='deleted_at')
    THEN EXECUTE format('ALTER TABLE public.%I ADD COLUMN deleted_at timestamptz', tbl); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='deleted_by')
    THEN EXECUTE format('ALTER TABLE public.%I ADD COLUMN deleted_by uuid', tbl); END IF;
  END LOOP;
END $$;

-- 5.1 soft_delete_record() INTERNO - NO EXPUESTO AL FRONTEND
--     CORRECCION V3.0: UPDATE construido dinamicamente segun columnas reales
--     de cada tabla. Usa information_schema.columns para detectar status y
--     updated_at. Nunca asume que existen.
--     Auditoria: write_audit_log_strict() (heredado de V2.9).
--     NOTA V3.1: Esta funcion es SECURITY DEFINER OWNER=postgres.
--     Bypassea RLS por diseno. Las politicas *_soft_delete fueron eliminadas
--     porque eran innecesarias y peligrosas (FOR UPDATE sin restriccion de columnas).
CREATE OR REPLACE FUNCTION public.soft_delete_record(
  p_table_name text, p_record_id uuid, p_tenant_id uuid, p_entity_type text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  pu_id UUID;
  ent_type TEXT;
  has_status BOOLEAN;
  has_updated_at BOOLEAN;
  set_parts TEXT[];
  update_sql TEXT;
  cols_detail jsonb;
  allowed_tables TEXT[] := ARRAY[
    'roles','profiles','permissions','applications','application_instances',
    'application_categories','countries','warehouses','clients'];
BEGIN
  IF NOT (p_table_name = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'soft_delete_record: tabla "%" no esta en la whitelist. Tablas permitidas: %',
      p_table_name, array_to_string(allowed_tables, ', ');
  END IF;

  SELECT id INTO pu_id FROM public.platform_users WHERE auth_user_id = auth.uid();
  ent_type := COALESCE(p_entity_type, p_table_name);

  -- === CORRECCION V3.0 (preservada en V3.1): deteccion dinamica de columnas por tabla ===
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table_name AND column_name = 'status'
  ) INTO has_status;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table_name AND column_name = 'updated_at'
  ) INTO has_updated_at;

  -- Construir clausulas SET dinamicamente
  IF has_status THEN
    set_parts := array_append(set_parts, 'status = ''inactive''');
  END IF;

  set_parts := array_append(set_parts, 'deleted_at = NOW()');
  set_parts := array_append(set_parts, 'deleted_by = $1');

  IF has_updated_at THEN
    set_parts := array_append(set_parts, 'updated_at = NOW()');
  END IF;

  update_sql := format(
    'UPDATE public.%I SET %s WHERE id = $2',
    p_table_name,
    array_to_string(set_parts, ', ')
  );

  EXECUTE update_sql USING pu_id, p_record_id;

  cols_detail := jsonb_build_object(
    'table', p_table_name,
    'has_status', has_status,
    'has_updated_at', has_updated_at,
    'set_clauses', array_to_string(set_parts, ', ')
  );

  PERFORM public.write_audit_log_strict('SOFT_DELETE', p_tenant_id, pu_id, ent_type, p_record_id, 'warning',
          jsonb_build_object('table', p_table_name, 'deleted_by_user', pu_id, 'columns', cols_detail));

  RETURN true;
END $$;

ALTER FUNCTION public.soft_delete_record(text, uuid, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.soft_delete_record(text, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_record(text, uuid, uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.soft_delete_record(text, uuid, uuid, text) FROM anon;

RAISE NOTICE '[OK] soft_delete_record() CREADO (V3.0 DINAMICO + V3.1: SECURITY DEFINER OWNER=postgres bypassea RLS, no necesita policies *_soft_delete), auditoria STRICT';


-- 5.2 admin_soft_delete_record() - GATEWAY SEGURO CON VALIDACION DE PERMISOS Y TENANT
--     Delega en soft_delete_record() que ahora es dinamico (V3.0).
--     NOTA V3.1: Ambas funciones son SECURITY DEFINER OWNER=postgres.
--     Bypassean RLS. Las validaciones de permisos y tenant son propias
--     de la funcion, no dependen de politicas RLS.
CREATE OR REPLACE FUNCTION public.admin_soft_delete_record(
  p_table_name text,
  p_record_id uuid,
  p_tenant_id uuid,
  p_entity_type text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  caller_level INT;
  caller_tenant UUID;
  caller_id UUID;
  record_tenant UUID;
  effective_tenant UUID;
  allowed_tables TEXT[] := ARRAY[
    'roles','profiles','permissions','applications','application_instances',
    'application_categories','countries','warehouses','clients'];
  tables_with_tenant TEXT[] := ARRAY[
    'roles','profiles','permissions','applications','application_instances',
    'application_categories','countries','warehouses','clients'];
BEGIN
  IF NOT (p_table_name = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'admin_soft_delete_record: tabla "%" no esta en la whitelist. Tablas permitidas: %',
      p_table_name, array_to_string(allowed_tables, ', ');
  END IF;

  SELECT COALESCE(r.level, 0), pu.tenant_id, pu.id
  INTO caller_level, caller_tenant, caller_id
  FROM public.platform_users pu
  JOIN public.roles r ON r.id = pu.role_id
  WHERE pu.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin_soft_delete_record: caller no encontrado en platform_users';
  END IF;

  IF caller_level < 100 AND caller_level < 80 THEN
    RAISE EXCEPTION 'admin_soft_delete_record: usuario nivel % no tiene permisos para soft-delete. Se requiere Super Admin (level>=100) o Tenant Admin (level>=80)', caller_level;
  END IF;

  record_tenant := NULL;

  IF p_table_name = ANY(tables_with_tenant) THEN
    BEGIN
      EXECUTE format('SELECT tenant_id FROM public.%I WHERE id = $1', p_table_name)
      INTO record_tenant USING p_record_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'admin_soft_delete_record: no se pudo leer el registro % de la tabla %', p_record_id, p_table_name;
    END;

    IF record_tenant IS NULL THEN
      RAISE EXCEPTION 'admin_soft_delete_record: registro % no encontrado en la tabla %', p_record_id, p_table_name;
    END IF;
  END IF;

  IF caller_level < 100 THEN
    IF caller_tenant IS NULL OR caller_tenant != p_tenant_id THEN
      RAISE EXCEPTION 'admin_soft_delete_record: tenant % no coincide con tu tenant asignado %', p_tenant_id, caller_tenant;
    END IF;

    IF p_table_name = ANY(tables_with_tenant) AND record_tenant != caller_tenant THEN
      RAISE EXCEPTION 'admin_soft_delete_record: el registro % pertenece al tenant %, pero tu tenant es %', p_record_id, record_tenant, caller_tenant;
    END IF;
  END IF;

  effective_tenant := COALESCE(record_tenant, p_tenant_id);

  RETURN public.soft_delete_record(p_table_name, p_record_id, effective_tenant, p_entity_type);
END $$;

ALTER FUNCTION public.admin_soft_delete_record(text, uuid, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_soft_delete_record(text, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_soft_delete_record(text, uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete_record(text, uuid, uuid, text) TO authenticated;

RAISE NOTICE '[OK] admin_soft_delete_record() - gateway seguro: SECURITY DEFINER OWNER=postgres bypassea RLS, validaciones propias de permisos y tenant';


-- 5.3 DROP de TODAS las politicas DELETE fisicas

DROP POLICY IF EXISTS countries_delete ON public.countries;
DROP POLICY IF EXISTS warehouses_delete ON public.warehouses;
DROP POLICY IF EXISTS clients_delete ON public.clients;
DROP POLICY IF EXISTS applications_delete ON public.applications;
DROP POLICY IF EXISTS app_instances_delete ON public.application_instances;
DROP POLICY IF EXISTS app_categories_delete ON public.application_categories;

DROP POLICY IF EXISTS roles_delete ON public.roles;
DROP POLICY IF EXISTS profiles_delete ON public.profiles;
DROP POLICY IF EXISTS permissions_delete ON public.permissions;
DROP POLICY IF EXISTS tenant_settings_delete ON public.tenant_settings;

DROP POLICY IF EXISTS user_app_access_delete ON public.user_application_access;

RAISE NOTICE '[OK] TODAS las politicas DELETE fisicas eliminadas';


-- ============================================================================
-- SECCION 5.4 (V3.1): ELIMINACION DE TODAS LAS POLITICAS *_soft_delete
-- ============================================================================
-- CORRECCION V3.1 CRITICA:
--
-- PostgreSQL RLS NO restringe columnas en policies FOR UPDATE.
-- Una policy "roles_soft_delete FOR UPDATE" permite modificar CUALQUIER
-- columna de la fila (level, is_system, name, tenant_id, etc.), NO solo
-- deleted_at/deleted_by. Esto creaba un bypass de can_manage_role():
--   - roles_update exige can_manage_role(id) -> valida nivel, is_system, tenant
--   - roles_soft_delete solo pedia SA o TA del tenant -> permitia a un TA
--     modificar level=100 o is_system=true sin pasar por can_manage_role()
--
-- soft_delete_record() y admin_soft_delete_record() son SECURITY DEFINER
-- con OWNER=postgres. Las funciones SECURITY DEFINER con OWNER=postgres
-- BYPASSEAN RLS completamente. Las politicas *_soft_delete NO eran
-- necesarias para que el soft delete funcionara.
--
-- Las politicas *_update (roles_update, profiles_update, permissions_update,
-- countries_update, warehouses_update, clients_update, applications_update,
-- app_instances_update, app_categories_update) permanecen como UNICA via
-- de UPDATE directo via RLS, cada una con sus restricciones jerarquicas:
--   - roles_update:         can_manage_role(id) + SA o TA del tenant
--   - profiles_update:      SA o TA del tenant
--   - permissions_update:   SA o TA del tenant
--   - countries_update:     SA o TA del tenant o Country Admin can_access_country
--   - warehouses_update:    SA o TA del tenant o Country Admin o Warehouse Admin
--   - clients_update:       SA o TA del tenant o Country/WH/Client Admin
--   - applications_update:  SA o TA del tenant
--   - app_instances_update: SA o TA del tenant
--   - app_categories_update: SA o TA del tenant

DROP POLICY IF EXISTS roles_soft_delete ON public.roles;
DROP POLICY IF EXISTS profiles_soft_delete ON public.profiles;
DROP POLICY IF EXISTS permissions_soft_delete ON public.permissions;
DROP POLICY IF EXISTS countries_soft_delete ON public.countries;
DROP POLICY IF EXISTS warehouses_soft_delete ON public.warehouses;
DROP POLICY IF EXISTS clients_soft_delete ON public.clients;
DROP POLICY IF EXISTS applications_soft_delete ON public.applications;
DROP POLICY IF EXISTS app_instances_soft_delete ON public.application_instances;
DROP POLICY IF EXISTS app_categories_soft_delete ON public.application_categories;

RAISE NOTICE '[OK] Seccion 5.4 (V3.1): TODAS las politicas *_soft_delete ELIMINADAS.';
RAISE NOTICE '  Motivo: PostgreSQL RLS NO restringe columnas en FOR UPDATE.';
RAISE NOTICE '  soft_delete_record() es SECURITY DEFINER OWNER=postgres -> bypassea RLS.';
RAISE NOTICE '  Las politicas *_soft_delete eran bypass innecesario de las restricciones jerarquicas de *_update.';
RAISE NOTICE '  Soft delete ahora funciona EXCLUSIVAMENTE via admin_soft_delete_record() -> soft_delete_record().';


-- ============================================================================
-- SECCION 5.5: OWNER Y GRANTS EXPLICITOS PARA TODAS LAS FUNCIONES SECURITY DEFINER (PARTE 1)
-- ============================================================================
-- ARQUITECTURA DE GRANTS V3.1:
--
--   can_access_country/warehouse/client SON RPC para authenticated PORQUE:
--     Las RLS policies (countries_select, warehouses_select, clients_select,
--     countries_update, warehouses_update, clients_update, etc.)
--     los llaman DIRECTAMENTE en su USING/WITH CHECK. Las policies ejecutan
--     con los privilegios del caller (NO son SECURITY DEFINER). Si se revoca
--     GRANT EXECUTE, los usuarios NO podrian hacer SELECT/UPDATE en esas tablas.
--     El frontend NO los llama directamente (grep en src/ confirma 0 usos).
--
--   can_manage_role/can_manage_user SON RPC para authenticated PORQUE:
--     Las RLS policies roles_update y platform_users_update_admin los llaman
--     DIRECTAMENTE en su USING/WITH CHECK. Misma razon que arriba: sin GRANT
--     EXECUTE, los Tenant Admin no podrian gestionar roles ni usuarios.
--
--   NOTA V3.1: Las politicas *_soft_delete fueron ELIMINADAS. Los grants
--   de can_access_* y can_manage_* ya NO son necesarios para soft_delete
--   (porque esas politicas ya no existen). Pero SIGUEN siendo necesarios
--   para las politicas *_update y *_select que permanecen.

-- === SECCION 1 - Funciones Core (RPC callable from frontend) ===

ALTER FUNCTION public.is_super_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

ALTER FUNCTION public.get_accessible_tenants() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_accessible_tenants() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_accessible_tenants() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_accessible_tenants() TO authenticated;

ALTER FUNCTION public.get_user_tenant_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_user_tenant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_tenant_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;

ALTER FUNCTION public.get_user_role_level() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_user_role_level() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_role_level() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role_level() TO authenticated;

ALTER FUNCTION public.get_user_country_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_user_country_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_country_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_country_id() TO authenticated;

RAISE NOTICE '[OK] Seccion 5.5a: OWNER/GRANTS - Funciones Core (5 funciones)';

-- === SECCION 2 - Context Switching (RPC callable from frontend) ===

ALTER FUNCTION public.set_tenant_context(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_tenant_context(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_tenant_context(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO authenticated;

ALTER FUNCTION public.clear_tenant_context() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.clear_tenant_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_tenant_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_tenant_context() TO authenticated;

ALTER FUNCTION public.set_country_context(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_country_context(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_country_context(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_country_context(uuid) TO authenticated;

ALTER FUNCTION public.clear_country_context() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.clear_country_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_country_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_country_context() TO authenticated;

ALTER FUNCTION public.set_warehouse_context(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_warehouse_context(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_warehouse_context(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_warehouse_context(uuid) TO authenticated;

ALTER FUNCTION public.clear_warehouse_context() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.clear_warehouse_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_warehouse_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_warehouse_context() TO authenticated;

ALTER FUNCTION public.set_client_context(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_client_context(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_client_context(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_client_context(uuid) TO authenticated;

ALTER FUNCTION public.clear_client_context() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.clear_client_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_client_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_client_context() TO authenticated;

RAISE NOTICE '[OK] Seccion 5.5b: OWNER/GRANTS - Context Switching (8 funciones)';

-- === SECCION 3 - Validaciones Jerarquicas (RPC para RLS policies, NO frontend) ===

ALTER FUNCTION public.can_access_country(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_access_country(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_country(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_country(uuid) TO authenticated;

ALTER FUNCTION public.can_access_warehouse(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_access_warehouse(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_warehouse(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_warehouse(uuid) TO authenticated;

ALTER FUNCTION public.can_access_client(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_access_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid) TO authenticated;

RAISE NOTICE '[OK] Seccion 5.5c: OWNER/GRANTS - Validaciones Jerarquicas (3 funciones) - RPC necesario para RLS policies (*_update/*_select), NO usado por frontend';
RAISE NOTICE '[OK] Seccion 5.5: OWNER/GRANTS explicitos completados para las 17 funciones Part 1';
RAISE NOTICE '';
RAISE NOTICE '=== V3.1 CAMBIO CLAVE: ELIMINACION de politicas *_soft_delete ===';
RAISE NOTICE 'V3.0 tenia 9 politicas *_soft_delete FOR UPDATE que permitian bypass de RLS.';
RAISE NOTICE 'soft_delete_record() es SECURITY DEFINER OWNER=postgres -> bypassea RLS.';
RAISE NOTICE 'Las politicas *_soft_delete eran innecesarias y peligrosas.';
RAISE NOTICE 'Por ejemplo, roles_soft_delete permitia a un TA modificar level/is_system';
RAISE NOTICE 'sin pasar por can_manage_role() que si exige roles_update.';
RAISE NOTICE 'V3.1: 0 politicas *_soft_delete. Soft delete solo via SECURITY DEFINER.';
RAISE NOTICE 'Parte 1/2 COMPLETADA. Ejecutar hardening_rls_v3_1_part2.sql';
COMMIT;