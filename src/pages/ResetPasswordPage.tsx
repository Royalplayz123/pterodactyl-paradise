import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Server, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { branding } = useBranding();

  const token = searchParams.get('token');

  useEffect(() => {
    const validateToken = async () => {
      // Check for custom token first
      if (token) {
        try {
          const { data, error } = await supabase.functions.invoke('password-reset', {
            body: { action: 'verify_token', token },
          });
          
          if (error || !data?.valid) {
            toast.error('Invalid or expired reset link');
            navigate('/forgot-password');
            return;
          }
          
          setTokenValid(true);
        } catch (err) {
          toast.error('Failed to validate reset link');
          navigate('/forgot-password');
        } finally {
          setValidating(false);
        }
        return;
      }

      // Check for Supabase recovery token in hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery') {
        setTokenValid(true);
        setValidating(false);
        return;
      }

      // No valid token found
      toast.error('Invalid or expired reset link');
      navigate('/forgot-password');
    };

    validateToken();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      if (token) {
        // Use custom token reset
        const { data, error } = await supabase.functions.invoke('password-reset', {
          body: {
            action: 'reset_password',
            token,
            new_password: password,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        // Use Supabase auth (for recovery links)
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }

      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/auth'), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const backgroundStyle = branding.backgroundImageUrl
    ? { backgroundImage: `url(${branding.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : branding.backgroundColor
    ? { backgroundColor: branding.backgroundColor }
    : {};

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" style={backgroundStyle}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating reset link...</p>
        </div>
      </div>
    );
  }

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
          <p className="text-muted-foreground">Set your new password</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-8 card-shadow">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Password Updated!</h2>
              <p className="text-muted-foreground text-sm">Redirecting to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-secondary border-border focus:border-primary"
                />
              </div>
              <Button type="submit" className="w-full" variant="glow" disabled={loading}>
                <Lock className="w-4 h-4 mr-2" />
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
