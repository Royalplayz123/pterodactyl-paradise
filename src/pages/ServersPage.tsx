import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Server, Plus, Play, Square, RotateCcw, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const eggs = [
  { id: 'paper', name: 'Paper (Minecraft)' },
  { id: 'vanilla', name: 'Vanilla (Minecraft)' },
  { id: 'forge', name: 'Forge (Minecraft)' },
  { id: 'fabric', name: 'Fabric (Minecraft)' },
  { id: 'bungeecord', name: 'BungeeCord (Proxy)' },
  { id: 'nodejs', name: 'Node.js' },
  { id: 'python', name: 'Python' },
];

const ServersPage = () => {
  const [serverName, setServerName] = useState('');
  const [selectedEgg, setSelectedEgg] = useState('');
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim() || !selectedEgg) {
      toast.error('Please fill in all fields');
      return;
    }
    setCreating(true);
    // This will call the edge function to create a server via Pterodactyl API
    toast.info('Server creation requires Pterodactyl API configuration. Set up your API keys in Admin panel.');
    setCreating(false);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servers</h1>
          <p className="text-muted-foreground">Create and manage your game servers.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="glow">
              <Plus className="w-4 h-4 mr-2" />
              Create Server
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Server</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateServer} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Server Name</Label>
                <Input
                  placeholder="My Awesome Server"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Server Type</Label>
                <Select value={selectedEgg} onValueChange={setSelectedEgg}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select server type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {eggs.map((egg) => (
                      <SelectItem key={egg.id} value={egg.id}>
                        {egg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="text-muted-foreground">Resources allocated from your balance:</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-foreground font-semibold">1024 MB</p>
                    <p className="text-xs text-muted-foreground">RAM</p>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-foreground font-semibold">100%</p>
                    <p className="text-xs text-muted-foreground">CPU</p>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-foreground font-semibold">5 GB</p>
                    <p className="text-xs text-muted-foreground">Disk</p>
                  </div>
                </div>
              </div>
              <Button type="submit" variant="glow" className="w-full" disabled={creating}>
                {creating ? 'Creating...' : 'Create Server'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      <div className="bg-card rounded-xl border border-border p-12 card-shadow text-center">
        <Server className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-float" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No servers yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Create your first game server. Choose from various server types including Minecraft, Node.js, and more.
        </p>
        <Button variant="glow" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Server
        </Button>
      </div>
    </div>
  );
};

export default ServersPage;
