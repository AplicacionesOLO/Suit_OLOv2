import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';

type Theme = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'olo-theme-preference';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyThemeToDOM(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { platformUser } = useAuth();

  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch { /* ignore */ }
    return 'system';
  });

  const resolvedTheme: ResolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  // Apply to DOM whenever resolved theme changes
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for OS-level preference changes when mode is "system"
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      applyThemeToDOM(getSystemTheme());
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Once platformUser is available, sync from DB (takes precedence over localStorage)
  const [dbSynced, setDbSynced] = useState(false);
  useEffect(() => {
    if (!platformUser?.id || dbSynced) return;

    let cancelled = false;
    const syncFromDB = async () => {
      try {
        const { data } = await supabase
          .from('platform_users')
          .select('preferences')
          .eq('id', platformUser.id)
          .maybeSingle();

        if (cancelled) return;

        if (data?.preferences && typeof data.preferences === 'object') {
          const prefs = data.preferences as Record<string, unknown>;
          const dbTheme = prefs.theme_preference;
          if (dbTheme === 'light' || dbTheme === 'dark' || dbTheme === 'system') {
            try { localStorage.setItem(STORAGE_KEY, dbTheme); } catch { /* ignore */ }
            setThemeState(dbTheme);
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setDbSynced(true);
    };

    syncFromDB();
    return () => { cancelled = true; };
  }, [platformUser?.id, dbSynced]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    try { localStorage.setItem(STORAGE_KEY, newTheme); } catch { /* ignore */ }

    if (platformUser?.id) {
      try {
        const { data: current } = await supabase
          .from('platform_users')
          .select('preferences')
          .eq('id', platformUser.id)
          .maybeSingle();

        const existing = (current?.preferences as Record<string, unknown>) || {};
        const updated = { ...existing, theme_preference: newTheme };

        await supabase
          .from('platform_users')
          .update({ preferences: updated })
          .eq('id', platformUser.id);
      } catch { /* ignore */ }
    }
  }, [platformUser?.id]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}