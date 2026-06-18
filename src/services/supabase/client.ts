import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: async (input, init) => {
          const response = await fetch(input, init);

          if (!response.ok && response.status === 400) {
            try {
              const cloned = response.clone();
              const body = await cloned.json();
              const errorMessage: string = body?.error_description || body?.message || body?.error || '';

              const isRefreshTokenError =
                errorMessage.includes('Refresh Token Not Found') ||
                errorMessage.includes('Invalid Refresh Token') ||
                errorMessage.includes('refresh_token') ||
                errorMessage.includes('Refresh Token');

              if (isRefreshTokenError) {
                console.warn('[Suite OLO] Refresh token inválido — cerrando sesión automáticamente');

                setTimeout(async () => {
                  try {
                    await supabaseInstance?.auth.signOut({ scope: 'local' });
                  } catch {
                    // Silencioso, ya no hay sesión que limpiar
                  }
                }, 0);

                return new Response(JSON.stringify({ error: 'session_expired', error_description: 'Sesión expirada' }), {
                  status: 401,
                  headers: { 'Content-Type': 'application/json' },
                });
              }
            } catch {
              // No se pudo parsear el body, continuar normalmente
            }
          }

          return response;
        },
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();