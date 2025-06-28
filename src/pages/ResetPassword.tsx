import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { isValidPassword } from '@/lib/auth';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Password validation states
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    number: false,
    letter: false,
  });

  // Update password validation when password changes
  useEffect(() => {
    setPasswordChecks({
      length: password.length >= 6,
      number: /\d/.test(password),
      letter: /[a-zA-Z]/.test(password),
    });
  }, [password]);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Check if we have recovery parameters in the URL (Supabase sends these in the hash)
        const hash = window.location.hash;
        const hasRecoveryParams = hash.includes('type=recovery') || 
                                 hash.includes('access_token') || 
                                 hash.includes('refresh_token');
        
        // Also check URL search params
        const urlParams = new URLSearchParams(window.location.search);
        const hasSearchParams = urlParams.has('access_token') || urlParams.has('refresh_token');
        
        console.log('Reset password session check:', {
          hasSession: !!session,
          hasRecoveryParams,
          hasSearchParams,
          hash: hash.substring(0, 50) + '...',
          searchParams: window.location.search
        });
        
        if (session || hasRecoveryParams || hasSearchParams) {
          setValidSession(true);
        } else {
          // Listen for auth state changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change:', event, !!session);
            if (event === 'PASSWORD_RECOVERY' || session) {
              setValidSession(true);
            }
          });

          return () => subscription.unsubscribe();
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        throw new Error("Passwords don't match");
      }

      // Validate password strength
      if (!isValidPassword(password)) {
        throw new Error("Password must be at least 6 characters long and contain at least one number and one letter");
      }

      // Update the user's password
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your password has been updated successfully. You can now sign in with your new password.",
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate('/app', { replace: true });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const allChecksPassed = Object.values(passwordChecks).every(check => check);

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Invalid Reset Link
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button 
              onClick={() => navigate('/app')}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-lg hover:shadow-xl"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Reset Password
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10 pr-10"
                  required
                  minLength={6}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Password strength indicators */}
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.length ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                  <span className={passwordChecks.length ? "text-green-600" : "text-red-600"}>
                    At least 6 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.number ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                  <span className={passwordChecks.number ? "text-green-600" : "text-red-600"}>
                    Contains a number
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.letter ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                  <span className={passwordChecks.letter ? "text-green-600" : "text-red-600"}>
                    Contains a letter
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10 pr-10"
                  required
                  minLength={6}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Password match indicator */}
              {confirmPassword && (
                <div className="flex items-center gap-2 text-xs mt-2">
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} className="text-red-500" />
                      <span className="text-red-600">Passwords don't match</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-lg hover:shadow-xl h-11 sm:h-10" 
              disabled={loading || !allChecksPassed || password !== confirmPassword}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 