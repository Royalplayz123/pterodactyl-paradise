import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Server, ArrowLeft, Mail } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { branding } = useBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use custom SMTP password reset
      const { data, error } = await supabase.functions.invoke('password-reset', {
        body: {
          action: 'request_reset',
          email,
          site_url: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSent(true);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
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
          <p className="text-muted-foreground">Reset your password</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-8 card-shadow">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
              <p className="text-muted-foreground text-sm">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <Link to="/auth">
                <Button variant="outline" className="w-full mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="submit" className="w-full" variant="glow" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <Link to="/auth" className="block text-center text-sm text-primary hover:underline">
                <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
