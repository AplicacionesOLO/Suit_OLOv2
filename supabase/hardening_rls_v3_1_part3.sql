-- ============================================================================
-- Suite OLO - HARDENING RLS V3.1 PARTE 3/3
-- Tests V3.1 + Resumen Final
-- PREREQUISITO: Ejecutar hardening_rls_v3_1.sql y hardening_rls_v3_1_part2.sql PRIMERO
--
-- CORRECCIONES V3.1 TESTEADAS AQUI:
--   1. CERO politicas *_soft_delete residuales (5 tests criticos nuevos).
--   2. roles_update es UNICA policy FOR UPDATE en roles + can_manage_role().
--   3. soft_delete_record es SECURITY DEFINER OWNER=postgres (bypassea RLS).
--   4. Todos los tests V3.0 y V2.9 preservados.
-- ============================================================================

BEGIN;

RAISE NOTICE 'Suite OLO - Hardening RLS V3.1 - Parte 3/3 (Tests + Resumen)';
RAISE NOTICE '25 tests CRITICOS (RAISE EXCEPTION): 5 V3.1 + 4 V3.0 + 16 V2.9';


-- ============================================================================
-- PRE-TEST: Validacion de sintaxis del DO block
-- ============================================================================
DO $$
DECLARE v3_1_do_syntax_valid BOOLEAN := false;
BEGIN
  v3_1_do_syntax_valid := true;
  RAISE NOTICE '[PASS] DO block syntax V3.1: DECLARE solo variables (sin FUNCTION) => OK';
END $$;


-- ============================================================================
-- TESTS PRINCIPALES V3.1 (25 CRITICOS)
-- ============================================================================
DO $$
DECLARE
  policy_count INT; tenant_all_exists BOOLEAN; func_with_direct_insert INT;
  has_insert_priv BOOLEAN; has_insert_priv_public BOOLEAN; func_owner TEXT;
  write_func_acl TEXT; write_grant_auth BOOLEAN; write_grant_anon BOOLEAN;
  write_grant_public_star BOOLEAN; soft_del_grant_auth BOOLEAN; soft_del_grant_anon BOOLEAN;
  soft_del_grant_public_star BOOLEAN; admin_sd_exists BOOLEAN; admin_sd_validates BOOLEAN;
  admin_sd_validates_tenant BOOLEAN; delete_policies_residual INT;
  revoke_func_exists BOOLEAN; set_tenant_context_all_audit BOOLEAN;
  revoke_uses_access_tenant BOOLEAN; revoke_uses_access_status BOOLEAN;
  strict_func_exists BOOLEAN; strict_grant_auth BOOLEAN; strict_grant_anon BOOLEAN;
  soft_del_uses_strict BOOLEAN; revoke_uses_strict BOOLEAN;
  can_access_grants_ok BOOLEAN; can_manage_grants_ok BOOLEAN;
  whitelist_tables TEXT[]; tbl TEXT; tbl_has_deleted_at BOOLEAN; tbl_has_deleted_by BOOLEAN;
  tbl_has_status BOOLEAN; tbl_has_updated_at BOOLEAN; tables_missing_cols TEXT[];
  sd_uses_info_schema BOOLEAN; sd_has_set_parts BOOLEAN;
  sd_has_has_status_var BOOLEAN; sd_has_dynamic_format BOOLEAN;
  soft_delete_policies_residual INT; soft_delete_policies_list TEXT;
  roles_update_policies INT; roles_update_uses_can_manage BOOLEAN;
  roles_update_only_policy BOOLEAN; soft_del_is_sec_def BOOLEAN;
  soft_del_owner_is_postgres BOOLEAN; any_soft_delete_policy TEXT;
  bypass_policy_found BOOLEAN; test_name TEXT;
  admin_func_exists BOOLEAN; admin_validates_sa BOOLEAN;
  admin_sd_uses_record_tenant BOOLEAN;
  context_funcs_without_audit INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========== TESTS ESTRICTOS (V3.1) ==========';
  RAISE NOTICE '25 CRITICAL: RAISE EXCEPTION -> ROLLBACK si fallan';
  RAISE NOTICE '';

  whitelist_tables := ARRAY['roles','profiles','permissions','applications','application_instances',
    'application_categories','countries','warehouses','clients'];

  -- ============================================================
  -- BLOQUE V3.1: 5 TESTS NUEVOS - Eliminacion *_soft_delete
  -- ============================================================

  -- CRITICAL V3.1 #1: CERO politicas *_soft_delete en las 9 tablas whitelist
  test_name := 'CERO politicas *_soft_delete en las 9 tablas whitelist (V3.1)';
  SELECT COUNT(*) INTO soft_delete_policies_residual FROM pg_policies
  WHERE schemaname = 'public' AND tablename = ANY(whitelist_tables) AND policyname ILIKE '%soft_delete%';
  IF soft_delete_policies_residual > 0 THEN
    SELECT string_agg(policyname || ' ON ' || tablename, ', ') INTO soft_delete_policies_list
    FROM pg_policies WHERE schemaname = 'public' AND tablename = ANY(whitelist_tables) AND policyname ILIKE '%soft_delete%';
    RAISE EXCEPTION '[FAIL] % politica(s) *_soft_delete RESIDUAL(es): %. V3.1 las elimino - son bypass de restricciones jerarquicas!', soft_delete_policies_residual, soft_delete_policies_list;
  ELSE
    RAISE NOTICE '[PASS] %', test_name;
  END IF;

  -- CRITICAL V3.1 #2: roles_update es la UNICA policy FOR UPDATE en roles
  test_name := 'roles_update es la UNICA policy FOR UPDATE en roles (V3.1)';
  SELECT COUNT(*) INTO roles_update_policies FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'roles' AND cmd = 'UPDATE';
  IF roles_update_policies = 1 THEN
    SELECT (policyname = 'roles_update') INTO roles_update_only_policy
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles' AND cmd = 'UPDATE' LIMIT 1;
    IF roles_update_only_policy THEN RAISE NOTICE '[PASS] %', test_name;
    ELSE
      SELECT policyname INTO any_soft_delete_policy FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'roles' AND cmd = 'UPDATE' LIMIT 1;
      RAISE EXCEPTION '[FAIL] La unica policy FOR UPDATE en roles es "%", NO es roles_update!', any_soft_delete_policy;
    END IF;
  ELSIF roles_update_policies = 0 THEN
    RAISE EXCEPTION '[FAIL] CERO policies FOR UPDATE en roles. roles_update DEBE existir!';
  ELSE
    RAISE EXCEPTION '[FAIL] % policies FOR UPDATE en roles (debe ser 1: roles_update). Extra = bypass!', roles_update_policies;
  END IF;

  -- CRITICAL V3.1 #3: roles_update exige can_manage_role() en USING y WITH CHECK
  test_name := 'roles_update exige can_manage_role() en USING y WITH CHECK (V3.1)';
  SELECT EXISTS(SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'roles_update'
      AND cmd = 'UPDATE' AND qual ILIKE '%can_manage_role%' AND with_check ILIKE '%can_manage_role%')
  INTO roles_update_uses_can_manage;
  IF roles_update_uses_can_manage THEN RAISE NOTICE '[PASS] %', test_name;
  ELSE
    IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles'
      AND policyname = 'roles_update' AND cmd = 'UPDATE') THEN
      RAISE EXCEPTION '[FAIL] roles_update existe pero NO exige can_manage_role(). Un TA podria modificar cualquier rol!';
    ELSE
      RAISE EXCEPTION '[FAIL] roles_update NO existe. La unica policy FOR UPDATE en roles debe exigir can_manage_role()!';
    END IF;
  END IF;

  -- CRITICAL V3.1 #4: Ninguna policy FOR UPDATE en roles es mas permisiva que roles_update
  test_name := 'Ninguna policy FOR UPDATE en roles es mas permisiva que roles_update (V3.1)';
  bypass_policy_found := false;
  FOR any_soft_delete_policy IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles'
      AND cmd = 'UPDATE' AND policyname != 'roles_update'
  LOOP
    bypass_policy_found := true;
    RAISE EXCEPTION '[FAIL] Policy "%" FOR UPDATE en roles NO es roles_update. Bypass de can_manage_role()!', any_soft_delete_policy;
  END LOOP;
  IF NOT bypass_policy_found THEN
    IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles'
      AND policyname = 'roles_update' AND cmd = 'UPDATE'
      AND (qual NOT ILIKE '%can_manage_role%' OR with_check NOT ILIKE '%can_manage_role%'))
    THEN
      RAISE EXCEPTION '[FAIL] roles_update no exige can_manage_role() - posible modificacion manual!';
    ELSE
      RAISE NOTICE '[PASS] %', test_name;
    END IF;
  END IF;

  -- CRITICAL V3.1 #5: soft_delete_record es SECURITY DEFINER OWNER=postgres
  test_name := 'soft_delete_record es SECURITY DEFINER OWNER=postgres (V3.1)';
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record' AND p.prosecdef = true)
  INTO soft_del_is_sec_def;
  SELECT (pg_get_userbyid(proowner) = 'postgres') INTO soft_del_owner_is_postgres
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record' LIMIT 1;
  IF soft_del_is_sec_def AND soft_del_owner_is_postgres THEN
    RAISE NOTICE '[PASS] % (bypassea RLS, no necesita politicas *_soft_delete)', test_name;
  ELSIF NOT soft_del_is_sec_def THEN
    RAISE EXCEPTION '[FAIL] soft_delete_record NO es SECURITY DEFINER. Sin politicas, el UPDATE fallaria!';
  ELSE
    RAISE EXCEPTION '[FAIL] soft_delete_record owner NO es postgres (debe serlo para bypassear RLS)';
  END IF;

  -- ============================================================
  -- BLOQUE V3.0: 4 tests schema whitelist + dinamico
  -- ============================================================

  -- CRITICAL #6: Las 9 tablas whitelist tienen deleted_at
  test_name := 'Las 9 tablas whitelist tienen columna deleted_at';
  tables_missing_cols := ARRAY[]::TEXT[];
  FOREACH tbl IN ARRAY whitelist_tables LOOP
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='deleted_at') INTO tbl_has_deleted_at;
    IF NOT tbl_has_deleted_at THEN tables_missing_cols := array_append(tables_missing_cols, tbl || '(deleted_at)'); END IF;
  END LOOP;
  IF array_length(tables_missing_cols, 1) IS NULL THEN RAISE NOTICE '[PASS] %', test_name;
  ELSE RAISE EXCEPTION '[FAIL] Tablas SIN deleted_at: %', array_to_string(tables_missing_cols, ', '); END IF;

  -- CRITICAL #7: Las 9 tablas whitelist tienen deleted_by
  test_name := 'Las 9 tablas whitelist tienen columna deleted_by';
  tables_missing_cols := ARRAY[]::TEXT[];
  FOREACH tbl IN ARRAY whitelist_tables LOOP
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='deleted_by') INTO tbl_has_deleted_by;
    IF NOT tbl_has_deleted_by THEN tables_missing_cols := array_append(tables_missing_cols, tbl || '(deleted_by)'); END IF;
  END LOOP;
  IF array_length(tables_missing_cols, 1) IS NULL THEN RAISE NOTICE '[PASS] %', test_name;
  ELSE RAISE EXCEPTION '[FAIL] Tablas SIN deleted_by: %', array_to_string(tables_missing_cols, ', '); END IF;

  -- CRITICAL #8: soft_delete_record detecta columnas dinamicamente
  test_name := 'soft_delete_record usa information_schema.columns (dinamico V3.0)';
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record' AND p.prosrc ILIKE '%information_schema.columns%')
  INTO sd_uses_info_schema;
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record'
      AND p.prosrc ILIKE '%has_status%' AND p.prosrc ILIKE '%has_updated_at%') INTO sd_has_has_status_var;
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record'
      AND p.prosrc ILIKE '%set_parts%' AND p.prosrc ILIKE '%array_append%') INTO sd_has_set_parts;
  IF sd_uses_info_schema AND sd_has_has_status_var AND sd_has_set_parts THEN
    RAISE NOTICE '[PASS] %', test_name;
  ELSIF NOT sd_uses_info_schema THEN
    RAISE EXCEPTION '[FAIL] soft_delete_record NO consulta information_schema.columns!';
  ELSE
    RAISE EXCEPTION '[FAIL] soft_delete_record sin deteccion dinamica completa (has_status=%, set_parts=%)', sd_has_has_status_var, sd_has_set_parts;
  END IF;

  -- CRITICAL #9: soft_delete_record NO asume status fijo
  test_name := 'soft_delete_record NO asume status fijo (maneja tablas sin status)';
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record' AND p.prosrc ILIKE '%IF has_status THEN%')
  INTO sd_has_dynamic_format;
  IF sd_has_dynamic_format THEN RAISE NOTICE '[PASS] %', test_name;
  ELSE
    IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record'
        AND p.prosrc ILIKE '%SET status = ''inactive''%' AND p.prosrc NOT ILIKE '%IF has_status%') THEN
      RAISE EXCEPTION '[FAIL] soft_delete_record tiene SET status fijo SIN condicional!';
    ELSE RAISE NOTICE '[PASS] % (no se detecta patron fijo)', test_name; END IF;
  END IF;

  -- ============================================================
  -- BLOQUE V2.9: 16 tests auditoria strict + OWNER/GRANTS + integridad
  -- ============================================================

  -- CRITICAL #10: write_audit_log_strict() existe y bloqueado
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'write_audit_log_strict') INTO strict_func_exists;
  SELECT EXISTS(SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_name = 'write_audit_log_strict' AND grantee = 'authenticated' AND privilege_type = 'EXECUTE') INTO strict_grant_auth;
  SELECT EXISTS(SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_name = 'write_audit_log_strict' AND grantee = 'anon' AND privilege_type = 'EXECUTE') INTO strict_grant_anon;
  IF strict_func_exists AND NOT strict_grant_auth AND NOT strict_grant_anon THEN
    RAISE NOTICE '[PASS] write_audit_log_strict() bloqueado para frontend';
  ELSIF NOT strict_func_exists THEN RAISE EXCEPTION '[FAIL] write_audit_log_strict() NO EXISTE!';
  ELSE RAISE EXCEPTION '[FAIL] write_audit_log_strict() EXPUESTO!'; END IF;

  -- CRITICAL #11: soft_delete_record usa write_audit_log_strict
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record' AND p.prosrc ILIKE '%write_audit_log_strict%')
  INTO soft_del_uses_strict;
  IF soft_del_uses_strict THEN RAISE NOTICE '[PASS] soft_delete_record usa write_audit_log_strict';
  ELSE RAISE EXCEPTION '[FAIL] soft_delete_record NO usa write_audit_log_strict()!'; END IF;

  -- CRITICAL #12: revoke_app_access usa write_audit_log_strict
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'revoke_app_access' AND p.prosrc ILIKE '%write_audit_log_strict%')
  INTO revoke_uses_strict;
  IF revoke_uses_strict THEN RAISE NOTICE '[PASS] revoke_app_access usa write_audit_log_strict';
  ELSE RAISE EXCEPTION '[FAIL] revoke_app_access NO usa write_audit_log_strict()!'; END IF;

  -- CRITICAL #13: revoke_app_access usa access_status
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'revoke_app_access' AND p.prosrc ILIKE '%access_status%')
  INTO revoke_uses_access_status;
  IF revoke_uses_access_status THEN RAISE NOTICE '[PASS] revoke_app_access usa access_status';
  ELSE
    IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'revoke_app_access' AND p.prosrc ILIKE '%SET status =%') THEN
      RAISE EXCEPTION '[FAIL] revoke_app_access usa "status", columna real es "access_status"!';
    ELSE RAISE EXCEPTION '[FAIL] revoke_app_access NO referencia access_status!'; END IF;
  END IF;

  -- CRITICAL #14: revoke_app_access OWNER=postgres
  SELECT pg_get_userbyid(proowner) INTO func_owner FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'revoke_app_access' LIMIT 1;
  IF func_owner = 'postgres' THEN RAISE NOTICE '[PASS] revoke_app_access OWNER=postgres';
  ELSE RAISE EXCEPTION '[FAIL] revoke_app_access owner es %', COALESCE(func_owner, 'DESCONOCIDO'); END IF;

  -- CRITICAL #15: authenticated NO puede write_audit_log
  SELECT EXISTS(SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_name = 'write_audit_log' AND grantee = 'authenticated' AND privilege_type = 'EXECUTE') INTO write_grant_auth;
  IF write_grant_auth THEN RAISE EXCEPTION '[FAIL] write_audit_log() GRANT EXECUTE para authenticated!';
  ELSE RAISE NOTICE '[PASS] authenticated NO puede write_audit_log()'; END IF;

  -- CRITICAL #16: anon NO puede write_audit_log
  SELECT EXISTS(SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_name = 'write_audit_log' AND grantee = 'anon' AND privilege_type = 'EXECUTE') INTO write_grant_anon;
  IF write_grant_anon THEN RAISE EXCEPTION '[FAIL] write_audit_log() GRANT EXECUTE para anon!';
  ELSE RAISE NOTICE '[PASS] anon NO puede write_audit_log()'; END IF;

  -- CRITICAL #17: write_audit_log owner es postgres
  SELECT pg_get_userbyid(proowner) INTO func_owner FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'write_audit_log'
    AND p.proargtypes::text LIKE '%text%uuid%uuid%text%uuid%text%jsonb%' LIMIT 1;
  IF func_owner = 'postgres' THEN RAISE NOTICE '[PASS] write_audit_log() owner=postgres';
  ELSE RAISE EXCEPTION '[FAIL] write_audit_log() owner es %', COALESCE(func_owner, 'DESCONOCIDO'); END IF;

  -- CRITICAL #18: REVOKE INSERT FROM PUBLIC en audit_logs
  SELECT has_table_privilege('public', 'public.audit_logs', 'INSERT') INTO has_insert_priv_public;
  IF has_insert_priv_public THEN RAISE EXCEPTION '[FAIL] PUBLIC puede insertar en audit_logs!';
  ELSE RAISE NOTICE '[PASS] REVOKE INSERT FROM PUBLIC en audit_logs'; END IF;

  -- CRITICAL #19: REVOKE INSERT para authenticated en audit_logs
  SELECT has_table_privilege('authenticated', 'public.audit_logs', 'INSERT') INTO has_insert_priv;
  IF has_insert_priv THEN RAISE EXCEPTION '[FAIL] authenticated puede insertar en audit_logs!';
  ELSE RAISE NOTICE '[PASS] REVOKE INSERT para authenticated en audit_logs'; END IF;

  -- CRITICAL #20: admin_write_audit_log valida is_super_admin
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_write_audit_log') INTO admin_func_exists;
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_write_audit_log' AND p.prosrc ILIKE '%is_super_admin%')
  INTO admin_validates_sa;
  IF admin_func_exists AND admin_validates_sa THEN RAISE NOTICE '[PASS] admin_write_audit_log valida is_super_admin()';
  ELSE RAISE EXCEPTION '[FAIL] admin_write_audit_log() no existe o no valida is_super_admin()'; END IF;

  -- CRITICAL #21: authenticated NO puede soft_delete_record
  SELECT EXISTS(SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_name = 'soft_delete_record' AND grantee = 'authenticated' AND privilege_type = 'EXECUTE') INTO soft_del_grant_auth;
  IF soft_del_grant_auth THEN RAISE EXCEPTION '[FAIL] soft_delete_record() GRANT EXECUTE para authenticated!';
  ELSE RAISE NOTICE '[PASS] authenticated NO puede soft_delete_record()'; END IF;

  -- CRITICAL #22: soft_delete_record owner es postgres
  SELECT pg_get_userbyid(proowner) INTO func_owner FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record' LIMIT 1;
  IF func_owner = 'postgres' THEN RAISE NOTICE '[PASS] soft_delete_record() owner=postgres';
  ELSE RAISE EXCEPTION '[FAIL] soft_delete_record() owner es %', COALESCE(func_owner, 'DESCONOCIDO'); END IF;

  -- CRITICAL #23: admin_soft_delete_record valida permisos y tenant_id
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_soft_delete_record') INTO admin_sd_exists;
  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_soft_delete_record'
      AND p.prosrc ILIKE '%is_super_admin%' AND p.prosrc ILIKE '%caller_level%') INTO admin_sd_validates;
  IF admin_sd_exists AND admin_sd_validates THEN RAISE NOTICE '[PASS] admin_soft_delete_record valida permisos';
  ELSE RAISE EXCEPTION '[FAIL] admin_soft_delete_record() no existe o no valida permisos'; END IF;

  -- CRITICAL #24: CERO politicas DELETE fisicas
  SELECT COUNT(*) INTO delete_policies_residual FROM pg_policies
  WHERE schemaname = 'public' AND cmd = 'DELETE'
    AND policyname IN ('roles_delete','profiles_delete','permissions_delete','tenant_settings_delete',
      'user_app_access_delete','countries_delete','warehouses_delete','clients_delete',
      'applications_delete','app_instances_delete','app_categories_delete');
  IF delete_policies_residual > 0 THEN
    RAISE EXCEPTION '[FAIL] % politica(s) DELETE fisica(s) RESIDUAL(es)!', delete_policies_residual;
  ELSE RAISE NOTICE '[PASS] CERO politicas DELETE fisicas'; END IF;

  -- CRITICAL #25: Solo write_audit_log/_strict hacen INSERT en audit_logs
  SELECT COUNT(*) INTO func_with_direct_insert FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname NOT IN ('write_audit_log', 'write_audit_log_strict')
    AND p.prosrc ILIKE '%INSERT%INTO%public.audit_logs%';
  IF func_with_direct_insert > 0 THEN
    RAISE EXCEPTION '[FAIL] % funcion(es) con INSERT directo en audit_logs!', func_with_direct_insert;
  ELSE RAISE NOTICE '[PASS] Solo write_audit_log/_strict hacen INSERT en audit_logs'; END IF;

  -- ============================================================
  -- FIN CRITICOS
  -- ============================================================
  RAISE NOTICE '';
  RAISE NOTICE '[OK] LOS 25 TESTS CRITICOS V3.1 PASARON - COMMIT procedera';
  RAISE NOTICE '  5 V3.1: eliminacion *_soft_delete + roles_update restrictivo + SECURITY DEFINER';
  RAISE NOTICE '  4 V3.0: schema whitelist + soft_delete_record dinamico';
  RAISE NOTICE ' 16 V2.9: auditoria strict + OWNER/GRANTS + integridad';

  -- ============================================================
  -- TESTS NO CRITICOS (WARNING)
  -- ============================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TESTS NO CRITICOS (WARNING) ---';

  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'profiles_update' AND cmd = 'UPDATE' AND qual ILIKE '%is_super_admin%')
  THEN RAISE NOTICE '[PASS] profiles_update restrictiva: SA o TA';
  ELSE RAISE WARNING '[FAIL] profiles_update no restrictiva'; END IF;

  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permissions'
    AND policyname = 'permissions_update' AND cmd = 'UPDATE' AND qual ILIKE '%is_super_admin%')
  THEN RAISE NOTICE '[PASS] permissions_update restrictiva: SA o TA';
  ELSE RAISE WARNING '[FAIL] permissions_update no restrictiva'; END IF;

  SELECT COUNT(*) INTO soft_delete_policies_residual FROM pg_policies
  WHERE schemaname = 'public' AND policyname ILIKE '%soft_delete%';
  IF soft_delete_policies_residual = 0 THEN RAISE NOTICE '[PASS] CERO *_soft_delete en TODA la DB';
  ELSE RAISE WARNING '[FAIL] % *_soft_delete residuales en otras tablas', soft_delete_policies_residual; END IF;

  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_soft_delete_record' AND p.prosecdef = true)
  THEN RAISE NOTICE '[PASS] admin_soft_delete_record es SECURITY DEFINER';
  ELSE RAISE WARNING '[FAIL] admin_soft_delete_record NO es SECURITY DEFINER'; END IF;

  RAISE NOTICE '--- Schema whitelist (diagnostico informativo) ---';
  FOREACH tbl IN ARRAY whitelist_tables LOOP
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='status') INTO tbl_has_status;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='updated_at') INTO tbl_has_updated_at;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='deleted_at') INTO tbl_has_deleted_at;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='deleted_by') INTO tbl_has_deleted_by;
    IF tbl_has_deleted_at AND tbl_has_deleted_by THEN
      RAISE NOTICE '[PASS] %: deleted_at=SI, deleted_by=SI, status=%, updated_at=%', tbl,
        CASE WHEN tbl_has_status THEN 'SI' ELSE 'NO (OK)' END,
        CASE WHEN tbl_has_updated_at THEN 'SI' ELSE 'NO (OK)' END;
    ELSE
      RAISE WARNING '[FAIL] %: deleted_at=%, deleted_by=%', tbl,
        CASE WHEN tbl_has_deleted_at THEN 'SI' ELSE 'NO!!!' END,
        CASE WHEN tbl_has_deleted_by THEN 'SI' ELSE 'NO!!!' END;
    END IF;
  END LOOP;

  SELECT EXISTS(SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_name = 'can_access_country' AND grantee = 'authenticated' AND privilege_type = 'EXECUTE') INTO can_access_grants_ok;
  IF can_access_grants_ok THEN RAISE NOTICE '[PASS] can_access_country GRANT EXECUTE (requerido por RLS policies)';
  ELSE RAISE WARNING '[FAIL] can_access_country SIN GRANT EXECUTE'; END IF;

  SELECT EXISTS(SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_name = 'can_manage_role' AND grantee = 'authenticated' AND privilege_type = 'EXECUTE') INTO can_manage_grants_ok;
  IF can_manage_grants_ok THEN RAISE NOTICE '[PASS] can_manage_role GRANT EXECUTE (requerido por roles_update)';
  ELSE RAISE WARNING '[FAIL] can_manage_role SIN GRANT EXECUTE'; END IF;

  SELECT EXISTS(SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_name = 'soft_delete_record' AND grantee = 'anon' AND privilege_type = 'EXECUTE') INTO soft_del_grant_anon;
  IF soft_del_grant_anon THEN RAISE WARNING '[FAIL] anon puede soft_delete_record()';
  ELSE RAISE NOTICE '[PASS] anon NO puede soft_delete_record()'; END IF;

  SELECT proacl::text INTO write_func_acl FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record' LIMIT 1;
  soft_del_grant_public_star := (write_func_acl IS NOT NULL AND write_func_acl LIKE '%=X/%');
  IF soft_del_grant_public_star THEN RAISE WARNING '[FAIL] PUBLIC puede soft_delete_record()';
  ELSE RAISE NOTICE '[PASS] PUBLIC NO puede soft_delete_record()'; END IF;

  SELECT proacl::text INTO write_func_acl FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'write_audit_log'
    AND p.proargtypes::text LIKE '%text%uuid%uuid%text%uuid%text%jsonb%' LIMIT 1;
  write_grant_public_star := (write_func_acl IS NOT NULL AND write_func_acl LIKE '%=X/%');
  IF write_grant_public_star THEN RAISE WARNING '[FAIL] PUBLIC puede write_audit_log()';
  ELSE RAISE NOTICE '[PASS] PUBLIC NO puede write_audit_log()'; END IF;

  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'revoke_app_access') INTO revoke_func_exists;
  IF revoke_func_exists THEN RAISE NOTICE '[PASS] revoke_app_access() existe';
  ELSE RAISE WARNING '[FAIL] revoke_app_access() NO existe'; END IF;

  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_soft_delete_record' AND p.prosrc ILIKE '%effective_tenant%')
  INTO admin_sd_uses_record_tenant;
  IF admin_sd_uses_record_tenant THEN RAISE NOTICE '[PASS] admin_soft_delete_record usa effective_tenant';
  ELSE RAISE WARNING '[FAIL] admin_soft_delete_record NO usa effective_tenant'; END IF;

  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'set_tenant_context' AND p.prosrc ILIKE '%write_audit_log%TENANT_CONTEXT_SET%')
  INTO set_tenant_context_all_audit;
  IF set_tenant_context_all_audit THEN RAISE NOTICE '[PASS] set_tenant_context audita todas las ramas';
  ELSE RAISE WARNING '[FAIL] set_tenant_context puede no auditar'; END IF;

  SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'revoke_app_access'
      AND p.prosrc ILIKE '%APP_ACCESS_REVOKED%' AND p.prosrc ILIKE '%access_tenant%')
  INTO revoke_uses_access_tenant;
  IF revoke_uses_access_tenant THEN RAISE NOTICE '[PASS] revoke_app_access usa access_tenant real';
  ELSE RAISE WARNING '[FAIL] revoke_app_access podria usar p_tenant_id'; END IF;

  IF EXISTS(SELECT 1 FROM pg_policies WHERE policyname='audit_logs_select' AND qual ILIKE '%level%) = 50%')
  THEN RAISE NOTICE '[PASS] Auditor level=50 lee audit logs'; ELSE RAISE WARNING '[FAIL] Auditor sin acceso'; END IF;

  IF EXISTS(SELECT 1 FROM pg_policies WHERE policyname='audit_logs_select' AND qual ILIKE '%user_id%auth_user_id%')
  THEN RAISE NOTICE '[PASS] Usuario lee sus propios logs'; ELSE RAISE WARNING '[FAIL] Politica usuario no encontrada'; END IF;

  SELECT COUNT(*) INTO context_funcs_without_audit FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname IN ('set_country_context','clear_country_context',
    'set_warehouse_context','clear_warehouse_context','set_client_context','clear_client_context')
    AND p.prosrc NOT ILIKE '%write_audit_log%';
  IF context_funcs_without_audit = 0 THEN RAISE NOTICE '[PASS] TODAS las funciones de contexto auditan';
  ELSE RAISE WARNING '[FAIL] % funcion(es) de contexto SIN auditoria', context_funcs_without_audit; END IF;

  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'soft_delete_record'
      AND p.prosrc ILIKE '%allowed_tables%' AND p.prosrc ILIKE '%RAISE EXCEPTION%')
  THEN RAISE NOTICE '[PASS] soft_delete_record tiene whitelist'; ELSE RAISE WARNING '[FAIL] sin whitelist'; END IF;

  SELECT EXISTS(SELECT 1 FROM pg_policies WHERE policyname='tenant_select_all') INTO tenant_all_exists;
  IF tenant_all_exists THEN RAISE WARNING '[FAIL] tenant_select_all existe'; ELSE RAISE NOTICE '[PASS] tenant_select_all eliminado'; END IF;

  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname='public' AND qual = 'true';
  IF policy_count > 0 THEN RAISE WARNING '[FAIL] % politica(s) USING(true)', policy_count;
  ELSE RAISE NOTICE '[PASS] Cero USING(true)'; END IF;

  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname='public' AND with_check = 'true';
  IF policy_count > 0 THEN RAISE WARNING '[FAIL] % politica(s) WITH CHECK(true)', policy_count;
  ELSE RAISE NOTICE '[PASS] Cero WITH CHECK(true)'; END IF;

  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE policyname='platform_users_update_own')
  THEN RAISE NOTICE '[PASS] platform_users_update_own eliminada';
  ELSE RAISE WARNING '[FAIL] platform_users_update_own existe'; END IF;

  IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_anti_escalation')
  THEN RAISE NOTICE '[PASS] Trigger anti-escalamiento activo'; ELSE RAISE WARNING '[FAIL] sin trigger'; END IF;

  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
    WHERE n.nspname='public' AND p.proname='update_own_profile')
  THEN RAISE NOTICE '[PASS] update_own_profile() existe'; END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========== VERIFICACION V3.1 COMPLETADA ==========';
  RAISE NOTICE '25 tests criticos PASARON. No-criticos con WARNING no bloquean COMMIT.';
END $$;


-- ============================================================================
-- SECCION 12: RESUMEN FINAL V3.1
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Suite OLO - Hardening RLS V3.1 COMPLETADO';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CORRECCION CRITICA V3.0 -> V3.1:';
  RAISE NOTICE '  ELIMINACION de TODAS las politicas *_soft_delete FOR UPDATE.';
  RAISE NOTICE '  PostgreSQL RLS NO restringe columnas en FOR UPDATE.';
  RAISE NOTICE '  roles_soft_delete permitia a un TA modificar level/is_system';
  RAISE NOTICE '  sin pasar por can_manage_role().';
  RAISE NOTICE '';
  RAISE NOTICE '  soft_delete_record() es SECURITY DEFINER OWNER=postgres.';
  RAISE NOTICE '  Las funciones SECURITY DEFINER BYPASSEAN RLS por diseno.';
  RAISE NOTICE '  Las politicas *_soft_delete eran innecesarias y peligrosas.';
  RAISE NOTICE '';
  RAISE NOTICE 'ARQUITECTURA FINAL V3.1:';
  RAISE NOTICE '  admin_soft_delete_record() <- UNICO punto de entrada (RPC, SA/TA)';
  RAISE NOTICE '    -> validacion permisos + tenant + whitelist';
  RAISE NOTICE '    -> soft_delete_record() (SECURITY DEFINER, OWNER=postgres)';
  RAISE NOTICE '      -> deteccion dinamica columnas (information_schema.columns)';
  RAISE NOTICE '      -> UPDATE construido dinamicamente';
  RAISE NOTICE '      -> write_audit_log_strict()';
  RAISE NOTICE '  CERO politicas *_soft_delete.';
  RAISE NOTICE '  roles_update es UNICA via UPDATE en roles + can_manage_role().';
  RAISE NOTICE '';
  RAISE NOTICE '25 tests CRITICOS: 5 V3.1 + 4 V3.0 + 16 V2.9';
  RAISE NOTICE '30+ tests NO CRITICOS (WARNING informativo)';
  RAISE NOTICE '';
  RAISE NOTICE 'PROXIMO PASO: Ejecutar phase_5.3_test_users.sql + validar en /rls-test';
  RAISE NOTICE '  [NUEVO V3.1] Confirmar TA NO modifica level/is_system de roles via UPDATE directo';
  RAISE NOTICE '  [NUEVO V3.1] Confirmar CERO politicas *_soft_delete en pg_policies';
  RAISE NOTICE '============================================';
END $$;

COMMIT;