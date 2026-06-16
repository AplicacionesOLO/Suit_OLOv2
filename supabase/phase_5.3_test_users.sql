-- ============================================================
-- SUITE OLO — FASE 5.3: CREACIÓN DE USUARIOS DE PRUEBA RLS
-- Versión: 1.0.0
-- Fecha:   2026-06-15
-- 
-- ⛔ PRIMERO: Ejecutar supabase/hardening_rls.sql en SQL Editor
-- ⛔ SEGUNDO: Crear los 7 usuarios en Supabase Auth Dashboard
--             (Authentication > Users > Add User)
-- ⛔ TERCERO: Ejecutar ESTE script para crear platform_users
-- 
-- Usuarios a crear en Auth Dashboard (password idéntico al email):
--   super.admin@olo.test
--   tenant.admin@olo.test
--   country.admin@olo.test
--   warehouse.admin@olo.test
--   client.admin@olo.test
--   auditor@olo.test
--   user@olo.test
-- ============================================================

BEGIN;

-- ============================================================
-- PASO 1: Obtener los auth.user_id de los usuarios creados
-- ============================================================
-- Después de crear los usuarios en Auth Dashboard, ejecutar:
-- SELECT id, email FROM auth.users WHERE email LIKE '%@olo.test';
-- 
-- Luego reemplazar los placeholders abajo con los IDs reales.
-- ============================================================

-- ⚠️ REEMPLAZAR ESTOS IDs con los valores obtenidos del SELECT anterior
-- \set super_admin_id     'UUID-DEL-USUARIO-SUPER-ADMIN'
-- \set tenant_admin_id    'UUID-DEL-USUARIO-TENANT-ADMIN'
-- \set country_admin_id   'UUID-DEL-USUARIO-COUNTRY-ADMIN'
-- \set warehouse_admin_id 'UUID-DEL-USUARIO-WAREHOUSE-ADMIN'
-- \set client_admin_id    'UUID-DEL-USUARIO-CLIENT-ADMIN'
-- \set auditor_id         'UUID-DEL-USUARIO-AUDITOR'
-- \set basic_user_id      'UUID-DEL-USUARIO-BASIC'

-- ============================================================
-- PASO 2: IDs de referencia (NO MODIFICAR)
-- ============================================================

-- Roles del sistema:
--   10000000-0000-0000-0000-000000000001  Super Admin      (level 100)
--   10000000-0000-0000-0000-000000000002  Tenant Admin     (level 80)
--   10000000-0000-0000-0000-000000000003  Country Admin    (level 60)
--   10000000-0000-0000-0000-000000000007  Auditor          (level 50)
--   10000000-0000-0000-0000-000000000004  Warehouse Admin  (level 40)
--   10000000-0000-0000-0000-000000000005  Client Admin     (level 30)
--   10000000-0000-0000-0000-000000000006  User             (level 10)

-- Tenants:
--   00000000-0000-0000-0000-000000000001  Costa Rica (CR)
--   00000000-0000-0000-0000-000000000002  Panamá    (PA)
--   00000000-0000-0000-0000-000000000003  México    (MX)
--   00000000-0000-0000-0000-000000000004  Colombia  (CO)

-- Countries en CR:
--   f7474d1f-95d2-464b-8ad4-03ced84827ab  Costa Rica
--   1e9ad13c-53b7-437f-bc2b-86ebe5175b22  Nicaragua

-- Warehouses en CR:
--   9a5baf2e-da28-405c-94f6-a0c1887b50d2  Bodega Cartago    (CR)
--   0d82b413-700c-4b42-b7d1-a3cb1d9b9fd0  CD Heredia         (CR)
--   39b0f50e-36a2-4d82-94b3-e4a8b2c55009  Bodega Managua    (NI)

-- Clients en CR:
--   523e1e6b-5217-46d3-84c0-ce44dee17b5d  Almacenes El Roble Ltda.    (Bodega Cartago)
--   89be28a7-9346-4154-88b2-00f272ca966d  Bodegas Unidas del Norte     (CD Heredia)
--   c95bcea8-e021-419b-8d46-0d8def16e26c  AgroComercio del Pacifico    (Bodega Managua)

-- Profiles:
--   40000000-0000-0000-4000-000000000001  Administrador Operativo
--   40000000-0000-0000-4000-000000000002  Supervisor Logistico
--   40000000-0000-0000-4000-000000000003  Analista Comercial
--   40000000-0000-0000-4000-000000000004  Auditor de Seguridad
--   40000000-0000-0000-4000-000000000005  Usuario Basico

-- ============================================================
-- PASO 3: Insertar platform_users
-- ============================================================

-- 1. Super Admin: ve todos los tenants, sin restricción de país/almacén/cliente
-- INSERT INTO public.platform_users (auth_user_id, tenant_id, country_id, warehouse_id, client_id, role_id, profile_id, first_name, last_name, email, status, created_at, updated_at)
-- VALUES (:super_admin_id, '00000000-0000-0000-0000-000000000001', NULL, NULL, NULL, '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-4000-000000000001', 'Super', 'Admin', 'super.admin@olo.test', 'active', NOW(), NOW())
-- ON CONFLICT (auth_user_id) DO UPDATE SET status = 'active', role_id = '10000000-0000-0000-0000-000000000001';

-- 2. Tenant Admin CR: solo ve tenant Costa Rica
-- INSERT INTO public.platform_users (auth_user_id, tenant_id, country_id, warehouse_id, client_id, role_id, profile_id, first_name, last_name, email, status, created_at, updated_at)
-- VALUES (:tenant_admin_id, '00000000-0000-0000-0000-000000000001', NULL, NULL, NULL, '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-4000-000000000001', 'Tenant', 'Admin', 'tenant.admin@olo.test', 'active', NOW(), NOW())
-- ON CONFLICT (auth_user_id) DO UPDATE SET status = 'active', role_id = '10000000-0000-0000-0000-000000000002';

-- 3. Country Admin: solo ve país Costa Rica (f7474d1f...)
-- INSERT INTO public.platform_users (auth_user_id, tenant_id, country_id, warehouse_id, client_id, role_id, profile_id, first_name, last_name, email, status, created_at, updated_at)
-- VALUES (:country_admin_id, '00000000-0000-0000-0000-000000000001', 'f7474d1f-95d2-464b-8ad4-03ced84827ab', NULL, NULL, '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-4000-000000000002', 'Country', 'Admin', 'country.admin@olo.test', 'active', NOW(), NOW())
-- ON CONFLICT (auth_user_id) DO UPDATE SET status = 'active', role_id = '10000000-0000-0000-0000-000000000003';

-- 4. Warehouse Admin: solo ve Bodega Cartago (9a5baf2e...)
-- INSERT INTO public.platform_users (auth_user_id, tenant_id, country_id, warehouse_id, client_id, role_id, profile_id, first_name, last_name, email, status, created_at, updated_at)
-- VALUES (:warehouse_admin_id, '00000000-0000-0000-0000-000000000001', 'f7474d1f-95d2-464b-8ad4-03ced84827ab', '9a5baf2e-da28-405c-94f6-a0c1887b50d2', NULL, '10000000-0000-0000-0000-000000000004', '40000000-0000-0000-4000-000000000002', 'Warehouse', 'Admin', 'warehouse.admin@olo.test', 'active', NOW(), NOW())
-- ON CONFLICT (auth_user_id) DO UPDATE SET status = 'active', role_id = '10000000-0000-0000-0000-000000000004';

-- 5. Client Admin: solo ve Almacenes El Roble (523e1e6b...)
-- INSERT INTO public.platform_users (auth_user_id, tenant_id, country_id, warehouse_id, client_id, role_id, profile_id, first_name, last_name, email, status, created_at, updated_at)
-- VALUES (:client_admin_id, '00000000-0000-0000-0000-000000000001', 'f7474d1f-95d2-464b-8ad4-03ced84827ab', '9a5baf2e-da28-405c-94f6-a0c1887b50d2', '523e1e6b-5217-46d3-84c0-ce44dee17b5d', '10000000-0000-0000-0000-000000000005', '40000000-0000-0000-4000-000000000003', 'Client', 'Admin', 'client.admin@olo.test', 'active', NOW(), NOW())
-- ON CONFLICT (auth_user_id) DO UPDATE SET status = 'active', role_id = '10000000-0000-0000-0000-000000000005';

-- 6. Auditor: solo ve audit_logs del tenant CR, sin permisos de escritura
-- INSERT INTO public.platform_users (auth_user_id, tenant_id, country_id, warehouse_id, client_id, role_id, profile_id, first_name, last_name, email, status, created_at, updated_at)
-- VALUES (:auditor_id, '00000000-0000-0000-0000-000000000001', NULL, NULL, NULL, '10000000-0000-0000-0000-000000000007', '40000000-0000-0000-4000-000000000004', 'Audit', 'Reader', 'auditor@olo.test', 'active', NOW(), NOW())
-- ON CONFLICT (auth_user_id) DO UPDATE SET status = 'active', role_id = '10000000-0000-0000-0000-000000000007';

-- 7. Usuario básico: solo ve aplicaciones asignadas en tenant CR
-- INSERT INTO public.platform_users (auth_user_id, tenant_id, country_id, warehouse_id, client_id, role_id, profile_id, first_name, last_name, email, status, created_at, updated_at)
-- VALUES (:basic_user_id, '00000000-0000-0000-0000-000000000001', NULL, NULL, NULL, '10000000-0000-0000-0000-000000000006', '40000000-0000-0000-4000-000000000005', 'Basic', 'User', 'user@olo.test', 'active', NOW(), NOW())
-- ON CONFLICT (auth_user_id) DO UPDATE SET status = 'active', role_id = '10000000-0000-0000-0000-000000000006';

COMMIT;

-- ============================================================
-- VERIFICACIÓN: Ejecutar después del INSERT
-- ============================================================
-- SELECT pu.email, r.name AS role, r.level, t.name AS tenant,
--        c.name AS country, w.name AS warehouse, cl.name AS client,
--        pu.status
-- FROM platform_users pu
-- LEFT JOIN roles r ON pu.role_id = r.id
-- LEFT JOIN tenants t ON pu.tenant_id = t.id
-- LEFT JOIN countries c ON pu.country_id = c.id
-- LEFT JOIN warehouses w ON pu.warehouse_id = w.id
-- LEFT JOIN clients cl ON pu.client_id = cl.id
-- WHERE pu.email LIKE '%@olo.test'
-- ORDER BY r.level DESC;