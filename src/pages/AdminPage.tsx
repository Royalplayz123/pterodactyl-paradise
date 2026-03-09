import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Shield, Users, Ticket, Plus, Trash2, AlertTriangle,
  Server, BarChart3, Settings, Ban, CheckCircle2, Search,
  Coins, MemoryStick, Cpu, HardDrive, Eye, UserPlus, ServerCrash,
  Activity, TrendingUp, Globe, Zap, Save, ShoppingCart, Pencil
} from 'lucide-react';
import { useAppSetting, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { toast } from 'sonner';
import { useIsAdmin } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePteroServers, usePteroUsers, useSuspendServer, useUnsuspendServer,
  useDeletePteroServer, useDeletePteroUser, useCreatePteroUser
} from '@/hooks/usePterodactyl';

const AdminPage = () => {
  const isAdmin = useIsAdmin();
  const { user } = useAuth();

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponCoins, setCouponCoins] = useState('');
  const [couponRam, setCouponRam] = useState('');
  const [couponCpu, setCouponCpu] = useState('');
  const [couponDisk, setCouponDisk] = useState('');
  const [couponSlots, setCouponSlots] = useState('');
  const [couponUses, setCouponUses] = useState('');
  const [coupons, setCoupons] = useState<any[]>([]);

  // Dashboard users state
  const [dashUsers, setDashUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editCoins, setEditCoins] = useState('');

  // New Ptero User
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Panel config
  const [serverSearch, setServerSearch] = useState('');

  // Ptero hooks
  const { data: pteroServers, isLoading: serversLoading } = usePteroServers(isAdmin);
  const { data: pteroUsers, isLoading: usersLoading } = usePteroUsers(isAdmin);
  const suspendServer = useSuspendServer();
  const unsuspendServer = useUnsuspendServer();
  const deletePteroServer = useDeletePteroServer();
  const deletePteroUser = useDeletePteroUser();
  const createPteroUser = useCreatePteroUser();

  useEffect(() => {
    if (isAdmin) {
      loadCoupons();
      loadDashUsers();
    }
  }, [isAdmin]);

  const loadCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data);
  };

  const loadDashUsers = async () => {
    // Admin needs service role to see all profiles - we'll use an edge function or RLS policy
    // For now, query profiles visible to admin
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setDashUsers(data);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
      </div>
    );
  }

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) {
      toast.error('Please enter a coupon code');
      return;
    }
    try {
      const { error } = await supabase.from('coupons').insert({
        code: couponCode.toUpperCase(),
        coins_reward: parseInt(couponCoins) || 0,
        ram_reward: parseInt(couponRam) || 0,
        cpu_reward: parseInt(couponCpu) || 0,
        disk_reward: parseInt(couponDisk) || 0,
        slots_reward: parseInt(couponSlots) || 0,
        max_uses: parseInt(couponUses) || null,
      });
      if (error) throw error;
      toast.success('Coupon created!');
      setCouponCode(''); setCouponCoins(''); setCouponRam('');
      setCouponCpu(''); setCouponDisk(''); setCouponSlots(''); setCouponUses('');
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Coupon deleted'); loadCoupons(); }
  };

  const handleToggleCoupon = async (id: string, active: boolean) => {
    const { error } = await supabase.from('coupons').update({ active: !active }).eq('id', id);
    if (error) toast.error(error.message);
    else { loadCoupons(); }
  };

  const handleUpdateUserCoins = async () => {
    if (!editingUser) return;
    const { error } = await supabase.from('profiles').update({ coins: parseInt(editCoins) || 0 }).eq('id', editingUser.id);
    if (error) toast.error(error.message);
    else { toast.success('Coins updated!'); setEditingUser(null); loadDashUsers(); }
  };

  const handleCreatePteroUser = async (e: React.FormEvent) => {
    e.preventDefault();
    createPteroUser.mutate({
      username: newUsername, email: newEmail,
      first_name: newFirstName, last_name: newLastName, password: newPassword,
    }, {
      onSuccess: () => {
        setNewUserDialog(false);
        setNewUsername(''); setNewEmail(''); setNewFirstName('');
        setNewLastName(''); setNewPassword('');
      }
    });
  };

  const pteroServerList = pteroServers?.data || [];
  const pteroUserList = pteroUsers?.data || [];
  const filteredServers = pteroServerList.filter((s: any) =>
    s.attributes?.name?.toLowerCase().includes(serverSearch.toLowerCase())
  );
  const filteredDashUsers = dashUsers.filter(u =>
    (u.username || u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  // Analytics
  const totalServers = pteroServerList.length;
  const totalPteroUsers = pteroUserList.length;
  const totalDashUsers = dashUsers.length;
  const totalCoins = dashUsers.reduce((sum: number, u: any) => sum + (u.coins || 0), 0);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage users, servers, coupons, and panel settings.</p>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5">
            <Users className="w-4 h-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="servers" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5">
            <Server className="w-4 h-4" /> Servers
          </TabsTrigger>
          <TabsTrigger value="coupons" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5">
            <Ticket className="w-4 h-4" /> Coupons
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5">
            <Settings className="w-4 h-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="shop" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5">
            <ShoppingCart className="w-4 h-4" /> Shop
          </TabsTrigger>
        </TabsList>

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 card-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Servers</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalServers}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 card-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <span className="text-sm text-muted-foreground">Panel Users</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalPteroUsers}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 card-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Dashboard Users</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalDashUsers}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 card-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-warning" />
                </div>
                <span className="text-sm text-muted-foreground">Total Coins</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalCoins.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <div className="bg-card rounded-xl border border-border p-6 card-shadow">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Recent Users
              </h3>
              <div className="space-y-2 max-h-64 overflow-auto">
                {dashUsers.slice(0, 10).map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.username || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-warning">
                      <Coins className="w-3.5 h-3.5" /> {u.coins}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 card-shadow">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" /> Active Coupons
              </h3>
              <div className="space-y-2 max-h-64 overflow-auto">
                {coupons.filter(c => c.active).slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="font-mono font-semibold text-foreground text-sm">{c.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.coins_reward > 0 && `${c.coins_reward} coins `}
                        {c.ram_reward > 0 && `${c.ram_reward}MB RAM `}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{c.current_uses}/{c.max_uses ?? '∞'}</span>
                  </div>
                ))}
                {coupons.filter(c => c.active).length === 0 && (
                  <p className="text-sm text-muted-foreground">No active coupons.</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== USERS TAB ===== */}
        <TabsContent value="users">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 bg-secondary border-border"
                />
              </div>
              <Dialog open={newUserDialog} onOpenChange={setNewUserDialog}>
                <DialogTrigger asChild>
                  <Button variant="glow" size="sm">
                    <UserPlus className="w-4 h-4 mr-1" /> Create Panel User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Create Panel User</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePteroUser} className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">First Name</Label>
                        <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="bg-secondary border-border" required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Last Name</Label>
                        <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="bg-secondary border-border" required />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Username</Label>
                      <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-secondary border-border" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-secondary border-border" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Password</Label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-secondary border-border" required minLength={8} />
                    </div>
                    <Button type="submit" variant="glow" className="w-full" disabled={createPteroUser.isPending}>
                      {createPteroUser.isPending ? 'Creating...' : 'Create User'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Dashboard Users */}
            <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Dashboard Users ({filteredDashUsers.length})</h3>
              </div>
              <div className="max-h-96 overflow-auto">
                {filteredDashUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.username || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm text-warning">
                        <Coins className="w-3.5 h-3.5" /> {u.coins}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingUser(u); setEditCoins(String(u.coins)); }}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel Users */}
            <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Panel Users ({pteroUserList.length})</h3>
              </div>
              {usersLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading panel users...</div>
              ) : (
                <div className="max-h-96 overflow-auto">
                  {pteroUserList.map((u: any) => (
                    <div key={u.attributes.id} className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.attributes.username}</p>
                          <p className="text-xs text-muted-foreground">{u.attributes.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{u.attributes.root_admin ? 'Admin' : 'User'}</span>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                          onClick={() => { if (confirm('Delete this panel user?')) deletePteroUser.mutate(u.attributes.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Edit User Dialog */}
          <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Edit User: {editingUser?.username}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={editingUser?.email || ''} readOnly className="bg-secondary border-border opacity-60" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Coins</Label>
                  <Input type="number" value={editCoins} onChange={(e) => setEditCoins(e.target.value)} className="bg-secondary border-border" />
                </div>
                <Button variant="glow" onClick={handleUpdateUserCoins} className="w-full">
                  <Coins className="w-4 h-4 mr-2" /> Update Coins
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== SERVERS TAB ===== */}
        <TabsContent value="servers">
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search servers..."
                value={serverSearch}
                onChange={(e) => setServerSearch(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>

            {serversLoading ? (
              <div className="bg-card rounded-xl border border-border p-12 card-shadow text-center">
                <ServerCrash className="w-12 h-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
                <p className="text-muted-foreground">Loading servers from panel...</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">All Servers ({filteredServers.length})</h3>
                </div>
                <div className="max-h-[500px] overflow-auto">
                  {filteredServers.map((s: any) => {
                    const attr = s.attributes;
                    const isSuspended = attr.suspended;
                    return (
                      <div key={attr.id} className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSuspended ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                            <Server className={`w-4 h-4 ${isSuspended ? 'text-destructive' : 'text-primary'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{attr.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {attr.id} • {attr.limits?.memory}MB RAM • {attr.limits?.cpu}% CPU • {attr.limits?.disk}MB Disk
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isSuspended ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                            {isSuspended ? 'Suspended' : 'Active'}
                          </span>
                          {isSuspended ? (
                            <Button size="sm" variant="ghost" className="text-success hover:text-success"
                              onClick={() => unsuspendServer.mutate(attr.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="text-warning hover:text-warning"
                              onClick={() => suspendServer.mutate(attr.id)}>
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                            onClick={() => { if (confirm('Delete this server permanently?')) deletePteroServer.mutate(attr.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredServers.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No servers found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== COUPONS TAB ===== */}
        <TabsContent value="coupons">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Create Coupon
              </h2>
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <Input placeholder="WELCOME2024" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="bg-secondary border-border font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Coins</Label>
                    <Input type="number" placeholder="100" value={couponCoins} onChange={(e) => setCouponCoins(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">RAM (MB)</Label>
                    <Input type="number" placeholder="0" value={couponRam} onChange={(e) => setCouponRam(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CPU (%)</Label>
                    <Input type="number" placeholder="0" value={couponCpu} onChange={(e) => setCouponCpu(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Disk (MB)</Label>
                    <Input type="number" placeholder="0" value={couponDisk} onChange={(e) => setCouponDisk(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Slots</Label>
                    <Input type="number" placeholder="0" value={couponSlots} onChange={(e) => setCouponSlots(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Uses</Label>
                    <Input type="number" placeholder="∞" value={couponUses} onChange={(e) => setCouponUses(e.target.value)} className="bg-secondary border-border" />
                  </div>
                </div>
                <Button type="submit" variant="glow" className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Create Coupon
                </Button>
              </form>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Existing Coupons ({coupons.length})</h2>
              {coupons.length === 0 ? (
                <p className="text-muted-foreground text-sm">No coupons yet.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {coupons.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                      <div className="flex-1">
                        <p className="font-mono font-semibold text-foreground text-sm">{c.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.coins_reward > 0 && `${c.coins_reward} coins `}
                          {c.ram_reward > 0 && `${c.ram_reward}MB RAM `}
                          {c.cpu_reward > 0 && `${c.cpu_reward}% CPU `}
                          {c.disk_reward > 0 && `${c.disk_reward}MB Disk `}
                          {c.slots_reward > 0 && `${c.slots_reward} slots `}
                          • {c.current_uses}/{c.max_uses ?? '∞'} uses
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleToggleCoupon(c.id, c.active)}
                          className={c.active ? 'text-success hover:text-success' : 'text-muted-foreground'}>
                          {c.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCoupon(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>

        {/* ===== SHOP TAB ===== */}
        <TabsContent value="shop">
          <ShopManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SettingsTab = () => {
  const { data: defaultRes, isLoading: resLoading } = useAppSetting('default_resources');
  const { data: afkConfig, isLoading: afkLoading } = useAppSetting('afk_rewards');
  const updateSetting = useUpdateAppSetting();

  const [res, setRes] = useState({ coins: 100, ram: 1024, cpu: 100, disk: 5120, server_slots: 1, databases: 1, backups: 1, allocations: 1 });
  const [afk, setAfk] = useState({ enabled: true, coins_per_interval: 1, interval_seconds: 60 });

  useEffect(() => {
    if (defaultRes) setRes(defaultRes);
  }, [defaultRes]);

  useEffect(() => {
    if (afkConfig) setAfk(afkConfig);
  }, [afkConfig]);

  const saveResources = () => updateSetting.mutate({ key: 'default_resources', value: res });
  const saveAfk = () => updateSetting.mutate({ key: 'afk_rewards', value: afk });

  if (resLoading || afkLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Panel Connection */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Panel Connection
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
            <span className="text-sm text-muted-foreground">Panel URL</span>
            <span className="text-sm font-medium text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
            <span className="text-sm text-muted-foreground">API Key</span>
            <span className="text-sm font-medium text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Configured
            </span>
          </div>
        </div>
      </div>

      {/* Default Resources - Editable */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Cpu className="w-5 h-5 text-accent" /> Default Resources
        </h2>
        <p className="text-sm text-muted-foreground">Resources given to new users on signup.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Coins</Label>
            <Input type="number" value={res.coins} onChange={(e) => setRes({ ...res, coins: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">RAM (MB)</Label>
            <Input type="number" value={res.ram} onChange={(e) => setRes({ ...res, ram: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">CPU (%)</Label>
            <Input type="number" value={res.cpu} onChange={(e) => setRes({ ...res, cpu: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Disk (MB)</Label>
            <Input type="number" value={res.disk} onChange={(e) => setRes({ ...res, disk: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Server Slots</Label>
            <Input type="number" value={res.server_slots} onChange={(e) => setRes({ ...res, server_slots: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Databases</Label>
            <Input type="number" value={res.databases} onChange={(e) => setRes({ ...res, databases: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Backups</Label>
            <Input type="number" value={res.backups} onChange={(e) => setRes({ ...res, backups: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Allocations</Label>
            <Input type="number" value={res.allocations} onChange={(e) => setRes({ ...res, allocations: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
          </div>
        </div>
        <Button variant="glow" className="w-full" onClick={saveResources} disabled={updateSetting.isPending}>
          <Save className="w-4 h-4 mr-2" /> Save Default Resources
        </Button>
      </div>

      {/* AFK Reward Settings */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4 lg:col-span-2">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning" /> AFK Reward Settings
        </h2>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
          <span className="text-sm text-foreground">Enable AFK Rewards</span>
          <Switch checked={afk.enabled} onCheckedChange={(checked) => setAfk({ ...afk, enabled: checked })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Coins per Interval</Label>
            <Input type="number" value={afk.coins_per_interval} onChange={(e) => setAfk({ ...afk, coins_per_interval: parseInt(e.target.value) || 1 })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Interval (seconds)</Label>
            <Input type="number" value={afk.interval_seconds} onChange={(e) => setAfk({ ...afk, interval_seconds: parseInt(e.target.value) || 60 })} className="bg-secondary border-border" min={10} />
          </div>
        </div>
        <Button variant="glow" className="w-full" onClick={saveAfk} disabled={updateSetting.isPending}>
          <Save className="w-4 h-4 mr-2" /> Save AFK Settings
        </Button>
      </div>
    </div>
  );
};

const ShopManagementTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('server');
  const [formPrice, setFormPrice] = useState('');
  const [formResource, setFormResource] = useState('ram');
  const [formAmount, setFormAmount] = useState('');
  const [formDisplay, setFormDisplay] = useState('');
  const [formColor, setFormColor] = useState('text-primary');
  const [formOrder, setFormOrder] = useState('0');

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('shop_items').select('*').order('sort_order', { ascending: true });
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const resetForm = () => {
    setFormName(''); setFormDesc(''); setFormIcon('server'); setFormPrice('');
    setFormResource('ram'); setFormAmount(''); setFormDisplay(''); setFormColor('text-primary'); setFormOrder('0');
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormName(item.name);
    setFormDesc(item.description);
    setFormIcon(item.icon);
    setFormPrice(String(item.price));
    setFormResource(item.resource);
    setFormAmount(String(item.amount));
    setFormDisplay(item.display_amount);
    setFormColor(item.color);
    setFormOrder(String(item.sort_order));
    setShowAdd(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      description: formDesc,
      icon: formIcon,
      price: parseInt(formPrice) || 0,
      resource: formResource,
      amount: parseInt(formAmount) || 0,
      display_amount: formDisplay,
      color: formColor,
      sort_order: parseInt(formOrder) || 0,
    };

    try {
      if (editItem) {
        const { error } = await supabase.from('shop_items').update(payload).eq('id', editItem.id);
        if (error) throw error;
        toast.success('Item updated!');
        setEditItem(null);
      } else {
        const { error } = await supabase.from('shop_items').insert(payload);
        if (error) throw error;
        toast.success('Item created!');
        setShowAdd(false);
      }
      resetForm();
      loadItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shop item?')) return;
    const { error } = await supabase.from('shop_items').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Item deleted'); loadItems(); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from('shop_items').update({ active: !active }).eq('id', id);
    if (error) toast.error(error.message);
    else loadItems();
  };

  const iconOptions = [
    { value: 'memory-stick', label: 'RAM' },
    { value: 'cpu', label: 'CPU' },
    { value: 'hard-drive', label: 'Disk' },
    { value: 'server', label: 'Server' },
    { value: 'zap', label: 'Zap' },
    { value: 'database', label: 'Database' },
    { value: 'archive', label: 'Backup' },
    { value: 'network', label: 'Allocation' },
  ];

  const resourceOptions = [
    { value: 'ram', label: 'RAM' },
    { value: 'cpu', label: 'CPU' },
    { value: 'disk', label: 'Disk' },
    { value: 'server_slots', label: 'Server Slots' },
    { value: 'databases', label: 'Databases' },
    { value: 'backups', label: 'Backups' },
    { value: 'allocations', label: 'Allocations' },
  ];

  const colorOptions = [
    { value: 'text-primary', label: 'Primary' },
    { value: 'text-accent', label: 'Accent' },
    { value: 'text-success', label: 'Success' },
    { value: 'text-warning', label: 'Warning' },
    { value: 'text-destructive', label: 'Destructive' },
  ];

  const showForm = showAdd || editItem;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Item List */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> Shop Items ({items.length})
          </h2>
          <Button size="sm" variant="glow" onClick={() => { setEditItem(null); resetForm(); setShowAdd(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shop items yet.</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                    {!item.active && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Disabled</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.price} coins → {item.display_amount} {item.resource}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(item.id, item.active)}
                    className={item.active ? 'text-success hover:text-success' : 'text-muted-foreground'}>
                    {item.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {editItem ? <><Pencil className="w-5 h-5 text-primary" /> Edit Item</> : <><Plus className="w-5 h-5 text-primary" /> New Item</>}
          </h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="bg-secondary border-border" required placeholder="512 MB RAM" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="bg-secondary border-border" placeholder="Extra memory for your servers" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Price (coins)</Label>
                <Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="bg-secondary border-border" required placeholder="50" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Resource Type</Label>
                <select value={formResource} onChange={(e) => setFormResource(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background">
                  {resourceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="bg-secondary border-border" required placeholder="512" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display Amount</Label>
                <Input value={formDisplay} onChange={(e) => setFormDisplay(e.target.value)} className="bg-secondary border-border" required placeholder="512 MB" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Icon</Label>
                <select value={formIcon} onChange={(e) => setFormIcon(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background">
                  {iconOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <select value={formColor} onChange={(e) => setFormColor(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background">
                  {colorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={formOrder} onChange={(e) => setFormOrder(e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="glow" className="flex-1">
                <Save className="w-4 h-4 mr-2" /> {editItem ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setEditItem(null); setShowAdd(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
