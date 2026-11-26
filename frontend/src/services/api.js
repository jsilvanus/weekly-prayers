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

  if (response.status === 204) return null;
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
  submitPrayer: (content, startDate, endDate, tenantId, portalPosition = null) =>
    request('/prayers', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, tenantId, portalPosition }),
    }),
  checkPrayer: (content, lang, signal) =>
    request('/prayers/check', {
      method: 'POST',
      body: JSON.stringify({ content, lang }),
      signal,
    }),
  saveRedaction: (id, redactedContent) =>
    request(`/prayers/${encodeURIComponent(id)}/redaction`, {
      method: 'PUT',
      body: JSON.stringify({ redactedContent }),
    }),
  confirmRedaction: (id) =>
    request(`/prayers/${encodeURIComponent(id)}/redaction/confirm`, {
      method: 'POST',
    }),
  getPrayerDecisions: (id) =>
    request(`/prayers/${encodeURIComponent(id)}/decisions`),
  submitStaffPrayer: (content, startDate, endDate, ministryGroup, ministryTag, isYhtymaWide, tenantId, portalPosition = null) =>
    request('/prayers/staff', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, ministryGroup, ministryTag, isYhtymaWide, tenantId, portalPosition }),
    }),
  submitPastorPrayer: (content, startDate, endDate, logoUrl, isYhtymaWide, tenantId, highlightPriority, portalPosition = null) =>
    request('/prayers/pastor', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, logoUrl, isYhtymaWide, tenantId, highlightPriority, portalPosition }),
    }),
  submitBishopPrayer: (content, startDate, endDate, logoUrl, isYhtymaWide, tenantId, highlightPriority, portalPosition = null) =>
    request('/prayers/bishop', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate, logoUrl, isYhtymaWide, tenantId, highlightPriority, portalPosition }),
    }),
  updatePrayerPortalPlacement: (id, portalPosition, portalOrder = 0) =>
    request(`/prayers/${id}/portal`, {
      method: 'PUT',
      body: JSON.stringify({ portalPosition, portalOrder }),
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
      body: JSON.stringify({ approved: Boolean(isApproved), isApproved: Boolean(isApproved) }),
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
  getBibleToday: (date) =>
    request(`/bible/today${date ? `?date=${date}` : ''}`),
  getLiturgicalHours: (date) =>
    request(`/bible/hours${date ? `?date=${date}` : ''}`),
  getLiturgicalDay: (date) =>
    request(`/bible/liturgical-day${date ? `?date=${date}` : ''}`),
  getSundayGospel: (date) =>
    request(`/bible/sunday-gospel${date ? `?date=${date}` : ''}`),
  getDailyPrayerHours: (date) =>
    request(`/bible/hours${date ? `?date=${date}` : ''}`),
  getAnnoStatus: () =>
    request('/bible/status'),
  testAnnoConnection: (customUrl) =>
    request('/bible/test-connection', {
      method: 'POST',
      body: JSON.stringify({ customUrl }),
    }),
  testAnnoApiStatus: (url) =>
    request(`/bible/anno-status${url ? `?url=${encodeURIComponent(url)}` : ''}`),
  getBibleOverrides: () =>
    request('/bible/overrides'),
  createBibleOverride: (payload) =>
    request('/bible/overrides', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateBibleOverride: (id, payload) =>
    request(`/bible/overrides/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteBibleOverride: (id) =>
    request(`/bible/overrides/${id}`, {
      method: 'DELETE',
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

  // Devotions (Hartaus)
  getTodayDevotion: (date = null, tenant = null) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (tenant) params.append('tenant', tenant);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/devotions/today${qs}`);
  },
  listDevotions: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.tenant) sp.append('tenant', params.tenant);
    if (params.startDate) sp.append('startDate', params.startDate);
    if (params.endDate) sp.append('endDate', params.endDate);
    if (params.limit) sp.append('limit', params.limit);
    if (params.offset) sp.append('offset', params.offset);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/devotions${qs}`);
  },
  saveDevotion: (data) =>
    request('/devotions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDevotionPortal: (id, portalPosition) =>
    request(`/devotions/${id}/portal`, {
      method: 'PATCH',
      body: JSON.stringify({ portal_position: portalPosition, portalPosition }),
    }),
  deleteDevotion: (id) =>
    request(`/devotions/${id}`, {
      method: 'DELETE',
    }),

  // Meditations
  getMeditations: (includeInactive = false, tenant = null) => {
    const params = new URLSearchParams();
    if (includeInactive) params.append('includeInactive', 'true');
    if (tenant) params.append('tenant', tenant);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/meditations${qs}`);
  },
  getMeditationById: (id) => request(`/meditations/${id}`),
  saveMeditation: (data) => {
    const targetId = data.dbId || data.id;
    if (targetId && !data.createNew) {
      return request(`/meditations/${encodeURIComponent(targetId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
    return request('/meditations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateMeditationPortal: (id, portalPosition, tenant = null) =>
    request(`/meditations/${encodeURIComponent(id)}/portal`, {
      method: 'PATCH',
      body: JSON.stringify({ portal_position: portalPosition, portalPosition, tenant }),
    }),
  deleteMeditation: (id) =>
    request(`/meditations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Pyhäpäivä & Kirkkovuosi
  getPyhapaivaDay: (date = null, tenant = null, translation = 'KR92') => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (tenant) params.append('tenant', tenant);
    if (translation) params.append('translation', translation);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/pyhapaiva/day${qs}`);
  },
  getHolyDay: (date = null, tenant = null, translation = 'KR92') => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (tenant) params.append('tenant', tenant);
    if (translation) params.append('translation', translation);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/pyhapaiva/day${qs}`);
  },
  getPyhapaivaCalendar: (from = null, days = 90, tenant = null) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (days) params.append('days', String(days));
    if (tenant) params.append('tenant', tenant);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/pyhapaiva/calendar${qs}`);
  },
  getPyhapaivaOverrides: (tenant = null) =>
    request(`/pyhapaiva/overrides${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ''}`),
  savePyhapaivaOverride: (date, payload) =>
    request(`/pyhapaiva/overrides/${encodeURIComponent(date)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deletePyhapaivaOverride: (date, tenant = null) =>
    request(`/pyhapaiva/overrides/${encodeURIComponent(date)}${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ''}`, {
      method: 'DELETE',
    }),

  // Weekly prayer mailings (coordinator and above)
  getMailingLists: () => request('/mailings/lists'),
  createMailingList: (data) =>
    request('/mailings/lists', { method: 'POST', body: JSON.stringify(data) }),
  updateMailingList: (id, data) =>
    request(`/mailings/lists/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMailingList: (id) =>
    request(`/mailings/lists/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getMailingSubscribers: (listId) =>
    request(`/mailings/lists/${encodeURIComponent(listId)}/subscribers`),
  addMailingSubscribers: (listId, data) =>
    request(`/mailings/lists/${encodeURIComponent(listId)}/subscribers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeMailingSubscriber: (id) =>
    request(`/mailings/subscribers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getMailings: () => request('/mailings'),
  createMailing: (data) =>
    request('/mailings', { method: 'POST', body: JSON.stringify(data) }),
  updateMailing: (id, data) =>
    request(`/mailings/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMailing: (id) =>
    request(`/mailings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getMailingSends: (id) => request(`/mailings/${encodeURIComponent(id)}/sends`),
  previewMailing: (id) =>
    request(`/mailings/${encodeURIComponent(id)}/preview`, { method: 'POST' }),
  sendMailingTest: (id) =>
    request(`/mailings/${encodeURIComponent(id)}/test`, { method: 'POST' }),
};

export default api;
