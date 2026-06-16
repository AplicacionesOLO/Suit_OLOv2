import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';

const RLS_TEST_ENABLED = import.meta.env.VITE_ENABLE_RLS_TEST === 'true';

interface TestResult {
  table: string;
  label: string;
  expected: string;
  actual: string;
  status: 'pass' | 'fail' | 'warning';
  rows: number;
  detail: string;
}

interface TableRow {
  name: string;
  code?: string;
  status?: string;
  [key: string]: unknown;
}

export default function RlsTestPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user, platformUser } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [runComplete, setRunComplete] = useState(false);
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    if (!RLS_TEST_ENABLED) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const getRoleLevel = (): number => {
    if (!platformUser?.role_level) return 0;
    return Number(platformUser.role_level) || 0;
  };

  const getRoleName = (): string => {
    if (!platformUser?.role_name) return 'Desconocido';
    return String(platformUser.role_name);
  };

  const runTests = useCallback(async () => {
    if (!user) return;

    setRunning(true);
    setRunComplete(false);
    const startedAt = new Date().toISOString();
    const testResults: TestResult[] = [];
    const roleLevel = getRoleLevel();

    const addResult = (
      table: string,
      label: string,
      expected: string,
      actualCount: number,
      actualItems: TableRow[],
      expectedMin: number,
      expectedMax: number,
      detail: string,
    ) => {
      let status: TestResult['status'] = 'pass';
      let actual = `${actualCount} registros`;

      if (actualCount === 0 && expectedMin > 0) {
        status = 'fail';
        actual = '0 registros (¡bloqueado!)';
      } else if (actualCount < expectedMin) {
        status = 'warning';
        actual = `${actualCount} registros (menos de lo esperado)`;
      } else if (expectedMax > 0 && actualCount > expectedMax) {
        status = 'warning';
        actual = `${actualCount} registros (más de lo esperado)`;
      }

      if (actualItems.length > 0) {
        const names = actualItems.slice(0, 5).map((r: TableRow) => r.name || r.code || '?').join(', ');
        actual += ` → ${names}`;
        if (actualItems.length > 5) actual += ` +${actualItems.length - 5} más`;
      }

      testResults.push({ table, label, expected, actual, status, rows: actualCount, detail });
    };

    try {
      // Test 1: Tenants
      const { data: tenants } = await supabase.from('tenants').select('name, code');
      const tenantCount = tenants?.length || 0;
      if (roleLevel >= 100) {
        addResult('tenants', 'Tenants visibles', 'Super Admin: 4 tenants', tenantCount, tenants || [], 4, 4,
          'Como Super Admin (level >= 100), deberías ver los 4 tenants (CR, PA, MX, CO)');
      } else {
        addResult('tenants', 'Tenants visibles', '1 tenant (solo el asignado)', tenantCount, tenants || [], 1, 1,
          'Como usuario sin privilegios de Super Admin, solo deberías ver tu tenant asignado');
      }

      // Test 2: Countries
      const { data: countries } = await supabase.from('countries').select('name, code');
      const countryCount = countries?.length || 0;
      if (roleLevel >= 100) {
        addResult('countries', 'Países visibles', '8 países (todos los tenants)', countryCount, countries || [], 7, 9,
          'Super Admin debería ver todos los países de todos los tenants');
      } else if (roleLevel >= 60) {
        addResult('countries', 'Países visibles', 'Países del tenant asignado', countryCount, countries || [], 1, 8,
          'Country Admin o superior ve los países de su tenant');
      } else {
        addResult('countries', 'Países visibles', 'Países del tenant asignado', countryCount, countries || [], 1, 8,
          'Usuario ve los países filtrados por su tenant');
      }

      // Test 3: Warehouses
      const { data: warehouses } = await supabase.from('warehouses').select('name, code');
      const warehouseCount = warehouses?.length || 0;
      if (roleLevel >= 100) {
        addResult('warehouses', 'Almacenes visibles', '14 almacenes (todos los tenants)', warehouseCount, warehouses || [], 13, 15,
          'Super Admin debería ver todos los almacenes');
      } else if (roleLevel >= 40) {
        addResult('warehouses', 'Almacenes visibles', 'Almacenes del tenant/country asignado', warehouseCount, warehouses || [], 1, 14,
          'Warehouse Admin o superior ve almacenes de su tenant');
      } else {
        addResult('warehouses', 'Almacenes visibles', 'Almacenes del tenant asignado', warehouseCount, warehouses || [], 1, 14,
          'Usuario ve almacenes filtrados por su tenant');
      }

      // Test 4: Clients
      const { data: clients } = await supabase.from('clients').select('name, code');
      const clientCount = clients?.length || 0;
      if (roleLevel >= 100) {
        addResult('clients', 'Clientes visibles', '28 clientes (todos los tenants)', clientCount, clients || [], 27, 30,
          'Super Admin debería ver todos los clientes');
      } else if (roleLevel >= 30) {
        addResult('clients', 'Clientes visibles', 'Clientes del tenant/almacén asignado', clientCount, clients || [], 1, 28,
          'Client Admin o superior ve clientes de su tenant');
      } else {
        addResult('clients', 'Clientes visibles', 'Clientes del tenant asignado', clientCount, clients || [], 1, 28,
          'Usuario ve clientes filtrados por su tenant');
      }

      // Test 5: Roles
      const { data: roles } = await supabase.from('roles').select('name, level');
      const roleCount = roles?.length || 0;
      addResult('roles', 'Roles visibles', '7 roles del sistema (al menos)', roleCount, roles || [], 6, 8,
        'Todos los usuarios autenticados deberían ver los roles del sistema (7 roles base)');

      // Test 6: Profiles
      const { data: profiles } = await supabase.from('profiles').select('name');
      const profileCount = profiles?.length || 0;
      addResult('profiles', 'Perfiles visibles', '5 perfiles (al menos)', profileCount, profiles || [], 4, 6,
        'Todos los usuarios autenticados deberían ver perfiles de su tenant');

      // Test 7: Applications
      const { data: applications } = await supabase.from('applications').select('name, code');
      const appCount = applications?.length || 0;
      addResult('applications', 'Aplicaciones visibles', 'Aplicaciones del tenant (21+)', appCount, applications || [], 1, 25,
        'Aplicaciones filtradas por tenant. Super Admin ve todas, usuario ve solo las asignadas');

      // Test 8: Application Instances
      const { data: instances } = await supabase.from('application_instances').select('instance_name, status');
      const instanceCount = instances?.length || 0;
      addResult('application_instances', 'Instancias visibles', 'Instancias del tenant', instanceCount, instances || [], 1, 50,
        'Instancias filtradas por tenant asignado');

      // Test 9: User Application Access
      const { data: accesses } = await supabase.from('user_application_access').select('status');
      const accessCount = accesses?.length || 0;
      if (roleLevel >= 80) {
        addResult('user_application_access', 'Accesos visibles', 'Todos los accesos del tenant', accessCount, accesses || [], 0, 200,
          'Admin de tenant ve todos los accesos de aplicaciones de su tenant');
      } else {
        addResult('user_application_access', 'Accesos visibles', 'Solo accesos propios', accessCount, accesses || [], 0, 200,
          'Usuario normal solo ve sus propios accesos a aplicaciones');
      }

      // Test 10: Audit Logs
      const { data: auditLogs } = await supabase.from('audit_logs').select('action, severity').limit(100);
      const auditCount = auditLogs?.length || 0;
      if (roleLevel >= 50) {
        addResult('audit_logs', 'Auditoría visible', 'Todos los logs del tenant (50+)', auditCount, auditLogs || [], 1, 200,
          'Auditor y Admin ven los logs de auditoría de su tenant');
      } else if (roleLevel >= 80) {
        addResult('audit_logs', 'Auditoría visible', 'Todos los logs del tenant (50+)', auditCount, auditLogs || [], 1, 200,
          'Admin de tenant ve todos los logs de su tenant');
      } else {
        addResult('audit_logs', 'Auditoría visible', 'Logs del tenant (acceso limitado)', auditCount, auditLogs || [], 0, 200,
          'Usuario básico tiene acceso limitado a logs de auditoría');
      }

      // Test 11: Application Categories
      const { data: categories } = await supabase.from('application_categories').select('name');
      const catCount = categories?.length || 0;
      addResult('application_categories', 'Categorías visibles', 'Categorías del tenant (8+)', catCount, categories || [], 1, 12,
        'Categorías de aplicaciones del tenant asignado');

      // Test 12: Permissions
      const { data: permissions } = await supabase.from('permissions').select('application_id').limit(50);
      const permCount = permissions?.length || 0;
      addResult('permissions', 'Permisos visibles', 'Permisos del tenant (81+)', permCount, permissions || [], 1, 100,
        'Matriz de permisos del tenant asignado');

      // Test 13: Tenant Settings
      const { data: tenantSettings } = await supabase.from('tenant_settings').select('setting_key');
      const tsCount = tenantSettings?.length || 0;
      addResult('tenant_settings', 'Configuración de tenant', 'Settings del tenant (4+)', tsCount, tenantSettings || [], 1, 6,
        'Configuraciones de seguridad del tenant asignado');

      // Test 14: Platform Users
      const { data: platformUsers } = await supabase.from('platform_users').select('email, role_id').limit(20);
      const puCount = platformUsers?.length || 0;
      if (roleLevel >= 80) {
        addResult('platform_users', 'Usuarios de plataforma', 'Usuarios del tenant', puCount, platformUsers || [], 1, 20,
          'Admin de tenant ve todos los usuarios de su tenant');
      } else {
        addResult('platform_users', 'Usuarios de plataforma', 'Solo perfil propio', puCount, platformUsers || [], 0, 2,
          'Usuario normal solo ve su propio registro de plataforma');
      }

      // Registrar resultado en audit_logs
      const totalPass = testResults.filter((r) => r.status === 'pass').length;
      const totalFail = testResults.filter((r) => r.status === 'fail').length;
      const totalWarning = testResults.filter((r) => r.status === 'warning').length;

      await supabase.from('audit_logs').insert({
        tenant_id: platformUser?.tenant_id || '',
        user_id: platformUser?.id || user.id,
        action: 'RLS_TEST_RUN',
        entity_type: 'rls_validation',
        entity_id: user.id,
        details: {
          tested_at: startedAt,
          role: getRoleName(),
          role_level: roleLevel,
          email: user.email,
          tables_tested: 14,
          pass: totalPass,
          fail: totalFail,
          warning: totalWarning,
          summary: testResults.map((r) => ({ table: r.table, status: r.status, rows: r.rows })),
        },
        severity: totalFail > 0 ? 'high' : totalWarning > 0 ? 'medium' : 'info',
        created_at: new Date().toISOString(),
      });

      for (const r of testResults) {
        if (r.status === 'pass' || r.status === 'fail') {
          await supabase.from('audit_logs').insert({
            tenant_id: platformUser?.tenant_id || '',
            user_id: platformUser?.id || user.id,
            action: r.status === 'pass' ? 'RLS_TEST_PASS' : 'RLS_TEST_FAIL',
            entity_type: 'rls_validation',
            entity_id: r.table,
            details: {
              table: r.table,
              label: r.label,
              expected: r.expected,
              actual_rows: r.rows,
              detail: r.detail,
            },
            severity: r.status === 'fail' ? 'high' : 'info',
            created_at: new Date().toISOString(),
          });
        }
      }

      setResults(testResults);
      setTimestamp(new Date().toLocaleString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      testResults.push({
        table: 'global',
        label: 'Error de conexión',
        expected: 'Conexión exitosa a Supabase',
        actual: msg,
        status: 'fail',
        rows: 0,
        detail: 'No se pudo conectar a Supabase. Verificar que hardening_rls.sql fue ejecutado.',
      });
      setResults(testResults);
    }

    setRunning(false);
    setRunComplete(true);
  }, [user, platformUser]);

  if (!RLS_TEST_ENABLED) return null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <p className="text-foreground-500 text-sm animate-pulse">Cargando Suite OLO RLS Test...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const roleLevel = getRoleLevel();
  const roleName = getRoleName();
  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const warnCount = results.filter((r) => r.status === 'warning').length;

  const statusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
            <i className="ri-checkbox-circle-fill text-sm"></i>
            PASS
          </span>
        );
      case 'fail':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25 whitespace-nowrap">
            <i className="ri-close-circle-fill text-sm"></i>
            FAIL
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 whitespace-nowrap">
            <i className="ri-error-warning-fill text-sm"></i>
            WARNING
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background-50/95 backdrop-blur-sm border-b border-background-200/70">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-500/15 border border-accent-500/25 flex items-center justify-center">
                <i className="ri-shield-check-fill text-accent-400 text-lg"></i>
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground-950">RLS Multi-Tenant Validation</h1>
                <p className="text-xs text-foreground-500">Suite OLO — Fase 5.3 · Seguridad enterprise</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-600 hover:text-foreground-900 hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-arrow-left-line"></i>
              Volver al Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* User Info Card */}
        <div className="rounded-xl border border-background-200/70 bg-background-50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                <span className="text-accent-400 font-bold text-sm">
                  {(user.email || '?')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground-950">{user.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-foreground-500">ID:</span>
                  <code className="text-xs font-mono text-foreground-400 bg-background-100 px-1.5 py-0.5 rounded">
                    {user.id.slice(0, 8)}...
                  </code>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-500/10 border border-accent-500/15">
                <span className="text-xs text-foreground-500">Rol:</span>
                <span className="text-xs font-semibold text-accent-400">{roleName}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/15">
                <span className="text-xs text-foreground-500">Nivel:</span>
                <span className="text-xs font-bold text-primary-400">{roleLevel}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-100 border border-background-200/50">
                <span className="text-xs text-foreground-500">Tenant:</span>
                <span className="text-xs font-semibold text-foreground-800">
                  {platformUser?.tenant_name || 'No asignado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground-950">
              Pruebas de visibilidad RLS · {results.length > 0 ? `${results.length} tablas evaluadas` : 'Sin ejecutar'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {runComplete && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                  <span className="text-xs font-semibold text-emerald-400">{passCount} PASS</span>
                </div>
                {warnCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15">
                    <span className="text-xs font-semibold text-amber-400">{warnCount} WARN</span>
                  </div>
                )}
                {failCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15">
                    <span className="text-xs font-semibold text-red-400">{failCount} FAIL</span>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={runTests}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-background-50 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-background-50/30 border-t-background-50 rounded-full animate-spin"></div>
                  Ejecutando pruebas...
                </>
              ) : (
                <>
                  <i className="ri-play-fill"></i>
                  {runComplete ? 'Re-ejecutar pruebas' : 'Ejecutar pruebas RLS'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!runComplete && !running && (
          <div className="rounded-xl border border-dashed border-background-300/60 bg-background-50 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-500/10 border border-accent-500/15 flex items-center justify-center">
              <i className="ri-shield-check-line text-accent-400 text-2xl"></i>
            </div>
            <h3 className="text-sm font-semibold text-foreground-900 mb-1">RLS Validation Suite</h3>
            <p className="text-xs text-foreground-500 max-w-md mx-auto">
              Haz clic en "Ejecutar pruebas RLS" para validar que Row Level Security funciona correctamente
              con tu rol actual. Se evaluarán 14 tablas con indicadores PASS / FAIL / WARNING.
            </p>
          </div>
        )}

        {/* Running state */}
        {running && (
          <div className="space-y-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-background-200/40 bg-background-50 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-background-200"></div>
                  <div className="h-4 w-40 bg-background-200 rounded"></div>
                  <div className="h-3 w-24 bg-background-200 rounded ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {runComplete && results.length > 0 && (
          <div className="space-y-1.5">
            {results.map((r) => (
              <div
                key={r.table}
                className={`rounded-lg border p-4 transition-colors ${
                  r.status === 'fail'
                    ? 'border-red-500/20 bg-red-500/[0.03]'
                    : r.status === 'warning'
                      ? 'border-amber-500/20 bg-amber-500/[0.03]'
                      : 'border-background-200/40 bg-background-50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        r.status === 'fail'
                          ? 'bg-red-500/10 text-red-400'
                          : r.status === 'warning'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      <i
                        className={`text-base ${
                          r.status === 'fail'
                            ? 'ri-close-circle-fill'
                            : r.status === 'warning'
                              ? 'ri-error-warning-fill'
                              : 'ri-checkbox-circle-fill'
                        }`}
                      ></i>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground-900">{r.label}</h4>
                        <code className="text-[10px] font-mono text-foreground-400 bg-background-100 px-1.5 py-0.5 rounded">
                          {r.table}
                        </code>
                        {statusBadge(r.status)}
                      </div>
                      <p className="text-xs text-foreground-500 mt-1">{r.detail}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-foreground-400 uppercase tracking-wider">Expected</span>
                          <span className="text-xs text-foreground-700">{r.expected}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-foreground-400 uppercase tracking-wider">Actual</span>
                          <span
                            className={`text-xs font-medium ${
                              r.status === 'fail' ? 'text-red-400' : r.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {r.actual}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`shrink-0 text-xs font-bold font-mono px-2 py-1 rounded ${
                      r.status === 'fail'
                        ? 'bg-red-500/10 text-red-400'
                        : r.status === 'warning'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {r.rows} rows
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary footer */}
        {runComplete && (
          <div className="rounded-xl border border-background-200/70 bg-background-50 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs text-foreground-500">
                  Última ejecución: <span className="text-foreground-700 font-medium">{timestamp}</span>
                </p>
                <p className="text-[10px] text-foreground-400 mt-0.5">
                  Los resultados se registraron en <code className="font-mono">audit_logs</code> con acción RLS_TEST_RUN
                </p>
              </div>
              <div className="flex items-center gap-2">
                {failCount === 0 && warnCount === 0 ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <i className="ri-shield-check-fill"></i>
                    Todas las pruebas pasaron
                  </span>
                ) : failCount > 0 ? (
                  <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
                    <i className="ri-shield-flash-fill"></i>
                    {failCount} prueba{failCount !== 1 ? 's' : ''} fallida{failCount !== 1 ? 's' : ''} — requiere hardening_rls.sql
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    <i className="ri-shield-user-fill"></i>
                    {warnCount} adverencia{warnCount !== 1 ? 's' : ''} — revisar manualmente
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}