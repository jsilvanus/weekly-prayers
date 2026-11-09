import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useSettings } from './SettingsContext';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const settingsContext = useSettings();
  const settings = settingsContext?.settings || {};

  const [selectedSlug, setSelectedSlug] = useState(() => {
    return localStorage.getItem('selected_tenant_slug') || 'tuomiokirkko';
  });

  const [tenantHierarchy, setTenantHierarchy] = useState({
    tenant: {
      id: 'e2000000-0000-0000-0000-000000000001',
      name: settings.parish_name || 'Tuomiokirkkoseurakunta',
      slug: 'tuomiokirkko',
      type: 'seurakunta',
      parent_id: 'e1000000-0000-0000-0000-000000000001',
      diocese: 'Tampereen hiippakunta'
    },
    yhtyma: {
      id: 'e1000000-0000-0000-0000-000000000001',
      name: settings.yhtyma_name || 'Tampereen seurakuntayhtymä',
      slug: 'tampereen-seurakuntayhtyma',
      type: 'seurakuntayhtyma'
    },
    isPartOfYhtyma: true,
    sisterParishes: [
      { id: 'e2000000-0000-0000-0000-000000000002', name: 'Harjun seurakunta', slug: 'harju', type: 'seurakunta' },
      { id: 'e2000000-0000-0000-0000-000000000003', name: 'Messukylän seurakunta', slug: 'messukyla', type: 'seurakunta' }
    ],
    allParishesInYhtyma: [
      { id: 'e2000000-0000-0000-0000-000000000001', name: settings.parish_name || 'Tuomiokirkkoseurakunta', slug: 'tuomiokirkko', type: 'seurakunta' },
      { id: 'e2000000-0000-0000-0000-000000000002', name: 'Harjun seurakunta', slug: 'harju', type: 'seurakunta' },
      { id: 'e2000000-0000-0000-0000-000000000003', name: 'Messukylän seurakunta', slug: 'messukyla', type: 'seurakunta' }
    ]
  });

  const [loading, setLoading] = useState(true);

  const fetchHierarchy = useCallback(async (slug) => {
    setLoading(true);
    try {
      const data = await api.getTenantCurrent(slug);
      if (data && data.tenant) {
        setTenantHierarchy(data);
      }
    } catch (err) {
      console.warn('Could not fetch tenant hierarchy, using defaults:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy(selectedSlug);
  }, [selectedSlug, fetchHierarchy]);

  const switchParish = (slug) => {
    if (!slug) return;
    localStorage.setItem('selected_tenant_slug', slug);
    setSelectedSlug(slug);
  };

  // Overlay configurable names from settings
  const effectiveTenant = {
    ...tenantHierarchy.tenant,
    name: (tenantHierarchy.tenant?.slug === 'tuomiokirkko' && settings?.parish_name)
      ? settings.parish_name
      : tenantHierarchy.tenant?.name
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

  const effectiveSisterParishes = effectiveAllParishes.filter(p => p.id !== effectiveTenant.id);

  const value = {
    currentTenant: effectiveTenant,
    yhtyma: effectiveYhtyma,
    isPartOfYhtyma: tenantHierarchy.isPartOfYhtyma,
    sisterParishes: effectiveSisterParishes,
    allParishesInYhtyma: effectiveAllParishes,
    selectedSlug,
    switchParish,
    refetchTenant: () => fetchHierarchy(selectedSlug),
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
