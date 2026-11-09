const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

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
  submitStaffPrayer: (content, startDate, endDate, ministryGroup, ministryTag, isYhtymaWide = false, tenantId = null) =>
    request('/prayers/staff', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, ministryGroup, ministryTag, isYhtymaWide, tenantId }),
    }),
  submitPastorPrayer: (content, startDate, endDate, logoUrl, isYhtymaWide = false, tenantId = null) =>
    request('/prayers/pastor', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, logoUrl, isYhtymaWide, tenantId }),
    }),
  submitBishopPrayer: (content, startDate, endDate, logoUrl) =>
    request('/prayers/bishop', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, logoUrl }),
    }),
  updatePrayer: (id, data) =>
    request(`/prayers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePrayer: (id) =>
    request(`/prayers/${id}`, { method: 'DELETE' }),
  approvePrayer: (id, approved) =>
    request(`/prayers/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    }),
  updatePrayerHighlight: (id, highlightPriority) =>
    request(`/prayers/${id}/highlight`, {
      method: 'PUT',
      body: JSON.stringify({ highlightPriority }),
    }),

  // Settings & Appearance
  getSettings: () => request('/settings'),
  updateSettings: (settings) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    }),
  uploadImage: (image, name) =>
    request('/settings/upload', {
      method: 'POST',
      body: JSON.stringify({ image, name }),
    }),

  // Counts
  getWeekCount: (week, year) =>
    request(`/counts/week/${week}?year=${year}`),
  incrementCount: () =>
    request('/counts/increment', { method: 'POST' }),

  // Users (admin)
  getUsers: () => request('/users'),
  updateUserRole: (id, role) =>
    request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  // Bible & Anno API
  getBibleToday: (date) => request(`/bible/today${date ? `?date=${date}` : ''}`),
  getBibleOverrides: () => request('/bible/overrides'),
  createBibleOverride: (data) =>
    request('/bible/overrides', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBibleOverride: (id, data) =>
    request(`/bible/overrides/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteBibleOverride: (id) =>
    request(`/bible/overrides/${id}`, { method: 'DELETE' }),
  testAnnoApiStatus: (url) =>
    request(`/bible/anno-status${url ? `?url=${encodeURIComponent(url)}` : ''}`),

  // Tenants & Yhtymä Multi-tenancy
  getTenants: () => request('/tenants'),
  getTenantCurrent: (slug) => request(`/tenants/current${slug ? `?slug=${slug}` : ''}`),
  getTenant: (identifier) => request(`/tenants/${identifier}`),
};

export { ApiError };
