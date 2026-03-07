import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAppSetting = (key: string) => {
  return useQuery({
    queryKey: ['app_settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();
      if (error) throw error;
      return data?.value as any;
    },
  });
};

export const useUpdateAppSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['app_settings', key] });
      toast.success('Settings saved!');
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });
};
