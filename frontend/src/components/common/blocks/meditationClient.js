import { api, withBasePath } from '../../../services/api';

async function authFetch(endpoint, options = {}) {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
  const url = withBasePath(`/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || data.error || 'Pyyntö epäonnistui');
  }
  return data;
}

export const meditationClient = {
  getMeditations: async (includeInactive = false, tenant = null) => {
    if (api.getMeditations && !tenant) {
      return api.getMeditations(includeInactive);
    }
    const qs = new URLSearchParams();
    if (includeInactive) qs.set('includeInactive', 'true');
    if (tenant) qs.set('tenant', tenant);
    const queryStr = qs.toString();
    return authFetch(`/meditations${queryStr ? `?${queryStr}` : ''}`);
  },

  saveMeditation: async (payload) => {
    if (typeof api.saveMeditation === 'function') {
      return api.saveMeditation(payload);
    }
    if (payload.dbId || payload.id) {
      return authFetch(`/meditations/${encodeURIComponent(payload.dbId || payload.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
    return authFetch('/meditations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateMeditationPortal: async (id, portalPosition, tenant = null) => {
    if (typeof api.updateMeditationPortal === 'function') {
      return api.updateMeditationPortal(id, portalPosition, tenant);
    }
    return authFetch(`/meditations/${encodeURIComponent(id)}/portal`, {
      method: 'PATCH',
      body: JSON.stringify({ portal_position: portalPosition, tenant }),
    });
  },

  deleteMeditation: async (id, tenant = null) => {
    if (typeof api.deleteMeditation === 'function') {
      return api.deleteMeditation(id, tenant);
    }
    const qs = tenant ? `?tenant=${encodeURIComponent(tenant)}` : '';
    return authFetch(`/meditations/${encodeURIComponent(id)}${qs}`, {
      method: 'DELETE',
    });
  },

  updateDevotionPortal: async (id, portalPosition) => {
    if (typeof api.updateDevotionPortal === 'function') {
      return api.updateDevotionPortal(id, portalPosition);
    }
    return authFetch(`/devotions/${encodeURIComponent(id)}/portal`, {
      method: 'PATCH',
      body: JSON.stringify({ portal_position: portalPosition }),
    });
  },
};
