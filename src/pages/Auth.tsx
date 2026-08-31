import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/providers/ToastProvider';
import { supabase } from '@/lib/supabase';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          showToast({
            title: 'Registration Failed',
            message: signUpError.message,
            type: 'danger',
          });
          return;
        }

        if (data.session) {
          showToast({
            title: 'Account Created',
            message: 'Welcome to SkipLogic! Setting up your workspace.',
            type: 'success',
          });
          navigate('/app/setup');
        } else {
          showToast({
            title: 'Account Created',
            message: 'Account created! You can now sign in or verify your email if required.',
            type: 'success',
          });
          setIsSignUp(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(signInError.message);
          showToast({
            title: 'Sign In Failed',
            message: signInError.message,
            type: 'danger',
          });
          return;
        }

        showToast({
          title: 'Welcome Back',
          message: 'Signed in successfully.',
          type: 'success',
        });
        navigate('/app');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (oauthError) {
        showToast({
          title: 'OAuth Error',
          message: oauthError.message,
          type: 'danger',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'OAuth Error',
        message: err?.message || 'Failed to initiate Google sign in.',
        type: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-background relative">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="font-mono font-black text-3xl tracking-tight bg-gradient-to-r from-brand to-indigo-400 bg-clip-text text-transparent">
              SkipLogic
            </span>
          </Link>
          <p className="text-sm text-text-secondary mt-2">
            {isSignUp ? 'Create your attendance tracking space' : "Don't guess. Know whether you can bunk."}
          </p>
        </div>

        {/* Card containing credentials entry */}
        <Card className="border border-border shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs text-danger font-medium animate-in fade-in">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full h-10 cursor-pointer" isLoading={isLoading}>
              {isSignUp ? 'Register Account' : 'Sign In'}
            </Button>

            {/* Separator line */}
            <div className="flex items-center gap-3 my-4">
              <div className="h-[1px] bg-border flex-1" />
              <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">or</span>
              <div className="h-[1px] bg-border flex-1" />
            </div>

            {/* Social Oauth Button */}
            <Button
              type="button"
              variant="secondary"
              className="w-full h-10 flex items-center justify-center gap-2 cursor-pointer"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {/* Google SVG Icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          {/* Form switcher footer */}
          <div className="text-center mt-6 text-xs text-text-secondary">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-brand hover:underline font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                New to SkipLogic?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-brand hover:underline font-semibold cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
