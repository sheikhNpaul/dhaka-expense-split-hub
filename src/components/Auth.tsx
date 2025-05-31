
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ForgotPassword } from './ForgotPassword';

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              username: username,
            },
          },
        });
        if (error) throw error;
        toast({
          title: "Success!",
          description: "Check your email for the confirmation link.",
        });
      } else {
        // Try to sign in with email first
        let signInError = null;
        
        const { error: emailError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        signInError = emailError;
        
        // If email signin fails and the input doesn't contain @, try username
        if (emailError && !email.includes('@')) {
          // Find user by username in profiles table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', email)
            .maybeSingle();
          
          if (!profileError && profile?.email) {
            const { error: usernameError } = await supabase.auth.signInWithPassword({
              email: profile.email,
              password,
            });
            signInError = usernameError;
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Sign Up' : 'Sign In'}</CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Create an account to start tracking expenses with your roommates'
              : 'Sign in to your expense tracker account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">
                {isSignUp ? 'Email' : 'Email or Username'}
              </Label>
              <Input
                id="email"
                type={isSignUp ? "email" : "text"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isSignUp ? "Enter your email" : "Enter your email or username"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          
          {!isSignUp && (
            <div className="mt-4 text-center">
              <ForgotPassword />
            </div>
          )}
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:underline"
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
