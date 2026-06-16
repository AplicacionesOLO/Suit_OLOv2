import { useState, useEffect, useCallback } from 'react';
import {
  fetchCountries,
  createCountry,
  updateCountry,
  toggleCountryStatus,
  fetchTenants,
  type CountryWithCounts,
} from '@/services/operations/countriesService';

interface UseCountriesReturn {
  countries: CountryWithCounts[];
  tenants: { id: string; name: string }[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  addCountry: (data: { name: string; code: string; iso_code: string; tenant_id: string; currency?: string; currency_name?: string; timezone?: string; language?: string; phone_prefix?: string; continent?: string; flag_url?: string }) => Promise<{ error: string | null }>;
  editCountry: (id: string, data: { name?: string; code?: string; iso_code?: string; tenant_id?: string; currency?: string; currency_name?: string; timezone?: string; language?: string; phone_prefix?: string; continent?: string; flag_url?: string }) => Promise<{ error: string | null }>;
  toggleStatus: (id: string, currentStatus: string) => Promise<{ error: string | null }>;
}

export function useCountries(): UseCountriesReturn {
  const [countries, setCountries] = useState<CountryWithCounts[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [cResult, tResult] = await Promise.all([fetchCountries(), fetchTenants()]);
      if (cResult.error) setError(cResult.error);
      setCountries(cResult.data);
      if (!tResult.error) setTenants(tResult.data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addCountry = useCallback(async (data: { name: string; code: string; iso_code: string; tenant_id: string; currency?: string; currency_name?: string; timezone?: string; language?: string; phone_prefix?: string; continent?: string; flag_url?: string }) => {
    const result = await createCountry(data);
    if (!result.error) await load();
    return result;
  }, [load]);

  const editCountry = useCallback(async (id: string, data: { name?: string; code?: string; iso_code?: string; tenant_id?: string; currency?: string; currency_name?: string; timezone?: string; language?: string; phone_prefix?: string; continent?: string; flag_url?: string }) => {
    const result = await updateCountry(id, data);
    if (!result.error) await load();
    return result;
  }, [load]);

  const toggleStatus = useCallback(async (id: string, currentStatus: string) => {
    const result = await toggleCountryStatus(id, currentStatus);
    if (!result.error) await load();
    return result;
  }, [load]);

  return { countries, tenants, loading, error, refresh: load, addCountry, editCountry, toggleStatus };
}