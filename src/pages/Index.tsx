import { useAuth } from '@/hooks/useAuth';
import { Auth } from '@/components/Auth';
import { Dashboard } from '@/components/Dashboard';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If no tab is set in URL and user is logged in, default to expenses tab
    if (user && !location.search.includes('tab=')) {
      const params = new URLSearchParams(location.search);
      params.set('tab', 'expenses');
      navigate(`/?${params.toString()}`, { replace: true });
    }
  }, [user, location.search, navigate]);

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

  return user ? <Dashboard /> : <Auth />;
};

export default Index;
