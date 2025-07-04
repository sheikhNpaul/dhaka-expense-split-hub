import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        
        // Get the hash and search parameters
        const hash = location.hash;
        const searchParams = new URLSearchParams(location.search);
        
        console.log('Auth callback - URL params:', {
          hash,
          search: location.search,
          pathname: location.pathname
        });

        // Check if this is an email confirmation
        const isEmailConfirmation = hash.includes('type=signup') || 
                                   searchParams.get('type') === 'signup' ||
                                   hash.includes('access_token');

        if (isEmailConfirmation) {
          // Handle email confirmation
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error);
            setError('Failed to confirm email. Please try again.');
            return;
          }

          if (data.session) {
            setSuccess(true);
            // Redirect to app after a short delay
            setTimeout(() => {
              navigate('/app', { replace: true });
            }, 2000);
          } else {
            setError('Email confirmation failed. Please try again.');
          }
        } else {
          // Handle other auth callbacks (like password reset)
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Auth callback error:', error);
            setError('Authentication failed. Please try again.');
            return;
          }

          if (data.session) {
            setSuccess(true);
            // Redirect to app
            setTimeout(() => {
              navigate('/app', { replace: true });
            }, 1000);
          } else {
            // No session, redirect to sign in
            navigate('/app', { replace: true });
          }
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An error occurred during authentication.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Verifying Email
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Please wait while we confirm your email address...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button 
              onClick={() => navigate('/app')}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-lg hover:shadow-xl"
            >
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              Email Confirmed!
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Your email has been successfully confirmed. Redirecting you to the app...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 