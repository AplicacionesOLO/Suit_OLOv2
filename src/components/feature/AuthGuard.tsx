import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/auth/callback'];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, platformUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.includes(location.pathname);

    if (!isAuthenticated && !isPublic) {
      navigate('/login', { replace: true });
    }

    if (isAuthenticated && isPublic) {
      const roleLevel = platformUser?.role_level ?? 0;
      navigate(roleLevel >= 50 ? '/dashboard' : '/my-access', { replace: true });
    }

    setChecked(true);
  }, [isAuthenticated, loading, location.pathname, platformUser?.role_level, navigate]);

  if (loading || !checked) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <img
            src="https://storage.helloreaddy.io/project_files/437d9be5-f316-4ce4-bdea-9d5839ae0518/c45bb62f-53ee-47ef-b37c-7d43f30597f2_compressed_logo_transparente.webp"
            alt="OLO Logo"
            className="w-10 h-10 object-contain mx-auto"
          />
          <p className="text-sm text-foreground-500 animate-pulse">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}