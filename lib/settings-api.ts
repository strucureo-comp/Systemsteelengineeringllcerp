const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/backend';
const API_BASE = BASE_URL.startsWith('/')
  ? BASE_URL
  : (BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`);

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bb_token');
}

function headers(withJson = true): HeadersInit {
  const token = getToken();
  const h: HeadersInit = withJson ? { 'Content-Type': 'application/json' } : {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function apiGet<T>(path: string, requireAuth = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: requireAuth ? headers() : {},
    cache: 'no-store'
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.data as T;
}

async function apiSend<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return (json.data ?? json) as T;
}

export type SettingsUser = {
  _id: string;
  full_name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'disabled';
  invited_at?: string;
  last_login?: string;
  signature_url?: string | null;
};

export const settingsApi = {
  getCompany: () => apiGet<any>('/settings/company'),
  saveCompany: (data: any) => apiSend<any>('/settings/company', 'PUT', data),

  getBranding: () => apiGet<any>('/settings/branding', false),
  saveBranding: (data: any) => {
    const payload = {
      logo: data?.logo ?? null,
      primaryColor: data?.primaryColor ?? '#0F172A',
      accentColor: data?.accentColor ?? '#10B981',
      footerText: data?.footerText ?? '',
      favicon: data?.favicon ?? null,
      authorizedSignature: data?.authorizedSignature ?? null,
      acknowledgementTitle: data?.acknowledgementTitle ?? 'RECEIVER ACKNOWLEDGEMENT',
      acknowledgementSignatureLabel: data?.acknowledgementSignatureLabel ?? 'SIGNATURE / COMPANY STAMP',
      acknowledgementNameLabel: data?.acknowledgementNameLabel ?? 'NAME',
      acknowledgementDateLabel: data?.acknowledgementDateLabel ?? 'DATE & TIME',
    };
    return apiSend<any>('/settings/branding', 'PUT', payload);
  },

  getFinance: () => apiGet<any>('/settings/finance-config'),
  saveFinance: (data: any) => apiSend<any>('/settings/finance-config', 'PUT', data),

  getTaxes: () => apiGet<any[]>('/settings/taxes'),
  createTax: (data: any) => apiSend<any>('/settings/taxes', 'POST', data),
  updateTax: (id: string, data: any) => apiSend<any>(`/settings/taxes/${id}`, 'PUT', data),
  deleteTax: (id: string) => apiSend<any>(`/settings/taxes/${id}`, 'DELETE'),
  toggleTax: (id: string, enabled: boolean) => apiSend<any>(`/settings/taxes/${id}/toggle`, 'PUT', { enabled }),

  getRoles: () => apiGet<any[]>('/settings/roles'),
  createRole: (data: any) => apiSend<any>('/settings/roles', 'POST', data),
  updateRole: (id: string, data: any) => apiSend<any>(`/settings/roles/${id}`, 'PUT', data),
  deleteRole: (id: string) => apiSend<any>(`/settings/roles/${id}`, 'DELETE'),

  getModules: () => apiGet<any>('/settings/modules'),
  saveModules: (modules: Record<string, boolean>) => apiSend<any>('/settings/modules', 'PUT', { modules }),

  getApprovals: () => apiGet<any>('/settings/approvals'),
  saveApprovals: (data: any) => apiSend<any>('/settings/approvals', 'PUT', data),

  getUsers: () => apiGet<SettingsUser[]>('/auth/users'),
  inviteUser: (email: string, role: string) => apiSend<any>('/auth/users/invite', 'POST', { email, role }),
  updateUser: (id: string, data: any) => apiSend<any>(`/auth/users/${id}`, 'PUT', data),
  deleteUser: (id: string) => apiSend<any>(`/auth/users/${id}`, 'DELETE'),
  toggleUserStatus: (id: string, status: 'active' | 'disabled') => apiSend<any>(`/auth/users/${id}/toggle-status`, 'PUT', { status }),
};
