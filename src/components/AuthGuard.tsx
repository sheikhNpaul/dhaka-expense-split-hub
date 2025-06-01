import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard = ({ children, requireAuth = true }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      // Check if we're on the reset-password page
      const isResetPasswordPage = location.pathname === '/reset-password';
      
      // If we're on reset-password page and user is authenticated, allow access
      if (isResetPasswordPage) {
        return;
      }

      // For other routes, handle normal auth flow
      if (requireAuth && !user) {
        navigate('/');
      } else if (!requireAuth && user && location.pathname === '/') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate, location.pathname, requireAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}; 