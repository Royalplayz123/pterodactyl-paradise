import { useState, useEffect } from 'react';
import { User, Mail, Key, Hash, Loader2, MessageCircle, CheckCircle, Link, Unlink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

const AccountPage = () => {
  const { user } = useAuth();
  const { data: profile, refetch } = useProfile();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const [disconnectingDiscord, setDisconnectingDiscord] = useState(false);

  // Handle Discord link callback
  useEffect(() => {
    const discordLinked = searchParams.get('discord_linked');
    const discordError = searchParams.get('discord_error');
    
    if (discordLinked === 'true') {
      toast.success('Discord account connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refetch();
      // Clear params
      searchParams.delete('discord_linked');
      setSearchParams(searchParams, { replace: true });
    } else if (discordError) {
      toast.error(`Discord connection failed: ${discordError}`);
      searchParams.delete('discord_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient, refetch]);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setResetting(false);
    }
  };

  const handleConnectDiscord = async () => {
    setLinkingDiscord(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Please log in first');
        return;
      }

      const response = await supabase.functions.invoke('discord-link', {
        body: {
          frontend_redirect: window.location.origin + '/dashboard/account'
        }
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to initiate Discord connection');
        return;
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect Discord');
    } finally {
      setLinkingDiscord(false);
    }
  };

  const handleDisconnectDiscord = async () => {
    setDisconnectingDiscord(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          discord_id: null,
          discord_username: null
        })
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('Discord account disconnected successfully');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect Discord');
    } finally {
      setDisconnectingDiscord(false);
    }
  };

  const isDiscordConnected = !!profile?.discord_id;

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="text-muted-foreground">Manage your account details</p>
      </div>

      {/* Discord Connection */}
      <Card className={isDiscordConnected ? 'border-green-500/50' : 'border-[#5865F2]/50'}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className={`w-5 h-5 ${isDiscordConnected ? 'text-green-500' : 'text-[#5865F2]'}`} />
            Discord Connection
            {isDiscordConnected && <CheckCircle className="w-4 h-4 text-green-500" />}
          </CardTitle>
          <CardDescription>
            {isDiscordConnected 
              ? 'Your Discord account is connected' 
              : 'Connect your Discord account to create servers'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDiscordConnected ? (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary border border-border">
              <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#5865F2]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{profile?.discord_username || 'Discord User'}</p>
                <p className="text-sm text-muted-foreground">ID: {profile?.discord_id}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Why connect Discord?</p>
                <ul className="space-y-1">
                  <li>• Required to create game servers</li>
                  <li>• Automatically join our community server</li>
                  <li>• Get support and announcements</li>
                </ul>
              </div>
              <Button 
                onClick={handleConnectDiscord} 
                disabled={linkingDiscord}
                className="w-full gap-2 bg-[#5865F2] hover:bg-[#4752C4]"
              >
                {linkingDiscord ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                {linkingDiscord ? 'Connecting...' : 'Connect Discord Account'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Username
              </Label>
              <div className="bg-secondary rounded-lg px-3 py-2.5 text-sm font-medium text-foreground border border-border">
                {profile?.username ?? '—'}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <div className="bg-secondary rounded-lg px-3 py-2.5 text-sm font-medium text-foreground border border-border">
                {profile?.email ?? user?.email ?? '—'}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-muted-foreground flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Pterodactyl ID
              </Label>
              <div className="bg-secondary rounded-lg px-3 py-2.5 text-sm font-medium text-foreground border border-border">
                {profile?.pterodactyl_id ?? 'Not linked'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-warning" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleResetPassword} disabled={resetting} variant="glow">
            {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;
