/**
 * API Abstraction Layer
 * 
 * Detects environment and routes requests to either:
 * - Lovable Cloud (Supabase) when running in Lovable preview
 * - Express + SQLite backend when running on VPS
 * 
 * Set VITE_API_MODE=local and VITE_API_URL=http://localhost:6002 in .env for VPS
 */

const API_MODE = import.meta.env.VITE_API_MODE || 'cloud'; // 'cloud' | 'local'
const API_URL = import.meta.env.VITE_API_URL || '';

export const isLocalMode = API_MODE === 'local';

// ──────── Token storage (local mode) ────────

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
}

// ──────── HTTP helper (local mode) ────────

async function localFetch<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ──────── Auth API ────────

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  designation: string;
  phone: string | null;
  must_change_password: boolean;
  role: 'admin' | 'user';
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResult> {
    return localFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  async me(): Promise<AuthUser> {
    return localFetch('/api/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return localFetch('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  },

  logout() {
    setAuthToken(null);
  },
};

// ──────── Users API ────────

export const usersApi = {
  async list(): Promise<AuthUser[]> {
    return localFetch('/api/users');
  },
  async create(data: { email: string; password: string; full_name: string; designation?: string; phone?: string; role?: string }) {
    return localFetch('/api/users', { method: 'POST', body: data });
  },
  async update(id: string, data: any) {
    return localFetch(`/api/users/${id}`, { method: 'PUT', body: data });
  },
  async remove(id: string) {
    return localFetch(`/api/users/${id}`, { method: 'DELETE' });
  },
};

// ──────── Projects API ────────

export const projectsApi = {
  async list() {
    return localFetch('/api/projects');
  },
  async create(data: { name: string; location: string }) {
    return localFetch('/api/projects', { method: 'POST', body: data });
  },
  async update(id: string, data: any) {
    return localFetch(`/api/projects/${id}`, { method: 'PUT', body: data });
  },
  async remove(id: string) {
    return localFetch(`/api/projects/${id}`, { method: 'DELETE' });
  },
};

// ──────── Categories API ────────

export const categoriesApi = {
  async list() {
    return localFetch('/api/categories');
  },
  async create(data: { name: string }) {
    return localFetch('/api/categories', { method: 'POST', body: data });
  },
  async remove(id: string) {
    return localFetch(`/api/categories/${id}`, { method: 'DELETE' });
  },
};

// ──────── Material Requests API ────────

export const requestsApi = {
  async list() {
    return localFetch('/api/requests');
  },
  async get(id: string) {
    return localFetch(`/api/requests/${id}`);
  },
  async create(data: any) {
    return localFetch('/api/requests', { method: 'POST', body: data });
  },
  async update(id: string, data: any) {
    return localFetch(`/api/requests/${id}`, { method: 'PATCH', body: data });
  },
  async remove(id: string) {
    return localFetch(`/api/requests/${id}`, { method: 'DELETE' });
  },
};

// ──────── Approvals API ────────

export const approvalsApi = {
  async pending() {
    return localFetch('/api/approvals/pending');
  },
  async pendingCount(): Promise<number> {
    const data = await localFetch<{ count: number }>('/api/approvals/pending/count');
    return data.count;
  },
  async create(data: { request_id: string; action: string; comment?: string; request_type?: string }) {
    return localFetch('/api/approvals', { method: 'POST', body: data });
  },
};

// ──────── Stock API ────────

export const stockApi = {
  async list() {
    const data = await localFetch<{ items: any[] }>('/api/stock');
    return data.items;
  },
  async add(items: any[]) {
    const data = await localFetch<{ items: any[] }>('/api/stock', { method: 'POST', body: { items } });
    return data.items;
  },
  async deduct(items: any[]) {
    const data = await localFetch<{ items: any[] }>('/api/stock/deduct', { method: 'POST', body: { items } });
    return data.items;
  },
};

// ──────── Dashboard API ────────

export const dashboardApi = {
  async metrics() {
    return localFetch('/api/dashboard/metrics');
  },
};
