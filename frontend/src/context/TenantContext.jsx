import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useSettings } from './SettingsContext';

const TenantContext = createContext(null);

function detectInitialTenant() {
  if (typeof window === 'undefined') return 'riihimaki';

  // 1. URL Query Parameter (?tenant=... or ?seurakunta=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('tenant') || params.get('seurakunta');
    if (fromParam) return fromParam;
  } catch (e) {}

  // 2. URL Path Parameter (/seurakunta/:slug or subpath /rukous/:slug)
  try {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const rukousIdx = pathParts.indexOf('rukous');
    if (rukousIdx !== -1 && pathParts[rukousIdx + 1]) {
      const nextSeg = pathParts[rukousIdx + 1];
      if (!['admin', 'bible', 'raamattu', 'api', 'esirukouslista', 'esirukous', 'intercession'].includes(nextSeg)) {
        return nextSeg;
      }
    }
    const seurakuntaIdx = pathParts.indexOf('seurakunta');
    if (seurakuntaIdx !== -1 && pathParts[seurakuntaIdx + 1]) {
      return pathParts[seurakuntaIdx + 1];
    }
  } catch (e) {}

  // 3. Hostname detection (e.g. riihimaki.rukous.fi, rukous.riihimaenseurakunta.fi)
  try {
    const host = window.location.hostname;
    if (host && !['localhost', '127.0.0.1'].includes(host)) {
      if (host.includes('.rukous.')) {
        const sub = host.split('.rukous.')[0];
        if (sub && !['www', 'api', 'app', 'kehitys'].includes(sub)) {
          return sub;
        }
      }
      return host;
    }
  } catch (e) {}

  // 4. Saved user preference in localStorage
  try {
    const saved = localStorage.getItem('selected_tenant_slug');
    if (saved) return saved;
  } catch (e) {}

  return 'riihimaki';
}

export function TenantProvider({ children }) {
  const settingsContext = useSettings();
  const settings = settingsContext?.settings || {};

  const [selectedSlug, setSelectedSlug] = useState(detectInitialTenant);
  const [allTenantsList, setAllTenantsList] = useState([]);

  const [tenantHierarchy, setTenantHierarchy] = useState({
    tenant: {
      id: 'e2000000-0000-0000-0000-000000000010',
      name: 'Riihimäen seurakunta',
      slug: 'riihimaki',
      type: 'seurakunta',
      parent_id: null,
      diocese: 'Tampereen hiippakunta',
      domain: 'riihimaenseurakunta.fi'
    },
    yhtyma: null,
    isPartOfYhtyma: false,
    sisterParishes: [],
    allParishesInYhtyma: []
  });

  const [loading, setLoading] = useState(true);

  const fetchHierarchy = useCallback(async (slugOrHost) => {
    setLoading(true);
    try {
      const data = await api.getCurrentTenant(slugOrHost);
      if (data && data.tenant) {
        setTenantHierarchy(data);
        if (data.tenant.slug && data.tenant.slug !== selectedSlug) {
          setSelectedSlug(data.tenant.slug);
        }
      }
    } catch (err) {
      console.warn('Could not fetch tenant hierarchy, using defaults:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSlug]);

  const fetchAllTenants = useCallback(async () => {
    try {
      const res = await api.getTenants();
      if (res?.tenants) {
        setAllTenantsList(res.tenants);
      }
    } catch (e) {
      console.warn('Could not fetch all tenants list:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy(selectedSlug);
    fetchAllTenants();
  }, [selectedSlug, fetchHierarchy, fetchAllTenants]);

  const switchParish = (slug) => {
    if (!slug) return;
    try {
      localStorage.setItem('selected_tenant_slug', slug);
    } catch (e) {}
    setSelectedSlug(slug);
  };

  // Overlay configurable names from settings if tuomiokirkko
  const effectiveTenant = {
    ...tenantHierarchy.tenant,
    name: (tenantHierarchy.tenant?.slug === 'tuomiokirkko' && settings?.parish_name)
      ? settings.parish_name
      : tenantHierarchy.tenant?.name,
    highlight_icon: tenantHierarchy.tenant?.highlight_icon || settings?.highlight_icon || 'candle'
  };

  const effectiveYhtyma = tenantHierarchy.yhtyma ? {
    ...tenantHierarchy.yhtyma,
    name: settings?.yhtyma_name || tenantHierarchy.yhtyma?.name
  } : null;

  const effectiveAllParishes = (tenantHierarchy.allParishesInYhtyma || []).map(p => {
    if (p.slug === 'tuomiokirkko' && settings?.parish_name) {
      return { ...p, name: settings.parish_name };
    }
    return p;
  });

  const effectiveSisterParishes = effectiveAllParishes.filter(p => p.id !== effectiveTenant?.id);

  const activeModules = (() => {
    const raw = effectiveTenant?.active_modules || settings?.active_modules;
    if (!raw) return ['prayers', 'bible', 'hours', 'hartaus', 'meditations'];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : ['prayers', 'bible', 'hours', 'hartaus', 'meditations'];
    } catch (e) {
      return ['prayers', 'bible', 'hours', 'hartaus', 'meditations'];
    }
  })();

  const isModuleEnabled = (moduleKey, isPrivileged = false) => {
    if (isPrivileged) return true;
    return activeModules.includes(moduleKey);
  };

  const getModuleTitle = (moduleKey, fallback = '') => {
    switch (moduleKey) {
      case 'prayers':
        return settings?.module_title_prayers || fallback || 'Esirukoukset';
      case 'bible':
        return settings?.module_title_bible || fallback || 'Raamattu & Sana';
      case 'hours':
        return settings?.module_title_hours || fallback || 'Hetkirukous';
      case 'hartaus':
        return settings?.module_title_hartaus || fallback || 'Hartaus';
      case 'meditations':
        return settings?.module_title_meditations || fallback || 'Meditaatiot';
      default:
        return fallback || moduleKey;
    }
  };

  const value = {
    currentTenant: effectiveTenant,
    yhtyma: effectiveYhtyma,
    isPartOfYhtyma: tenantHierarchy.isPartOfYhtyma,
    sisterParishes: effectiveSisterParishes,
    allParishesInYhtyma: effectiveAllParishes,
    allTenants: allTenantsList,
    selectedSlug,
    activeModules,
    isModuleEnabled,
    getModuleTitle,
    switchParish,
    refetchTenant: () => {
      fetchHierarchy(selectedSlug);
      fetchAllTenants();
    },
    loading
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
