import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ForgotPassword } from './ForgotPassword';
import { isValidEmail, isValidPassword } from '@/lib/auth';
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react';

interface AuthProps {
  initialMode?: 'signup' | 'signin' | null;
}

export const Auth = ({ initialMode }: AuthProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialMode === 'signup') {
      setIsSignUp(true);
    } else if (initialMode === 'signin') {
      setIsSignUp(false);
    }
  }, [initialMode]);

  // Check username availability
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      
      // If no data found, username is available
      setUsernameAvailable(!data);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  // Debounced username check
  useEffect(() => {
    if (!isSignUp) return;
    
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, isSignUp]);

  // Reset username availability when switching modes
  const handleModeToggle = () => {
    setIsSignUp(!isSignUp);
    setUsernameAvailable(null);
    setUsernameChecking(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate email format
        if (!isValidEmail(email)) {
          throw new Error('Please enter a valid email address.');
        }

        // Validate password strength
        if (!isValidPassword(password)) {
          throw new Error('Password must be at least 6 characters long.');
        }

        // Check if username is available
        if (usernameAvailable === false) {
          throw new Error('Username is already taken. Please choose a different one.');
        }

        // Check if email already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing user:', checkError);
        }

        if (existingUser) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        // Create user account
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              username: username.toLowerCase(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          // Handle specific Supabase errors
          if (signUpError.message?.includes('already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
          throw signUpError;
        }

        // Check if signup was successful
        if (data.user) {
          toast({
            title: "Success!",
            description: "Check your email for the confirmation link.",
          });
        } else {
          throw new Error('Signup failed. Please try again.');
        }
      } else {
        // Sign in logic with better error handling
        let signInError = null;
        
        try {
          if (email.includes('@')) {
            // Try email sign in
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            signInError = error;
          } else {
            // Try username sign in
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', email)
              .maybeSingle();
            
            if (!profileError && profileData?.email) {
              const { error } = await supabase.auth.signInWithPassword({
                email: profileData.email,
                password,
              });
              signInError = error;
            } else {
              signInError = new Error('Invalid username or password');
            }
          }
        } catch (captchaError: any) {
          // Handle CAPTCHA-specific errors
          if (captchaError.message?.includes('captcha') || captchaError.message?.includes('verification')) {
            signInError = new Error('Please try again in a few moments. If the problem persists, try refreshing the page or using a different browser.');
          } else {
            signInError = captchaError;
          }
        }
        
        if (signInError) {
          // Provide more helpful error messages
          let errorMessage = signInError.message;
          if (signInError.message?.includes('captcha') || signInError.message?.includes('verification')) {
            errorMessage = 'Sign-in temporarily blocked. Please wait a moment and try again, or refresh the page.';
          } else if (signInError.message?.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email/username or password. Please check your credentials and try again.';
          }
          throw new Error(errorMessage);
        }
        
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-3 sm:px-4 py-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {isSignUp 
              ? 'Join your roommates and start tracking expenses together'
              : 'Sign in to your expense tracker account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
                  required
                />
              </div>
            )}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a unique username"
                    className={`transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10 pr-10 ${
                      usernameAvailable === true ? 'border-green-500 focus:ring-green-500/20' :
                      usernameAvailable === false ? 'border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : usernameAvailable === true ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
                {username && username.length >= 3 && (
                  <p className={`text-xs ${
                    usernameAvailable === true ? 'text-green-600' :
                    usernameAvailable === false ? 'text-red-600' :
                    'text-muted-foreground'
                  }`}>
                    {usernameChecking ? 'Checking availability...' :
                     usernameAvailable === true ? 'Username is available!' :
                     usernameAvailable === false ? 'Username is already taken' :
                     'Enter at least 3 characters'}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {isSignUp ? 'Email Address' : 'Email or Username'}
              </Label>
              <Input
                id="email"
                type={isSignUp ? "email" : "text"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isSignUp ? "Enter your email" : "Enter your email or username"}
                className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-lg hover:shadow-xl h-11 sm:h-10" 
              disabled={loading || (isSignUp && usernameAvailable === false)}
            >
              {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>
          
          {!isSignUp && (
            <div className="mt-6 text-center">
              <ForgotPassword />
            </div>
          )}
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleModeToggle}
              className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline py-2"
            >
              {isSignUp 
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-primary transition-colors p-2"
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
