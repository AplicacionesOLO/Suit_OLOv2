// Detecta errores de "sesión expirada" o "token de refresco inválido".
// Supabase puede devolver estos mensajes en inglés o en español (según el
// idioma del navegador), y a veces solo expone un código de error. Por eso
// comparamos varios marcadores y también el código.

const EXPIRED_MARKERS = [
  // Mensajes en inglés
  'session expired',
  'refresh token not found',
  'invalid refresh token',
  'auth session missing',
  'authsessionmissingerror',
  'token expired',
  'jwt expired',
  'token has expired',
  // Mensajes en español
  'sesión expirada',
  'sesion expirada',
  'expirada',
  'expirado',
  // Códigos de error
  'session_not_found',
  'refresh_token_not_found',
  'session_expired',
  'invalid_grant',
  'invalid_token',
  'auth_session_missing',
];

export function isSessionExpiredMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return EXPIRED_MARKERS.some((marker) => lower.includes(marker));
}

export function isSessionExpiredError(error: unknown): boolean {
  if (!error) return false;

  const code = (error as { code?: string | number | null }).code;
  if (code !== undefined && code !== null && isSessionExpiredMessage(String(code))) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return isSessionExpiredMessage(message);
}