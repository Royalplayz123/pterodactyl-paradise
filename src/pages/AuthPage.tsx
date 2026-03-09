import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Server, Chrome, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { sendNotification } from '@/lib/notifications';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branding } = useBranding();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const syncWithPanel = async () => {
    try {
      await supabase.functions.invoke('pterodactyl-api', {
        body: { action: 'sync_admin_status' },
      });
    } catch (err) {
      console.warn('Panel sync failed:', err);
    }
  };

  const registerOnPanel = async (userEmail: string, userPassword: string, userUsername: string) => {
    try {
      await supabase.functions.invoke('pterodactyl-api', {
        body: {
          action: 'register_panel_user',
          email: userEmail,
          username: userUsername,
          password: userPassword,
        },
      });
    } catch (err) {
      console.warn('Panel registration failed:', err);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin) {
      if (!username.trim()) {
        toast.error('Please enter a username');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await syncWithPanel();
        // Send login notification
        sendNotification({
          type: 'login',
          email,
          data: { username: authData.user?.user_metadata?.username || email.split('@')[0] }
        });
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            emailRedirectTo: window.location.origin,
            data: { username }
          },
        });
        if (error) throw error;
        if (data.session) {
          await registerOnPanel(email, password, username);
          await syncWithPanel();
          // Send welcome notification
          sendNotification({
            type: 'new_user',
            email,
            data: { username, email }
          });
          navigate('/dashboard');
        } else {
          toast.success('Check your email for the confirmation link!');
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result?.redirected) return;
      if (result?.error) {
        toast.error(result.error.message || 'Google login failed');
        return;
      }
      await syncWithPanel();
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('discord-auth', {
        body: {
          frontend_redirect: window.location.origin + '/dashboard',
          redirect_uri: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discord-auth/callback`
        }
      });
      
      if (response.error) {
        toast.error(response.error.message || 'Discord login failed');
        return;
      }
      
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Discord login failed');
    } finally {
      setLoading(false);
    }
  };

  const backgroundStyle = branding.backgroundImageUrl
    ? { backgroundImage: `url(${branding.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : branding.backgroundColor
    ? { backgroundColor: branding.backgroundColor }
    : {};

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={backgroundStyle}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center glow-effect">
                <Server className="w-6 h-6 text-primary" />
              </div>
            )}
            <h1 className="text-3xl font-bold gradient-text">{branding.dashboardName}</h1>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? 'Welcome back! Sign in to your account.' : 'Create a new account to get started.'}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-8 card-shadow">
          <div className="space-y-3 mb-6">
            <Button
              variant="social"
              className="w-full h-11 gap-3"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <Chrome className="w-5 h-5" />
              Continue with Google
            </Button>
            <Button
              variant="social"
              className="w-full h-11 gap-3"
              onClick={handleDiscordLogin}
              disabled={loading}
            >
              <MessageCircle className="w-5 h-5" />
              Continue with Discord
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                  className="bg-secondary border-border focus:border-primary"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary border-border focus:border-primary"
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!isLogin}
                  minLength={6}
                  className="bg-secondary border-border focus:border-primary"
                />
              </div>
            )}
            {isLogin && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
            <Button type="submit" className="w-full" variant="glow" disabled={loading}>
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
