import React from 'react';
import { MessageCircle, X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiscordConnectPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DiscordConnectPopup: React.FC<DiscordConnectPopupProps> = ({ open, onOpenChange }) => {
  const [loading, setLoading] = React.useState(false);

  const handleConnectDiscord = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#5865F2]" />
            Connect Discord Account
          </DialogTitle>
          <DialogDescription>
            Link your Discord account to access all features. You'll be automatically added to our community server.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <h4 className="font-medium text-sm text-foreground">Why connect Discord?</h4>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Required to create game servers
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Get support from our community
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Receive important announcements
              </li>
            </ul>
          </div>

          <Button 
            onClick={handleConnectDiscord} 
            disabled={loading}
            className="w-full gap-2 bg-[#5865F2] hover:bg-[#4752C4]"
          >
            <MessageCircle className="w-4 h-4" />
            {loading ? 'Connecting...' : 'Connect Discord'}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By connecting, you'll automatically join our Discord server.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscordConnectPopup;
