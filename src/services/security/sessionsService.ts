export interface ActiveSession {
  id: string;
  user_name: string;
  email: string;
  role: string;
  ip_address: string;
  country: string;
  device: string;
  browser: string;
  last_activity: string;
  status: string;
  risk: string;
}

const mockSessions: ActiveSession[] = [
  { id: 's1', user_name: 'Super Admin', email: 'admin@suiteolo.io', role: 'Super Admin', ip_address: '186.32.45.12', country: 'Costa Rica', device: 'MacBook Pro', browser: 'Chrome 125', last_activity: new Date(Date.now() - 120000).toISOString(), status: 'active', risk: 'low' },
  { id: 's2', user_name: 'Operador CR', email: 'operador@suiteolo.io', role: 'User', ip_address: '186.32.45.55', country: 'Costa Rica', device: 'Windows 11', browser: 'Chrome 125', last_activity: new Date(Date.now() - 900000).toISOString(), status: 'active', risk: 'low' },
  { id: 's3', user_name: 'Tenant Admin PA', email: 'tenant_admin@panama.com', role: 'Tenant Admin', ip_address: '190.140.50.30', country: 'Panama', device: 'Dell XPS', browser: 'Chrome 124', last_activity: new Date(Date.now() - 1800000).toISOString(), status: 'active', risk: 'low' },
  { id: 's4', user_name: 'Admin MX', email: 'admin@mexico.com', role: 'Tenant Admin', ip_address: '187.45.23.10', country: 'Mexico', device: 'Surface Pro', browser: 'Edge 122', last_activity: new Date(Date.now() - 3600000).toISOString(), status: 'inactive', risk: 'medium' },
  { id: 's5', user_name: 'Auditor CO', email: 'auditor@colombia.com', role: 'Auditor', ip_address: '181.55.12.44', country: 'Colombia', device: 'ThinkPad', browser: 'Chrome 126', last_activity: new Date(Date.now() - 7200000).toISOString(), status: 'expired', risk: 'low' },
  { id: 's6', user_name: 'DevOps CR', email: 'devops@suiteolo.io', role: 'User', ip_address: '186.32.45.99', country: 'Costa Rica', device: 'Mac Mini', browser: 'Chrome 125', last_activity: new Date(Date.now() - 600000).toISOString(), status: 'active', risk: 'low' },
  { id: 's7', user_name: 'Supervisor MX', email: 'supervisor@mexico.com', role: 'Country Admin', ip_address: '187.45.23.35', country: 'Mexico', device: 'HP EliteBook', browser: 'Chrome 125', last_activity: new Date(Date.now() - 5400000).toISOString(), status: 'active', risk: 'low' },
  { id: 's8', user_name: 'Unknown Source', email: 'unknown@vpn.com', role: 'N/A', ip_address: '45.33.32.156', country: 'Unknown', device: 'Virtual Machine', browser: 'python-requests', last_activity: new Date(Date.now() - 300000).toISOString(), status: 'active', risk: 'critical' },
  { id: 's9', user_name: 'Admin PA', email: 'admin@panama.com', role: 'Tenant Admin', ip_address: '190.140.50.22', country: 'Panama', device: 'iPad Pro', browser: 'Safari 17', last_activity: new Date(Date.now() - 14400000).toISOString(), status: 'revoked', risk: 'high' },
  { id: 's10', user_name: 'Analista CR', email: 'analista@suiteolo.io', role: 'User', ip_address: '201.55.33.10', country: 'Costa Rica', device: 'MacBook Air', browser: 'Chrome 126', last_activity: new Date(Date.now() - 600000).toISOString(), status: 'active', risk: 'medium' },
];

export async function fetchSessions(): Promise<{ data: ActiveSession[]; error: string | null }> {
  return { data: mockSessions, error: null };
}

export async function revokeSession(sessionId: string): Promise<{ error: string | null }> {
  return { error: null };
}

export async function markSessionSuspicious(sessionId: string): Promise<{ error: string | null }> {
  return { error: null };
}