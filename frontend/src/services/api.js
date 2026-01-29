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
  getPrayers: () => request('/prayers'),
  getPrayersByWeek: (week, year) =>
    request(`/prayers/week/${week}?year=${year}`),
  submitPrayer: (content, startDate, endDate) =>
    request('/prayers', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate }),
    }),
  submitStaffPrayer: (content, startDate, endDate) =>
    request('/prayers/staff', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate }),
    }),
  submitPastorPrayer: (content, startDate, endDate) =>
    request('/prayers/pastor', {
      method: 'POST',
      body: JSON.stringify({ content, startDate, endDate }),
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
};

export { ApiError };
