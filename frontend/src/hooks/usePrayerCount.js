import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function usePrayerCount(week, year) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCount = useCallback(async () => {
    if (!week || !year) return;

    try {
      const data = await api.getWeekCount(week, year);
      setCount(data.count || 0);
    } catch (err) {
      // Count endpoint might not exist yet, default to 0
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [week, year]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const increment = async () => {
    try {
      const data = await api.incrementCount();
      setCount(data.count || count + 1);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  return { count, loading, error, increment, refetch: fetchCount };
}
