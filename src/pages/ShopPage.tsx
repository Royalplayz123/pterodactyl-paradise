import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Coins, Cpu, HardDrive, MemoryStick, Server, Zap, Loader2, Database, Archive, Network } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUserResources } from '@/hooks/useProfile';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { sendNotification } from '@/lib/notifications';

const iconMap: Record<string, React.ElementType> = {
  'memory-stick': MemoryStick,
  'cpu': Cpu,
  'hard-drive': HardDrive,
  'server': Server,
  'zap': Zap,
  'database': Database,
  'archive': Archive,
  'network': Network,
};

const useShopItems = () => {
  return useQuery({
    queryKey: ['shop_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

const ShopPage = () => {
  const [buying, setBuying] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: resources } = useUserResources();
  const { data: shopItems, isLoading } = useShopItems();
  const queryClient = useQueryClient();

  const handleBuy = async (item: any) => {
    if (!user || !profile || !resources) return;
    if (profile.coins < item.price) {
      toast.error('Not enough coins!');
      return;
    }

    setBuying(item.id);
    try {
      const { error: coinErr } = await supabase
        .from('profiles')
        .update({ coins: profile.coins - item.price })
        .eq('id', user.id);
      if (coinErr) throw coinErr;

      const { error: resErr } = await supabase
        .from('user_resources')
        .update({ [item.resource]: (resources as any)[item.resource] + item.amount })
        .eq('user_id', user.id);
      if (resErr) throw resErr;

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'purchase',
        description: `Bought ${item.name}`,
        coins_change: -item.price,
      });

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user_resources'] });
      toast.success(`Purchased ${item.name}!`);
      
      // Send notification
      if (profile.email) {
        sendNotification({
          type: 'shop_purchase',
          email: profile.email,
          data: { itemName: item.name, price: item.price }
        });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shop</h1>
        <p className="text-muted-foreground">Purchase resources with your coins.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 card-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
            <Coins className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-3xl font-bold text-foreground">{profile?.coins ?? 0} <span className="text-lg text-muted-foreground font-normal">coins</span></p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(shopItems || []).map((item) => {
            const IconComp = iconMap[item.icon] || Server;
            return (
              <div key={item.id} className="bg-card rounded-xl border border-border p-5 card-shadow hover:border-primary/30 transition-all duration-200 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <IconComp className={`w-5 h-5 ${item.color}`} />
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
                    disabled={buying === item.id || (profile?.coins ?? 0) < item.price}
                    onClick={() => handleBuy(item)}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                    Buy
                  </Button>
                </div>
              </div>
            );
          })}
          {(shopItems || []).length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No items available in the shop right now.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopPage;
