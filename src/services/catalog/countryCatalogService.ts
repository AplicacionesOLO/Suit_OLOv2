import { supabase } from '@/services/supabase/client';

export interface CatalogCountry {
  id: string;
  name: string;
  official_name: string | null;
  iso2: string;
  iso3: string;
  currency_code: string | null;
  currency_name: string | null;
  phone_prefix: string | null;
  timezone: string | null;
  continent: string | null;
  language: string | null;
  flag_url: string | null;
  is_active: boolean;
}

export interface CountryFormData {
  name: string;
  code: string;
  iso_code: string;
  currency: string;
  currency_name: string;
  timezone: string;
  flag: string;
  continent: string;
  language: string;
  phone_prefix: string;
}

let cachedCatalog: CatalogCountry[] | null = null;
let fetchPromise: Promise<CatalogCountry[]> | null = null;

export async function fetchCatalog(): Promise<CatalogCountry[]> {
  if (cachedCatalog) return cachedCatalog;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const { data, error } = await supabase
      .from('country_catalog')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw new Error(error.message);
    cachedCatalog = (data || []) as CatalogCountry[];
    return cachedCatalog;
  })();

  return fetchPromise;
}

export function searchCatalog(query: string, catalog: CatalogCountry[]): CatalogCountry[] {
  if (!query.trim()) return catalog.slice(0, 20);
  const q = query.toLowerCase();
  return catalog
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso2.toLowerCase().includes(q) ||
        c.iso3.toLowerCase().includes(q)
    )
    .slice(0, 15);
}

export function mapCatalogToForm(country: CatalogCountry): CountryFormData {
  return {
    name: country.name,
    code: country.iso2,
    iso_code: country.iso3,
    currency: country.currency_code || 'N/A',
    currency_name: country.currency_name || 'N/A',
    timezone: country.timezone || 'N/A',
    flag: country.flag_url || '',
    continent: country.continent || 'N/A',
    language: country.language || 'N/A',
    phone_prefix: country.phone_prefix || 'N/A',
  };
}

export function clearCache(): void {
  cachedCatalog = null;
  fetchPromise = null;
}