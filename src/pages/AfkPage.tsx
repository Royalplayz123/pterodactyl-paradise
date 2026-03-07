import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { Coins, Clock, Zap, TrendingUp, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AfkPage = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [afkConfig, setAfkConfig] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [active, setActive] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load AFK settings
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'afk_rewards')
        .single();
      const config = (data?.value as any) ?? { enabled: true, coins_per_interval: 1, interval_seconds: 60 };
      setAfkConfig(config);
      setCountdown(0); // Start claiming immediately
    };
    load();
  }, []);

  const claimReward = useCallback(async () => {
    if (!user || claiming || !active) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke('afk-claim');
      if (error) throw error;
      const result = data as any;
      if (result.rewarded) {
        setTotalEarned((prev) => prev + result.coins_earned);
        setCountdown(result.next_claim_seconds);
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      } else if (result.remaining_seconds) {
        setCountdown(result.remaining_seconds);
      }
    } catch (err: any) {
      console.error('AFK claim error:', err);
    } finally {
      setClaiming(false);
    }
  }, [user, claiming, active, queryClient]);

  // Auto-claim timer
  useEffect(() => {
    if (!afkConfig?.enabled || !active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Initial claim
    claimReward();

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          claimReward();
          return afkConfig.interval_seconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [afkConfig, active]);

  // Session timer
  useEffect(() => {
    sessionRef.current = setInterval(() => {
      if (active) setSessionTime((prev) => prev + 1);
    }, 1000);
    return () => {
      if (sessionRef.current) clearInterval(sessionRef.current);
    };
  }, [active]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  if (!afkConfig) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading AFK settings...</div>
      </div>
    );
  }

  if (!afkConfig.enabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Pause className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">AFK Rewards Disabled</h2>
        <p className="text-muted-foreground">The admin has disabled AFK rewards.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-warning" />
          AFK Rewards
        </h1>
        <p className="text-muted-foreground">
          Stay on this page to earn coins automatically every {afkConfig.interval_seconds}s.
        </p>
      </div>

      {/* Main reward display */}
      <div className="bg-card rounded-xl border border-border p-8 card-shadow text-center">
        <div className="relative inline-flex items-center justify-center w-40 h-40 mb-6">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <circle
              cx="80" cy="80" r="70" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 70}
              strokeDashoffset={2 * Math.PI * 70 * (countdown / (afkConfig.interval_seconds || 60))}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{countdown}s</span>
            <span className="text-xs text-muted-foreground">until reward</span>
          </div>
        </div>

        <p className="text-lg text-foreground mb-2">
          Earning <span className="font-bold text-warning">{afkConfig.coins_per_interval} coin{afkConfig.coins_per_interval !== 1 ? 's' : ''}</span> per interval
        </p>

        <Button
          variant={active ? 'destructive' : 'glow'}
          onClick={() => setActive(!active)}
          className="mt-4"
        >
          {active ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Resume</>}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 card-shadow">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="w-5 h-5 text-warning" />
            <span className="text-sm text-muted-foreground">Session Earned</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalEarned}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 card-shadow">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Total Coins</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{profile?.coins ?? 0}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 card-shadow">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">Session Time</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatTime(sessionTime)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 card-shadow">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Status</span>
          </div>
          <p className={`text-2xl font-bold ${active ? 'text-success' : 'text-muted-foreground'}`}>
            {active ? 'Active' : 'Paused'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AfkPage;
