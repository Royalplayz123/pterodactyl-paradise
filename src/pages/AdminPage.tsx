import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key, Settings, Users, Ticket, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const AdminPage = () => {
  const [panelUrl, setPanelUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponCoins, setCouponCoins] = useState('');
  const [couponUses, setCouponUses] = useState('');

  const handleSaveConfig = () => {
    if (!panelUrl || !apiKey) {
      toast.error('Please fill in all fields');
      return;
    }
    toast.info('API configuration will be saved as secure secrets. This feature requires edge function setup.');
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponCoins) {
      toast.error('Please fill in all fields');
      return;
    }
    toast.info('Coupon creation requires database setup.');
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">Configure your Pterodactyl panel and manage resources.</p>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="config" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Key className="w-4 h-4 mr-2" />
            API Config
          </TabsTrigger>
          <TabsTrigger value="coupons" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Ticket className="w-4 h-4 mr-2" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <div className="bg-card rounded-xl border border-border p-6 card-shadow max-w-xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Pterodactyl API Configuration</h2>
            </div>
            <div className="space-y-2">
              <Label>Panel URL</Label>
              <Input
                placeholder="https://panel.example.com"
                value={panelUrl}
                onChange={(e) => setPanelUrl(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Admin API Key</Label>
              <Input
                type="password"
                placeholder="ptla_xxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-secondary border-border font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from Pterodactyl Panel → Application API
              </p>
            </div>
            <Button variant="glow" onClick={handleSaveConfig}>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="coupons">
          <div className="bg-card rounded-xl border border-border p-6 card-shadow max-w-xl space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Create Coupon</h2>
            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <Input
                  placeholder="WELCOME2024"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coins Reward</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={couponCoins}
                    onChange={(e) => setCouponCoins(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={couponUses}
                    onChange={(e) => setCouponUses(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <Button type="submit" variant="glow">
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="bg-card rounded-xl border border-border p-8 card-shadow text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">User Management</h3>
            <p className="text-muted-foreground">
              View and manage users. Admin access is synced from your Pterodactyl panel.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="bg-card rounded-xl border border-border p-6 card-shadow max-w-xl space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Default Resources</h2>
            <p className="text-sm text-muted-foreground">Configure default resources for new users.</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>RAM (MB)</Label>
                <Input type="number" placeholder="1024" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>CPU (%)</Label>
                <Input type="number" placeholder="100" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Disk (MB)</Label>
                <Input type="number" placeholder="5120" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Server Slots</Label>
                <Input type="number" placeholder="1" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Starting Coins</Label>
                <Input type="number" placeholder="100" className="bg-secondary border-border" />
              </div>
            </div>
            <Button variant="glow">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
