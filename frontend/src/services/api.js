const DEV_ROLE_KEY = 'weekly_prayers_dev_role';

export function getBasePath() {
  if (typeof window !== 'undefined' && typeof window.__BASE_PATH__ === 'string') {
    return window.__BASE_PATH__.replace(/\/+$/, '');
  }
  // If <base href="..."> is present in document
  if (typeof document !== 'undefined') {
    const baseEl = document.querySelector('base');
    if (baseEl && baseEl.getAttribute('href')) {
      const href = baseEl.getAttribute('href');
      try {
        const url = new URL(href, window.location.origin);
        const path = url.pathname.replace(/\/+$/, '');
        return path;
      } catch (e) {
        return href.replace(/\/+$/, '');
      }
    }
  }
  return '';
}

export function withBasePath(path) {
  if (!path || typeof path !== 'string') return path;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const base = getBasePath();
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');
  const url = withBasePath(`/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      data.error?.message || 'Request failed',
      response.status,
      data
    );
  }

  return response.json();
}

export const api = {
  // Auth
  getAuthConfig: () => request('/auth/config'),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Prayers
  getPrayers: (tenant) => request(`/prayers${tenant ? `?tenant=${tenant}` : ''}`),
  getPrayersByWeek: (week, year, tenant) =>
    request(`/prayers/week/${week}?year=${year}${tenant ? `&tenant=${tenant}` : ''}`),
  submitPrayer: (content, startDate, endDate, tenantId) =>
    request('/prayers', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, tenantId }),
    }),
  submitStaffPrayer: (content, startDate, endDate, ministryGroup, ministryTag, isYhtymaWide, tenantId) =>
    request('/prayers/staff', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, ministryGroup, ministryTag, isYhtymaWide, tenantId }),
    }),
  submitPastorPrayer: (content, startDate, endDate, logoUrl, isYhtymaWide, tenantId) =>
    request('/prayers/pastor', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, logoUrl, isYhtymaWide, tenantId }),
    }),
  submitBishopPrayer: (content, startDate, endDate, logoUrl, isYhtymaWide, tenantId) =>
    request('/prayers/bishop', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, logoUrl, isYhtymaWide, tenantId }),
    }),
  updatePrayer: (id, updates) =>
    request(`/prayers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deletePrayer: (id) =>
    request(`/prayers/${id}`, {
      method: 'DELETE',
    }),
  approvePrayer: (id, isApproved) =>
    request(`/prayers/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ isApproved }),
    }),
  updatePrayerHighlight: (id, highlightPriority, startDate, endDate) =>
    request(`/prayers/${id}/highlight`, {
      method: 'PUT',
      body: JSON.stringify({ highlightPriority, startDate, endDate }),
    }),
  updatePrayerPriority: (id, highlightPriority, startDate, endDate) =>
    request(`/prayers/${id}/highlight`, {
      method: 'PUT',
      body: JSON.stringify({ highlightPriority, startDate, endDate }),
    }),

  // Counts
  getCounts: (tenant) => request(`/counts${tenant ? `?tenant=${tenant}` : ''}`),
  incrementCount: (tenantId) =>
    request('/counts/increment', {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    }),

  // Export
  getIntercessionExport: (options = {}) => {
    const params = new URLSearchParams(options);
    return request(`/export/intercession?${params}`);
  },

  // Users (Admin)
  getUsers: () => request('/users'),
  updateUserRole: (id, role) =>
    request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Bible (Kirkkovuosikalenteri & Anno API)
  getLiturgicalDay: (date) =>
    request(`/bible/liturgical-day${date ? `?date=${date}` : ''}`),
  getSundayGospel: (date) =>
    request(`/bible/sunday-gospel${date ? `?date=${date}` : ''}`),
  getDailyPrayerHours: (date) =>
    request(`/bible/daily-hours${date ? `?date=${date}` : ''}`),
  getAnnoStatus: () =>
    request('/bible/status'),
  testAnnoConnection: (customUrl) =>
    request('/bible/test-connection', {
      method: 'POST',
      body: JSON.stringify({ customUrl }),
    }),

  // Tenants (Multi-Tenancy)
  getTenants: () => request('/tenants'),
  getCurrentTenant: (slugOrHost) => {
    if (!slugOrHost) return request('/tenants/current');
    const param = slugOrHost.includes('.') ? `host=${slugOrHost}` : `slug=${slugOrHost}`;
    return request(`/tenants/current?${param}`);
  },
  getTenantCurrent: (slugOrHost) => {
    if (!slugOrHost) return request('/tenants/current');
    const param = slugOrHost.includes('.') ? `host=${slugOrHost}` : `slug=${slugOrHost}`;
    return request(`/tenants/current?${param}`);
  },
  getTenantById: (identifier) => request(`/tenants/${identifier}`),
  createTenant: (data) =>
    request('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTenant: (identifier, updates) =>
    request(`/tenants/${identifier}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteTenant: (identifier) =>
    request(`/tenants/${identifier}`, {
      method: 'DELETE',
    }),
};

export default api;
