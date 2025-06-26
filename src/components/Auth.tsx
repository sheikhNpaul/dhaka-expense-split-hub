import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ForgotPassword } from './ForgotPassword';
import { isEmailInUse, isValidEmail, isValidPassword } from '@/lib/auth';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const { toast } = useToast();

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

        // Check if email is already in use
        const emailExists = await isEmailInUse(email);
        if (emailExists) {
          throw new Error('This email is already registered. Please use a different email or sign in.');
        }

        // Create user profile
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              username: username,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: (await supabase.auth.getUser()).data.user?.id,
              name: name,
              username: username,
              email: email,
            },
          ]);

        if (profileError) throw profileError;

        toast({
          title: "Success!",
          description: "Check your email for the confirmation link.",
        });
      } else {
        // Sign in logic
        let signInError = null;
        
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
        
        if (signInError) throw signInError;
        
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
                  required
                />
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
              disabled={loading}
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
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline py-2"
            >
              {isSignUp 
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
