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
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center glow-primary mx-auto">
            <span className="text-primary-400 font-bold text-xs tracking-tighter">OLO</span>
          </div>
          <p className="text-sm text-foreground-500 animate-pulse">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}