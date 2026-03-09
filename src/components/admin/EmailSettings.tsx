import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Server, Save, Loader2, CheckCircle2, AlertCircle, UserPlus, LogIn, ServerCog, ShoppingCart, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAppSetting, useUpdateAppSetting } from '@/hooks/useAppSettings';

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

interface NotificationSettings {
  enabled: boolean;
  new_user: boolean;
  login: boolean;
  server_create: boolean;
  server_delete: boolean;
  shop_purchase: boolean;
  coupon_claim: boolean;
}

const defaultSmtpConfig: SmtpConfig = {
  host: '',
  port: 587,
  username: '',
  password: '',
  from_email: '',
  from_name: '',
};

const defaultNotificationSettings: NotificationSettings = {
  enabled: false,
  new_user: true,
  login: true,
  server_create: true,
  server_delete: true,
  shop_purchase: true,
  coupon_claim: true,
};

const EmailSettings = () => {
  const { data: smtpData, isLoading: smtpLoading } = useAppSetting('smtp_config');
  const { data: notifData, isLoading: notifLoading } = useAppSetting('notification_settings');
  const updateSetting = useUpdateAppSetting();

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(defaultSmtpConfig);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (smtpData) setSmtpConfig({ ...defaultSmtpConfig, ...smtpData });
  }, [smtpData]);

  useEffect(() => {
    if (notifData) setNotifSettings({ ...defaultNotificationSettings, ...notifData });
  }, [notifData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'smtp_config', value: smtpConfig });
      await updateSetting.mutateAsync({ key: 'notification_settings', value: notifSettings });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
      toast.error('Please fill in SMTP configuration first');
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'test_smtp',
          smtp_config: smtpConfig,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Test email sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'SMTP test failed');
    } finally {
      setTesting(false);
    }
  };

  if (smtpLoading || notifLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Email Notifications</CardTitle>
                <CardDescription>Send email notifications for user actions</CardDescription>
              </div>
            </div>
            <Switch
              checked={notifSettings.enabled}
              onCheckedChange={(enabled) => setNotifSettings({ ...notifSettings, enabled })}
            />
          </div>
        </CardHeader>
      </Card>

      {/* SMTP Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Server className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">SMTP Configuration</CardTitle>
              <CardDescription>Configure your email server settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                placeholder="smtp.example.com"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                placeholder="587"
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                placeholder="your@email.com"
                value={smtpConfig.username}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={smtpConfig.password}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                placeholder="noreply@example.com"
                value={smtpConfig.from_email}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                placeholder="My App"
                value={smtpConfig.from_name}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, from_name: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleTestSmtp}
            disabled={testing || !smtpConfig.host}
            className="mt-2"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Test SMTP Connection
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Events */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Notification Events</CardTitle>
          <CardDescription>Choose which events trigger email notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">New User Registration</p>
                  <p className="text-sm text-muted-foreground">Send welcome email on signup</p>
                </div>
              </div>
              <Switch
                checked={notifSettings.new_user}
                onCheckedChange={(new_user) => setNotifSettings({ ...notifSettings, new_user })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div className="flex items-center gap-3">
                <LogIn className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">User Login</p>
                  <p className="text-sm text-muted-foreground">Notify on each login</p>
                </div>
              </div>
              <Switch
                checked={notifSettings.login}
                onCheckedChange={(login) => setNotifSettings({ ...notifSettings, login })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div className="flex items-center gap-3">
                <ServerCog className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium text-foreground">Server Create</p>
                  <p className="text-sm text-muted-foreground">Notify when a server is created</p>
                </div>
              </div>
              <Switch
                checked={notifSettings.server_create}
                onCheckedChange={(server_create) => setNotifSettings({ ...notifSettings, server_create })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-foreground">Server Delete</p>
                  <p className="text-sm text-muted-foreground">Notify when a server is deleted</p>
                </div>
              </div>
              <Switch
                checked={notifSettings.server_delete}
                onCheckedChange={(server_delete) => setNotifSettings({ ...notifSettings, server_delete })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-foreground">Shop Purchase</p>
                  <p className="text-sm text-muted-foreground">Notify on purchases</p>
                </div>
              </div>
              <Switch
                checked={notifSettings.shop_purchase}
                onCheckedChange={(shop_purchase) => setNotifSettings({ ...notifSettings, shop_purchase })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-foreground">Coupon Claim</p>
                  <p className="text-sm text-muted-foreground">Notify when coupons are claimed</p>
                </div>
              </div>
              <Switch
                checked={notifSettings.coupon_claim}
                onCheckedChange={(coupon_claim) => setNotifSettings({ ...notifSettings, coupon_claim })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} variant="glow" disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Email Settings
          </>
        )}
      </Button>
    </div>
  );
};

export default EmailSettings;