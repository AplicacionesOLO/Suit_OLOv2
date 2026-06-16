import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWorldCountries, searchCountries, mapCountryToForm, type WorldCountry, type CountryFormData } from '@/services/external/countriesApiService';

interface UseWorldCountriesReturn {
  allCountries: WorldCountry[];
  searchResults: WorldCountry[];
  selectedCountry: CountryFormData | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectCountry: (country: WorldCountry) => void;
  clearSelection: () => void;
  retry: () => void;
}

export function useWorldCountries(): UseWorldCountriesReturn {
  const [allCountries, setAllCountries] = useState<WorldCountry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorldCountries();
      setAllCountries(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar paises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim() && allCountries.length > 0) {
        const results = searchCountries(searchQuery, allCountries);
        setSearchResultsState(results);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, allCountries]);

  const [searchResults, setSearchResultsState] = useState<WorldCountry[]>([]);

  useEffect(() => {
    if (!searchQuery.trim() && allCountries.length > 0) {
      setSearchResultsState(allCountries.slice(0, 20));
    }
  }, [searchQuery, allCountries]);

  const selectCountry = useCallback((country: WorldCountry) => {
    setSelectedCountry(mapCountryToForm(country));
    setSearchQuery(country.name);
    setSearchResultsState([]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCountry(null);
    setSearchQuery('');
    if (allCountries.length > 0) {
      setSearchResultsState(allCountries.slice(0, 20));
    }
  }, [allCountries]);

  const retry = useCallback(() => {
    load();
  }, [load]);

  return {
    allCountries,
    searchResults,
    selectedCountry,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectCountry,
    clearSelection,
    retry,
  };
}