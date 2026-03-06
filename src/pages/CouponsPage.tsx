import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket, Gift, Coins, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const CouponsPage = () => {
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setRedeeming(true);
    // Placeholder — will call edge function to validate coupon
    toast.info('Coupon system requires database setup. Configure in Admin panel.');
    setRedeeming(false);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
        <p className="text-muted-foreground">Redeem coupon codes for coins and resources.</p>
      </div>

      {/* Redeem Card */}
      <div className="bg-card rounded-xl border border-border p-8 card-shadow max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center animate-pulse-glow">
            <Ticket className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Redeem Coupon</h2>
            <p className="text-sm text-muted-foreground">Enter your coupon code below</p>
          </div>
        </div>

        <form onSubmit={handleRedeem} className="space-y-4">
          <div className="space-y-2">
            <Label>Coupon Code</Label>
            <Input
              placeholder="ENTER-YOUR-CODE"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="bg-secondary border-border text-center font-mono text-lg tracking-wider"
              required
            />
          </div>
          <Button type="submit" variant="glow" className="w-full" disabled={redeeming}>
            <Sparkles className="w-4 h-4 mr-2" />
            {redeeming ? 'Redeeming...' : 'Redeem Coupon'}
          </Button>
        </form>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg">
        <div className="bg-card rounded-xl border border-border p-4 card-shadow text-center">
          <Coins className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Coins</p>
          <p className="text-xs text-muted-foreground">Get free coins</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 card-shadow text-center">
          <Gift className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Resources</p>
          <p className="text-xs text-muted-foreground">RAM, CPU, Disk</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 card-shadow text-center">
          <Sparkles className="w-6 h-6 text-accent mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Special</p>
          <p className="text-xs text-muted-foreground">Limited rewards</p>
        </div>
      </div>
    </div>
  );
};

export default CouponsPage;
