import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppSetting, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Palette, Image, Upload, Save, Trash2, Type } from 'lucide-react';

const BrandingSettings = () => {
  const { data: brandingData, isLoading } = useAppSetting('branding');
  const updateSetting = useUpdateAppSetting();
  
  const [dashboardName, setDashboardName] = useState('PteroDash');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (brandingData) {
      setDashboardName(brandingData.dashboardName || 'PteroDash');
      setLogoUrl(brandingData.logoUrl || null);
      setBackgroundColor(brandingData.backgroundColor || '#0f172a');
      setBackgroundImageUrl(brandingData.backgroundImageUrl || null);
    }
  }, [brandingData]);

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      return null;
    }
    
    const { data } = supabase.storage.from('branding').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const url = await uploadFile(file, 'logo');
    if (url) {
      setLogoUrl(url);
      toast.success('Logo uploaded!');
    }
    setUploading(false);
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const url = await uploadFile(file, 'background');
    if (url) {
      setBackgroundImageUrl(url);
      toast.success('Background image uploaded!');
    }
    setUploading(false);
  };

  const saveBranding = () => {
    updateSetting.mutate({
      key: 'branding',
      value: {
        dashboardName,
        logoUrl,
        backgroundColor,
        backgroundImageUrl,
      },
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading branding settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Name */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Type className="w-5 h-5 text-primary" /> Dashboard Name
        </h2>
        <div className="space-y-2">
          <Label>Name displayed across the app</Label>
          <Input
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            placeholder="PteroDash"
            className="bg-secondary border-border"
          />
        </div>
      </div>

      {/* Logo */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Image className="w-5 h-5 text-accent" /> Logo
        </h2>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative">
              <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-secondary border border-border" />
              <button
                onClick={() => setLogoUrl(null)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-secondary border border-dashed border-border flex items-center justify-center">
              <Image className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">Recommended: 128x128px, PNG or SVG</p>
          </div>
        </div>
      </div>

      {/* Background */}
      <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-warning" /> Background
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Background Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#0f172a"
                className="bg-secondary border-border flex-1"
              />
            </div>
          </div>

          {/* Background Image */}
          <div className="space-y-2">
            <Label>Background Image</Label>
            <div className="flex items-center gap-2">
              {backgroundImageUrl ? (
                <div className="relative">
                  <img src={backgroundImageUrl} alt="Background" className="w-20 h-10 rounded-lg object-cover border border-border" />
                  <button
                    onClick={() => setBackgroundImageUrl(null)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : null}
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                onChange={handleBgImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => bgInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {backgroundImageUrl ? 'Change' : 'Upload'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Image takes priority over color</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button variant="glow" className="w-full" onClick={saveBranding} disabled={updateSetting.isPending}>
        <Save className="w-4 h-4 mr-2" /> Save Branding Settings
      </Button>
    </div>
  );
};

export default BrandingSettings;
