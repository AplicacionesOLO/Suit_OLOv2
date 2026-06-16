import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';

export default function IntegrationPage() {
  const [activeTab, setActiveTab] = useState<'sso' | 'jwt' | 'domains' | 'security'>('sso');

  const tabs = [
    { key: 'sso' as const, label: 'SSO / OIDC', icon: 'ri-shield-keyhole-line' },
    { key: 'jwt' as const, label: 'JWT Federado', icon: 'ri-key-2-line' },
    { key: 'domains' as const, label: 'Dominios', icon: 'ri-global-line' },
    { key: 'security' as const, label: 'Seguridad', icon: 'ri-shield-check-line' },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground-100">Configuración de Integración</h1>
          <p className="text-sm text-foreground-500 mt-1">Administra SSO, JWT federado, dominios permitidos y políticas de seguridad para aplicaciones.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-background-100 border border-secondary-500/15 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-foreground-50'
                  : 'text-foreground-500 hover:text-foreground-300'
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={`${tab.icon} text-base`}></i>
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'sso' && (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">Configuración SSO / OpenID Connect</h2>
              <p className="text-xs text-foreground-500 mb-6">Configura la autenticación única para que los usuarios accedan a las aplicaciones sin credenciales adicionales.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Provider OIDC</label>
                    <select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                      <option value="google">Google Workspace</option>
                      <option value="microsoft">Microsoft Entra ID</option>
                      <option value="okta">Okta</option>
                      <option value="custom">Custom OIDC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Client ID</label>
                    <input type="text" defaultValue="olo-platform-prod-2026" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Issuer URL</label>
                  <input type="text" defaultValue="https://auth.suiteolo.io/oidc" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Redirect URI</label>
                    <input type="text" defaultValue="https://suiteolo.io/callback" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Scopes</label>
                    <input type="text" defaultValue="openid profile email groups" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500" />
                    <span className="text-sm text-foreground-400">Auto-provisionar usuarios</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500" />
                    <span className="text-sm text-foreground-400">Mapear grupos a roles</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-secondary-500/10">
                <button className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Guardar configuración</button>
                <button className="h-9 px-4 rounded-lg border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 transition-all text-sm font-medium whitespace-nowrap">Probar conexión</button>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">Proveedores externos</h2>
              <div className="space-y-3">
                {[
                  { name: 'Google Workspace', status: 'configured', icon: 'ri-google-fill', color: 'text-red-400', bg: 'bg-red-500/10' },
                  { name: 'Microsoft Entra ID', status: 'pending', icon: 'ri-microsoft-fill', color: 'text-accent-400', bg: 'bg-accent-500/10' },
                  { name: 'Okta', status: 'not_configured', icon: 'ri-shield-user-line', color: 'text-foreground-500', bg: 'bg-secondary-500/10' },
                ].map((provider) => (
                  <div key={provider.name} className="flex items-center justify-between p-4 rounded-xl border border-secondary-500/10 bg-background-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${provider.bg} flex items-center justify-center`}>
                        <i className={`${provider.icon} ${provider.color} text-base`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground-300">{provider.name}</p>
                        <p className="text-2xs text-foreground-600 mt-0.5">
                          {provider.status === 'configured' ? 'Configurado y activo' : provider.status === 'pending' ? 'Pendiente de verificación' : 'No configurado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${provider.status === 'configured' ? 'bg-emerald-400' : provider.status === 'pending' ? 'bg-amber-400' : 'bg-secondary-500/40'}`}></span>
                      <button className={`text-xs font-medium ${provider.status === 'configured' ? 'text-primary-400 hover:text-primary-300' : 'text-foreground-500 hover:text-foreground-300'} transition-colors`}>
                        {provider.status === 'configured' ? 'Editar' : 'Configurar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jwt' && (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">JWT Federado</h2>
              <p className="text-xs text-foreground-500 mb-6">Configura la federación de tokens JWT para que las aplicaciones externas confíen en la autenticación de Suite OLO.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">Algoritmo de firma</label>
                    <select className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-300 outline-none focus:border-primary-500/40">
                      <option value="RS256">RS256 (Recomendado)</option>
                      <option value="ES256">ES256</option>
                      <option value="HS256">HS256</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-400 mb-1.5">TTL del token (minutos)</label>
                    <input type="number" defaultValue="60" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Claims personalizados (JSON)</label>
                  <textarea
                    rows={4}
                    defaultValue='{"tenant_id": "${tenant}", "role": "${role}", "scope": "${scope}", "app_id": "${app_id}"}'
                    className="w-full bg-background-100 border border-secondary-500/20 rounded-lg px-3 py-2 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all resize-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-400 mb-1.5">Public Key (JWKS endpoint)</label>
                  <input type="text" defaultValue="https://auth.suiteolo.io/.well-known/jwks.json" className="w-full h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 outline-none focus:border-primary-500/40 transition-all font-mono" />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-secondary-500/10">
                <button className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Guardar</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">Dominios Permitidos</h2>
              <p className="text-xs text-foreground-500 mb-6">Define qué dominios pueden ser accedidos desde aplicaciones embebidas y configuraciones iframe.</p>

              <div className="space-y-3">
                {[
                  { domain: '*.suiteolo.io', status: 'allowed', desc: 'Todos los subdominios de Suite OLO' },
                  { domain: 'hacienda.go.cr', status: 'allowed', desc: 'Facturación electrónica Costa Rica' },
                  { domain: 'dgi.gob.pa', status: 'allowed', desc: 'Facturación electrónica Panamá' },
                  { domain: 'dian.gov.co', status: 'allowed', desc: 'Facturación electrónica Colombia' },
                  { domain: '*.googleapis.com', status: 'restricted', desc: 'APIs de Google (solo lectura)' },
                ].map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-secondary-500/10 bg-background-100">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                        <i className="ri-global-line text-accent-400 text-sm"></i>
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground-300 font-mono">{d.domain}</p>
                        <p className="text-2xs text-foreground-600 mt-0.5">{d.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-2xs font-medium ${d.status === 'allowed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {d.status === 'allowed' ? 'Permitido' : 'Restringido'}
                      </span>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-delete-bin-line text-sm"></i></span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input type="text" placeholder="Añadir dominio (ej: *.example.com)" className="flex-1 h-10 bg-background-100 border border-secondary-500/20 rounded-lg px-3 text-sm text-foreground-200 placeholder:text-foreground-600 outline-none focus:border-primary-500/40 transition-all font-mono" />
                <button className="h-10 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Añadir</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground-200 mb-4">Políticas de Seguridad de Integración</h2>
              <p className="text-xs text-foreground-500 mb-6">Define las reglas de seguridad para la comunicación entre Suite OLO y las aplicaciones integradas.</p>

              <div className="space-y-4">
                {[
                  { label: 'Verificar HTTPS en todas las conexiones', desc: 'Bloquear conexiones que no usen TLS 1.3', checked: true },
                  { label: 'Validar certificados SSL', desc: 'Rechazar conexiones con certificados inválidos o expirados', checked: true },
                  { label: 'Rate limiting por aplicación', desc: 'Máximo 1000 requests/minuto por instancia', checked: true },
                  { label: 'CORS estricto', desc: 'Solo permitir orígenes explícitamente configurados', checked: true },
                  { label: 'Timeout de conexión', desc: '30 segundos máximo por request a aplicación externa', checked: true },
                  { label: 'Sanitizar headers', desc: 'Remover headers sensibles antes de reenviar', checked: true },
                  { label: 'Auditar todas las integraciones', desc: 'Registrar cada request/respuesta en audit logs', checked: false },
                ].map((policy, i) => (
                  <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-secondary-500/10 bg-background-100 cursor-pointer hover:border-secondary-500/20 transition-all">
                    <input type="checkbox" defaultChecked={policy.checked} className="w-4 h-4 rounded border-secondary-500/40 bg-background-100 text-primary-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground-300">{policy.label}</p>
                      <p className="text-2xs text-foreground-600 mt-0.5">{policy.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-secondary-500/10">
                <button className="h-9 px-4 rounded-lg bg-primary-500 text-foreground-50 hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap">Guardar políticas</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}