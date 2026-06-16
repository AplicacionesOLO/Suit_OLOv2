-- ============================================================================
-- Suite OLO - HARDENING RLS V3.1 PARTE 2/3
-- Integridad, Anti-escalamiento, Reconstruccion RLS, Trigger
-- PREREQUISITO: Ejecutar hardening_rls_v3_1.sql PRIMERO
--
-- NOTA V3.1: Las politicas *_soft_delete fueron ELIMINADAS en Parte 1.
--   Las politicas *_update son la UNICA via de UPDATE directo via RLS.
--   soft_delete_record() es SECURITY DEFINER OWNER=postgres -> bypassea RLS.
-- ============================================================================

BEGIN;

RAISE NOTICE 'Suite OLO - Hardening RLS V3.1 - Parte 2/3 (Integridad + Reconstruccion RLS)';


-- ============================================================================
-- SECCION 6: INTEGRIDAD USER_APPLICATION_ACCESS (VALIDACION CRUZADA + REVOKE EN VEZ DE DELETE)
--            revoke_app_access usa write_audit_log_strict() (V2.9+)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT user_id, application_id, instance_id, COUNT(*)
    FROM public.user_application_access
    GROUP BY user_id, application_id, instance_id HAVING COUNT(*) > 1) THEN
    DELETE FROM public.user_application_access a WHERE a.id NOT IN (
      SELECT MIN(b.id) FROM public.user_application_access b
      GROUP BY b.user_id, b.application_id, COALESCE(b.instance_id, '00000000-0000-0000-0000-000000000000'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_app_instance_access') THEN
    ALTER TABLE public.user_application_access
    ADD CONSTRAINT uq_user_app_instance_access UNIQUE NULLS NOT DISTINCT (user_id, application_id, instance_id);
  END IF;
END $$;

-- 6.0 validate_access_tenant_coherence (INTERNAL - usado por policies, NO RPC)
CREATE OR REPLACE FUNCTION public.validate_access_tenant_coherence(
  p_access_tenant_id uuid, p_user_id uuid, p_application_id uuid, p_instance_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE user_tenant UUID; app_tenant UUID; instance_tenant UUID;
BEGIN
  SELECT tenant_id INTO user_tenant FROM public.platform_users WHERE id = p_user_id;
  IF NOT FOUND OR user_tenant IS NULL THEN RETURN false; END IF;
  IF user_tenant != p_access_tenant_id THEN RETURN false; END IF;
  SELECT tenant_id INTO app_tenant FROM public.applications WHERE id = p_application_id;
  IF NOT FOUND OR app_tenant IS NULL THEN RETURN false; END IF;
  IF app_tenant != p_access_tenant_id THEN RETURN false; END IF;
  IF p_instance_id IS NOT NULL THEN
    SELECT tenant_id INTO instance_tenant FROM public.application_instances WHERE id = p_instance_id;
    IF NOT FOUND OR instance_tenant IS NULL THEN RETURN false; END IF;
    IF instance_tenant != p_access_tenant_id THEN RETURN false; END IF;
  END IF;
  RETURN true;
END $$;

ALTER FUNCTION public.validate_access_tenant_coherence(uuid, uuid, uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_access_tenant_coherence(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_access_tenant_coherence(uuid, uuid, uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.validate_access_tenant_coherence(uuid, uuid, uuid, uuid) FROM anon;

DROP POLICY IF EXISTS user_app_access_insert ON public.user_application_access;
CREATE POLICY user_app_access_insert ON public.user_application_access FOR INSERT
WITH CHECK (
  (public.is_super_admin() AND public.validate_access_tenant_coherence(tenant_id, user_id, application_id, instance_id))
  OR (public.get_user_role_level() >= 80 AND tenant_id = public.get_user_tenant_id()
      AND public.validate_access_tenant_coherence(tenant_id, user_id, application_id, instance_id))
);

DROP POLICY IF EXISTS user_app_access_update ON public.user_application_access;
CREATE POLICY user_app_access_update ON public.user_application_access FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level() >= 80 AND tenant_id = public.get_user_tenant_id()))
WITH CHECK (
  (public.is_super_admin() AND public.validate_access_tenant_coherence(tenant_id, user_id, application_id, instance_id))
  OR (public.get_user_role_level() >= 80 AND tenant_id = public.get_user_tenant_id()
      AND public.validate_access_tenant_coherence(tenant_id, user_id, application_id, instance_id))
);

-- 6.1 revoke_app_access() - access_status='revoked' + write_audit_log_strict + access_tenant real
CREATE OR REPLACE FUNCTION public.revoke_app_access(p_access_id uuid, p_tenant_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE caller_level INT; caller_tenant UUID; caller_id UUID; access_tenant UUID;
BEGIN
  SELECT COALESCE(r.level, 0), pu.tenant_id, pu.id INTO caller_level, caller_tenant, caller_id
  FROM public.platform_users pu JOIN public.roles r ON r.id = pu.role_id WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'revoke_app_access: caller no encontrado en platform_users'; END IF;
  IF caller_level < 100 AND caller_level < 80 THEN
    RAISE EXCEPTION 'revoke_app_access: nivel % insuficiente. Requiere SA (>=100) o TA (>=80)', caller_level;
  END IF;
  SELECT tenant_id INTO access_tenant FROM public.user_application_access WHERE id = p_access_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'revoke_app_access: acceso % no encontrado', p_access_id; END IF;
  IF caller_level < 100 AND (caller_tenant IS NULL OR caller_tenant != access_tenant) THEN
    RAISE EXCEPTION 'revoke_app_access: acceso del tenant %, tu tenant es %', access_tenant, caller_tenant;
  END IF;
  UPDATE public.user_application_access SET access_status = 'revoked', updated_at = NOW() WHERE id = p_access_id;
  PERFORM public.write_audit_log_strict('APP_ACCESS_REVOKED', access_tenant, caller_id, 'user_application_access', p_access_id, 'warning',
    jsonb_build_object('access_id', p_access_id, 'revoked_by', caller_id));
  RETURN true;
END $$;

ALTER FUNCTION public.revoke_app_access(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.revoke_app_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_app_access(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_app_access(uuid, uuid) TO authenticated;

RAISE NOTICE '[OK] Seccion 6: Integridad user_application_access + revoke_app_access()';


-- ============================================================================
-- SECCION 7: INTEGRIDAD JERARQUICA OPERATIVA (TRIGGERS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_warehouse_hierarchy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE country_tenant UUID;
BEGIN
  SELECT tenant_id INTO country_tenant FROM public.countries WHERE id = NEW.country_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Country with id % not found', NEW.country_id; END IF;
  IF country_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Country % belongs to tenant %, warehouse assigned to tenant %', NEW.country_id, country_tenant, NEW.tenant_id;
  END IF;
  RETURN NEW;
END $$;

ALTER FUNCTION public.validate_warehouse_hierarchy() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_warehouse_hierarchy() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_warehouse_hierarchy() FROM authenticated;
REVOKE ALL ON FUNCTION public.validate_warehouse_hierarchy() FROM anon;

DROP TRIGGER IF EXISTS trg_validate_warehouse_hierarchy ON public.warehouses;
CREATE TRIGGER trg_validate_warehouse_hierarchy BEFORE INSERT OR UPDATE ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.validate_warehouse_hierarchy();

CREATE OR REPLACE FUNCTION public.validate_client_hierarchy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE wh_tenant UUID;
BEGIN
  SELECT w.tenant_id INTO wh_tenant FROM public.warehouses w WHERE w.id = NEW.warehouse_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse with id % not found', NEW.warehouse_id; END IF;
  IF wh_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Warehouse % belongs to tenant %, client assigned to tenant %', NEW.warehouse_id, wh_tenant, NEW.tenant_id;
  END IF;
  RETURN NEW;
END $$;

ALTER FUNCTION public.validate_client_hierarchy() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_client_hierarchy() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_client_hierarchy() FROM authenticated;
REVOKE ALL ON FUNCTION public.validate_client_hierarchy() FROM anon;

DROP TRIGGER IF EXISTS trg_validate_client_hierarchy ON public.clients;
CREATE TRIGGER trg_validate_client_hierarchy BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.validate_client_hierarchy();

CREATE OR REPLACE FUNCTION public.validate_platform_user_hierarchy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE ref_tenant UUID;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.country_id IS NOT NULL THEN
    SELECT tenant_id INTO ref_tenant FROM public.countries WHERE id = NEW.country_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Country % not found', NEW.country_id; END IF;
    IF ref_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Country % belongs to tenant %, user assigned to tenant %', NEW.country_id, ref_tenant, NEW.tenant_id;
    END IF;
  END IF;
  IF NEW.warehouse_id IS NOT NULL THEN
    SELECT tenant_id INTO ref_tenant FROM public.warehouses WHERE id = NEW.warehouse_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse % not found', NEW.warehouse_id; END IF;
    IF ref_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Warehouse % belongs to tenant %, user assigned to tenant %', NEW.warehouse_id, ref_tenant, NEW.tenant_id;
    END IF;
  END IF;
  IF NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO ref_tenant FROM public.clients WHERE id = NEW.client_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Client % not found', NEW.client_id; END IF;
    IF ref_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Client % belongs to tenant %, user assigned to tenant %', NEW.client_id, ref_tenant, NEW.tenant_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

ALTER FUNCTION public.validate_platform_user_hierarchy() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_platform_user_hierarchy() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_platform_user_hierarchy() FROM authenticated;
REVOKE ALL ON FUNCTION public.validate_platform_user_hierarchy() FROM anon;

DROP TRIGGER IF EXISTS trg_validate_platform_user_hierarchy ON public.platform_users;
CREATE TRIGGER trg_validate_platform_user_hierarchy BEFORE INSERT OR UPDATE ON public.platform_users
FOR EACH ROW EXECUTE FUNCTION public.validate_platform_user_hierarchy();

RAISE NOTICE '[OK] Seccion 7: Triggers de integridad jerarquica (OWNER/GRANTS, NO RPC)';


-- ============================================================================
-- SECCION 8: PROTECCION ANTI-ESCALAMIENTO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_anti_escalation_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE caller_level INT; caller_tenant UUID; caller_id UUID; dangerous_columns_changed BOOLEAN := false;
BEGIN
  IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.role_id IS DISTINCT FROM OLD.role_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.country_id IS DISTINCT FROM OLD.country_id
     OR NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN dangerous_columns_changed := true; END IF;
  IF NOT dangerous_columns_changed THEN RETURN NEW; END IF;
  SELECT COALESCE(r.level, 0), pu.tenant_id, pu.id INTO caller_level, caller_tenant, caller_id
  FROM public.platform_users pu JOIN public.roles r ON r.id = pu.role_id WHERE pu.auth_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'anti_escalation: caller not found'; END IF;
  IF caller_level >= 100 THEN RETURN NEW; END IF;
  IF caller_level >= 80 AND public.can_manage_user(OLD.id) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'anti_escalation: user level=% cannot modify sensitive columns for user %', caller_level, OLD.id;
END $$;

ALTER FUNCTION public.trg_anti_escalation_check() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_anti_escalation_check() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_anti_escalation_check() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_anti_escalation_check() FROM anon;

DROP TRIGGER IF EXISTS trg_anti_escalation ON public.platform_users;
CREATE TRIGGER trg_anti_escalation BEFORE UPDATE ON public.platform_users
FOR EACH ROW EXECUTE FUNCTION public.trg_anti_escalation_check();

CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_first_name text DEFAULT NULL, p_last_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL, p_preferences jsonb DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE pu_id UUID; user_tenant UUID;
BEGIN
  SELECT id, tenant_id INTO pu_id, user_tenant FROM public.platform_users WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.platform_users SET first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name), avatar_url = COALESCE(p_avatar_url, avatar_url),
    preferences = COALESCE(p_preferences, preferences), updated_at = NOW() WHERE id = pu_id;
  PERFORM public.write_audit_log('PROFILE_UPDATED', user_tenant, pu_id, 'platform_users', pu_id, 'info',
    jsonb_build_object('fields', jsonb_build_object('first_name', p_first_name IS NOT NULL,
      'last_name', p_last_name IS NOT NULL, 'avatar_url', p_avatar_url IS NOT NULL, 'preferences', p_preferences IS NOT NULL)));
  RETURN true;
END $$;

ALTER FUNCTION public.update_own_profile(text, text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_own_profile(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_own_profile(text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_role(p_target_role_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE my_level INT; target_level INT; target_is_system BOOLEAN; target_tenant UUID; my_tenant UUID;
BEGIN
  my_level := public.get_user_role_level(); my_tenant := public.get_user_tenant_id();
  IF my_level >= 100 THEN RETURN true; END IF;
  SELECT r.level, r.is_system, r.tenant_id INTO target_level, target_is_system, target_tenant
  FROM public.roles r WHERE r.id = p_target_role_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF target_is_system THEN RETURN false; END IF;
  IF my_tenant IS NULL OR my_tenant != target_tenant THEN RETURN false; END IF;
  IF target_level >= my_level THEN RETURN false; END IF;
  RETURN true;
END $$;

ALTER FUNCTION public.can_manage_role(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_manage_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_role(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_user(p_target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE my_level INT; my_tenant UUID; target_tenant UUID; target_level INT;
BEGIN
  my_level := public.get_user_role_level(); my_tenant := public.get_user_tenant_id();
  IF my_level >= 100 THEN RETURN true; END IF;
  SELECT pu.tenant_id, COALESCE(r.level, 0) INTO target_tenant, target_level
  FROM public.platform_users pu LEFT JOIN public.roles r ON r.id = pu.role_id WHERE pu.id = p_target_user_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF target_level >= 100 THEN RETURN false; END IF;
  IF my_tenant IS NULL OR my_tenant != target_tenant THEN RETURN false; END IF;
  IF target_level >= my_level THEN RETURN false; END IF;
  RETURN true;
END $$;

ALTER FUNCTION public.can_manage_user(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_manage_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_user(uuid) TO authenticated;

DROP POLICY IF EXISTS platform_users_update_own ON public.platform_users;
DROP POLICY IF EXISTS platform_users_update_admin ON public.platform_users;
CREATE POLICY platform_users_update_admin ON public.platform_users FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND public.can_manage_user(id)))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND public.can_manage_user(id)));

DROP POLICY IF EXISTS roles_select ON public.roles;
DROP POLICY IF EXISTS roles_insert ON public.roles;
DROP POLICY IF EXISTS roles_update ON public.roles;
CREATE POLICY roles_select ON public.roles FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY roles_insert ON public.roles FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level() >= 80 AND tenant_id = public.get_user_tenant_id()
  AND level < public.get_user_role_level()));
CREATE POLICY roles_update ON public.roles FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()
  AND public.can_manage_role(id)))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()
  AND public.can_manage_role(id)));

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));

DROP POLICY IF EXISTS permissions_select ON public.permissions;
DROP POLICY IF EXISTS permissions_insert ON public.permissions;
DROP POLICY IF EXISTS permissions_update ON public.permissions;
CREATE POLICY permissions_select ON public.permissions FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY permissions_insert ON public.permissions FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY permissions_update ON public.permissions FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));

DROP POLICY IF EXISTS tenant_settings_select ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_insert ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_update ON public.tenant_settings;
CREATE POLICY tenant_settings_select ON public.tenant_settings FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY tenant_settings_insert ON public.tenant_settings FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY tenant_settings_update ON public.tenant_settings FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));

RAISE NOTICE '[OK] Seccion 8: Anti-escalamiento (OWNER/GRANTS + can_manage_* RPC para policies)';


-- ============================================================================
-- SECCION 9: RECONSTRUCCION COMPLETA DE POLITICAS RLS (14 TABLAS)
--            V3.1: SIN politicas *_soft_delete. Solo *_update restrictivas.
-- ============================================================================

DROP POLICY IF EXISTS tenant_select_all ON public.tenants;
DROP POLICY IF EXISTS tenant_select ON public.tenants;
DROP POLICY IF EXISTS tenant_select_sa ON public.tenants;
DROP POLICY IF EXISTS tenant_select_own ON public.tenants;
DROP POLICY IF EXISTS tenant_insert ON public.tenants;
DROP POLICY IF EXISTS tenant_update ON public.tenants;
CREATE POLICY tenant_select_sa ON public.tenants FOR SELECT USING (public.is_super_admin());
CREATE POLICY tenant_select_own ON public.tenants FOR SELECT
USING (NOT public.is_super_admin() AND id = public.get_user_tenant_id());
CREATE POLICY tenant_insert ON public.tenants FOR INSERT WITH CHECK (public.is_super_admin());
CREATE POLICY tenant_update ON public.tenants FOR UPDATE
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS countries_select ON public.countries;
DROP POLICY IF EXISTS countries_insert ON public.countries;
DROP POLICY IF EXISTS countries_update ON public.countries;
CREATE POLICY countries_select ON public.countries FOR SELECT USING (public.can_access_country(id));
CREATE POLICY countries_insert ON public.countries FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY countries_update ON public.countries FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id())
  OR (public.get_user_role_level()>=60 AND public.can_access_country(id)))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id())
  OR (public.get_user_role_level()>=60 AND public.can_access_country(id)));

DROP POLICY IF EXISTS warehouses_select ON public.warehouses;
DROP POLICY IF EXISTS warehouses_insert ON public.warehouses;
DROP POLICY IF EXISTS warehouses_update ON public.warehouses;
CREATE POLICY warehouses_select ON public.warehouses FOR SELECT USING (public.can_access_warehouse(id));
CREATE POLICY warehouses_insert ON public.warehouses FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY warehouses_update ON public.warehouses FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id())
  OR (public.get_user_role_level()>=60 AND public.can_access_warehouse(id))
  OR (public.get_user_role_level()>=40 AND public.can_access_warehouse(id)))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id())
  OR (public.get_user_role_level()>=60 AND public.can_access_warehouse(id))
  OR (public.get_user_role_level()>=40 AND public.can_access_warehouse(id)));

DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_insert ON public.clients;
DROP POLICY IF EXISTS clients_update ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT USING (public.can_access_client(id));
CREATE POLICY clients_insert ON public.clients FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY clients_update ON public.clients FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id())
  OR (public.get_user_role_level()>=60 AND public.can_access_client(id))
  OR (public.get_user_role_level()>=40 AND public.can_access_client(id))
  OR (public.get_user_role_level()>=30 AND public.can_access_client(id)))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id())
  OR (public.get_user_role_level()>=60 AND public.can_access_client(id))
  OR (public.get_user_role_level()>=40 AND public.can_access_client(id))
  OR (public.get_user_role_level()>=30 AND public.can_access_client(id)));

DROP POLICY IF EXISTS platform_users_select ON public.platform_users;
DROP POLICY IF EXISTS platform_users_insert ON public.platform_users;
CREATE POLICY platform_users_select ON public.platform_users FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id() OR auth_user_id = auth.uid());
CREATE POLICY platform_users_insert ON public.platform_users FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));

DROP POLICY IF EXISTS applications_select ON public.applications;
DROP POLICY IF EXISTS applications_insert ON public.applications;
DROP POLICY IF EXISTS applications_update ON public.applications;
CREATE POLICY applications_select ON public.applications FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY applications_insert ON public.applications FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY applications_update ON public.applications FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));

DROP POLICY IF EXISTS app_instances_select ON public.application_instances;
DROP POLICY IF EXISTS app_instances_insert ON public.application_instances;
DROP POLICY IF EXISTS app_instances_update ON public.application_instances;
CREATE POLICY app_instances_select ON public.application_instances FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY app_instances_insert ON public.application_instances FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY app_instances_update ON public.application_instances FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));

DROP POLICY IF EXISTS app_categories_select ON public.application_categories;
DROP POLICY IF EXISTS app_categories_insert ON public.application_categories;
DROP POLICY IF EXISTS app_categories_update ON public.application_categories;
CREATE POLICY app_categories_select ON public.application_categories FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY app_categories_insert ON public.application_categories FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));
CREATE POLICY app_categories_update ON public.application_categories FOR UPDATE
USING (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()))
WITH CHECK (public.is_super_admin() OR (public.get_user_role_level()>=80 AND tenant_id=public.get_user_tenant_id()));

DROP POLICY IF EXISTS user_app_access_select ON public.user_application_access;
CREATE POLICY user_app_access_select ON public.user_application_access FOR SELECT
USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id()
  OR user_id = (SELECT id FROM public.platform_users WHERE auth_user_id = auth.uid()));

RAISE NOTICE '[OK] Seccion 9 (V3.1): Reconstruccion RLS 14 tablas (SIN *_soft_delete, solo *_update restrictivas)';


-- ============================================================================
-- SECCION 10: TRIGGER DE ONBOARDING MEJORADO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE default_tenant_id uuid; pu_id uuid;
BEGIN
  INSERT INTO public.platform_users (auth_user_id, email, status, tenant_id, role_id,
    first_name, last_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'pending', NULL, NULL,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''), NOW(), NOW())
  ON CONFLICT (auth_user_id) DO NOTHING RETURNING id INTO pu_id;
  IF pu_id IS NULL THEN RETURN NEW; END IF;
  BEGIN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE status = 'active' ORDER BY created_at ASC LIMIT 1;
    PERFORM public.write_audit_log('USER_REGISTERED', default_tenant_id, pu_id, 'platform_users', pu_id, 'info',
      jsonb_build_object('email', NEW.email, 'auth_user_id', NEW.id, 'status', 'pending'));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_auth_user: No se pudo registrar audit_log para %', NEW.email;
  END;
  RETURN NEW;
END $$;

ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM anon;

RAISE NOTICE '[OK] Seccion 10: Trigger onboarding mejorado (write_audit_log interno + OWNER/GRANTS)';
RAISE NOTICE '';
RAISE NOTICE 'Parte 2/3 COMPLETADA. Ejecutar hardening_rls_v3_1_part3.sql (Tests + Resumen)';

COMMIT;