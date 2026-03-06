import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Coins, Cpu, HardDrive, MemoryStick, Server, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  price: number;
  amount: string;
  color: string;
}

const shopItems: ShopItem[] = [
  { id: 'ram-512', name: '512 MB RAM', description: 'Extra memory for your servers', icon: MemoryStick, price: 50, amount: '512 MB', color: 'text-accent' },
  { id: 'ram-1024', name: '1 GB RAM', description: 'More memory for better performance', icon: MemoryStick, price: 90, amount: '1024 MB', color: 'text-accent' },
  { id: 'cpu-50', name: '50% CPU', description: 'Additional processing power', icon: Cpu, price: 40, amount: '50%', color: 'text-success' },
  { id: 'cpu-100', name: '100% CPU', description: 'Full CPU core allocation', icon: Cpu, price: 70, amount: '100%', color: 'text-success' },
  { id: 'disk-1', name: '1 GB Disk', description: 'Extra storage space', icon: HardDrive, price: 20, amount: '1 GB', color: 'text-primary' },
  { id: 'disk-5', name: '5 GB Disk', description: 'Large storage expansion', icon: HardDrive, price: 80, amount: '5 GB', color: 'text-primary' },
  { id: 'server-1', name: '+1 Server Slot', description: 'Create an additional server', icon: Server, price: 100, amount: '1 slot', color: 'text-warning' },
  { id: 'backup-1', name: '+1 Backup Slot', description: 'Extra backup for your server', icon: Zap, price: 30, amount: '1 slot', color: 'text-primary' },
];

const ShopPage = () => {
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (item: ShopItem) => {
    setBuying(item.id);
    // Placeholder — this will call edge function to deduct coins and add resources
    toast.info(`Purchase requires database setup. Configure your panel in Admin settings.`);
    setBuying(null);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shop</h1>
        <p className="text-muted-foreground">Purchase resources with your coins.</p>
      </div>

      {/* Balance */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
            <Coins className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-3xl font-bold text-foreground">0 <span className="text-lg text-muted-foreground font-normal">coins</span></p>
          </div>
        </div>
      </div>

      {/* Shop Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shopItems.map((item) => (
          <div
            key={item.id}
            className="bg-card rounded-xl border border-border p-5 card-shadow hover:border-primary/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-warning" />
                <span className="font-bold text-foreground">{item.price}</span>
              </div>
              <Button
                size="sm"
                variant="glow"
                disabled={buying === item.id}
                onClick={() => handleBuy(item)}
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                Buy
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
