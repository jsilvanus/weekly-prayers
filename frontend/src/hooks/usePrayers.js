import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function usePrayers(week = null, year = null, tenant = null) {
  const [prayers, setPrayers] = useState({ bishop: [], pastor: [], staff: [], public: [] });
  const [weekInfo, setWeekInfo] = useState({ week: null, year: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrayers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = week && year
        ? await api.getPrayersByWeek(week, year, tenant)
        : await api.getPrayers(tenant);

      setPrayers(data.prayers);
      setWeekInfo({ week: data.week, year: data.year });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [week, year, tenant]);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  return {
    prayers,
    week: weekInfo.week,
    year: weekInfo.year,
    loading,
    error,
    refetch: fetchPrayers,
  };
}
