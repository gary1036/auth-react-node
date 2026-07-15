import type { Role, UserStatus } from './roles';

export type User = {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  createdAt?: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type AuthResponse = TokenPair & {
  user: User;
};

type ApiErrorBody = {
  error?: {
    message?: string;
    code?: string;
  };
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const ACCESS_KEY = 'auth.accessToken';
const REFRESH_KEY = 'auth.refreshToken';

let memoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;
  memoryAccessToken = localStorage.getItem(ACCESS_KEY);
  return memoryAccessToken;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: Pick<TokenPair, 'accessToken' | 'refreshToken'>) {
  memoryAccessToken = tokens.accessToken;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens() {
  memoryAccessToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    const message = data.error?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: 'bearer' | 'basic' | 'none';
  basic?: { email: string; password: string };
  skipRefresh?: boolean;
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const json = (await response.json()) as { data: TokenPair };
  setTokens(json.data);
  return json.data.accessToken;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authMode = options.auth ?? 'bearer';
  if (authMode === 'bearer') {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (authMode === 'basic' && options.basic) {
    const encoded = btoa(`${options.basic.email}:${options.basic.password}`);
    headers.Authorization = `Basic ${encoded}`;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && authMode === 'bearer' && !options.skipRefresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    }
  }

  return parseJson<T>(response);
}

export const authApi = {
  register(input: { email: string; password: string; name?: string }) {
    return apiRequest<{ data: AuthResponse }>('/auth/register', {
      method: 'POST',
      body: input,
      auth: 'none',
    });
  },
  login(input: { email: string; password: string }) {
    return apiRequest<{ data: AuthResponse }>('/auth/login', {
      method: 'POST',
      body: input,
      auth: 'none',
    });
  },
  me() {
    return apiRequest<{ data: { user: User; authMethod: 'basic' | 'bearer' } }>('/auth/me');
  },
  meBasic(email: string, password: string) {
    return apiRequest<{ data: { user: User; authMethod: 'basic' | 'bearer' } }>('/auth/me', {
      auth: 'basic',
      basic: { email, password },
      skipRefresh: true,
    });
  },
  logout() {
    const refreshToken = getRefreshToken();
    return apiRequest<{ data: { success: boolean } }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      auth: 'none',
      skipRefresh: true,
    });
  },
  googleAuthorizeUrl() {
    return `${API_BASE}/auth/oauth/google/authorize`;
  },
};

export type UsersListResponse = {
  data: User[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export const usersApi = {
  list(params: { q?: string; page?: number; pageSize?: number; status?: UserStatus; role?: Role }) {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    if (params.status) search.set('status', params.status);
    if (params.role) search.set('role', params.role);
    const qs = search.toString();
    return apiRequest<UsersListResponse>(`/users${qs ? `?${qs}` : ''}`);
  },
  update(
    id: string,
    body: {
      name?: string | null;
      email?: string;
      username?: string;
      role?: Role;
      avatarUrl?: string | null;
    },
  ) {
    return apiRequest<{ data: User }>(`/users/${id}`, { method: 'PUT', body });
  },
  updateStatus(id: string, status: UserStatus) {
    return apiRequest<{ data: User }>(`/users/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },
};

export const dashboardApi = {
  stats() {
    return apiRequest<{
      data: {
        totalUsers: number;
        activeUsers: number;
        inactiveUsers: number;
        adminUsers: number;
        regularUsers: number;
      };
    }>('/dashboard/stats');
  },
};
