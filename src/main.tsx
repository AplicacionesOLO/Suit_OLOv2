import { StrictMode } from 'react'
import './i18n'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from '@/services/supabase/client'
import { isSessionExpiredError } from '@/utils/sessionErrors'

// Si una promesa falla con "sesión expirada" sin ser atrapada (por ejemplo una
// llamada a getUser() dentro de un servicio), cerramos la sesión local para que
// la app redirija al login en lugar de quedarse en un estado roto.
window.addEventListener('unhandledrejection', (event) => {
  if (isSessionExpiredError(event.reason)) {
    event.preventDefault();
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
