import { Server, Coins, Cpu, HardDrive, MemoryStick, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const stats = [
  { label: 'Servers', value: '0', icon: Server, color: 'text-primary' },
  { label: 'Coins', value: '0', icon: Coins, color: 'text-warning' },
  { label: 'CPU', value: '0%', icon: Cpu, color: 'text-success' },
  { label: 'RAM', value: '0 MB', icon: MemoryStick, color: 'text-accent' },
  { label: 'Disk', value: '0 MB', icon: HardDrive, color: 'text-primary' },
];

const DashboardHome = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Manage your game servers and resources.</p>
        </div>
        <Button variant="glow" onClick={() => navigate('/dashboard/servers')}>
          <Plus className="w-4 h-4 mr-2" />
          New Server
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-4 card-shadow hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="secondary" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/dashboard/servers')}>
            <Server className="w-5 h-5 text-primary" />
            <span>Create Server</span>
          </Button>
          <Button variant="secondary" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/dashboard/shop')}>
            <Coins className="w-5 h-5 text-warning" />
            <span>Buy Resources</span>
          </Button>
          <Button variant="secondary" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/dashboard/coupons')}>
            <span className="text-accent">🎟️</span>
            <span>Redeem Coupon</span>
          </Button>
        </div>
      </div>

      {/* Servers List (empty state) */}
      <div className="bg-card rounded-xl border border-border p-8 card-shadow text-center">
        <Server className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No servers yet</h3>
        <p className="text-muted-foreground mb-4">Create your first server to get started.</p>
        <Button variant="glow" onClick={() => navigate('/dashboard/servers')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Server
        </Button>
      </div>
    </div>
  );
};

export default DashboardHome;
