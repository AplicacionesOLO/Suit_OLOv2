import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchCatalog, searchCatalog, mapCatalogToForm, type CatalogCountry, type CountryFormData } from '@/services/catalog/countryCatalogService';

interface UseWorldCountriesReturn {
  allCountries: CatalogCountry[];
  searchResults: CatalogCountry[];
  selectedCountry: CountryFormData | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectCountry: (country: CatalogCountry) => void;
  clearSelection: () => void;
  retry: () => void;
}

export function useWorldCountries(): UseWorldCountriesReturn {
  const [allCountries, setAllCountries] = useState<CatalogCountry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalog();
      setAllCountries(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el catalogo de paises');
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
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim() && allCountries.length > 0) {
      return allCountries.slice(0, 20);
    }
    return searchCatalog(debouncedQuery, allCountries);
  }, [debouncedQuery, allCountries]);

  const selectCountry = useCallback((country: CatalogCountry) => {
    setSelectedCountry(mapCatalogToForm(country));
    setSearchQuery(country.name);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCountry(null);
    setSearchQuery('');
  }, []);

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