import React, { createContext, useContext, ReactNode } from 'react';
import { useAppSetting } from '@/hooks/useAppSettings';

interface BrandingConfig {
  dashboardName: string;
  logoUrl: string | null;
  backgroundColor: string;
  backgroundImageUrl: string | null;
}

interface BrandingContextType {
  branding: BrandingConfig;
  isLoading: boolean;
}

const defaultBranding: BrandingConfig = {
  dashboardName: 'PteroDash',
  logoUrl: null,
  backgroundColor: '',
  backgroundImageUrl: null,
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  isLoading: true,
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { data: brandingData, isLoading } = useAppSetting('branding');

  const branding: BrandingConfig = {
    ...defaultBranding,
    ...(brandingData || {}),
  };

  return (
    <BrandingContext.Provider value={{ branding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
};
