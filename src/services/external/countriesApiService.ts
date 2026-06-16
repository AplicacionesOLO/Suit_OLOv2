export interface WorldCountry {
  name: string;
  code: string;
  iso_code: string;
  currency: string;
  timezone: string;
  flag: string;
  region: string;
  subregion: string;
}

interface RestCountry {
  name: { common: string };
  cca2: string;
  cca3: string;
  currencies?: Record<string, { name: string; symbol: string }>;
  timezones?: string[];
  flags: { svg: string; png: string };
  region: string;
  subregion: string;
}

let cachedCountries: WorldCountry[] | null = null;
let fetchPromise: Promise<WorldCountry[]> | null = null;

export async function fetchWorldCountries(): Promise<WorldCountry[]> {
  if (cachedCountries) return cachedCountries;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const res = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,currencies,timezones,flags,region,subregion'
    );
    if (!res.ok) throw new Error('Failed to fetch countries');
    const data: RestCountry[] = await res.json();

    cachedCountries = data
      .map((c): WorldCountry => {
        const currencyKey = c.currencies ? Object.keys(c.currencies)[0] : '';
        return {
          name: c.name.common,
          code: c.cca2,
          iso_code: c.cca3,
          currency: currencyKey || 'N/A',
          timezone: c.timezones?.[0] || 'N/A',
          flag: c.flags.svg || c.flags.png,
          region: c.region,
          subregion: c.subregion || '',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return cachedCountries;
  })();

  return fetchPromise;
}

export function searchCountries(query: string, countries: WorldCountry[]): WorldCountry[] {
  if (!query.trim()) return countries.slice(0, 20);
  const q = query.toLowerCase();
  return countries
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.iso_code.toLowerCase().includes(q)
    )
    .slice(0, 15);
}

export interface CountryFormData {
  name: string;
  code: string;
  iso_code: string;
  currency: string;
  timezone: string;
  flag: string;
  region: string;
  subregion: string;
}

export function mapCountryToForm(country: WorldCountry): CountryFormData {
  return {
    name: country.name,
    code: country.code,
    iso_code: country.iso_code,
    currency: country.currency,
    timezone: country.timezone,
    flag: country.flag,
    region: country.region,
    subregion: country.subregion,
  };
}