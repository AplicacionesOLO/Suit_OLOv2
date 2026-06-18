import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PlatformUserFull, UpdateUserInput, UserAppAccessForEdit } from '@/services/auth/usersService';
import {
  fetchUserBridgeScopes,
  fetchUserAppAccessesForEdit,
  fetchUserAuditEvents,
  fetchRolePermissionsForDisplay,
} from '@/services/auth/usersService';
import { revokeUserAccess } from '@/services/security/accessService';
import MultiSelect from '@/components/base/MultiSelect';

interface EditUserModalProps {
  user: PlatformUserFull;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onEditUser: (userId: string, input: UpdateUserInput) => Promise<{ error: string | null }>;
  tenants: { id: string; name: string; country_id?: string | null }[];
  roles: { id: string; name: string; level: number }[];
  countries: { id: string; name: string; tenant_id: string }[];
  clients: { id: string; name: string; tenant_id: string }[];
}

type EditFormState = {
  first_name: string;
  last_name: string;
  role_id: string;
  status: string;
  tenant_id: string;
  country_id: string;
  client_id: string;
  scope_countries: string[];
  scope_tenants: string[];
  scope_clients: string[];
  scope_all_countries: boolean;
  scope_all_tenants: boolean;
  scope_all_clients: boolean;
};

export default function EditUserModal({ user, isOpen, onClose, onSaved, onEditUser, tenants, roles, countries, clients }: EditUserModalProps) {
  const [editForm, setEditForm] = useState<EditFormState>({
    first_name: '', last_name: '', role_id: '', status: 'active',
    tenant_id: '', country_id: '', client_id: '',
    scope_countries: [], scope_tenants: [], scope_clients: [],
    scope_all_countries: false, scope_all_tenants: false, scope_all_clients: false,
  });

  const [appAccesses, setAppAccesses] = useState<UserAppAccessForEdit[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]> | null>(null);
  const [sectionLoading, setSectionLoading] = useState(true);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ========== CASCADING LOGIC ==========

  // All active countries (for the root selector)
  const allCountryOptions = useMemo(() => countries.map((c) => ({ id: c.id, label: c.name })), [countries]);

  // Tenants filtered by selected countries: tenant.country_id must be in selected country set
  const tenantOptionsByCountry = useMemo(() => {
    const selectedCountrySet = new Set([editForm.country_id, ...editForm.scope_countries].filter(Boolean));
    if (selectedCountrySet.size === 0) return tenants.map((t) => ({ id: t.id, label: t.name }));
    return tenants
      .filter((t) => t.country_id && selectedCountrySet.has(t.country_id))
      .map((t) => ({ id: t.id, label: t.name }));
  }, [tenants, editForm.country_id, editForm.scope_countries]);

  // All tenant options (unfiltered, for reference dropdowns)
  const allTenantOptions = useMemo(() => tenants.map((t) => ({ id: t.id, label: t.name })), [tenants]);

  // Clients filtered by selected tenants: client.tenant_id must be in selected tenant set
  const clientOptionsByTenant = useMemo(() => {
    const selectedTenantSet = new Set([editForm.tenant_id, ...editForm.scope_tenants].filter(Boolean));
    if (selectedTenantSet.size === 0) return clients.map((c) => ({ id: c.id, label: c.name }));
    return clients
      .filter((c) => selectedTenantSet.has(c.tenant_id))
      .map((c) => ({ id: c.id, label: c.name }));
  }, [clients, editForm.tenant_id, editForm.scope_tenants]);

  // Countries filtered by selected tenant (for Section 3 country dropdown)
  const countriesByTenant = useMemo(() => {
    if (!editForm.tenant_id) return [];
    const tenant = tenants.find((t) => t.id === editForm.tenant_id);
    const tenantCountryId = tenant?.country_id;
    if (!tenantCountryId) return countries;
    return countries.filter((c) => c.id === tenantCountryId);
  }, [countries, tenants, editForm.tenant_id]);

  // Clients filtered by selected tenant only (for Section 3 client dropdown)
  const clientsByTenantOnly = useMemo(() => {
    if (!editForm.tenant_id) return [];
    return clients.filter((c) => c.tenant_id === editForm.tenant_id);
  }, [clients, editForm.tenant_id]);

  // ========== COMPUTED CONTEXTS (Section 8) ==========
  const availableCountryNames = useMemo(() => {
    if (editForm.scope_all_countries) return ['Todos los paises'];
    const ids = new Set([editForm.country_id, ...editForm.scope_countries].filter(Boolean));
    return countries.filter((c) => ids.has(c.id)).map((c) => c.name);
  }, [editForm.scope_all_countries, editForm.country_id, editForm.scope_countries, countries]);

  const availableTenantNames = useMemo(() => {
    if (editForm.scope_all_tenants) return ['Todos los tenants'];
    const ids = new Set([editForm.tenant_id, ...editForm.scope_tenants].filter(Boolean));
    return tenants.filter((t) => ids.has(t.id)).map((t) => t.name);
  }, [editForm.scope_all_tenants, editForm.tenant_id, editForm.scope_tenants, tenants]);

  const availableClientNames = useMemo(() => {
    if (editForm.scope_all_clients) return ['Todos los clientes'];
    const ids = new Set([editForm.client_id, ...editForm.scope_clients].filter(Boolean));
    return clients.filter((c) => ids.has(c.id)).map((c) => c.name);
  }, [editForm.scope_all_clients, editForm.client_id, editForm.scope_clients, clients]);

  // ========== LOAD DYNAMIC DATA ==========
  useEffect(() => {
    if (!isOpen || !user) return;

    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role_id: user.role_id || '',
      status: user.status || 'active',
      tenant_id: user.tenant_id || '',
      country_id: user.country_id || '',
      client_id: user.client_id || '',
      scope_countries: [],
      scope_tenants: [],
      scope_clients: [],
      scope_all_countries: (user as any).scope_all_countries || false,
      scope_all_tenants: (user as any).scope_all_tenants || false,
      scope_all_clients: (user as any).scope_all_clients || false,
    });

    setSectionLoading(true);
    setSectionError(null);
    setAppAccesses([]);
    setAuditLogs([]);
    setRolePermissions(null);
    setFormError('');
    setToast(null);

    const loadSections = async () => {
      const [scopesRes, appsRes, auditRes] = await Promise.all([
        fetchUserBridgeScopes(user.id),
        fetchUserAppAccessesForEdit(user.id),
        fetchUserAuditEvents(user.id),
      ]);

      if (scopesRes.data && !scopesRes.error) {
        setEditForm((prev) => ({
          ...prev,
          scope_countries: scopesRes.data.country_ids.filter((cid: string) => cid !== user.country_id),
          scope_tenants: scopesRes.data.tenant_ids.filter((tid: string) => tid !== user.tenant_id),
          scope_clients: scopesRes.data.client_ids.filter((clid: string) => clid !== user.client_id),
        }));
      }

      if (appsRes.data) setAppAccesses(appsRes.data);
      if (auditRes.data) setAuditLogs(auditRes.data);

      if (user.role_id) {
        const permRes = await fetchRolePermissionsForDisplay(user.role_id);
        if (permRes.data) setRolePermissions(permRes.data);
      }

      setSectionLoading(false);
    };

    loadSections();
  }, [isOpen, user]);

  // ========== HANDLERS ==========
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleTenantChange = (tid: string) => {
    // When tenant changes, reset country and client to match the new tenant's country
    const tenant = tenants.find((t) => t.id === tid);
    setEditForm((prev) => ({
      ...prev,
      tenant_id: tid,
      country_id: tenant?.country_id || '',
      client_id: '',
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');

    // ========== CASCADE VALIDATION ==========
    // Rule: tenant.country_id must be in selected countries
    // Rule: client.tenant_id must be in selected tenants
    const selectedCountryIds = new Set([editForm.country_id, ...editForm.scope_countries].filter(Boolean));
    const selectedTenantIds = new Set([editForm.tenant_id, ...editForm.scope_tenants].filter(Boolean));

    if (!editForm.scope_all_tenants && !editForm.scope_all_countries) {
      for (const tid of selectedTenantIds) {
        const tenant = tenants.find((t) => t.id === tid);
        if (tenant?.country_id && !selectedCountryIds.has(tenant.country_id)) {
          setSaving(false);
          setFormError(`El tenant "${tenant.name}" pertenece a un pais no seleccionado. Agrega ese pais a los alcances o elimina el tenant.`);
          return;
        }
      }
    }

    if (!editForm.scope_all_clients && !editForm.scope_all_tenants) {
      for (const clid of [editForm.client_id, ...editForm.scope_clients].filter(Boolean)) {
        const client = clients.find((c) => c.id === clid);
        if (client && !selectedTenantIds.has(client.tenant_id)) {
          setSaving(false);
          setFormError(`El cliente "${client.name}" pertenece a un tenant no seleccionado. Agrega ese tenant a los alcances o elimina el cliente.`);
          return;
        }
      }
    }

    const primaryCountryIds = editForm.country_id ? [editForm.country_id] : [];
    const primaryTenantIds = editForm.tenant_id ? [editForm.tenant_id] : [];
    const primaryClientIds = editForm.client_id ? [editForm.client_id] : [];

    const update: UpdateUserInput = {
      first_name: editForm.first_name || undefined,
      last_name: editForm.last_name || undefined,
      role_id: editForm.role_id || undefined,
      status: editForm.status || undefined,
      tenant_id: editForm.tenant_id || undefined,
      country_id: editForm.country_id || undefined,
      client_id: editForm.client_id || undefined,
      scope_countries: [...primaryCountryIds, ...editForm.scope_countries].filter(Boolean),
      scope_tenants: [...primaryTenantIds, ...editForm.scope_tenants].filter(Boolean),
      scope_clients: [...primaryClientIds, ...editForm.scope_clients].filter(Boolean),
      scope_all_countries: editForm.scope_all_countries,
      scope_all_tenants: editForm.scope_all_tenants,
      scope_all_clients: editForm.scope_all_clients,
    };

    const result = await onEditUser(user.id, update);
    setSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    showToast('success', 'Usuario actualizado correctamente');
    onSaved();
    onClose();
  };

  const handleRevokeAccess = async (accessId: string) => {
    const result = await revokeUserAccess(accessId);
    if (result.error) {
      showToast('error', result.error);
      return;
    }
    setAppAccesses((prev) => prev.map((a) => a.id === accessId ? { ...a, access_status: 'revoked' } : a));
    showToast('success', 'Acceso revocado');
  };

  // ========== UTILITY ==========
  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': case 'assigned': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'suspended': case 'revoked': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'inactive': return 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20';
      default: return 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': case 'assigned': return 'Activo';
      case 'pending': return 'Pendiente';
      case 'suspended': return 'Suspendido';
      case 'revoked': return 'Revocado';
      case 'inactive': return 'Inactivo';
      default: return status;
    }
  };

  const auditActionLabel = (action: string): string => {
    const map: Record<string, string> = {
      'LOGIN': 'Inicio de sesion', 'LOGOUT': 'Cierre de sesion', 'LOGIN_FAILED': 'Intento fallido de login',
      'USER_UPDATED': 'Usuario actualizado', 'USER_DELETED': 'Usuario eliminado', 'USER_INVITED': 'Usuario invitado',
      'USER_INVITATION_REVOKED': 'Invitacion revocada', 'ACCESS_GRANTED': 'Acceso otorgado',
      'ACCESS_REVOKED': 'Acceso revocado', 'ACCESS_DENIED': 'Acceso denegado', 'TENANT_CHANGED': 'Cambio de tenant',
      'PASSWORD_CHANGED': 'Cambio de contrasena', 'APP_OPENED': 'Aplicacion abierta',
      'PERMISSION_CHANGED': 'Permisos modificados', 'ROLE_CHANGED': 'Rol modificado',
    };
    return map[action] || action;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-panel-strong rounded-none sm:rounded-2xl w-full sm:max-w-6xl h-full sm:max-h-[92vh] flex flex-col animate-scale-in overflow-hidden">
        {/* Toast */}
        {toast && (
          <div className={`absolute top-4 right-4 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl animate-slide-in-right shadow-lg border ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <i className={toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}></i>
            </span>
            <span className="text-sm">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
              <i className="ri-user-settings-line text-accent-400 text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground-200">Editar usuario</h2>
              <p className="text-xs text-foreground-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-200 hover:bg-background-200/50 transition-all">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {formError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span className="w-4 h-4 flex items-center justify-center shrink-0"><i className="ri-error-warning-line"></i></span>
              {formError}
            </div>
          )}

          {/* ========== SECTION 1: IDENTITY ========== */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-primary-500/10 flex items-center justify-center">
                <i className="ri-user-line text-primary-400 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Identidad</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-4 p-4 rounded-xl bg-background-100/70 border border-secondary-500/10">
                <div className="w-14 h-14 rounded-xl bg-accent-500/15 border border-accent-500/20 flex items-center justify-center shrink-0">
                  <span className="text-accent-400 text-xl font-semibold">
                    {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                    {(user.last_name?.[0] || '')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-200 truncate">
                    {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Usuario'}
                  </p>
                  <p className="text-xs text-foreground-500">{user.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-foreground-500">
                    <span><i className="ri-calendar-line mr-1"></i>Creado: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
                    <span><i className="ri-login-circle-line mr-1"></i>Ultimo acceso: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Nombre</label>
                <input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Nombre" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Apellido</label>
                <input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" placeholder="Apellido" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Correo</label>
                <input type="text" value={user.email || ''} readOnly className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-500 outline-none cursor-not-allowed opacity-60" />
              </div>
            </div>
          </section>

          {/* ========== SECTION 2: SECURITY ========== */}
          <section className="border-t border-secondary-500/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-red-500/10 flex items-center justify-center">
                <i className="ri-shield-line text-red-400 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Seguridad</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Rol</label>
                <select value={editForm.role_id} onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                  <option value="">Sin rol</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name} (Nivel {r.level})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Estado</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                  <option value="active">Activo</option>
                  <option value="pending_review">Revision</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">MFA</label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-background-100 border border-secondary-500/20">
                  <span className="w-4 h-4 flex items-center justify-center text-foreground-500"><i className="ri-smartphone-line text-sm"></i></span>
                  <span className="text-xs text-foreground-500">Gestionado por Supabase Auth</span>
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">Sesiones</label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-background-100 border border-secondary-500/20">
                  <span className="w-4 h-4 flex items-center justify-center text-foreground-500"><i className="ri-history-line text-sm"></i></span>
                  <span className="text-xs text-foreground-500">Supabase Auth</span>
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* SECTION 3: CONTEXTO PRINCIPAL — País → Tenant → Cliente */}
          {/* ================================================================ */}
          <section className="border-t border-secondary-500/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-accent-500/10 flex items-center justify-center">
                <i className="ri-stack-line text-accent-400 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Contexto principal</h3>
              <span className="text-2xs text-foreground-500 ml-1">Pais → Tenant → Cliente — define el contexto por defecto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* PAÍS — root of the hierarchy */}
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                  <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-emerald-400"><i className="ri-global-line text-xs"></i></span>
                  Pais principal
                </label>
                <select
                  value={editForm.country_id}
                  onChange={(e) => setEditForm({ ...editForm, country_id: e.target.value })}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                >
                  <option value="">Sin pais</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* TENANT — filtered by country */}
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                  <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-primary-400"><i className="ri-building-line text-xs"></i></span>
                  Tenant principal
                </label>
                <select
                  value={editForm.tenant_id}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40"
                >
                  <option value="">Sin tenant</option>
                  {tenantOptionsByCountry.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                {editForm.country_id && tenantOptionsByCountry.length === 0 && (
                  <p className="text-2xs text-amber-400 mt-1">No hay tenants en este pais</p>
                )}
              </div>

              {/* CLIENTE — filtered by tenant */}
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                  <span className="w-3 h-3 inline-flex items-center justify-center mr-1 text-amber-400"><i className="ri-building-2-line text-xs"></i></span>
                  Cliente principal
                </label>
                <select
                  value={editForm.client_id}
                  onChange={(e) => setEditForm({ ...editForm, client_id: e.target.value })}
                  disabled={!editForm.tenant_id}
                  className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40 disabled:opacity-40"
                >
                  <option value="">Sin cliente</option>
                  {clientsByTenantOnly.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Cascade status indicator */}
            <div className="mt-3 flex items-center gap-2 text-xs text-foreground-500">
              <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-information-line"></i></span>
              <span>
                {editForm.country_id ? (
                  editForm.tenant_id ? (
                    editForm.client_id ? (
                      <>Contexto: <span className="text-emerald-400 font-medium">{countries.find(c => c.id === editForm.country_id)?.name}</span> → <span className="text-primary-400 font-medium">{tenants.find(t => t.id === editForm.tenant_id)?.name}</span> → <span className="text-amber-400 font-medium">{clients.find(c => c.id === editForm.client_id)?.name}</span></>
                    ) : (
                      <>Contexto: <span className="text-emerald-400 font-medium">{countries.find(c => c.id === editForm.country_id)?.name}</span> → <span className="text-primary-400 font-medium">{tenants.find(t => t.id === editForm.tenant_id)?.name}</span> → <span className="text-foreground-600">sin cliente</span></>
                    )
                  ) : (
                    <>Contexto: <span className="text-emerald-400 font-medium">{countries.find(c => c.id === editForm.country_id)?.name}</span> → <span className="text-foreground-600">sin tenant</span></>
                  )
                ) : (
                  'Selecciona un pais para comenzar la cascada'
                )}
              </span>
            </div>
          </section>

          {/* ================================================================ */}
          {/* SECTION 4: ALCANCES ADICIONALES — Cascading multi-selects */}
          {/* ================================================================ */}
          <section className="border-t border-secondary-500/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <i className="ri-stack-line text-emerald-400 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Alcances adicionales</h3>
              <span className="text-2xs text-foreground-500 ml-1">Selecciona en cascada: Paises → Tenants → Clientes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* PAÍSES — Level 1 (root, no filter) */}
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                  <i className="ri-global-line text-emerald-400 text-xs mr-1"></i>
                  Paises adicionales
                </label>
                <MultiSelect
                  options={allCountryOptions.filter((c) => c.id !== editForm.country_id)}
                  selected={editForm.scope_countries}
                  onChange={(vals) => setEditForm({ ...editForm, scope_countries: vals })}
                  placeholder={editForm.scope_all_countries ? 'Todos los paises (global)' : 'Ninguno'}
                  searchPlaceholder="Buscar pais..."
                  emptyMessage="Sin paises disponibles"
                  disabled={editForm.scope_all_countries}
                />
              </div>

              {/* TENANTS — Level 2 (filtered by selected countries) */}
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                  <i className="ri-building-line text-primary-400 text-xs mr-1"></i>
                  Tenants adicionales
                </label>
                <MultiSelect
                  options={tenantOptionsByCountry.filter((t) => t.id !== editForm.tenant_id)}
                  selected={editForm.scope_tenants}
                  onChange={(vals) => setEditForm({ ...editForm, scope_tenants: vals })}
                  placeholder={editForm.scope_all_tenants ? 'Todos los tenants (global)' : 'Ninguno'}
                  searchPlaceholder="Buscar tenant..."
                  emptyMessage={
                    editForm.scope_all_countries
                      ? 'Todos los tenants disponibles'
                      : editForm.country_id || editForm.scope_countries.length > 0
                        ? 'Sin tenants en los paises seleccionados'
                        : 'Selecciona un pais primero'
                  }
                  disabled={editForm.scope_all_tenants}
                />
              </div>

              {/* CLIENTES — Level 3 (filtered by selected tenants) */}
              <div>
                <label className="block text-xs font-medium text-foreground-400 mb-1.5">
                  <i className="ri-building-2-line text-amber-400 text-xs mr-1"></i>
                  Clientes adicionales
                </label>
                <MultiSelect
                  options={clientOptionsByTenant.filter((c) => c.id !== editForm.client_id)}
                  selected={editForm.scope_clients}
                  onChange={(vals) => setEditForm({ ...editForm, scope_clients: vals })}
                  placeholder={editForm.scope_all_clients ? 'Todos los clientes (global)' : 'Ninguno'}
                  searchPlaceholder="Buscar cliente..."
                  emptyMessage={
                    editForm.scope_all_tenants
                      ? 'Todos los clientes disponibles'
                      : editForm.tenant_id || editForm.scope_tenants.length > 0
                        ? 'Sin clientes en los tenants seleccionados'
                        : 'Selecciona un tenant primero'
                  }
                  disabled={editForm.scope_all_clients}
                />
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* SECTION 5: ACCESO GLOBAL */}
          {/* ================================================================ */}
          <section className="border-t border-secondary-500/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center">
                <i className="ri-global-line text-amber-400 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Acceso global</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${editForm.scope_all_countries ? 'bg-primary-500/10 border-primary-500/30' : 'bg-background-100/50 border-secondary-500/15 hover:border-secondary-500/30'}`}>
                <input
                  type="checkbox"
                  checked={editForm.scope_all_countries}
                  onChange={(e) => setEditForm({ ...editForm, scope_all_countries: e.target.checked, scope_countries: e.target.checked ? [] : editForm.scope_countries })}
                  className="w-4 h-4 rounded border-secondary-500/30 bg-background-100 text-primary-500 focus:ring-primary-500/20"
                />
                <span className="text-sm text-foreground-400">Todos los paises</span>
              </label>
              <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${editForm.scope_all_tenants ? 'bg-primary-500/10 border-primary-500/30' : 'bg-background-100/50 border-secondary-500/15 hover:border-secondary-500/30'}`}>
                <input
                  type="checkbox"
                  checked={editForm.scope_all_tenants}
                  onChange={(e) => setEditForm({ ...editForm, scope_all_tenants: e.target.checked, scope_tenants: e.target.checked ? [] : editForm.scope_tenants })}
                  className="w-4 h-4 rounded border-secondary-500/30 bg-background-100 text-primary-500 focus:ring-primary-500/20"
                />
                <span className="text-sm text-foreground-400">Todos los tenants</span>
              </label>
              <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${editForm.scope_all_clients ? 'bg-primary-500/10 border-primary-500/30' : 'bg-background-100/50 border-secondary-500/15 hover:border-secondary-500/30'}`}>
                <input
                  type="checkbox"
                  checked={editForm.scope_all_clients}
                  onChange={(e) => setEditForm({ ...editForm, scope_all_clients: e.target.checked, scope_clients: e.target.checked ? [] : editForm.scope_clients })}
                  className="w-4 h-4 rounded border-secondary-500/30 bg-background-100 text-primary-500 focus:ring-primary-500/20"
                />
                <span className="text-sm text-foreground-400">Todos los clientes</span>
              </label>
            </div>
          </section>

          {/* ========== SECTION 6: ASSIGNED APPS ========== */}
          <section className="border-t border-secondary-500/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-accent-500/10 flex items-center justify-center">
                <i className="ri-apps-2-line text-accent-400 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Aplicaciones asignadas</h3>
            </div>
            {sectionLoading ? (
              <div className="flex items-center gap-3 px-4 py-8 text-sm text-foreground-500 justify-center">
                <span className="w-4 h-4 flex items-center justify-center animate-spin"><i className="ri-loader-4-line"></i></span>
                Cargando aplicaciones...
              </div>
            ) : appAccesses.length === 0 ? (
              <div className="text-center py-8">
                <span className="w-10 h-10 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-apps-2-line text-foreground-500 text-lg"></i>
                </span>
                <p className="text-sm text-foreground-500">Sin aplicaciones asignadas</p>
                <p className="text-xs text-foreground-600 mt-1">Usa la seccion de Asignaciones para agregar aplicaciones.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-secondary-500/10">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-secondary-500/10 bg-background-100/50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-500">Aplicacion</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-500">Instancia</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-500">Estado</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-500">Vence</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-foreground-500">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appAccesses.map((acc) => (
                      <tr key={acc.id} className="border-b border-secondary-500/5 hover:bg-background-100/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center border border-${acc.application_color}-500/20 bg-${acc.application_color}-500/10`}>
                              <i className={`${acc.application_icon} text-${acc.application_color}-400 text-sm`}></i>
                            </span>
                            <span className="text-sm text-foreground-300">{acc.application_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs text-foreground-500">{acc.instance_name || '—'}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium border ${statusBadge(acc.access_status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                            {statusLabel(acc.access_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-foreground-500">{acc.expires_at ? new Date(acc.expires_at).toLocaleDateString() : 'Sin vencimiento'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {acc.access_status === 'assigned' && (
                            <button onClick={() => handleRevokeAccess(acc.id)} className="h-7 px-2.5 rounded-md text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all whitespace-nowrap">
                              Revocar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ========== SECTION 7: EFFECTIVE PERMISSIONS ========== */}
          <section className="border-t border-secondary-500/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-secondary-500/10 flex items-center justify-center">
                <i className="ri-key-2-line text-secondary-400 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Permisos efectivos</h3>
              <span className="text-2xs text-foreground-500 ml-1">Solo lectura — otorgados por el rol: {user.role_name || 'Sin rol'}</span>
            </div>
            {sectionLoading ? (
              <div className="flex items-center gap-3 px-4 py-8 text-sm text-foreground-500 justify-center">
                <span className="w-4 h-4 flex items-center justify-center animate-spin"><i className="ri-loader-4-line"></i></span>
                Cargando permisos...
              </div>
            ) : !rolePermissions || Object.keys(rolePermissions).length === 0 ? (
              <div className="text-center py-8">
                <span className="w-10 h-10 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-key-2-line text-foreground-500 text-lg"></i>
                </span>
                <p className="text-sm text-foreground-500">Sin permisos configurados</p>
                <p className="text-xs text-foreground-600 mt-1">Este rol no tiene modulos de permisos asignados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(rolePermissions).map(([module, actions]) => (
                  <div key={module} className="p-4 rounded-xl bg-background-100/70 border border-secondary-500/10">
                    <h4 className="text-sm font-medium text-foreground-300 capitalize mb-3">{module}</h4>
                    <div className="space-y-1.5">
                      {actions.map((action) => (
                        <div key={action} className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded bg-emerald-500/15 flex items-center justify-center">
                            <i className="ri-check-line text-emerald-400 text-xs"></i>
                          </span>
                          <span className="text-xs text-foreground-500 capitalize">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ================================================================ */}
          {/* SECTION 8: CONTEXTOS DISPONIBLES — País → Tenant → Cliente */}
          {/* ================================================================ */}
          <section className="border-t border-secondary-500/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-primary-500/10 flex items-center justify-center">
                <i className="ri-arrow-left-right-line text-primary-400 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Contextos disponibles</h3>
              <span className="text-2xs text-foreground-500 ml-1">Lo que vera en el selector del Topbar: Pais → Tenant → Cliente</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-background-100/70 border border-secondary-500/10">
                <p className="text-xs font-medium text-foreground-500 mb-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 flex items-center justify-center text-emerald-400"><i className="ri-global-line text-xs"></i></span>
                  Paises disponibles
                </p>
                <ul className="space-y-1">
                  {availableCountryNames.length === 0 ? (
                    <li className="text-xs text-foreground-600 italic">Ningun pais</li>
                  ) : availableCountryNames.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-xs text-foreground-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60"></span>
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-background-100/70 border border-secondary-500/10">
                <p className="text-xs font-medium text-foreground-500 mb-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 flex items-center justify-center text-primary-400"><i className="ri-building-line text-xs"></i></span>
                  Tenants disponibles
                </p>
                <ul className="space-y-1">
                  {availableTenantNames.length === 0 ? (
                    <li className="text-xs text-foreground-600 italic">Ningun tenant</li>
                  ) : availableTenantNames.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-xs text-foreground-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400/60"></span>
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-background-100/70 border border-secondary-500/10">
                <p className="text-xs font-medium text-foreground-500 mb-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 flex items-center justify-center text-amber-400"><i className="ri-building-2-line text-xs"></i></span>
                  Clientes disponibles
                </p>
                <ul className="space-y-1">
                  {availableClientNames.length === 0 ? (
                    <li className="text-xs text-foreground-600 italic">Ningun cliente</li>
                  ) : availableClientNames.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-xs text-foreground-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60"></span>
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ========== SECTION 9: AUDIT ========== */}
          <section className="border-t border-secondary-500/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-foreground-500/10 flex items-center justify-center">
                <i className="ri-history-line text-foreground-500 text-xs"></i>
              </span>
              <h3 className="text-sm font-semibold text-foreground-200">Auditoria</h3>
              <span className="text-2xs text-foreground-500 ml-1">Ultimos 20 eventos</span>
            </div>
            {sectionLoading ? (
              <div className="flex items-center gap-3 px-4 py-8 text-sm text-foreground-500 justify-center">
                <span className="w-4 h-4 flex items-center justify-center animate-spin"><i className="ri-loader-4-line"></i></span>
                Cargando auditoria...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <span className="w-10 h-10 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-history-line text-foreground-500 text-lg"></i>
                </span>
                <p className="text-sm text-foreground-500">Sin eventos registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-secondary-500/10 max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background-100 z-10">
                    <tr className="border-b border-secondary-500/10">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-500">Fecha</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-500">Accion</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-500">Severidad</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-500">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-secondary-500/5 hover:bg-background-100/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-foreground-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-foreground-300">{auditActionLabel(log.action)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium border ${
                            log.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            log.severity === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-secondary-500/10 text-secondary-400 border-secondary-500/20'
                          }`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-foreground-600 max-w-[200px] truncate block">
                            {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details).slice(0, 80)) : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-500/10 shrink-0 bg-background-50">
          <div className="flex items-center gap-2 text-xs text-foreground-500">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-information-line"></i></span>
            ID: {user.id.slice(0, 8)}...
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-secondary-500/20 text-sm text-foreground-400 hover:text-foreground-200 hover:border-secondary-500/40 transition-all whitespace-nowrap">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center animate-spin"><i className="ri-loader-4-line"></i></span>
                  Guardando...
                </span>
              ) : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}