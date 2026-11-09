import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [selectedSlug, setSelectedSlug] = useState(() => {
    return localStorage.getItem('selected_tenant_slug') || 'tuomiokirkko';
  });

  const [tenantHierarchy, setTenantHierarchy] = useState({
    tenant: {
      id: 'e2000000-0000-0000-0000-000000000001',
      name: 'Tuomiokirkkoseurakunta',
      slug: 'tuomiokirkko',
      type: 'seurakunta',
      parent_id: 'e1000000-0000-0000-0000-000000000001',
      diocese: 'Tampereen hiippakunta'
    },
    yhtyma: {
      id: 'e1000000-0000-0000-0000-000000000001',
      name: 'Tampereen seurakuntayhtymä',
      slug: 'tampereen-seurakuntayhtyma',
      type: 'seurakuntayhtyma'
    },
    isPartOfYhtyma: true,
    sisterParishes: [
      { id: 'e2000000-0000-0000-0000-000000000002', name: 'Harjun seurakunta', slug: 'harju', type: 'seurakunta' },
      { id: 'e2000000-0000-0000-0000-000000000003', name: 'Messukylän seurakunta', slug: 'messukyla', type: 'seurakunta' }
    ],
    allParishesInYhtyma: [
      { id: 'e2000000-0000-0000-0000-000000000001', name: 'Tuomiokirkkoseurakunta', slug: 'tuomiokirkko', type: 'seurakunta' },
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

  const value = {
    currentTenant: tenantHierarchy.tenant,
    yhtyma: tenantHierarchy.yhtyma,
    isPartOfYhtyma: tenantHierarchy.isPartOfYhtyma,
    sisterParishes: tenantHierarchy.sisterParishes || [],
    allParishesInYhtyma: tenantHierarchy.allParishesInYhtyma || [],
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
